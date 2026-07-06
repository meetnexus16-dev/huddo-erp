import {
  getRoleDisplayName,
  isCityManager,
  isCountryManager,
  isEmployeeRole,
  isPromoter,
  isRetailerOrDistributor,
  isStateManager,
  resolveUserRole
} from '../utils/roleRouting';

export const ROUTES = {
  LOGIN: '/login',
  ONBOARD: '/onboard',
  HOME: '/',

  ADMIN: '/app',
  COUNTRY_MANAGER: '/country-manager',
  STATE_MANAGER: '/state-manager',
  CITY_MANAGER: '/city-manager',
  PROMOTER: '/promoter',
  RETAILER: '/retailer',
  EMPLOYEE: '/employee'
};

export const ADMIN_ROUTES = {
  Dashboard: 'dashboard',
  Hierarchy: 'hierarchy',
  Departments: 'departments',
  Employees: 'employees',
  Teams: 'teams',
  Promoters: 'promoters',
  CountryManagers: 'country-managers',
  Retailers: 'retailers',
  Products: 'products',
  ProductCategories: 'product-categories',
  Orders: 'orders',
  Billing: 'billing',
  Commissions: 'commissions',
  Sales: 'sales',
  Targets: 'targets',
  'Petty Cash': 'petty-cash',
  'Field Tracking': 'field-tracking',
  Approvals: 'approvals',
  Inventory: 'inventory',
  Purchase: 'purchase',
  'Users & Roles': 'users-roles',
  Notifications: 'notifications',
  Reports: 'reports',
  'Security & Audit': 'security-audit',
  CommunicationSettings: 'communication-settings',
  Profile: 'profile',
  'Portal Settings': 'portal-settings'
};

export const COUNTRY_MANAGER_ROUTES = {
  Dashboard: 'dashboard',
  NetworkReferral: 'network/referral',
  NetworkUsers: 'network/users',
  NetworkReferrals: 'network/referrals',
  NetworkOrders: 'network/orders',
  NetworkCommissions: 'network/commissions',
  NetworkPayments: 'network/payments',
  Orders: 'orders',
  Approvals: 'approvals',
  States: 'states',
  'State Managers': 'state-managers',
  'City Managers': 'city-managers',
  Retailers: 'retailers',
  Targets: 'targets',
  Analytics: 'analytics',
  Notifications: 'notifications',
  Profile: 'profile'
};

export const STATE_MANAGER_ROUTES = {
  Dashboard: 'dashboard',
  NetworkReferral: 'network/referral',
  NetworkUsers: 'network/users',
  NetworkReferrals: 'network/referrals',
  NetworkOrders: 'network/orders',
  NetworkCommissions: 'network/commissions',
  NetworkPayments: 'network/payments',
  'City Managers': 'city-managers',
  Retailers: 'retailers',
  Orders: 'orders',
  Approvals: 'approvals',
  'Sales Monitoring': 'sales-monitoring',
  Targets: 'targets',
  'Field Force': 'field-force',
  'My Incentive': 'incentive',
  Reports: 'reports',
  Notifications: 'notifications',
  Profile: 'profile'
};

export const CITY_MANAGER_ROUTES = {
  Dashboard: 'dashboard',
  NetworkReferral: 'network/referral',
  NetworkUsers: 'network/users',
  NetworkReferrals: 'network/referrals',
  NetworkOrders: 'network/orders',
  NetworkCommissions: 'network/commissions',
  NetworkPayments: 'network/payments',
  'My Retailers': 'retailers',
  'Onboard Retailer': 'onboard-retailer',
  'Pending Verification': 'pending-verification',
  Orders: 'orders',
  Approvals: 'approvals',
  'Visit Logs': 'visit-logs',
  'Market Leads': 'market-leads',
  'Promoter View': 'promoter-view',
  'Sales Monitoring': 'sales-monitoring',
  Targets: 'targets',
  'My Incentive': 'incentive',
  Reports: 'reports',
  Notifications: 'notifications',
  Profile: 'profile'
};

export const PROMOTER_ROUTES = {
  Dashboard: 'dashboard',
  NetworkReferral: 'network/referral',
  NetworkUsers: 'network/users',
  NetworkReferrals: 'network/referrals',
  NetworkOrders: 'network/orders',
  NetworkCommissions: 'network/commissions',
  NetworkPayments: 'network/payments',
  Profile: 'profile'
};

