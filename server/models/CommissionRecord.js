import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const commissionRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  retailer: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
  commission_type: {
    type: String,
    enum: ['ManagerIncentive', 'PromoterRoyalty', 'PromoterBonus', 'Bonus'],
    required: true
  },
  beneficiary_role: { type: String },
  amount: amountSchemaType,
  percentage: { type: Number, required: true },
  base_franchise_points: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  description: { type: String },
  referrer_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referred_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_direct_referral: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Paid', 'Rejected'],
    default: 'Approved'
  },
  settlement_date: { type: Date }
}, { timestamps: true });

commissionRecordSchema.plugin(softDeletePlugin);

commissionRecordSchema.index({ user: 1 });
commissionRecordSchema.index({ order: 1 });
commissionRecordSchema.index({ status: 1 });

const CommissionRecord = mongoose.model('CommissionRecord', commissionRecordSchema);
export default CommissionRecord;
