import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'Founder', 'CEO', 'Admin', 'CountryManager', 
      'StateManager', 'CityManager', 'SalesManager', 'SalesExecutive',
      'PurchaseManager', 'InventoryManager', 'FinanceManager', 'HRManager',
      'Retailer', 'Distributor', 'TeamMember', 'Promoter'
    ]
  },
  permissions: [{
    module: { type: String, required: true },
    actions: [{
      type: String,
      enum: ['create', 'view', 'edit', 'delete', 'approve', 'reject', 'export', 'assign']
    }]
  }],
  is_custom: { type: Boolean, default: false }
}, { timestamps: true });

roleSchema.plugin(softDeletePlugin);



const Role = mongoose.model('Role', roleSchema);
export default Role;
