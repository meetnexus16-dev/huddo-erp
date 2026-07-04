import ProductCategory, {
  DEFAULT_CATEGORY_COMMISSIONS,
  DEFAULT_PROMOTER_COMMISSIONS,
  LEGACY_PROMOTER_BONUS_OFFSETS
} from '../models/ProductCategory.js';

export { DEFAULT_CATEGORY_COMMISSIONS, DEFAULT_PROMOTER_COMMISSIONS, LEGACY_PROMOTER_BONUS_OFFSETS };

const PROMOTER_KEY_ALIASES = {
  retailer: ['retailer', 'Retailer'],
  cityManager: ['cityManager', 'city_manager', 'CityManager'],
  stateManager: ['stateManager', 'state_manager', 'StateManager'],
  countryManager: ['countryManager', 'country_manager', 'CountryManager']
};

export function normalizePromoterCommissionInput(raw = {}) {
  const normalized = {};
  for (const [targetKey, aliases] of Object.entries(PROMOTER_KEY_ALIASES)) {
    for (const alias of aliases) {
      if (raw[alias] !== undefined && raw[alias] !== null && raw[alias] !== '') {
        normalized[targetKey] = Number(raw[alias]);
        break;
      }
    }
  }
  return normalized;
}

export function normalizeCommissionInput(raw = {}) {
  const normalized = {};
  const map = {
    retailer: ['retailer', 'retailerMargin', 'retailer_margin'],
    cityManager: ['cityManager', 'city_manager', 'cityManagerIncentive', 'city_manager_incentive'],
    stateManager: ['stateManager', 'state_manager', 'stateManagerIncentive', 'state_manager_incentive'],
    countryManager: ['countryManager', 'country_manager', 'countryManagerIncentive', 'country_manager_incentive'],
    promoter: ['promoter', 'promoterRoyalty', 'promoter_royalty']
  };

  for (const [targetKey, aliases] of Object.entries(map)) {
    for (const alias of aliases) {
      if (raw[alias] !== undefined && raw[alias] !== null && raw[alias] !== '') {
        normalized[targetKey] = Number(raw[alias]);
        break;
      }
    }
  }

  if (raw.promoterCommissions && typeof raw.promoterCommissions === 'object') {
    normalized.promoterCommissions = normalizePromoterCommissionInput(raw.promoterCommissions);
  }

  return normalized;
}

export function hasExplicitPromoterCommissions(source = {}) {
  const nested = source.promoterCommissions || {};
  return ['retailer', 'cityManager', 'stateManager', 'countryManager'].some(
    (key) => nested[key] !== undefined && nested[key] !== null
  );
}

export function resolvePromoterCommissionsFromCategory(categoryDoc) {
  const source = categoryDoc?.commissions || categoryDoc || {};
  const nested = source.promoterCommissions || {};

  if (hasExplicitPromoterCommissions(source)) {
    return {
      retailer: nested.retailer ?? DEFAULT_PROMOTER_COMMISSIONS.retailer,
      cityManager: nested.cityManager ?? DEFAULT_PROMOTER_COMMISSIONS.cityManager,
      stateManager: nested.stateManager ?? DEFAULT_PROMOTER_COMMISSIONS.stateManager,
      countryManager: nested.countryManager ?? DEFAULT_PROMOTER_COMMISSIONS.countryManager
    };
  }

  const legacyBase = source.promoter ?? DEFAULT_CATEGORY_COMMISSIONS.promoter;
  return {
    retailer: legacyBase + LEGACY_PROMOTER_BONUS_OFFSETS.retailer,
    cityManager: legacyBase + LEGACY_PROMOTER_BONUS_OFFSETS.cityManager,
    stateManager: legacyBase + LEGACY_PROMOTER_BONUS_OFFSETS.stateManager,
    countryManager: legacyBase + LEGACY_PROMOTER_BONUS_OFFSETS.countryManager
  };
}

export function resolveCommissionsFromCategory(categoryDoc) {
  const source = categoryDoc?.commissions || categoryDoc || {};
  const promoterCommissions = resolvePromoterCommissionsFromCategory(source);

  return {
    retailer: source.retailer ?? DEFAULT_CATEGORY_COMMISSIONS.retailer,
    cityManager: source.cityManager ?? DEFAULT_CATEGORY_COMMISSIONS.cityManager,
    stateManager: source.stateManager ?? DEFAULT_CATEGORY_COMMISSIONS.stateManager,
    countryManager: source.countryManager ?? DEFAULT_CATEGORY_COMMISSIONS.countryManager,
    promoter: source.promoter ?? DEFAULT_CATEGORY_COMMISSIONS.promoter,
    promoterCommissions
  };
}

export async function getCategoryCommissions(categoryId) {
  if (!categoryId) {
    return {
      ...DEFAULT_CATEGORY_COMMISSIONS,
      promoterCommissions: { ...DEFAULT_PROMOTER_COMMISSIONS }
    };
  }
  const category = await ProductCategory.findById(categoryId);
  return resolveCommissionsFromCategory(category);
}

export function enrichProductWithCommissions(productDoc) {
  const product = productDoc?.toObject ? productDoc.toObject() : { ...productDoc };
  const commissions = resolveCommissionsFromCategory(product.category);
  product.commissions = commissions;
  product.retailerMargin = commissions.retailer;
  product.cityManagerIncentive = commissions.cityManager;
  product.stateManagerIncentive = commissions.stateManager;
  product.countryManagerIncentive = commissions.countryManager;
  product.promoterCommissions = commissions.promoterCommissions;
  product.promoterRoyalty = commissions.promoterCommissions.retailer;
  return product;
}
