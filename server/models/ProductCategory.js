import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

export const DEFAULT_CATEGORY_COMMISSIONS = {
  retailer: 20,
  cityManager: 2,
  stateManager: 1,
  countryManager: 0.5,
  promoter: 5
};

const commissionFields = {
  retailer: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.retailer, min: 0, max: 100 },
  cityManager: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.cityManager, min: 0, max: 100 },
  stateManager: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.stateManager, min: 0, max: 100 },
  countryManager: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.countryManager, min: 0, max: 100 },
  promoter: { type: Number, default: DEFAULT_CATEGORY_COMMISSIONS.promoter, min: 0, max: 100 }
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
