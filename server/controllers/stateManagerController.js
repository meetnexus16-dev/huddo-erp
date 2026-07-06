import User from '../models/User.js';
import {
  buildCityManagersForGeo,
  getManagedGeoIds,
  getTerritoryLabel
} from '../utils/managerTerritoryService.js';

// GET /api/v1/state-managers/me/city-managers (legacy alias)
export const getMyCityManagers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('role state');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const roleName = user.role?.name || user.roleName;
    if (roleName !== 'StateManager') {
      return res.status(403).json({ success: false, message: 'Only State Managers can access city manager team data.' });
    }

    if (!user.state) {
      return res.status(400).json({ success: false, message: 'No state assigned to this account.' });
    }

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
    next(error);
  }
};
