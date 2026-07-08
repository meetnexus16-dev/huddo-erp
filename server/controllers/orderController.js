import Order from '../models/Order.js';
import ProductVariant from '../models/ProductVariant.js';
import { calculateAndStoreOrderCommissions } from '../utils/commissionEngine.js';
import { adjustVariantStock } from '../utils/inventoryService.js';

const APPROVER_ROLES = ['CityManager', 'StateManager', 'CountryManager', 'Founder', 'Admin'];

// POST /api/v1/orders/:id/approve — single-step approval (no multi-level chain)
export const approveOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
        data: null
      });
    }

    const userRole = req.user.role.name;
    if (!APPROVER_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only managers and admins can approve orders.',
        data: null
      });
    }

    if (order.status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Order is already approved.',
        data: null
      });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is cancelled and cannot be approved.',
        data: null
      });
    }

    // Validate stock availability across all order items before approving.
    const variantMap = new Map();
    const shortages = [];
    for (const item of order.items) {
      const variant = await ProductVariant.findById(item.product_variant).populate('product', 'name sku');
      if (!variant) {
        shortages.push(`Variant ${item.product_variant} not found`);
        continue;
      }
      variantMap.set(String(item.product_variant), variant);
      const available = Number(variant.stock_quantity) || 0;
      if (available < item.quantity) {
        shortages.push(
          `${variant.product?.name || variant.sku_variant} (${variant.color}/${variant.size}): need ${item.quantity}, only ${available} in stock`
        );
      }
    }

    if (shortages.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock to approve this order. ${shortages.join('; ')}.`,
        data: { shortages }
      });
    }

    const wasApproved = order.status === 'Approved';
    order.status = 'Approved';
    order.cancelled_reason = undefined;
    await order.save();

    // Deduct inventory and record a transaction per item.
    for (const item of order.items) {
      const variant = variantMap.get(String(item.product_variant));
      if (!variant) continue;
      try {
        await adjustVariantStock({
          variant,
          delta: -Math.abs(item.quantity),
          type: 'deduct',
          source: 'order',
          referenceType: 'order',
          referenceId: order._id,
          referenceLabel: order.order_number,
          note: `Order ${order.order_number} approved`,
          user: req.user
        });
      } catch (stockError) {
        console.error('[Inventory] Failed to deduct stock for order item:', stockError.message);
      }
    }

    if (!wasApproved && !order.commissions_calculated) {
      try {
        await calculateAndStoreOrderCommissions(order._id);
      } catch (commissionError) {
        console.error('[CommissionEngine] Failed to calculate commissions:', commissionError.message);
      }
    }

    const refreshedOrder = await Order.findById(order._id);

    res.status(200).json({
      success: true,
      message: remarks ? `Order approved. ${remarks}` : 'Order approved successfully.',
      data: refreshedOrder
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/orders/:id/reject
export const rejectOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Remarks/rejection reason is required.',
        data: null
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
        data: null
      });
    }

    const userRole = req.user.role.name;
    if (!APPROVER_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only managers and admins can reject orders.',
        data: null
      });
    }

    order.status = 'Cancelled';
    order.cancelled_reason = remarks;

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order rejected and cancelled.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};
