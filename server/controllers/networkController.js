import User from '../models/User.js';
import Retailer from '../models/Retailer.js';
import Order from '../models/Order.js';
import CommissionRecord from '../models/CommissionRecord.js';
import ProductCategory from '../models/ProductCategory.js';
import City from '../models/City.js';
import State from '../models/State.js';
import Country from '../models/Country.js';

async function getManagedGeoIds(user) {
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
    const cities = await City.find({ state: { $in: result.stateIds }, is_deleted: { $ne: true } }).select('_id');
    result.cityIds = cities.map((c) => c._id.toString());
  }

  return result;
}

async function getRetailerIdsUnderUser(user) {
  const geo = await getManagedGeoIds(user);
  const filter = { is_deleted: { $ne: true } };
  if (geo.cityIds.length) filter.city = { $in: geo.cityIds };
  else if (geo.stateIds.length) filter.state = { $in: geo.stateIds };
  else if (geo.countryIds.length) {
    const states = await State.find({ country: { $in: geo.countryIds } }).select('_id');
    const cities = await City.find({ state: { $in: states.map((s) => s._id) } }).select('_id');
    filter.city = { $in: cities.map((c) => c._id) };
  } else {
    return [];
  }

  const retailers = await Retailer.find(filter).select('_id user');
  return retailers;
}

async function getRetailerIdsForCommissionFilter(user, { cityId, stateId, countryId }) {
  if (!cityId && !stateId && !countryId) return null;

  const filter = { is_deleted: { $ne: true } };
  const geo = await getManagedGeoIds(user);

  if (geo.cityIds.length) {
    filter.city = { $in: geo.cityIds };
  } else if (geo.stateIds.length) {
    filter.state = { $in: geo.stateIds };
  } else if (geo.countryIds.length) {
    const states = await State.find({ country: { $in: geo.countryIds }, is_deleted: { $ne: true } }).select('_id');
    filter.state = { $in: states.map((s) => s._id) };
  }

  if (countryId) {
    const states = await State.find({ country: countryId, is_deleted: { $ne: true } }).select('_id');
    filter.state = { $in: states.map((s) => s._id) };
  }
  if (stateId) filter.state = stateId;
  if (cityId) filter.city = cityId;

  const retailers = await Retailer.find(filter).select('_id');
  return retailers.map((r) => r._id);
}

