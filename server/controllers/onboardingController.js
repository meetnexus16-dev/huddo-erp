import User from '../models/User.js';
import Role from '../models/Role.js';
import Retailer from '../models/Retailer.js';
import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import { DEFAULT_USER_PASSWORD } from '../constants/defaultCredentials.js';
import { resolveUserByCode } from '../utils/userCode.js';
import {
  assignCityManager,
  assignCountryManager,
  assignStateManager,
  cleanupOrphanedCityManager,
  cleanupOrphanedCountryManager,
  cleanupOrphanedStateManager,
  getActiveManagerUser
} from '../utils/managerAssignment.js';
import { normalizeRoleName } from '../utils/roleUtils.js';
import {
  findCityByName,
  findCountryByName,
  findStateByName,
  geoNamePresent,
  resolveOnboardingTerritory
} from '../utils/geoResolve.js';

const ONBOARDING_ROLES = ['CountryManager', 'StateManager', 'CityManager', 'Retailer'];

export const getOnboardingGeoOptions = async (req, res, next) => {
  try {
    return res.status(410).json({
      success: false,
      message: 'Use /api/geo/world/* endpoints for territory search.'
    });
  } catch (error) {
    next(error);
  }
};

export const validateReferrerCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const user = await resolveUserByCode(code);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Referrer code not found.' });
    }
    if (user.approval_status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Referrer is not approved yet.' });
    }
    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        role: user.roleName || user.role?.name,
        user_code: user.user_code || user.employee_id
      }
    });
  } catch (error) {
    next(error);
  }
};

async function validateManagerSlotByName(roleName, { countryName, stateName, cityName }) {
  if (roleName === 'CountryManager' && countryName) {
    const country = await findCountryByName(countryName);
    if (country) {
      await cleanupOrphanedCountryManager(country._id);
      const refreshed = await Country.findById(country._id);
      const manager = await getActiveManagerUser(refreshed?.manager);
      if (manager) {
        return `${country.name} already has manager ${manager.name}.`;
      }
    }
  }

  if (roleName === 'StateManager' && countryName && stateName) {
    const country = await findCountryByName(countryName);
    if (country) {
      const state = await findStateByName(stateName, country._id);
      if (state) {
        await cleanupOrphanedStateManager(state._id);
        const refreshed = await State.findById(state._id);
        const manager = await getActiveManagerUser(refreshed?.manager);
        if (manager) {
          return `${state.name} already has manager ${manager.name}.`;
        }
      }
    }
  }

  if (roleName === 'CityManager' && countryName && stateName && cityName) {
    const country = await findCountryByName(countryName);
    if (country) {
      const state = await findStateByName(stateName, country._id);
      if (state) {
        const city = await findCityByName(cityName, state._id);
        if (city) {
          await cleanupOrphanedCityManager(city._id);
          const refreshed = await City.findById(city._id);
          const manager = await getActiveManagerUser(refreshed?.manager);
          if (manager) {
            return `${city.name} already has manager ${manager.name}.`;
          }
        }
      }
    }
  }

  return null;
}

