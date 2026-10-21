import mongoose from 'mongoose';
import { softDeletePlugin } from './plugins.js';

const notificationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['email', 'sms', 'whatsapp'], 
    required: true 
  },
  subject: { type: String }, // optional, for emails only
  body: { type: String, required: true },
  variables: [{ type: String }]
}, { timestamps: true });

notificationTemplateSchema.plugin(softDeletePlugin);



const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
export default NotificationTemplate;
