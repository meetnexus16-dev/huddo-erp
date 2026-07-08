import mongoose from 'mongoose';
import { softDeletePlugin, amountSchemaType } from './plugins.js';

const orderItemSchema = new mongoose.Schema({
  product_variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  quantity: { type: Number, required: true },
  unit_price: amountSchemaType,
  total_price: amountSchemaType
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changed_at: { type: Date, default: Date.now },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String }
}, { _id: false });

const approvalStageSchema = new mongoose.Schema({
  level: { 
    type: String, 
    enum: ['CityManager', 'StateManager', 'CountryManager', 'Founder'], 
    required: true 
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  remarks: { type: String },
  actioned_at: { type: Date }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  order_number: { type: String, unique: true },
  retailer: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true },
  items: [orderItemSchema],
  subtotal: amountSchemaType,
  tax_amount: amountSchemaType,
  discount_amount: amountSchemaType,
  grand_total: amountSchemaType,
  payment_screenshot: { type: String },
  utr_number: { type: String },
  transaction_number: { type: String },
  payment_status: { 
    type: String, 
    enum: ['Pending', 'Verified', 'Failed'], 
    default: 'Pending' 
  },
  status: { 
    type: String, 
    enum: ['Draft', 'Submitted', 'Approved', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'], 
    default: 'Draft' 
  },
  approval_chain: [approvalStageSchema],
  status_history: [statusHistorySchema],
  dispatch_details: {
    courier: { type: String },
    tracking_number: { type: String },
    dispatched_at: { type: Date }
  },
  delivered_at: { type: Date },
  cancelled_reason: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commissions_calculated: { type: Boolean, default: false },
  commission_snapshot: {
    calculated_at: { type: Date },
    structure_version: { type: String },
    items: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product_variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
      product_category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
      category_name: { type: String },
      franchise_points: { type: Number },
      quantity: { type: Number },
      rates: {
        cityManager: { type: Number },
        stateManager: { type: Number },
        countryManager: { type: Number },
        promoterCommissions: { type: mongoose.Schema.Types.Mixed },
        promoterFallbackByRole: { type: mongoose.Schema.Types.Mixed },
        /** @deprecated */
        promoterBase: { type: Number },
        /** @deprecated */
        promoterBonusByRole: { type: mongoose.Schema.Types.Mixed }
      }
    }],
    recipients: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String },
      commission_type: { type: String },
      total_amount: { type: Number },
      lines: [{ description: String, amount: Number, percentage: Number }]
    }]
  }
}, { timestamps: true });

orderSchema.plugin(softDeletePlugin);

// Auto-generate order number before saving if not present
orderSchema.pre('save', async function (next) {
  if (!this.order_number) {
    const today = new Date();
    const dateString = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
    // We append a random 4-digit number to guarantee uniqueness in concurrency
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.order_number = `ORD-${dateString}-${randomSuffix}`;
  }
  next();
});

// Maintain a status history log with timestamps on create and on every status change.
orderSchema.pre('save', function (next) {
  if (!Array.isArray(this.status_history)) {
    this.status_history = [];
  }

  const changedBy = this.$locals?.statusChangedBy || this.created_by || null;

  if (this.isNew) {
    if (this.status_history.length === 0) {
      this.status_history.push({
        status: this.status,
        changed_at: new Date(),
        changed_by: changedBy,
        note: this.$locals?.statusNote || 'Order created'
      });
    }
  } else if (this.isModified('status')) {
    this.status_history.push({
      status: this.status,
      changed_at: new Date(),
      changed_by: changedBy,
      note: this.$locals?.statusNote || `Status changed to ${this.status}`
    });
  }

  next();
});

// Capture status changes made via findOneAndUpdate / findByIdAndUpdate (e.g. generic PUT).
orderSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate() || {};
    const newStatus = update.status ?? update.$set?.status;
    if (!newStatus) return next();

    const current = await this.model.findOne(this.getQuery()).select('status');
    if (current && current.status === newStatus) return next();

    if (!update.$push) update.$push = {};
    update.$push.status_history = {
      status: newStatus,
      changed_at: new Date(),
      note: `Status changed to ${newStatus}`
    };
    this.setUpdate(update);
    next();
  } catch (error) {
    next(error);
  }
});

orderSchema.index({ order_number: 1 });
orderSchema.index({ retailer: 1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
