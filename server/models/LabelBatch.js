import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

/**
 * A batch of printable barcode labels generated when inventory is added.
 * Stores a snapshot of the label content so history stays accurate even if
 * the product changes later. `barcode_value` is what a scanner decodes.
 */
const labelBatchSchema = new mongoose.Schema({
  batch_number: { type: String, unique: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  inventory_transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction' },

  // Snapshot of label content
  product_name: { type: String },
  article_no: { type: String },
  size: { type: String },
  color: { type: String },
  colors_text: { type: String },
  hsn_code: { type: String },
  mrp: { type: Number },
  quantity: { type: Number, required: true },
  barcode_value: { type: String, required: true },

  // Print / download tracking
  print_count: { type: Number, default: 0 },
  download_count: { type: Number, default: 0 },
  last_printed_at: { type: Date },
  last_downloaded_at: { type: Date },

  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_by_name: { type: String }
}, { timestamps: true });

labelBatchSchema.plugin(softDeletePlugin);

labelBatchSchema.index({ createdAt: -1 });
labelBatchSchema.index({ product: 1 });

labelBatchSchema.pre('save', async function preSave(next) {
  if (this.batch_number) return next();
  try {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('LabelBatch').countDocuments({
      batch_number: new RegExp(`^LBL-${datePart}-`)
    });
    this.batch_number = `LBL-${datePart}-${String(count + 1).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

const LabelBatch = mongoose.model('LabelBatch', labelBatchSchema);
export default LabelBatch;
