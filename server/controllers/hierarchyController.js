import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import Retailer from '../models/Retailer.js';
import User from '../models/User.js';
import {
  assignCEO,
  assignCityManager,
  assignCountryManager,
  assignStateManager,
  createManagerUser,
  cleanupOrphanedCountryManager,
  getActiveManagerUser,
  getAssignedManagerMap,
  getRoleByName,
  unassignCEO,
  unassignCityManager,
  unassignCountryManager,
  unassignStateManager,
  validateCountryAvailable
} from '../utils/managerAssignment.js';
import { buildGeoOptions } from '../utils/geoOptionsService.js';
import { isAdminUser } from '../utils/adminRole.js';
import { DEFAULT_USER_PASSWORD } from '../constants/defaultCredentials.js';

export const getGeoCascade = async (req, res, next) => {
  try {
    const { role, country_id: countryId, state_id: stateId } = req.query;
    const data = await buildGeoOptions({
      role: role || 'list_countries',
      countryId,
      stateId
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.message === 'Invalid role for geo options.') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getCeoCandidates = async (req, res, next) => {
  try {
    const ceoRole = await getRoleByName('CEO');
    if (!ceoRole) {
      return res.status(200).json({ success: true, data: [] });
    }

    const users = await User.find({
      role: ceoRole._id,
      is_deleted: { $ne: true }
    })
      .select('name email mobile role roleName designationName updatedAt')
      .populate('role')
      .sort({ updatedAt: -1, name: 1 });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getAssignedManagers = async (req, res, next) => {
  try {
    const assignments = await getAssignedManagerMap();
    const data = Array.from(assignments.entries()).map(([userId, info]) => ({
      user_id: userId,
      ...info
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAvailableCountries = async (req, res, next) => {
  try {
    const { exclude_user_id: excludeUserId } = req.query;
    const countries = await Country.find({ is_deleted: { $ne: true } })
      .sort({ name: 1 });

    const data = [];
    for (const country of countries) {
      await cleanupOrphanedCountryManager(country._id);
      const refreshed = await Country.findById(country._id);
      const activeManager = await getActiveManagerUser(refreshed?.manager);

      const isExcluded =
        excludeUserId && activeManager?._id?.toString() === excludeUserId.toString();
      const isAssigned = !!activeManager && !isExcluded;

      data.push({
        _id: country._id,
        name: country.name,
        code: country.code,
        available: !isAssigned,
        has_manager: isAssigned,
        manager_id: activeManager?._id?.toString() || null,
        manager_name: activeManager?.name || null
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createHierarchyManagerUser = async (req, res, next) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create managers for hierarchy assignment.'
      });
    }

    const { name, email, mobile, roleName } = req.body;

    if (!name?.trim() || !email?.trim() || !mobile?.trim() || !roleName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, mobile, and role are required.'
      });
    }

    const user = await createManagerUser({
      name,
      email,
      mobile,
      roleName,
      autoApprove: true
    });
    await user.populate('role');

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        roleName: user.roleName,
        role: user.role,
        designationName: user.designationName,
        approval_status: user.approval_status
      },
      default_password: DEFAULT_USER_PASSWORD,
      message: `Manager user created successfully. Default login password: ${DEFAULT_USER_PASSWORD}.`
    });
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('not found')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const assignHierarchyManager = async (req, res, next) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can reassign managers.'
      });
    }

    const { type, entity_id: entityId, manager_id: managerId } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Assignment type is required.'
      });
    }

    let data;
    const normalizedType = String(type).toLowerCase();
    const isUnassign = managerId === null || managerId === undefined || managerId === '';

    if (isUnassign) {
      if (normalizedType === 'ceo') {
        data = await unassignCEO();
      } else {
        if (!entityId) {
          return res.status(400).json({
            success: false,
            message: 'Entity ID is required for geographic manager unassignment.'
          });
        }

        if (normalizedType === 'country') {
          data = await unassignCountryManager(entityId);
        } else if (normalizedType === 'state') {
          data = await unassignStateManager(entityId);
        } else if (normalizedType === 'city') {
          data = await unassignCityManager(entityId);
        } else {
          return res.status(400).json({
            success: false,
            message: 'Invalid assignment type.'
          });
        }
      }

      return res.status(200).json({
        success: true,
        data,
        message: 'Manager unassigned successfully.'
      });
    }

    const managerUser = await User.findById(managerId);
    if (!managerUser) {
      return res.status(400).json({ success: false, message: 'Manager user not found.' });
    }
    if (managerUser.approval_status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'This user is pending approval. Approve them in Approvals before assigning as manager.'
      });
    }

    if (normalizedType === 'ceo') {
      data = await assignCEO(managerId);
    } else {
      if (!entityId) {
        return res.status(400).json({
          success: false,
          message: 'Entity ID is required for geographic manager assignment.'
        });
      }

      if (normalizedType === 'country') {
        data = await assignCountryManager(entityId, managerId);
      } else if (normalizedType === 'state') {
        data = await assignStateManager(entityId, managerId);
      } else if (normalizedType === 'city') {
        data = await assignCityManager(entityId, managerId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment type.'
        });
      }
    }

    res.status(200).json({
      success: true,
      data,
      message: 'Manager assigned successfully.'
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const toCountMap = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (row._id) {
      map.set(row._id.toString(), row.count);
    }
  });
  return map;
};

