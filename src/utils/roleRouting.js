const ROLE_DISPLAY_NAMES = {
  founder: 'Founder',
  ceo: 'CEO',
  admin: 'Admin',
  countrymanager: 'Country Manager',
  statemanager: 'State Manager',
  citymanager: 'City Manager',
  promoter: 'Promoter',
  retailer: 'Retailer',
  distributor: 'Distributor',
  financemanager: 'Finance Manager',
  hrmanager: 'HR Manager',
  inventorymanager: 'Inventory Manager',
  salesmanager: 'Sales Manager',
  salesexecutive: 'Sales Executive',
  purchasemanager: 'Purchase Manager',
  teammember: 'Team Member'
};

export function normalizeRoleKey(role) {
  const raw = String(
    typeof role === 'object'
      ? role?.name || role?.roleName || role?.role?.name || ''
      : role || ''
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  return raw;
}

export function getRoleDisplayName(role) {
  const key = normalizeRoleKey(role);
  if (ROLE_DISPLAY_NAMES[key]) return ROLE_DISPLAY_NAMES[key];
  const raw = String(typeof role === 'object' ? role?.name || role?.roleName || '' : role || '').trim();
  return raw || 'User';
}

export function isRole(role, targetKey) {
  return normalizeRoleKey(role) === normalizeRoleKey(targetKey);
}

export function isCountryManager(role) {
  return isRole(role, 'countrymanager');
}

export function isStateManager(role) {
  return isRole(role, 'statemanager');
}

export function isCityManager(role) {
  return isRole(role, 'citymanager');
}

export function isPromoter(role) {
  return isRole(role, 'promoter');
}

export function isRetailerOrDistributor(role) {
  const key = normalizeRoleKey(role);
  return key === 'retailer' || key === 'distributor';
}

export function isEmployeeRole(role) {
  const key = normalizeRoleKey(role);
  return [
    'salesexecutive', 'salesmanager', 'hrmanager', 'financemanager',
    'inventorymanager', 'purchasemanager', 'teammember'
  ].includes(key);
}

export function resolveUserRole(user) {
  if (!user) return '';
  return user.role?.name || user.roleName || user.role || '';
}
