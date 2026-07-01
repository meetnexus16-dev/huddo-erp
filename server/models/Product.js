import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
  description: { type: String },
  brand: { type: String, default: 'Huddo' },
  is_active: { type: Boolean, default: true },
  lifecycle_status: { 
    type: String, 
    enum: ['Active', 'Discontinued', 'ComingSoon'], 
    default: 'Active' 
  },
  image: { type: String },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  colour: { type: String },
  mrp: { type: Number },
  costPrice: { type: Number },
  margin: { type: Number },
  retailerMargin: { type: Number, default: 20 },
  cityManagerIncentive: { type: Number, default: 2 },
  stateManagerIncentive: { type: Number, default: 1 },
  hsn_code: { type: String },
  franchise_points: { type: Number },
  colorConfigs: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

productSchema.plugin(softDeletePlugin);

productSchema.index({ name: 1 });
productSchema.index({ sku: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
