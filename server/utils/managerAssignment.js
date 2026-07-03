import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';

import { normalizeRoleName } from './roleUtils.js';

export const getRoleByName = async (roleName) => {
  const normalized = normalizeRoleName(roleName);
  return Role.findOne({ name: normalized });
};

const toIdString = (value) => {
  if (!value) return null;
  return value._id ? value._id.toString() : value.toString();
};

export async function getActiveManagerUser(managerRef) {
  if (!managerRef) return null;

  const managerId = toIdString(managerRef);
  if (!managerId || !mongoose.isValidObjectId(managerId)) return null;

  const user = await User.findById(managerId);
  if (!user || user.is_deleted) return null;

  return user;
}

export async function cleanupOrphanedCountryManager(countryId) {
  const country = await Country.findById(countryId);
  if (!country?.manager) return country;

  const activeManager = await getActiveManagerUser(country.manager);
  if (!activeManager) {
    await Country.findByIdAndUpdate(countryId, { $unset: { manager: 1 } });
    return Country.findById(countryId);
  }

  return country;
}

export async function cleanupOrphanedStateManager(stateId) {
  const state = await State.findById(stateId);
  if (!state?.manager) return state;

  const activeManager = await getActiveManagerUser(state.manager);
  if (!activeManager) {
    await State.findByIdAndUpdate(stateId, { $unset: { manager: 1 } });
    return State.findById(stateId);
  }

  return state;
}

export async function cleanupOrphanedCityManager(cityId) {
  const city = await City.findById(cityId);
  if (!city?.manager) return city;

  const activeManager = await getActiveManagerUser(city.manager);
  if (!activeManager) {
    await City.findByIdAndUpdate(cityId, { $unset: { manager: 1 } });
    return City.findById(cityId);
  }

  return city;
}

export async function cleanupAllOrphanedGeoManagers() {
  const [countries, states, cities] = await Promise.all([
    Country.find({ manager: { $ne: null }, is_deleted: { $ne: true } }).select('_id'),
    State.find({ manager: { $ne: null }, is_deleted: { $ne: true } }).select('_id'),
    City.find({ manager: { $ne: null }, is_deleted: { $ne: true } }).select('_id')
  ]);

  await Promise.all([
    ...countries.map((country) => cleanupOrphanedCountryManager(country._id)),
    ...states.map((state) => cleanupOrphanedStateManager(state._id)),
    ...cities.map((city) => cleanupOrphanedCityManager(city._id))
  ]);
}

export const getAssignedManagerMap = async () => {
  await cleanupAllOrphanedGeoManagers();

  const [countries, states, cities, ceoRole] = await Promise.all([
    Country.find({ manager: { $ne: null }, is_deleted: { $ne: true } }).select('manager name'),
    State.find({ manager: { $ne: null }, is_deleted: { $ne: true } }).select('manager name'),
    City.find({ manager: { $ne: null }, is_deleted: { $ne: true } }).select('manager name'),
    Role.findOne({ name: 'CEO' })
  ]);

  const assignments = new Map();

  const addAssignment = (userId, type, entityName, entityId) => {
    if (!userId) return;
    assignments.set(userId, { type, entityName, entityId });
  };

  countries.forEach((country) => {
    const managerId = toIdString(country.manager);
    if (managerId) {
      addAssignment(managerId, 'Country', country.name, country._id.toString());
    }
  });
  states.forEach((state) => {
    addAssignment(toIdString(state.manager), 'State', state.name, state._id.toString());
  });
  cities.forEach((city) => {
    addAssignment(toIdString(city.manager), 'City', city.name, city._id.toString());
  });

  if (ceoRole) {
    const ceos = await User.find({ role: ceoRole._id, is_deleted: { $ne: true } }).select('_id name');
    ceos.forEach((ceo) => {
      addAssignment(ceo._id.toString(), 'CEO', 'Global Operations', 'ceo');
    });
  }

  return assignments;
};

export const getUserTerritoryAssignment = async (userId) => {
  if (!userId || !mongoose.isValidObjectId(userId)) return null;
  const map = await getAssignedManagerMap();
  return map.get(userId.toString()) || null;
};

export const validateUserAvailableForAssignment = async (userId, { allowSameEntity, entityType, entityId } = {}) => {
  if (!userId) return;

  const assignment = await getUserTerritoryAssignment(userId);
  if (!assignment) return;

  if (
    allowSameEntity &&
    assignment.type === entityType &&
    assignment.entityId === entityId?.toString()
  ) {
    return;
  }

  throw new Error(
    assignment.type === 'CEO'
      ? `This user is already assigned as CEO for ${assignment.entityName}. Create a new user instead.`
      : `This user is already assigned as ${assignment.type} Manager for ${assignment.entityName}. Create a new user instead.`
  );
};

