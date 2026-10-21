import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const productVariantSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  mrp: amountSchemaType,
  selling_price: amountSchemaType,
  cost_price: amountSchemaType,
  margin_percentage: { type: Number, default: 0 }, // e.g. 15 for 15%
  margin_points: { type: Number, default: 0 },
  stock_quantity: { type: Number, default: 0 },
  images: [{ type: String }],
  sku_variant: { type: String, required: true, unique: true, uppercase: true, trim: true },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

productVariantSchema.plugin(softDeletePlugin);

productVariantSchema.index({ product: 1 });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
export default ProductVariant;
