import User from '../models/User.js';
import State from '../models/State.js';
import City from '../models/City.js';
import Country from '../models/Country.js';
import Order from '../models/Order.js';
import Retailer from '../models/Retailer.js';
import Target from '../models/Target.js';

export const APPROVED_ORDER_STATUSES = ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'];

export async function getManagedGeoIds(user) {
  const roleName = user.roleName || user.role?.name;
  const result = { cityIds: [], stateIds: [], countryIds: [] };

  if (roleName === 'CityManager' && user.city) {
    result.cityIds = [user.city.toString()];
    return result;
  }

  if (roleName === 'StateManager' && user.state) {
    result.stateIds = [user.state.toString()];
    const cities = await City.find({ state: user.state, is_deleted: { $ne: true } }).select('_id');
    result.cityIds = cities.map((c) => c._id.toString());
    return result;
  }

  if (roleName === 'CountryManager' && user.country) {
    result.countryIds = [user.country.toString()];
    const states = await State.find({ country: user.country, is_deleted: { $ne: true } }).select('_id');
    result.stateIds = states.map((s) => s._id.toString());
    if (result.stateIds.length) {
      const cities = await City.find({ state: { $in: result.stateIds }, is_deleted: { $ne: true } }).select('_id');
      result.cityIds = cities.map((c) => c._id.toString());
    }
  }

  return result;
}

export async function getTerritoryLabel(user) {
  const roleName = user.roleName || user.role?.name;
  if (roleName === 'CityManager' && user.city) {
    const city = await City.findById(user.city).populate({ path: 'state', select: 'name' });
    return city ? `${city.name}${city.state?.name ? `, ${city.state.name}` : ''}` : 'City';
  }
  if (roleName === 'StateManager' && user.state) {
    const state = await State.findById(user.state).select('name');
    return state?.name || 'State';
  }
  if (roleName === 'CountryManager' && user.country) {
    const country = await Country.findById(user.country).select('name');
    return country?.name || 'Country';
  }
  return 'Territory';
}

async function retailersInCities(cityIds) {
  if (!cityIds.length) return [];
  return Retailer.find({ city: { $in: cityIds }, is_deleted: { $ne: true } });
}

export async function buildCityManagersForState(stateId) {
  const cities = await City.find({ state: stateId, is_deleted: { $ne: true } }).populate(
    'manager',
    'name mobile email status joining_date updatedAt'
  );
  const retailers = await retailersInCities(cities.map((c) => c._id));

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const targetPeriod = new Date().toISOString().slice(0, 7);
  const managerIds = cities.filter((c) => c.manager?._id).map((c) => c.manager._id);
  const revenueTargets = managerIds.length
    ? await Target.find({
      assigned_to: { $in: managerIds },
      period_type: 'Monthly',
      title: targetPeriod,
      kpi_type: 'Revenue',
      is_deleted: { $ne: true }
    })
    : [];
  const targetByManager = revenueTargets.reduce((acc, row) => {
    acc[row.assigned_to.toString()] = Number(row.target_value || 0);
    return acc;
  }, {});

  const monthOrders = retailers.length
    ? await Order.find({
      retailer: { $in: retailers.map((r) => r._id) },
      status: { $in: APPROVED_ORDER_STATUSES },
      createdAt: { $gte: startOfMonth }
    })
    : [];

  return cities
    .filter((c) => c.manager)
    .map((city) => {
      const manager = city.manager;
      const managerId = manager._id.toString();
      const cityRetailers = retailers.filter((r) => r.city?.toString() === city._id.toString());
      const cityRetailerIds = new Set(cityRetailers.map((r) => r._id.toString()));
      const ordersThisMonth = monthOrders.filter((o) => cityRetailerIds.has(o.retailer?.toString())).length;
      const achieved = monthOrders
        .filter((o) => cityRetailerIds.has(o.retailer?.toString()))
        .reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0);

      return {
        id: managerId,
        cityId: city._id.toString(),
        city: city.name,
        name: manager.name || '—',
        mobile: manager.mobile || '',
        email: manager.email || '',
        joiningDate: manager.joining_date || null,
        retailersCount: cityRetailers.length,
        ordersThisMonth,
        achieved,
        monthlyTarget: targetByManager[managerId] || 0,
        status: manager.status || 'Active',
        lastActive: manager.updatedAt
          ? manager.updatedAt.toISOString().split('T')[0]
          : null
      };
    });
}

