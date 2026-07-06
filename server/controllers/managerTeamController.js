import User from '../models/User.js';
import {
  buildCityManagersForGeo,
  buildRetailersForGeo,
  buildStateManagersForGeo,
  getManagedGeoIds,
  getTerritoryLabel,
  getTerritoryTeamForUser
} from '../utils/managerTerritoryService.js';

const MANAGER_ROLES = ['CountryManager', 'StateManager', 'CityManager'];

async function loadManagerUser(req) {
  return User.findById(req.user._id).populate('role country state city');
}

function assertManagerRole(roleName) {
  if (!MANAGER_ROLES.includes(roleName)) {
    const error = new Error('This endpoint is only available to territory managers.');
    error.statusCode = 403;
    throw error;
  }
}

function assertTerritoryAssigned(user, roleName) {
  if (roleName === 'CountryManager' && !user.country) {
    const error = new Error('No country assigned to this account.');
    error.statusCode = 400;
    throw error;
  }
  if (roleName === 'StateManager' && !user.state) {
    const error = new Error('No state assigned to this account.');
    error.statusCode = 400;
    throw error;
  }
  if (roleName === 'CityManager' && !user.city) {
    const error = new Error('No city assigned to this account.');
    error.statusCode = 400;
    throw error;
  }
}

// GET /api/v1/manager/me/team
export const getMyTerritoryTeam = async (req, res, next) => {
  try {
    const user = await loadManagerUser(req);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const roleName = user.role?.name || user.roleName;
    assertManagerRole(roleName);
    assertTerritoryAssigned(user, roleName);

    const data = await getTerritoryTeamForUser(user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/v1/manager/me/state-managers
export const getMyStateManagers = async (req, res, next) => {
  try {
    const user = await loadManagerUser(req);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const roleName = user.role?.name || user.roleName;
    if (roleName !== 'CountryManager') {
      return res.status(403).json({ success: false, message: 'Only Country Managers can view state managers in their territory.' });
    }
    assertTerritoryAssigned(user, roleName);

    const geo = await getManagedGeoIds(user);
    const stateManagers = await buildStateManagersForGeo(geo);

    res.status(200).json({
      success: true,
      data: {
        territoryLabel: await getTerritoryLabel(user),
        stateManagers
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/v1/manager/me/city-managers
export const getMyCityManagers = async (req, res, next) => {
  try {
    const user = await loadManagerUser(req);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const roleName = user.role?.name || user.roleName;
    if (!['CountryManager', 'StateManager'].includes(roleName)) {
      return res.status(403).json({ success: false, message: 'Only Country or State Managers can view city managers in their territory.' });
    }
    assertTerritoryAssigned(user, roleName);

    const geo = await getManagedGeoIds(user);
    const cityManagers = await buildCityManagersForGeo(geo);

    res.status(200).json({
      success: true,
      data: {
        territoryLabel: await getTerritoryLabel(user),
        cityManagers
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/v1/manager/me/retailers
export const getMyRetailers = async (req, res, next) => {
  try {
    const user = await loadManagerUser(req);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const roleName = user.role?.name || user.roleName;
    assertManagerRole(roleName);
    assertTerritoryAssigned(user, roleName);

    const geo = await getManagedGeoIds(user);
    const retailers = await buildRetailersForGeo(geo);

    res.status(200).json({
      success: true,
      data: {
        territoryLabel: await getTerritoryLabel(user),
        retailers
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};
