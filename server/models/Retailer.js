import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const communicationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  channel: { type: String, enum: ['Email', 'SMS', 'WhatsApp', 'InApp'], required: true },
  sent_at: { type: Date, default: Date.now },
  sent_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const retailerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  business_name: { type: String, required: true, trim: true },
  owner_name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  shop_address: { type: String },
  state: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
  city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  gst_number: { type: String },
  pan_number: { type: String },
  aadhaar_number: { type: String },
  shop_photo: { type: String },
  category: { 
    type: String, 
    enum: ['Platinum', 'Gold', 'Silver', 'Standard'], 
    default: 'Standard' 
  },
  assigned_promoter: { type: mongoose.Schema.Types.ObjectId, ref: 'Promoter' },
  assigned_city_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  communication_history: [communicationSchema],
  credit_limit: {
    amount: amountSchemaType,
    is_enabled: { type: Boolean, default: false }
  },
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  bank_details: {
    bank_name: { type: String, trim: true },
    account_no: { type: String, trim: true },
    ifsc_code: { type: String, trim: true },
    account_holder: { type: String, trim: true },
    branch_name: { type: String, trim: true },
    upi_id: { type: String, trim: true }
  }
}, { timestamps: true });

retailerSchema.plugin(softDeletePlugin);

retailerSchema.index({ business_name: 1 });
retailerSchema.index({ owner_name: 1 });
retailerSchema.index({ category: 1 });

const Retailer = mongoose.model('Retailer', retailerSchema);
export default Retailer;
