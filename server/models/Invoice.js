import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const invoiceItemSchema = new mongoose.Schema({
  product_variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  quantity: { type: Number, required: true },
  unit_price: amountSchemaType,
  total_price: amountSchemaType
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  invoice_number: { type: String, unique: true },
  retailer: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true },
  items: [invoiceItemSchema],
  subtotal: amountSchemaType,
  cgst: amountSchemaType,
  sgst: amountSchemaType,
  igst: amountSchemaType,
  total: amountSchemaType,
  gst_invoice_url: { type: String },
  payment_due_date: { type: Date },
  is_paid: { type: Boolean, default: false },
  paid_at: { type: Date }
}, { timestamps: true });

invoiceSchema.plugin(softDeletePlugin);

// Auto-generate invoice number before saving
invoiceSchema.pre('save', async function (next) {
  if (!this.invoice_number) {
    const today = new Date();
    const dateString = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.invoice_number = `INV-${dateString}-${randomSuffix}`;
  }
  next();
});

invoiceSchema.index({ order: 1 });
invoiceSchema.index({ retailer: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
