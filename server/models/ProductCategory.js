import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

export const DEFAULT_CATEGORY_COMMISSIONS = {
  retailer: 20,
  cityManager: 2,
  stateManager: 1,
  countryManager: 0.5,
  promoter: 5
};

export const DEFAULT_PROMOTER_COMMISSIONS = {
  retailer: 8,
  cityManager: 6.5,
  stateManager: 6,
  countryManager: 5.5
};

/** Legacy global bonus offsets applied on top of flat promoter % before per-role structure existed. */
export const LEGACY_PROMOTER_BONUS_OFFSETS = {
  retailer: 3,
  cityManager: 1.5,
  stateManager: 1,
  countryManager: 0.5
};

const promoterCommissionFields = {
  retailer: { type: Number, default: DEFAULT_PROMOTER_COMMISSIONS.retailer, min: 0, max: 100 },
  cityManager: { type: Number, default: DEFAULT_PROMOTER_COMMISSIONS.cityManager, min: 0, max: 100 },
  stateManager: { type: Number, default: DEFAULT_PROMOTER_COMMISSIONS.stateManager, min: 0, max: 100 },
  countryManager: { type: Number, default: DEFAULT_PROMOTER_COMMISSIONS.countryManager, min: 0, max: 100 }
};

const commissionFields = {
  retailer: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.retailer, min: 0, max: 100 },
  cityManager: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.cityManager, min: 0, max: 100 },
  stateManager: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.stateManager, min: 0, max: 100 },
  countryManager: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.countryManager, min: 0, max: 100 },
  /** @deprecated Use promoterCommissions per role instead */
  promoter: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.promoter, min: 0, max: 100 },
  promoterCommissions: promoterCommissionFields
};

const productCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
  description: { type: String },
  commissions: commissionFields,
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

productCategorySchema.plugin(softDeletePlugin);

const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);
export default ProductCategory;
