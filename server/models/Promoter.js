import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const promoterSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  promoter_code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String },
  aadhaar_number: { type: String },
  pan_number: { type: String },
  gst_number: { type: String },
  bank_details: {
    bank_name: { type: String, trim: true },
    account_no: { type: String, trim: true },
    ifsc_code: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    account_holder: { type: String, trim: true },
    branch_name: { type: String, trim: true },
    upi_id: { type: String, trim: true }
  },
  profile_photo: { type: String },
  territory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }],
  retailers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Retailer' }],
  royalty_percentage: { type: Number, default: 5 }, // e.g. 5 for 5% self royalty
  total_royalty_earned: amountSchemaType,
  // Mentorship / Training Hierarchy
  trained_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Promoter' },
  training_royalty_percentage: { type: Number, default: 2.0 }, // e.g. 2% for trainer
  total_training_royalty_earned: amountSchemaType,
  assigned_employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

promoterSchema.plugin(softDeletePlugin);

promoterSchema.index({ name: 1 });

const Promoter = mongoose.model('Promoter', promoterSchema);
export default Promoter;
