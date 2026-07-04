import ProductCategory, { DEFAULT_CATEGORY_COMMISSIONS } from '../models/ProductCategory.js';

export { DEFAULT_CATEGORY_COMMISSIONS };

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

  return normalized;
}

export function resolveCommissionsFromCategory(categoryDoc) {
  const source = categoryDoc?.commissions || categoryDoc || {};
  return {
    retailer: source.retailer ?? DEFAULT_CATEGORY_COMMISSIONS.retailer,
    cityManager: source.cityManager ?? DEFAULT_CATEGORY_COMMISSIONS.cityManager,
    stateManager: source.stateManager ?? DEFAULT_CATEGORY_COMMISSIONS.stateManager,
    countryManager: source.countryManager ?? DEFAULT_CATEGORY_COMMISSIONS.countryManager,
    promoter: source.promoter ?? DEFAULT_CATEGORY_COMMISSIONS.promoter
  };
}

export async function getCategoryCommissions(categoryId) {
  if (!categoryId) return { ...DEFAULT_CATEGORY_COMMISSIONS };
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
  product.promoterRoyalty = commissions.promoter;
  return product;
}
