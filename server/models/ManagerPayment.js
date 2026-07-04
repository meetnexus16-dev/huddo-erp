import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const managerPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  retailer: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer' },
  amount: { ...amountSchemaType, required: true },
  payment_date: { type: Date, required: true },
  reference: { type: String },
  notes: { type: String },
  payment_type: {
    type: String,
    enum: ['CommissionSettlement', 'RetailerPayment', 'Other'],
    default: 'CommissionSettlement'
  },
  recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commission_records: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CommissionRecord' }]
}, { timestamps: true });

managerPaymentSchema.plugin(softDeletePlugin);

managerPaymentSchema.index({ user: 1 });
managerPaymentSchema.index({ payment_date: -1 });

const ManagerPayment = mongoose.model('ManagerPayment', managerPaymentSchema);
export default ManagerPayment;