export const submitOnboarding = async (req, res, next) => {
  try {
    const {
      roleName,
      name,
      email,
      mobile,
      referrer_code: referrerCode,
      country_id: countryId,
      state_id: stateId,
      city_id: cityId,
      country_name: countryName,
      state_name: stateName,
      city_name: cityName,
      country_iso: countryIso,
      business_name: businessName,
      owner_name: ownerName,
      shop_address: shopAddress,
      gst_number: gstNumber,
      pan_number: panNumber,
      aadhaar_number: aadhaarNumber
    } = req.body;

    const normalizedRole = normalizeRoleName(roleName);
    if (!ONBOARDING_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid onboarding role.' });
    }
    if (!name?.trim() || !email?.trim() || !mobile?.trim() || !referrerCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, mobile, and referrer code are required.' });
    }

    const referrer = await resolveUserByCode(referrerCode);
    if (!referrer) {
      return res.status(400).json({ success: false, message: 'Invalid referrer code.' });
    }
    if (referrer.approval_status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Referrer is not approved.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim(), is_deleted: { $ne: true } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const role = await Role.findOne({ name: normalizedRole });
    if (!role) {
      return res.status(400).json({ success: false, message: 'Role not found.' });
    }

    if (normalizedRole === 'CountryManager' && !geoNamePresent(countryName)) {
      return res.status(400).json({ success: false, message: 'Country is required.' });
    }

    if (normalizedRole === 'StateManager') {
      if (!geoNamePresent(countryName, stateName)) {
        return res.status(400).json({ success: false, message: 'Country and state are required.' });
      }
    }

    if (normalizedRole === 'CityManager') {
      if (!geoNamePresent(countryName, stateName, cityName)) {
        return res.status(400).json({ success: false, message: 'Country, state, and city are required.' });
      }
    }

    if (normalizedRole === 'Retailer') {
      if (!businessName?.trim() || !geoNamePresent(countryName, stateName, cityName)) {
        return res.status(400).json({
          success: false,
          message: 'Business name, country, state, and city are required for retailer.'
        });
      }
    }

    const slotError = await validateManagerSlotByName(normalizedRole, {
      countryName,
      stateName,
      cityName
    });
    if (slotError) {
      return res.status(400).json({ success: false, message: slotError });
    }

    const existingCountry = countryName ? await findCountryByName(countryName) : null;
    const existingState = existingCountry && stateName
      ? await findStateByName(stateName, existingCountry._id)
      : null;
    const existingCity = existingState && cityName
      ? await findCityByName(cityName, existingState._id)
      : null;

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password: DEFAULT_USER_PASSWORD,
      role: role._id,
      roleName: normalizedRole,
      promoted_by: referrer._id,
      promoter_code_used: referrer.user_code || referrer.employee_id || referrerCode.trim().toUpperCase(),
      onboarding_source: 'referral',
      approval_status: 'Pending',
      is_verified: false,
      is_active: true,
      onboarding_meta: {
        requested_country: existingCountry?._id,
        requested_state: existingState?._id,
        requested_city: existingCity?._id,
        requested_country_name: countryName?.trim() || undefined,
        requested_state_name: stateName?.trim() || undefined,
        requested_city_name: cityName?.trim() || undefined,
        requested_country_iso: countryIso || undefined,
        business_name: businessName || undefined,
        shop_address: shopAddress || undefined,
        gst_number: gstNumber || undefined,
        pan_number: panNumber || undefined,
        aadhaar_number: aadhaarNumber || undefined
      }
    });

    await user.save();

    if (normalizedRole === 'Retailer') {
      await Retailer.create({
        user: user._id,
        business_name: businessName.trim(),
        owner_name: ownerName?.trim() || name.trim(),
        mobile: mobile.trim(),
        email: email.toLowerCase().trim(),
        shop_address: shopAddress,
        state: existingState?._id,
        city: existingCity?._id,
        gst_number: gstNumber,
        pan_number: panNumber,
        aadhaar_number: aadhaarNumber,
        is_verified: false,
        is_active: true
      });
    }

    res.status(201).json({
      success: true,
      message: 'Onboarding submitted successfully. Awaiting admin approval.',
      data: {
        user_id: user._id,
        approval_status: user.approval_status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingOnboardingUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      approval_status: 'Pending',
      onboarding_source: 'referral',
      is_deleted: { $ne: true }
    })
      .populate('role')
      .populate('promoted_by', 'name user_code roleName')
      .populate('onboarding_meta.requested_country', 'name')
      .populate('onboarding_meta.requested_state', 'name')
      .populate('onboarding_meta.requested_city', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const approveOnboardingUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason: rejectionReason } = req.body;
    const isApprove = action !== 'reject';

    const user = await User.findById(id).populate('role');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.approval_status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'User is not pending approval.' });
    }

    if (!isApprove) {
      user.approval_status = 'Rejected';
      user.rejection_reason = rejectionReason || 'Rejected by admin';
      user.approved_by = req.user._id;
      user.approved_at = new Date();
      user.is_active = false;
      await user.save();
      return res.status(200).json({ success: true, message: 'Onboarding rejected.', data: user });
    }

    const { generateUniqueUserCode } = await import('../utils/userCode.js');
    if (!user.user_code) {
      user.user_code = await generateUniqueUserCode('USR');
      user.employee_id = user.user_code;
    }

    user.approval_status = 'Approved';
    user.approved_by = req.user._id;
    user.approved_at = new Date();
    user.is_verified = true;
    user.is_active = true;

    const roleName = user.roleName || user.role?.name;
    const meta = user.onboarding_meta || {};

    const territory = await resolveOnboardingTerritory(roleName, meta);
    const createdNote = territory.created?.length
      ? ` Created: ${territory.created.join(', ')}.`
      : '';

    if (territory.countryId) user.country = territory.countryId;
    if (territory.stateId) user.state = territory.stateId;
    if (territory.cityId) user.city = territory.cityId;

    if (roleName === 'CountryManager' && territory.countryId) {
      await assignCountryManager(territory.countryId, user._id);
    } else if (roleName === 'StateManager' && territory.stateId) {
      await assignStateManager(territory.stateId, user._id);
    } else if (roleName === 'CityManager' && territory.cityId) {
      await assignCityManager(territory.cityId, user._id);
    } else if (roleName === 'Retailer') {
      let cityManagerId = null;
      if (territory.cityId) {
        const city = await City.findById(territory.cityId);
        cityManagerId = city?.manager || null;
      }
      await Retailer.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            is_verified: true,
            is_active: true,
            state: territory.stateId || undefined,
            city: territory.cityId || undefined,
            assigned_city_manager: cityManagerId || undefined
          }
        }
      );
    }

    if (meta.requested_country_name || meta.requested_state_name || meta.requested_city_name) {
      user.onboarding_meta = {
        ...meta,
        requested_country: territory.countryId || meta.requested_country,
        requested_state: territory.stateId || meta.requested_state,
        requested_city: territory.cityId || meta.requested_city
      };
    }

    await user.save();
    const refreshed = await User.findById(user._id)
      .populate('role')
      .populate('promoted_by', 'name user_code');

    res.status(200).json({
      success: true,
      message: `User approved successfully.${createdNote}`,
      data: refreshed,
      default_password: DEFAULT_USER_PASSWORD,
      geo_created: territory.created || []
    });
  } catch (error) {
    next(error);
  }
};

export const getReferralInfo = async (req, res, next) => {
  try {
    const user = req.user;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.status(200).json({
      success: true,
      data: {
        user_code: user.user_code || user.employee_id,
        onboarding_link: `${baseUrl}/onboard?ref=${encodeURIComponent(user.user_code || user.employee_id || '')}`,
        approval_status: user.approval_status
      }
    });
  } catch (error) {
    next(error);
  }
};