export async function buildCityManagersForGeo(geo) {
  if (!geo.stateIds.length) return [];
  const stateObjectIds = geo.stateIds;
  const cities = await City.find({ state: { $in: stateObjectIds }, is_deleted: { $ne: true } }).populate(
    'manager',
    'name mobile email status joining_date updatedAt'
  ).populate({ path: 'state', select: 'name' });

  const cityIds = cities.map((c) => c._id);
  const retailers = await retailersInCities(cityIds);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const targetPeriod = new Date().toISOString().slice(0, 7);
  const managerIds = cities.filter((c) => c.manager?._id).map((c) => c.manager._id);
  const revenueTargets = managerIds.length
    ? await Target.find({
      assigned_to: { $in: managerIds },
      period_type: 'Monthly',
      title: targetPeriod,
      kpi_type: 'Revenue',
      is_deleted: { $ne: true }
    })
    : [];
  const targetByManager = revenueTargets.reduce((acc, row) => {
    acc[row.assigned_to.toString()] = Number(row.target_value || 0);
    return acc;
  }, {});

  const monthOrders = retailers.length
    ? await Order.find({
      retailer: { $in: retailers.map((r) => r._id) },
      status: { $in: APPROVED_ORDER_STATUSES },
      createdAt: { $gte: startOfMonth }
    })
    : [];

  return cities
    .filter((c) => c.manager)
    .map((city) => {
      const manager = city.manager;
      const managerId = manager._id.toString();
      const cityRetailers = retailers.filter((r) => r.city?.toString() === city._id.toString());
      const cityRetailerIds = new Set(cityRetailers.map((r) => r._id.toString()));
      const ordersThisMonth = monthOrders.filter((o) => cityRetailerIds.has(o.retailer?.toString())).length;
      const achieved = monthOrders
        .filter((o) => cityRetailerIds.has(o.retailer?.toString()))
        .reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0);

      return {
        id: managerId,
        cityId: city._id.toString(),
        city: city.name,
        state: city.state?.name || '—',
        name: manager.name || '—',
        mobile: manager.mobile || '',
        email: manager.email || '',
        joiningDate: manager.joining_date || null,
        retailersCount: cityRetailers.length,
        ordersThisMonth,
        achieved,
        monthlyTarget: targetByManager[managerId] || 0,
        status: manager.status || 'Active',
        lastActive: manager.updatedAt
          ? manager.updatedAt.toISOString().split('T')[0]
          : null
      };
    });
}

export async function buildStateManagersForGeo(geo) {
  if (!geo.stateIds.length) return [];

  const states = await State.find({ _id: { $in: geo.stateIds }, is_deleted: { $ne: true } }).populate('manager');
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const managersList = [];
  for (const state of states) {
    if (!state.manager) continue;
    const mgr = state.manager;
    const cities = await City.find({ state: state._id, is_deleted: { $ne: true } }).select('_id');
    const retailers = await retailersInCities(cities.map((c) => c._id));
    const retailerIds = retailers.map((r) => r._id);

    const orders = retailerIds.length
      ? await Order.find({
        retailer: { $in: retailerIds },
        status: { $in: APPROVED_ORDER_STATUSES },
        createdAt: { $gte: startOfMonth }
      })
      : [];
    const monthlyRevenue = orders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);

    managersList.push({
      state_manager_id: mgr._id.toString(),
      id: mgr._id.toString(),
      name: mgr.name,
      mobile: mgr.mobile,
      email: mgr.email,
      assigned_state: state.name,
      status: mgr.status || 'Active',
      performance: {
        revenue: monthlyRevenue,
        orders: orders.length,
        retailers: retailers.length,
        target_pct: 0
      }
    });
  }

  return managersList;
}

function mapRetailerStatus(retailer) {
  if (!retailer.is_verified) return 'Pending Verification';
  if (retailer.is_active) return 'Active';
  return 'Inactive';
}

