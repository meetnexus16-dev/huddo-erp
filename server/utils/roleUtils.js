const ROLE_ALIASES = {
  ceo: 'CEO',
  founder: 'Founder',
  admin: 'Admin',
  'country manager': 'CountryManager',
  countrymanager: 'CountryManager',
  'state manager': 'StateManager',
  statemanager: 'StateManager',
  'city manager': 'CityManager',
  citymanager: 'CityManager',
  'sales manager': 'SalesManager',
  salesmanager: 'SalesManager',
  'sales executive': 'SalesExecutive',
  salesexecutive: 'SalesExecutive',
  'purchase manager': 'PurchaseManager',
  purchasemanager: 'PurchaseManager',
  'inventory manager': 'InventoryManager',
  inventorymanager: 'InventoryManager',
  'finance manager': 'FinanceManager',
  financemanager: 'FinanceManager',
  'hr manager': 'HRManager',
  hrmanager: 'HRManager',
  teammember: 'TeamMember',
  'team member': 'TeamMember',
  retailer: 'Retailer',
  distributor: 'Distributor',
  promoter: 'Promoter'
};

export const normalizeRoleName = (roleName = '') => {
  const trimmed = String(roleName).trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (ROLE_ALIASES[lower]) return ROLE_ALIASES[lower];
  const compactLower = trimmed.replace(/\s+/g, '').toLowerCase();
  if (ROLE_ALIASES[compactLower]) return ROLE_ALIASES[compactLower];
  return trimmed.replace(/\s+/g, '');
};
