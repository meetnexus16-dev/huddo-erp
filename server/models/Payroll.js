import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },

  // Base salary structure configured in employee master (monthly rate)
  basic: amountSchemaType,
  hra: amountSchemaType,
  allowances: amountSchemaType,
  base_monthly_rate: amountSchemaType, // basic + hra + allowances

  // Attendance metrics dynamically calculated for the month
  total_days: { type: Number, default: 30 },
  working_days: { type: Number, default: 26 },
  present_days: { type: Number, default: 0 },
  half_days: { type: Number, default: 0 },
  paid_leaves: { type: Number, default: 0 },
  absent_days: { type: Number, default: 0 },
  payable_days: { type: Number, default: 0 }, // present + (half * 0.5) + paid_leaves
  per_day_rate: amountSchemaType,
  attendance_deduction_lop: amountSchemaType, // Loss of pay deducted for absent days

  // Earned base salary after attendance deductions
  earned_basic: amountSchemaType,

  // Variable performance incentives (strictly segregated)
  sales_incentive: amountSchemaType, // direct counter/retail sales commission
  promoter_override_incentive: amountSchemaType, // supervised promoters' override commission
  manual_incentive: amountSchemaType, // Founder manual award/bonus
  incentive_amount: amountSchemaType, // total of all 3 incentive components

  // Deductions
  pf_deduction: amountSchemaType,
  tds_deduction: amountSchemaType,
  other_deductions: amountSchemaType,
  deductions: amountSchemaType, // total statutory & other deductions

  // Financial totals
  gross: amountSchemaType, // earned_basic + incentive_amount
  net_salary: amountSchemaType, // gross - deductions

  status: { type: String, enum: ['Pending', 'Processed', 'Paid'], default: 'Pending' },
  paid_at: { type: Date },
  payment_mode: { type: String, default: 'Bank Transfer' }, // e.g. Bank Transfer, Cheque, Cash, UPI
  notes: { type: String }
}, { timestamps: true });

payrollSchema.plugin(softDeletePlugin);

// Unique payroll record per employee for a specific month and year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;