export const validateCountryAvailable = async (countryId, excludeUserId = null) => {
  if (!countryId || !mongoose.isValidObjectId(countryId)) {
    throw new Error('A valid country is required.');
  }

  const country = await cleanupOrphanedCountryManager(countryId);
  if (!country) {
    throw new Error('Country not found.');
  }

  const activeManager = await getActiveManagerUser(country.manager);
  if (!activeManager) return country;

  const currentManagerId = activeManager._id.toString();
  if (excludeUserId && currentManagerId === excludeUserId.toString()) {
    return country;
  }

  const error = new Error(
    `${country.name} already has a Country Manager assigned (${activeManager.name}).`
  );
  error.statusCode = 400;
  error.existingManagerId = currentManagerId;
  throw error;
};

export const validateStateAvailable = async (stateId, excludeUserId = null) => {
  if (!stateId || !mongoose.isValidObjectId(stateId)) {
    throw new Error('A valid state is required.');
  }

  const state = await cleanupOrphanedStateManager(stateId);
  if (!state) {
    throw new Error('State not found.');
  }

  const activeManager = await getActiveManagerUser(state.manager);
  if (!activeManager) return state;

  const currentManagerId = activeManager._id.toString();
  if (excludeUserId && currentManagerId === excludeUserId.toString()) {
    return state;
  }

  const error = new Error(`${state.name} already has a State Manager assigned (${activeManager.name}).`);
  error.statusCode = 400;
  error.existingManagerId = currentManagerId;
  throw error;
};

export const validateCityAvailable = async (cityId, excludeUserId = null) => {
  if (!cityId || !mongoose.isValidObjectId(cityId)) {
    throw new Error('A valid city is required.');
  }

  const city = await cleanupOrphanedCityManager(cityId);
  if (!city) {
    throw new Error('City not found.');
  }

  const activeManager = await getActiveManagerUser(city.manager);
  if (!activeManager) return city;

  const currentManagerId = activeManager._id.toString();
  if (excludeUserId && currentManagerId === excludeUserId.toString()) {
    return city;
  }

  const error = new Error(`${city.name} already has a City Manager assigned (${activeManager.name}).`);
  error.statusCode = 400;
  error.existingManagerId = currentManagerId;
  throw error;
};

const clearPreviousGeoManagerRole = async (userId, roleName) => {
  if (!userId) return;

  const role = await getRoleByName(roleName);
  if (!role) return;

  const user = await User.findById(userId);
  if (!user || user.role?.toString() !== role._id.toString()) return;

  const teamMemberRole = await getRoleByName('TeamMember');
  if (!teamMemberRole) return;

  await User.findByIdAndUpdate(userId, {
    $set: {
      role: teamMemberRole._id,
      roleName: 'TeamMember'
    },
    $unset: { country: 1, state: 1, city: 1 }
  });
};

export const assignCountryManager = async (countryId, userId) => {
  if (!userId) {
    throw new Error('A manager must be selected or created.');
  }

  const country = await cleanupOrphanedCountryManager(countryId);
  if (!country) {
    throw new Error('Country not found.');
  }

  const previousManagerId = toIdString((await getActiveManagerUser(country.manager))?._id);
  const cmRole = await getRoleByName('CountryManager');
  if (!cmRole) {
    throw new Error('CountryManager role not found.');
  }

  await validateUserAvailableForAssignment(userId, {
    allowSameEntity: true,
    entityType: 'Country',
    entityId: countryId
  });

  if (previousManagerId && previousManagerId !== userId.toString()) {
    await Country.updateMany({ manager: previousManagerId }, { $unset: { manager: 1 } });
    await User.findByIdAndUpdate(previousManagerId, { $unset: { country: 1 } });
  }

  await Country.findByIdAndUpdate(countryId, { $set: { manager: userId } });
  await User.findByIdAndUpdate(userId, {
    $set: {
      role: cmRole._id,
      roleName: 'CountryManager',
      designationName: 'Country Manager',
      country: countryId,
      status: 'Active',
      is_active: true
    },
    $unset: { state: 1, city: 1 }
  });

  return Country.findById(countryId).populate('manager');
};

export const assignStateManager = async (stateId, userId) => {
  if (!userId) {
    throw new Error('A manager must be selected or created.');
  }

  const state = await State.findById(stateId).populate('country');
  if (!state) {
    throw new Error('State not found.');
  }

  const previousManagerId = toIdString(state.manager);
  const smRole = await getRoleByName('StateManager');
  if (!smRole) {
    throw new Error('StateManager role not found.');
  }

  await validateUserAvailableForAssignment(userId, {
    allowSameEntity: true,
    entityType: 'State',
    entityId: stateId
  });

  if (previousManagerId && previousManagerId !== userId.toString()) {
    await State.updateMany({ manager: previousManagerId }, { $unset: { manager: 1 } });
    await clearPreviousGeoManagerRole(previousManagerId, 'StateManager');
  }

  await State.findByIdAndUpdate(stateId, { $set: { manager: userId } });
  await User.findByIdAndUpdate(userId, {
    $set: {
      role: smRole._id,
      roleName: 'StateManager',
      designationName: 'State Manager',
      state: stateId,
      country: state.country?._id || state.country,
      status: 'Active',
      is_active: true
    },
    $unset: { city: 1 }
  });

  return State.findById(stateId).populate(['manager', 'country']);
};

