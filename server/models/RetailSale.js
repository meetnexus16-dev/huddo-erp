import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  product_name: { type: String },
  sku_variant: { type: String },
  size: { type: String },
  color: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unit_price: amountSchemaType,
  /** Line-level discount % (0–100). Ignored when discount_mode is 'bill'. */
  discount_percent: { type: Number, default: 0, min: 0, max: 100 },
  line_subtotal: amountSchemaType,
  line_discount_amount: amountSchemaType,
  line_total: amountSchemaType
}, { _id: false });

const retailSaleSchema = new mongoose.Schema({
  sale_number: { type: String, unique: true },
  retailer: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true },
  items: { type: [saleItemSchema], validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one item is required'] },
  /** none | line (per-product %) | bill (whole-bill %) */
  discount_mode: {
    type: String,
    enum: ['none', 'line', 'bill'],
    default: 'none'
  },
  bill_discount_percent: { type: Number, default: 0, min: 0, max: 100 },
  subtotal: amountSchemaType,
  discount_amount: amountSchemaType,
  grand_total: amountSchemaType,
  /** Snapshot of retailer location for geo analytics */
  city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  state: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
  city_name: { type: String },
  state_name: { type: String },
  country_name: { type: String },
  note: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pairs_sold: { type: Number, default: 0 }
}, { timestamps: true });

retailSaleSchema.plugin(softDeletePlugin);

retailSaleSchema.pre('save', async function (next) {
  if (!this.sale_number) {
    const today = new Date();
    const dateString =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.sale_number = `SALE-${dateString}-${randomSuffix}`;
  }
  if (Array.isArray(this.items)) {
    this.pairs_sold = this.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }
  next();
});

retailSaleSchema.index({ retailer: 1, createdAt: -1 });
retailSaleSchema.index({ city: 1, createdAt: -1 });
retailSaleSchema.index({ state: 1, createdAt: -1 });
retailSaleSchema.index({ country: 1, createdAt: -1 });
retailSaleSchema.index({ sale_number: 1 });
retailSaleSchema.index({ 'items.product': 1 });

const RetailSale = mongoose.model('RetailSale', retailSaleSchema);
export default RetailSale;
