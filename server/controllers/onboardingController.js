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

const ONBOARDING_ROLES = ['CountryManager', 'StateManager', 'CityManager', 'Retailer'];

export const getOnboardingGeoOptions = async (req, res, next) => {
  try {
    const { role, country_id: countryId, state_id: stateId } = req.query;

    if (role === 'CountryManager' || !role) {
      const countries = await Country.find({ is_deleted: { $ne: true } }).sort({ name: 1 });
      const data = [];
      for (const country of countries) {
        await cleanupOrphanedCountryManager(country._id);
        const refreshed = await Country.findById(country._id);
        const manager = await getActiveManagerUser(refreshed?.manager);
        data.push({
          _id: country._id,
          name: country.name,
          code: country.code,
          available: !manager,
          manager_name: manager?.name || null
        });
      }
      return res.status(200).json({ success: true, data: { countries: data } });
    }

    if (role === 'StateManager') {
      if (!countryId) {
        return res.status(400).json({ success: false, message: 'country_id is required for StateManager.' });
      }
      const country = await Country.findById(countryId).populate('manager');
      const states = await State.find({ country: countryId, is_deleted: { $ne: true } }).sort({ name: 1 });
      const stateData = [];
      for (const state of states) {
        await cleanupOrphanedStateManager(state._id);
        const refreshed = await State.findById(state._id);
        const manager = await getActiveManagerUser(refreshed?.manager);
        stateData.push({
          _id: state._id,
          name: state.name,
          available: !manager,
          manager_name: manager?.name || null
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          country_manager_name: country?.manager?.name || null,
          states: stateData
        }
      });
    }

    if (role === 'CityManager' || role === 'Retailer') {
      if (!countryId) {
        return res.status(400).json({ success: false, message: 'country_id is required.' });
      }
      const country = await Country.findById(countryId).populate('manager');
      let states = [];
      if (stateId) {
        const state = await State.findById(stateId).populate('manager');
        states = state ? [state] : [];
      } else {
        states = await State.find({ country: countryId, is_deleted: { $ne: true } }).sort({ name: 1 });
      }

      const statesPayload = [];
      for (const state of states) {
        await cleanupOrphanedStateManager(state._id);
        const refreshedState = await State.findById(state._id).populate('manager');
        const cities = await City.find({ state: refreshedState._id, is_deleted: { $ne: true } }).sort({ name: 1 });
        const cityData = [];
        for (const city of cities) {
          await cleanupOrphanedCityManager(city._id);
          const refreshedCity = await City.findById(city._id);
          const manager = await getActiveManagerUser(refreshedCity?.manager);
          cityData.push({
            _id: city._id,
            name: city.name,
            available: role === 'Retailer' ? true : !manager,
            manager_name: manager?.name || null
          });
        }
        statesPayload.push({
          _id: refreshedState._id,
          name: refreshedState.name,
          state_manager_name: refreshedState.manager?.name || null,
          cities: cityData
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          country_manager_name: country?.manager?.name || null,
          states: statesPayload
        }
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid role for geo options.' });
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

    if (normalizedRole === 'CountryManager') {
      if (!countryId) return res.status(400).json({ success: false, message: 'Country is required.' });
      await cleanupOrphanedCountryManager(countryId);
      const country = await Country.findById(countryId);
      const manager = await getActiveManagerUser(country?.manager);
      if (manager) {
        return res.status(400).json({ success: false, message: `${country.name} already has manager ${manager.name}.` });
      }
    }

    if (normalizedRole === 'StateManager') {
      if (!countryId || !stateId) {
        return res.status(400).json({ success: false, message: 'Country and state are required.' });
      }
      await cleanupOrphanedStateManager(stateId);
      const state = await State.findById(stateId);
      const manager = await getActiveManagerUser(state?.manager);
      if (manager) {
        return res.status(400).json({ success: false, message: `${state.name} already has manager ${manager.name}.` });
      }
    }

    if (normalizedRole === 'CityManager') {
      if (!countryId || !stateId || !cityId) {
        return res.status(400).json({ success: false, message: 'Country, state, and city are required.' });
      }
      await cleanupOrphanedCityManager(cityId);
      const city = await City.findById(cityId);
      const manager = await getActiveManagerUser(city?.manager);
      if (manager) {
        return res.status(400).json({ success: false, message: `${city.name} already has manager ${manager.name}.` });
      }
    }

    if (normalizedRole === 'Retailer') {
      if (!stateId || !cityId || !businessName?.trim()) {
        return res.status(400).json({ success: false, message: 'Business name, state, and city are required for retailer.' });
      }
    }

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
        requested_country: countryId || undefined,
        requested_state: stateId || undefined,
        requested_city: cityId || undefined,
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
        state: stateId,
        city: cityId,
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

    if (roleName === 'CountryManager' && meta.requested_country) {
      await assignCountryManager(meta.requested_country, user._id);
    } else if (roleName === 'StateManager' && meta.requested_state) {
      await assignStateManager(meta.requested_state, user._id);
    } else if (roleName === 'CityManager' && meta.requested_city) {
      await assignCityManager(meta.requested_city, user._id);
    } else if (roleName === 'Retailer') {
      await Retailer.findOneAndUpdate(
        { user: user._id },
        { $set: { is_verified: true, is_active: true } }
      );
    }

    await user.save();
    const refreshed = await User.findById(user._id)
      .populate('role')
      .populate('promoted_by', 'name user_code');

    res.status(200).json({
      success: true,
      message: 'User approved successfully.',
      data: refreshed,
      default_password: DEFAULT_USER_PASSWORD
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