export async function buildRetailersForGeo(geo) {
  if (!geo.cityIds.length) return [];

  const retailers = await Retailer.find({ city: { $in: geo.cityIds }, is_deleted: { $ne: true } })
    .populate('city', 'name')
    .populate('state', 'name')
    .populate('assigned_city_manager', 'name')
    .populate('assigned_promoter', 'name')
    .sort({ createdAt: -1 });

  const retailerIds = retailers.map((r) => r._id);
  const orders = retailerIds.length
    ? await Order.find({ retailer: { $in: retailerIds }, is_deleted: { $ne: true } }).sort({ createdAt: -1 })
    : [];

  return retailers.map((retailer) => {
    const retailerOrders = orders.filter((o) => o.retailer?.toString() === retailer._id.toString());
    const approvedOrders = retailerOrders.filter((o) => APPROVED_ORDER_STATUSES.includes(o.status));
    const totalRevenue = approvedOrders.reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0);
    const lastOrder = retailerOrders[0];

    return {
      id: retailer._id.toString(),
      businessName: retailer.business_name,
      ownerName: retailer.owner_name,
      city: retailer.city?.name || '—',
      state: retailer.state?.name || '—',
      cityManagerId: retailer.assigned_city_manager?._id?.toString() || '',
      cityManagerName: retailer.assigned_city_manager?.name || 'Not Assigned',
      assignedPromoter: retailer.assigned_promoter?.name || '',
      mobile: retailer.mobile,
      email: retailer.email,
      gstin: retailer.gst_number || '',
      panNo: retailer.pan_number || '',
      aadhaarNo: retailer.aadhaar_number || '',
      address: retailer.shop_address || '',
      category: retailer.category || 'Standard',
      status: mapRetailerStatus(retailer),
      totalOrders: approvedOrders.length,
      totalRevenue,
      pendingPayment: 0,
      joinedDate: retailer.createdAt ? retailer.createdAt.toISOString().split('T')[0] : null,
      lastOrderDate: lastOrder?.createdAt ? lastOrder.createdAt.toISOString().split('T')[0] : null
    };
  });
}

export async function getTerritoryTeamForUser(user) {
  const roleName = user.roleName || user.role?.name;
  const geo = await getManagedGeoIds(user);
  const territoryLabel = await getTerritoryLabel(user);

  const team = {
    role: roleName,
    territoryLabel,
    stateManagers: [],
    cityManagers: [],
    retailers: []
  };

  if (roleName === 'CountryManager') {
    team.stateManagers = await buildStateManagersForGeo(geo);
    team.cityManagers = await buildCityManagersForGeo(geo);
    team.retailers = await buildRetailersForGeo(geo);
  } else if (roleName === 'StateManager') {
    team.cityManagers = await buildCityManagersForGeo(geo);
    team.retailers = await buildRetailersForGeo(geo);
  } else if (roleName === 'CityManager') {
    team.retailers = await buildRetailersForGeo(geo);
  }

  return team;
}

export async function getUsersUnderTerritory(user) {
  const roleName = user.roleName || user.role?.name;
  const geo = await getManagedGeoIds(user);
  const userIds = new Set();

  if (roleName === 'CountryManager' && geo.stateIds.length) {
    const stateManagers = await User.find({
      state: { $in: geo.stateIds },
      roleName: 'StateManager',
      is_deleted: { $ne: true }
    }).select('_id');
    stateManagers.forEach((u) => userIds.add(u._id.toString()));
  }

  if (geo.cityIds.length) {
    const cityManagers = await User.find({
      city: { $in: geo.cityIds },
      roleName: 'CityManager',
      is_deleted: { $ne: true }
    }).select('_id');
    cityManagers.forEach((u) => userIds.add(u._id.toString()));
  }

  const retailers = geo.cityIds.length
    ? await Retailer.find({ city: { $in: geo.cityIds }, is_deleted: { $ne: true } }).select('_id user')
    : [];
  retailers.forEach((r) => {
    if (r.user) userIds.add(r.user.toString());
  });

  if (userIds.size === 0) return [];

  return User.find({
    _id: { $in: Array.from(userIds) },
    is_deleted: { $ne: true }
  })
    .populate('role')
    .populate('promoted_by', 'name user_code')
    .populate('country', 'name')
    .populate('state', 'name')
    .populate('city', 'name')
    .sort({ createdAt: -1 });
}
