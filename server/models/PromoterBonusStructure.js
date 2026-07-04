import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

export const PROMOTED_ROLES = ['Retailer', 'CityManager', 'StateManager', 'CountryManager'];

const promoterBonusStructureSchema = new mongoose.Schema({
  promoted_role: {
    type: String,
    enum: PROMOTED_ROLES,
    required: true
  },
  product_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    default: null
  },
  extra_bonus_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  description: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

promoterBonusStructureSchema.plugin(softDeletePlugin);

promoterBonusStructureSchema.index({ promoted_role: 1, product_category: 1 });

const PromoterBonusStructure = mongoose.model('PromoterBonusStructure', promoterBonusStructureSchema);
export default PromoterBonusStructure;