export const getCountriesWithHierarchyStats = async (req, res, next) => {
  try {
    const countries = await Country.find({ is_deleted: { $ne: true } })
      .populate('manager')
      .sort({ name: 1 });

    const countryIds = countries.map((country) => country._id);

    const [stateCounts, retailerCounts] = await Promise.all([
      State.aggregate([
        { $match: { country: { $in: countryIds }, is_deleted: { $ne: true } } },
        { $group: { _id: '$country', count: { $sum: 1 } } }
      ]),
      Retailer.aggregate([
        { $match: { is_deleted: { $ne: true }, state: { $ne: null } } },
        {
          $lookup: {
            from: 'states',
            localField: 'state',
            foreignField: '_id',
            as: 'stateDoc'
          }
        },
        { $unwind: '$stateDoc' },
        { $match: { 'stateDoc.country': { $in: countryIds }, 'stateDoc.is_deleted': { $ne: true } } },
        { $group: { _id: '$stateDoc.country', count: { $sum: 1 } } }
      ])
    ]);

    const stateMap = toCountMap(stateCounts);
    const retailerMap = toCountMap(retailerCounts);

    const data = countries.map((country) => {
      const doc = country.toObject();
      const countryId = country._id.toString();
      doc.statesCount = stateMap.get(countryId) || 0;
      doc.retailersCount = retailerMap.get(countryId) || 0;
      doc.revenue = doc.revenue || 0;
      return doc;
    });

    res.status(200).json({
      success: true,
      message: 'Countries retrieved successfully.',
      data,
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        pages: 1
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStatesWithHierarchyStats = async (req, res, next) => {
  try {
    const states = await State.find({ is_deleted: { $ne: true } })
      .populate(['country', 'manager'])
      .sort({ name: 1 });

    const stateIds = states.map((state) => state._id);

    const [cityCounts, retailerCounts] = await Promise.all([
      City.aggregate([
        { $match: { state: { $in: stateIds }, is_deleted: { $ne: true } } },
        { $group: { _id: '$state', count: { $sum: 1 } } }
      ]),
      Retailer.aggregate([
        { $match: { state: { $in: stateIds }, is_deleted: { $ne: true } } },
        { $group: { _id: '$state', count: { $sum: 1 } } }
      ])
    ]);

    const cityMap = toCountMap(cityCounts);
    const retailerMap = toCountMap(retailerCounts);

    const data = states.map((state) => {
      const doc = state.toObject();
      const stateId = state._id.toString();
      doc.citiesCount = cityMap.get(stateId) || 0;
      doc.retailersCount = retailerMap.get(stateId) || 0;
      doc.revenue = doc.revenue || 0;
      return doc;
    });

    res.status(200).json({
      success: true,
      message: 'States retrieved successfully.',
      data,
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        pages: 1
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCitiesWithHierarchyStats = async (req, res, next) => {
  try {
    const cities = await City.find({ is_deleted: { $ne: true } })
      .populate(['state', 'manager'])
      .sort({ name: 1 });

    const cityIds = cities.map((city) => city._id);

    const retailerCounts = await Retailer.aggregate([
      { $match: { city: { $in: cityIds }, is_deleted: { $ne: true } } },
      { $group: { _id: '$city', count: { $sum: 1 } } }
    ]);

    const retailerMap = toCountMap(retailerCounts);

    const data = cities.map((city) => {
      const doc = city.toObject();
      doc.retailersCount = retailerMap.get(city._id.toString()) || 0;
      doc.revenue = doc.revenue || 0;
      return doc;
    });

    res.status(200).json({
      success: true,
      message: 'Cities retrieved successfully.',
      data,
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        pages: 1
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validateCountryForManager = async (req, res, next) => {
  try {
    const { country_id: countryId, exclude_user_id: excludeUserId } = req.query;
    await validateCountryAvailable(countryId, excludeUserId || null);
    res.status(200).json({ success: true, available: true });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      existing_manager_id: error.existingManagerId || null
    });
  }
};