export const assignCityManager = async (cityId, userId) => {
  if (!userId) {
    throw new Error('A manager must be selected or created.');
  }

  const city = await City.findById(cityId).populate({ path: 'state', populate: { path: 'country' } });
  if (!city) {
    throw new Error('City not found.');
  }

  const previousManagerId = toIdString(city.manager);
  const cityRole = await getRoleByName('CityManager');
  if (!cityRole) {
    throw new Error('CityManager role not found.');
  }

  await validateUserAvailableForAssignment(userId, {
    allowSameEntity: true,
    entityType: 'City',
    entityId: cityId
  });

  if (previousManagerId && previousManagerId !== userId.toString()) {
    await City.updateMany({ manager: previousManagerId }, { $unset: { manager: 1 } });
    await clearPreviousGeoManagerRole(previousManagerId, 'CityManager');
  }

  await City.findByIdAndUpdate(cityId, { $set: { manager: userId } });
  await User.findByIdAndUpdate(userId, {
    $set: {
      role: cityRole._id,
      roleName: 'CityManager',
      designationName: 'City Manager',
      city: cityId,
      state: city.state?._id || city.state,
      country: city.state?.country?._id || city.state?.country,
      status: 'Active',
      is_active: true
    }
  });

  return City.findById(cityId).populate(['manager', 'state']);
};

export const unassignCountryManager = async (countryId) => {
  const country = await Country.findById(countryId);
  if (!country) {
    throw new Error('Country not found.');
  }

  const previousManagerId = toIdString(country.manager);
  await Country.findByIdAndUpdate(countryId, { $unset: { manager: 1 } });

  if (previousManagerId) {
    await User.findByIdAndUpdate(previousManagerId, { $unset: { country: 1 } });
  }

  return Country.findById(countryId).populate('manager');
};

export const unassignStateManager = async (stateId) => {
  const state = await State.findById(stateId);
  if (!state) {
    throw new Error('State not found.');
  }

  const previousManagerId = toIdString(state.manager);
  await State.findByIdAndUpdate(stateId, { $unset: { manager: 1 } });

  if (previousManagerId) {
    await clearPreviousGeoManagerRole(previousManagerId, 'StateManager');
    await User.findByIdAndUpdate(previousManagerId, { $unset: { state: 1 } });
  }

  return State.findById(stateId).populate(['manager', 'country']);
};

export const unassignCityManager = async (cityId) => {
  const city = await City.findById(cityId);
  if (!city) {
    throw new Error('City not found.');
  }

  const previousManagerId = toIdString(city.manager);
  await City.findByIdAndUpdate(cityId, { $unset: { manager: 1 } });

  if (previousManagerId) {
    await clearPreviousGeoManagerRole(previousManagerId, 'CityManager');
    await User.findByIdAndUpdate(previousManagerId, { $unset: { city: 1 } });
  }

  return City.findById(cityId).populate(['manager', 'state']);
};

export const unassignCEO = async () => {
  const ceoRole = await getRoleByName('CEO');
  const teamMemberRole = await getRoleByName('TeamMember');
  if (!ceoRole || !teamMemberRole) {
    throw new Error('CEO or TeamMember role not found.');
  }

  await User.updateMany(
    { role: ceoRole._id, is_deleted: { $ne: true } },
    { $set: { role: teamMemberRole._id, roleName: 'TeamMember' }, $unset: { designationName: 1 } }
  );

  return { unassigned: true };
};

export const assignCEO = async (userId) => {
  if (!userId) {
    throw new Error('A CEO must be selected or created.');
  }

  await validateUserAvailableForAssignment(userId, {
    allowSameEntity: true,
    entityType: 'CEO',
    entityId: 'ceo'
  });

  const ceoRole = await getRoleByName('CEO');
  if (!ceoRole) {
    throw new Error('CEO role not found.');
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        role: ceoRole._id,
        roleName: 'CEO',
        designationName: 'CEO',
        status: 'Active',
        is_active: true
      }
    },
    { new: true }
  ).populate('role');

  return updatedUser;
};

export const createManagerUser = async ({ name, email, mobile, roleName }) => {
  const normalizedRole = normalizeRoleName(roleName);
  const role = await getRoleByName(normalizedRole);
  if (!role) {
    throw new Error(`Role "${roleName}" not found.`);
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase().trim(), is_deleted: { $ne: true } });
  if (existingEmail) {
    throw new Error('A user with this email already exists.');
  }

  const existingMobile = await User.findOne({ mobile: mobile.trim(), is_deleted: { $ne: true } });
  if (existingMobile) {
    throw new Error('A user with this mobile number already exists.');
  }

  const designationMap = {
    CEO: 'CEO',
    CountryManager: 'Country Manager',
    StateManager: 'State Manager',
    CityManager: 'City Manager'
  };

  const user = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    mobile: mobile.trim(),
    password: 'password123',
    role: role._id,
    roleName: normalizedRole,
    designationName: designationMap[normalizedRole] || normalizedRole,
    status: 'Active',
    is_verified: true,
    is_active: true
  });

  await user.save();
  return user;
};
