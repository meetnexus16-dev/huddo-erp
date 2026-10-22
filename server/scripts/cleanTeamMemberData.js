import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import GPSLog from '../models/GPSLog.js';
import CommissionRecord from '../models/CommissionRecord.js';
import RetailSale from '../models/RetailSale.js';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected successfully.");

    const [tasks, attendance, leaves, gps, comms, sales] = await Promise.all([
      Task.deleteMany({}),
      Attendance.deleteMany({}),
      LeaveRequest.deleteMany({}),
      GPSLog.deleteMany({}),
      CommissionRecord.deleteMany({
        commission_type: { $in: ['Bonus', 'ManualIncentive', 'SalesIncentive'] }
      }),
      RetailSale.deleteMany({ is_team_member_sale: true })
    ]);

    console.log("CLEANUP RESULTS:");
    console.log(`- Tasks deleted: ${tasks.deletedCount}`);
    console.log(`- Attendance records deleted: ${attendance.deletedCount}`);
    console.log(`- Leave Requests deleted: ${leaves.deletedCount}`);
    console.log(`- GPS Logs deleted: ${gps.deletedCount}`);
    console.log(`- Team member commission records deleted: ${comms.deletedCount}`);

    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

run();