export const RETAILER_ROUTES = {
  Dashboard: 'dashboard',
  'Place Order': 'place-order',
  'My Orders': 'orders',
  'Billing & Invoices': 'billing',
  Inventory: 'inventory',
  'Schemes & Discounts': 'schemes',
  'Commission & Rewards': 'commissions',
  Profile: 'profile',
  Notifications: 'notifications'
};

export const EMPLOYEE_ROUTES = {
  Dashboard: 'dashboard',
  Profile: 'profile',
  Leave: 'leave',
  Attendance: 'attendance',
  'My Orders': 'orders',
  'Team Orders': 'team-orders',
  'Retailer Visits': 'retailer-visits',
  Targets: 'targets',
  Commission: 'commission',
  'Employee Directory': 'employee-directory',
  'Attendance HR': 'attendance-hr',
  'Leave Approvals': 'leave-approvals',
  Payroll: 'payroll',
  'Performance Reviews': 'performance-reviews',
  'Commission Calculations': 'commission-calculations',
  'Revenue Reports': 'revenue-reports',
  'Expense Tracking': 'expense-tracking',
  'GST Management': 'gst-management',
  'Payroll View': 'payroll-view',
  'Stock Management': 'stock-management',
  Warehouse: 'warehouse',
  'Stock Transfers': 'stock-transfers',
  'Stock Alerts': 'stock-alerts',
  'Inventory Reports': 'inventory-reports',
  'Vendor Management': 'vendor-management',
  'Purchase Orders': 'purchase-orders',
  'Purchase Approvals': 'purchase-approvals',
  'Material Tracking': 'material-tracking',
  'Procurement Reports': 'procurement-reports',
  'My Tasks': 'my-tasks'
};

export function buildPath(base, tabId, routeMap) {
  const slug = routeMap[tabId];
  if (!slug) return base;
  return `${base.replace(/\/$/, '')}/${slug}`;
}

export function tabIdFromPath(pathname, base, routeMap) {
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  if (normalizedPath === normalizedBase) {
    return 'Dashboard';
  }

  if (!normalizedPath.startsWith(normalizedBase)) {
    return null;
  }

  const rest = normalizedPath.slice(normalizedBase.length).replace(/^\//, '');
  if (!rest) return 'Dashboard';

  if (rest === 'profile/password') return 'Profile';

  const entries = Object.entries(routeMap).sort(
    (a, b) => b[1].length - a[1].length
  );

  const match = entries.find(([, slug]) => rest === slug || rest.startsWith(`${slug}/`));
  return match ? match[0] : null;
}

export function withSidebarPaths(sections, base, routeMap) {
  return sections.map((section) => {
    if (section.section && section.items) {
      return {
        ...section,
        items: section.items.map((item) => ({
          ...item,
          path: buildPath(base, item.id, routeMap)
        }))
      };
    }

    return {
      ...section,
      path: buildPath(base, section.id, routeMap)
    };
  });
}

export function getRoleHomePath(role) {
  const displayRole = getRoleDisplayName(role);

  if (isRetailerOrDistributor(displayRole)) {
    return buildPath(ROUTES.RETAILER, 'Dashboard', RETAILER_ROUTES);
  }
  if (isCountryManager(displayRole)) {
    return buildPath(ROUTES.COUNTRY_MANAGER, 'Dashboard', COUNTRY_MANAGER_ROUTES);
  }
  if (isStateManager(displayRole)) {
    return buildPath(ROUTES.STATE_MANAGER, 'Dashboard', STATE_MANAGER_ROUTES);
  }
  if (isCityManager(displayRole)) {
    return buildPath(ROUTES.CITY_MANAGER, 'Dashboard', CITY_MANAGER_ROUTES);
  }
  if (isPromoter(displayRole)) {
    return buildPath(ROUTES.PROMOTER, 'Dashboard', PROMOTER_ROUTES);
  }

  if (isEmployeeRole(displayRole)) {
    return buildPath(ROUTES.EMPLOYEE, 'Dashboard', EMPLOYEE_ROUTES);
  }

  return buildPath(ROUTES.ADMIN, 'Dashboard', ADMIN_ROUTES);
}

export function getRoleHomePathFromUser(user) {
  return getRoleHomePath(resolveUserRole(user));
}
