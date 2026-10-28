import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const employeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  employee_code: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  residential_address: { type: String },
  aadhaar_number: { type: String },
  pan_number: { type: String },
  profile_photo: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  department_name: { type: String, trim: true },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  designation_name: { type: String, trim: true },
  reporting_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  reporting_manager_name: { type: String, trim: true },
  joining_date: { type: Date },
  aadhaar_card_file: { type: String },
  pan_card_file: { type: String },
  salary_structure: {
    basic: amountSchemaType,
    hra: amountSchemaType,
    allowances: amountSchemaType,
    deductions: amountSchemaType,
    tds_pct: { type: Number, default: 0 },
    incentive_mode: { 
      type: String, 
      enum: ['slab_per_pair', 'percentage'], 
      default: 'slab_per_pair' 
    },
    incentive_slabs: [{
      min_qty: { type: Number, required: true },
      max_qty: { type: Number },
      incentive_per_pair: { type: Number, required: true }
    }],
    incentive_pct: { type: Number, default: 5 },
    incentive_earned: amountSchemaType,
    promoter_override_pct: { type: Number, default: 1 }
  },
  assigned_promoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Promoter' }],
  bank_details: {
    bank_name: { type: String, trim: true },
    account_no: { type: String, trim: true },
    ifsc_code: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    account_holder: { type: String, trim: true },
    branch_name: { type: String, trim: true },
    upi_id: { type: String, trim: true }
  },
  documents: [{
    type: { type: String }, // e.g. Aadhaar, PAN, Resume
    url: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  }],
  performance_records: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceReview' }],
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

employeeSchema.plugin(softDeletePlugin);

employeeSchema.index({ full_name: 1 });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