async function getUsersUnderHierarchy(user) {
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

  const retailers = await getRetailerIdsUnderUser(user);
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

export const getNetworkUsers = async (req, res, next) => {
  try {
    const { tab = 'all' } = req.query;
    const roleName = req.user.roleName || req.user.role?.name;
    const managerRoles = ['CountryManager', 'StateManager', 'CityManager'];

    if (managerRoles.includes(roleName)) {
      const users = await getUsersUnderHierarchy(req.user);

      const filtered = tab === 'pending'
        ? users.filter((u) => u.approval_status === 'Pending')
        : tab === 'approved'
          ? users.filter((u) => u.approval_status === 'Approved')
          : users;

      return res.status(200).json({
        success: true,
        data: filtered,
        counts: {
          total: users.length,
          pending: users.filter((u) => u.approval_status === 'Pending').length,
          approved: users.filter((u) => u.approval_status === 'Approved').length
        }
      });
    }

    res.status(200).json({ success: true, data: [], counts: { total: 0, pending: 0, approved: 0 } });
  } catch (error) {
    next(error);
  }
};

export const getMyReferrals = async (req, res, next) => {
  try {
    const { tab = 'all' } = req.query;
    const users = await User.find({
      promoted_by: req.user._id,
      is_deleted: { $ne: true }
    })
      .populate('role')
      .sort({ createdAt: -1 });

    const filtered = tab === 'pending'
      ? users.filter((u) => u.approval_status === 'Pending')
      : tab === 'approved'
        ? users.filter((u) => u.approval_status === 'Approved')
        : users;

    res.status(200).json({
      success: true,
      data: filtered,
      counts: {
        total: users.length,
        pending: users.filter((u) => u.approval_status === 'Pending').length,
        approved: users.filter((u) => u.approval_status === 'Approved').length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getNetworkOrders = async (req, res, next) => {
  try {
    const roleName = req.user.roleName || req.user.role?.name;
    let retailerIds = [];

    if (['CountryManager', 'StateManager', 'CityManager'].includes(roleName)) {
      const retailers = await getRetailerIdsUnderUser(req.user);
      retailerIds = retailers.map((r) => r._id);
    } else {
      const referrals = await User.find({ promoted_by: req.user._id }).select('_id');
      const directRetailers = await Retailer.find({ user: { $in: referrals.map((u) => u._id) } }).select('_id');

      const referredManagers = referrals.filter((u) =>
        ['CityManager', 'StateManager', 'CountryManager'].includes(u.roleName)
      );
      let downstreamRetailerIds = [];
      for (const mgr of referredManagers) {
        const under = await getRetailerIdsUnderUser(mgr);
        downstreamRetailerIds.push(...under.map((r) => r._id));
      }

      retailerIds = [...new Set([
        ...directRetailers.map((r) => r._id.toString()),
        ...downstreamRetailerIds.map((id) => id.toString())
      ])];
    }

    if (!retailerIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const orders = await Order.find({
      retailer: { $in: retailerIds },
      is_deleted: { $ne: true }
    })
      .populate('retailer', 'business_name owner_name')
      .sort({ createdAt: -1 });

    const orderIds = orders.map((o) => o._id);
    const commissions = await CommissionRecord.find({
      user: req.user._id,
      order: { $in: orderIds },
      is_deleted: { $ne: true }
    });

    const commissionByOrder = commissions.reduce((acc, row) => {
      const key = row.order.toString();
      acc[key] = acc[key] || { total: 0, rows: [] };
      acc[key].total += Number(row.amount || 0);
      acc[key].rows.push(row);
      return acc;
    }, {});

    const data = orders.map((order) => ({
      ...order.toObject(),
      my_commission: commissionByOrder[order._id.toString()]?.total || 0,
      commission_details: commissionByOrder[order._id.toString()]?.rows || []
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getCommissionFilterOptions = async (req, res, next) => {
  try {
    const categories = await ProductCategory.find({ is_deleted: { $ne: true } })
      .select('name code')
      .sort({ name: 1 });

    const geo = await getManagedGeoIds(req.user);
    let countries = [];
    let states = [];
    let cities = [];

    if (geo.countryIds.length) {
      countries = await Country.find({ _id: { $in: geo.countryIds }, is_deleted: { $ne: true } })
        .select('name')
        .sort({ name: 1 });
      states = await State.find({ country: { $in: geo.countryIds }, is_deleted: { $ne: true } })
        .select('name country')
        .populate('country', 'name')
        .sort({ name: 1 });
      cities = await City.find({ state: { $in: states.map((s) => s._id) }, is_deleted: { $ne: true } })
        .select('name state')
        .populate('state', 'name')
        .sort({ name: 1 });
    } else if (geo.stateIds.length) {
      states = await State.find({ _id: { $in: geo.stateIds }, is_deleted: { $ne: true } })
        .select('name country')
        .populate('country', 'name')
        .sort({ name: 1 });
      cities = await City.find({ state: { $in: geo.stateIds }, is_deleted: { $ne: true } })
        .select('name state')
        .populate('state', 'name')
        .sort({ name: 1 });
    } else if (geo.cityIds.length) {
      cities = await City.find({ _id: { $in: geo.cityIds }, is_deleted: { $ne: true } })
        .select('name state')
        .populate('state', 'name')
        .sort({ name: 1 });
    } else {
      countries = await Country.find({ is_deleted: { $ne: true } }).select('name').sort({ name: 1 }).limit(100);
      states = await State.find({ is_deleted: { $ne: true } }).select('name country').populate('country', 'name').sort({ name: 1 }).limit(200);
      cities = await City.find({ is_deleted: { $ne: true } }).select('name state').populate('state', 'name').sort({ name: 1 }).limit(300);
    }

    res.status(200).json({
      success: true,
      data: {
        categories,
        countries,
        states,
        cities,
        commission_types: [
          { value: 'ManagerIncentive', label: 'Manager Incentive' },
          { value: 'PromoterRoyalty', label: 'Direct Referrer (Royalty)' },
          { value: 'PromoterBonus', label: 'Downstream Referrer Bonus' },
          { value: 'Bonus', label: 'Other Bonus' }
        ],
        statuses: ['Pending', 'Approved', 'Paid', 'Rejected']
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCommissions = async (req, res, next) => {
  try {
    const {
      month,
      year,
      from_date: fromDate,
      to_date: toDate,
      city_id: cityId,
      state_id: stateId,
      country_id: countryId,
      category_id: categoryId,
      commission_type: commissionType,
      status
    } = req.query;

    const filter = {
      user: req.user._id,
      is_deleted: { $ne: true }
    };

    if (categoryId) filter.product_category = categoryId;
    if (commissionType) filter.commission_type = commissionType;
    if (status) filter.status = status;

    if (fromDate || toDate || month || year) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
      if (year && !fromDate && !toDate) {
        const y = Number(year);
        filter.createdAt.$gte = new Date(`${y}-01-01`);
        filter.createdAt.$lte = new Date(`${y}-12-31T23:59:59`);
      }
      if (month && year) {
        const y = Number(year);
        const m = Number(month) - 1;
        filter.createdAt.$gte = new Date(y, m, 1);
        filter.createdAt.$lte = new Date(y, m + 1, 0, 23, 59, 59);
      }
    }

    const retailerIds = await getRetailerIdsForCommissionFilter(req.user, { cityId, stateId, countryId });
    if (retailerIds !== null) {
      if (retailerIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          summary: { total: 0, count: 0 }
        });
      }
      filter.retailer = { $in: retailerIds };
    }

    const rows = await CommissionRecord.find(filter)
      .populate('order', 'order_number status grand_total createdAt')
      .populate({
        path: 'retailer',
        select: 'business_name city state',
        populate: [
          { path: 'city', select: 'name' },
          { path: 'state', select: 'name' }
        ]
      })
      .populate('product_category', 'name')
      .sort({ createdAt: -1 });

    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: rows,
      summary: {
        total: Math.round(total * 100) / 100,
        count: rows.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderCommissionBreakdown = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const myRows = await CommissionRecord.find({
      order: order._id,
      user: req.user._id,
      is_deleted: { $ne: true }
    }).populate('product_category', 'name');

    res.status(200).json({
      success: true,
      data: {
        snapshot: order.commission_snapshot || null,
        my_commissions: myRows
      }
    });
  } catch (error) {
    next(error);
  }
};
