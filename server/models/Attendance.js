import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

const coordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, required: true }, // e.g. Start of the day
  date_str: { type: String }, // e.g. "2026-06-01"
  day_name: { type: String }, // e.g. "Monday"
  check_in: { type: Date },
  check_out: { type: Date },
  check_in_time: { type: String }, // e.g. "09:15 AM"
  check_out_time: { type: String }, // e.g. "06:10 PM"
  working_hours: { type: String }, // e.g. "8.9"
  check_in_location: coordinateSchema,
  check_out_location: coordinateSchema,
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'HalfDay', 'Half Day', 'Leave', 'Holiday', 'Weekend'], 
    required: true,
    default: 'Present'
  }
}, { timestamps: true });

attendanceSchema.plugin(softDeletePlugin);

// Unique attendance index for an employee on a specific date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
