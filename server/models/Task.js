import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

const taskSchema = new mongoose.Schema({
  task_id: { type: String, required: true },
  title: { type: String, required: true },
  due_date: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  status: { 
    type: String, 
    enum: ['Not Started', 'In Progress', 'Completed'], 
    default: 'Not Started' 
  },
  notes: { type: String, default: '' },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

taskSchema.plugin(softDeletePlugin);
taskSchema.index({ task_id: 1 });
taskSchema.index({ status: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
