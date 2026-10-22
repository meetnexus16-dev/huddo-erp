import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

const systemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, trim: true }
}, { timestamps: true });

systemSettingSchema.plugin(softDeletePlugin);

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
export default SystemSetting;
