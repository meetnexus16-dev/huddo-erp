import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const poItemSchema = new mongoose.Schema({
  item_name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit_price: amountSchemaType,
  total: amountSchemaType
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  po_number: { type: String, unique: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  items: [poItemSchema],
  total_amount: amountSchemaType,
  status: { 
    type: String, 
    enum: ['Draft', 'Submitted', 'Approved', 'Received', 'Rejected', 'Cancelled'], 
    default: 'Draft' 
  },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quality_check_status: { type: String, default: 'Pending' }, // e.g. Pending, Passed, Failed
  received_at: { type: Date }
}, { timestamps: true });

purchaseOrderSchema.plugin(softDeletePlugin);

purchaseOrderSchema.pre('save', async function (next) {
  if (!this.po_number) {
    const today = new Date();
    const dateString = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.po_number = `PO-${dateString}-${randomSuffix}`;
  }
  next();
});

purchaseOrderSchema.index({ vendor: 1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;
