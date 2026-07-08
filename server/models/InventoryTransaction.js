import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

/**
 * Immutable ledger of every stock movement for a product variant.
 * `type: 'add'` for inbound (manual add inventory), `'deduct'` for outbound
 * (order confirmation), `'adjust'` for corrections/returns.
 */
const inventoryTransactionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  type: {
    type: String,
    enum: ['add', 'deduct', 'adjust'],
    required: true
  },
  quantity: { type: Number, required: true },
  balance_after: { type: Number, required: true },
  // Free-form origin of the movement, e.g. 'manual', 'order', 'return', 'label-batch'
  source: { type: String, default: 'manual' },
  // Optional reference to a related document (Order, LabelBatch, etc.)
  reference_type: { type: String },
  reference_id: { type: mongoose.Schema.Types.ObjectId },
  reference_label: { type: String },
  note: { type: String },
  performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performed_by_name: { type: String }
}, { timestamps: true });

inventoryTransactionSchema.plugin(softDeletePlugin);

inventoryTransactionSchema.index({ product_variant: 1, createdAt: -1 });
inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1 });

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
export default InventoryTransaction;
