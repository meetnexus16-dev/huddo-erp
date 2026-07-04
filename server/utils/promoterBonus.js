import PromoterBonusStructure from '../models/PromoterBonusStructure.js';
import {
  DEFAULT_CATEGORY_COMMISSIONS,
  hasExplicitPromoterCommissions,
  LEGACY_PROMOTER_BONUS_OFFSETS,
  resolveCommissionsFromCategory
} from './categoryCommission.js';

export const PROMOTED_ROLE_KEYS = {
  Retailer: 'retailer',
  CityManager: 'cityManager',
  StateManager: 'stateManager',
  CountryManager: 'countryManager'
};

export const PROMOTED_ROLE_LABELS = {
  Retailer: 'Retailer',
  CityManager: 'City Manager',
  StateManager: 'State Manager',
  CountryManager: 'Country Manager'
};

async function findPromoterStructure(promotedRole, categoryId) {
  const query = {
    promoted_role: promotedRole,
    is_active: true,
    is_deleted: { $ne: true }
  };

  if (categoryId) {
    const categorySpecific = await PromoterBonusStructure.findOne({
      ...query,
      product_category: categoryId
    });
    if (categorySpecific) return categorySpecific;
  }

  return PromoterBonusStructure.findOne({
    ...query,
    product_category: null
  });
}

export async function getGlobalPromoterFallback(promotedRole, categoryId) {
  const structure = await findPromoterStructure(promotedRole, categoryId);
  return structure?.extra_bonus_percentage ?? null;
}

/** @deprecated Use getReferrerCommissionPercentage */
export async function getExtraBonusForPromotedRole(promotedRole, categoryId) {
  const fallback = await getGlobalPromoterFallback(promotedRole, categoryId);
  return fallback ?? 0;
}

export async function getPromoterBonusMapByRole(categoryId) {
  const structures = await PromoterBonusStructure.find({
    is_active: true,
    is_deleted: { $ne: true },
    $or: [{ product_category: categoryId || null }, { product_category: null }]
  });

  const map = {};
  for (const row of structures) {
    const key = row.promoted_role;
    if (row.product_category && categoryId && row.product_category.toString() !== categoryId.toString()) {
      continue;
    }
    if (!map[key] || row.product_category) {
      map[key] = row.extra_bonus_percentage;
    }
  }
  return map;
}

export function getPromoterCommissionFromCategory(categoryCommissions, promotedRole) {
  const roleKey = PROMOTED_ROLE_KEYS[promotedRole];
  if (!roleKey) return 0;
  const resolved = resolveCommissionsFromCategory(categoryCommissions);
  return Number(resolved.promoterCommissions?.[roleKey] || 0);
}

export async function getReferrerCommissionPercentage(categoryDoc, promotedRole) {
  const roleKey = PROMOTED_ROLE_KEYS[promotedRole];
  if (!roleKey) return 0;

  const source = categoryDoc?.commissions || categoryDoc || {};

  if (hasExplicitPromoterCommissions(source)) {
    const nested = source.promoterCommissions || {};
    return Number(nested[roleKey] ?? 0);
  }

  const fallback = await getGlobalPromoterFallback(promotedRole, categoryDoc?._id);
  if (fallback !== null) {
    return Number(fallback);
  }

  const legacyBase = source.promoter ?? DEFAULT_CATEGORY_COMMISSIONS.promoter;
  return legacyBase + (LEGACY_PROMOTER_BONUS_OFFSETS[roleKey] ?? 0);
}

/** @deprecated Use getReferrerCommissionPercentage */
export function getTotalReferrerPercentage(categoryCommissions, promotedRole, extraBonus) {
  return getPromoterCommissionFromCategory(categoryCommissions, promotedRole) + (extraBonus || 0);
}

export function roundAmount(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateLineCommission(franchisePoints, quantity, percentage) {
  const base = Number(franchisePoints || 0) * Number(quantity || 0);
  return roundAmount(base * (Number(percentage || 0) / 100));
}

export { resolveCommissionsFromCategory };
