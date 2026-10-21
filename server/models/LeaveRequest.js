import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

const leaveRequestSchema = new mongoose.Schema({
  request_id: { type: String },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  leave_type: { 
    type: String, 
    enum: ['CL', 'SL', 'PL', 'EL', 'LWP', 'Casual Leave', 'Sick Leave', 'Earned Leave', 'Privilege Leave', 'Leave Without Pay'], 
    required: true,
    default: 'Casual Leave'
  },
  from_date: { type: Date, required: true },
  to_date: { type: Date, required: true },
  days: { type: Number, required: true, default: 1 },
  reason: { type: String, required: true },
  attachment_url: { type: String },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], 
    default: 'Pending' 
  },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

leaveRequestSchema.plugin(softDeletePlugin);

leaveRequestSchema.index({ employee: 1 });
leaveRequestSchema.index({ status: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
