import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { softDeletePlugin } from './plugins.js';
import { normalizeRoleName } from '../utils/roleUtils.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  roleName: { type: String },
  employee_id: { type: String, unique: true, sparse: true },
  user_code: { type: String, unique: true, sparse: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  departmentName: { type: String },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  designationName: { type: String },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
  state: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
  city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  reporting_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  otp: { type: String },
  otp_expiry: { type: Date },
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
  profile_photo: { type: String },
  alternate_mobile: { type: String, trim: true },
  gender: { type: String },
  date_of_birth: { type: Date },
  blood_group: { type: String },
  marital_status: { type: String },
  branch: { type: String },
  shift_timing: { type: String },
  pincode: { type: String },
  emergency_contact: {
    contact_person: { type: String },
    relationship: { type: String },
    mobile: { type: String }
  },
  last_login: { type: Date },
  refresh_token: { type: String },
  approval_status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Approved'
  },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  rejection_reason: { type: String },
  promoted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  promoter_code_used: { type: String, trim: true },
  onboarding_source: {
    type: String,
    enum: ['admin', 'referral', 'self'],
    default: 'admin'
  },
  onboarding_meta: {
    requested_country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
    requested_state: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
    requested_city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    requested_country_name: { type: String },
    requested_state_name: { type: String },
    requested_city_name: { type: String },
    requested_country_iso: { type: String },
    business_name: { type: String },
    shop_address: { type: String },
    gst_number: { type: String },
    pan_number: { type: String },
    aadhaar_number: { type: String }
  }
}, { timestamps: true });

userSchema.plugin(softDeletePlugin);

// Hook helper to resolve references before save or update
const resolveReferences = async (doc, isUpdate = false, updateObj = null) => {
  const target = isUpdate ? updateObj : doc;
  
  // 1. Resolve roleName
  if (target.roleName && !target.role) {
    const Role = mongoose.model('Role');
    const lookupName = normalizeRoleName(target.roleName);
    const dbRole = await Role.findOne({ name: lookupName });
    if (dbRole) {
      if (isUpdate) {
        updateObj.role = dbRole._id;
        updateObj.roleName = dbRole.name;
      } else {
        doc.role = dbRole._id;
        doc.roleName = dbRole.name;
      }
    } else {
      throw new Error(`Role "${lookupName}" not found.`);
    }
  }

  // 2. Resolve department
  if (target.departmentName && !target.department) {
    const Department = mongoose.model('Department');
    const dbDept = await Department.findOne({ name: target.departmentName });
    if (dbDept) {
      if (isUpdate) updateObj.department = dbDept._id;
      else doc.department = dbDept._id;
    }
  } else if (typeof target.department === 'string' && !mongoose.isValidObjectId(target.department)) {
    const Department = mongoose.model('Department');
    const dbDept = await Department.findOne({ name: target.department });
    if (dbDept) {
      if (isUpdate) updateObj.department = dbDept._id;
      else doc.department = dbDept._id;
    }
  }

  // 3. Resolve designation
  if (target.designationName && !target.designation) {
    const Designation = mongoose.model('Designation');
    const dbDesg = await Designation.findOne({ title: target.designationName });
    if (dbDesg) {
      if (isUpdate) updateObj.designation = dbDesg._id;
      else doc.designation = dbDesg._id;
    }
  } else if (typeof target.designation === 'string' && !mongoose.isValidObjectId(target.designation)) {
    const Designation = mongoose.model('Designation');
    const dbDesg = await Designation.findOne({ title: target.designation });
    if (dbDesg) {
      if (isUpdate) updateObj.designation = dbDesg._id;
      else doc.designation = dbDesg._id;
    }
  }

  // 4. Resolve status and is_active
  if (target.status) {
    const active = (target.status === 'Active');
    if (isUpdate) updateObj.is_active = active;
    else doc.is_active = active;
  } else if (target.is_active !== undefined) {
    const statusVal = target.is_active ? 'Active' : 'Inactive';
    if (isUpdate) updateObj.status = statusVal;
    else doc.status = statusVal;
  }
};

// Hashing password and resolving refs before saving
userSchema.pre('save', async function (next) {
  try {
    await resolveReferences(this, false);
    
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Hashing password and resolving refs before findOneAndUpdate
userSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.$set) {
    try {
      await resolveReferences(null, true, update.$set);
      
      if (update.$set.password) {
        const salt = await bcrypt.genSalt(10);
        update.$set.password = await bcrypt.hash(update.$set.password, salt);
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ mobile: 1 });
userSchema.index({ employee_id: 1 });
userSchema.index({ user_code: 1 });
userSchema.index({ status: 1 });

const User = mongoose.model('User', userSchema);
export default User;
