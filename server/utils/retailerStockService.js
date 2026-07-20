import mongoose from 'mongoose';
import Order from '../models/Order.js';
import RetailSale from '../models/RetailSale.js';
import ProductVariant from '../models/ProductVariant.js';

export const PURCHASED_STATUSES = ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'];

/**
 * Returns a Map<variantIdString, purchasedQty> for a retailer from approved+ orders.
 */
export async function getPurchasedQtyByVariant(retailerId) {
  const rid = new mongoose.Types.ObjectId(String(retailerId));
  const rows = await Order.aggregate([
    {
      $match: {
        retailer: rid,
        status: { $in: PURCHASED_STATUSES },
        is_deleted: { $ne: true }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product_variant',
        qty: { $sum: '$items.quantity' }
      }
    }
  ]);
  const map = new Map();
  rows.forEach((r) => {
    if (r._id) map.set(String(r._id), Number(r.qty) || 0);
  });
  return map;
}

/**
 * Returns a Map<variantIdString, soldQty> for a retailer from retail sales.
 */
export async function getSoldQtyByVariant(retailerId) {
  const rid = new mongoose.Types.ObjectId(String(retailerId));
  const rows = await RetailSale.aggregate([
    {
      $match: {
        retailer: rid,
        is_deleted: { $ne: true }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product_variant',
        qty: { $sum: '$items.quantity' }
      }
    }
  ]);
  const map = new Map();
  rows.forEach((r) => {
    if (r._id) map.set(String(r._id), Number(r.qty) || 0);
  });
  return map;
}

/**
 * Available retailer stock = purchased − sold, with product/variant details.
 */
export async function getRetailerAvailableStock(retailerId) {
  const [purchased, sold] = await Promise.all([
    getPurchasedQtyByVariant(retailerId),
    getSoldQtyByVariant(retailerId)
  ]);

  const variantIds = [...new Set([...purchased.keys(), ...sold.keys()])];
  if (variantIds.length === 0) return [];

  const variants = await ProductVariant.find({
    _id: { $in: variantIds.map((id) => new mongoose.Types.ObjectId(id)) }
  }).populate({
    path: 'product',
    populate: { path: 'category', select: 'name' }
  });

  const items = [];
  for (const variant of variants) {
    const vid = String(variant._id);
    const purchasedQty = purchased.get(vid) || 0;
    const soldQty = sold.get(vid) || 0;
    const available = purchasedQty - soldQty;
    if (available <= 0 && purchasedQty <= 0) continue;

    const prod = variant.product || {};
    items.push({
      product_variant_id: variant._id,
      product_id: prod._id || prod,
      product_name: prod.name || 'Product',
      category: prod.category?.name || (typeof prod.category === 'string' ? prod.category : 'Footwear'),
      image: prod.image || null,
      size: variant.size,
      color: variant.color,
      sku_variant: variant.sku_variant,
      mrp: variant.mrp,
      selling_price: variant.selling_price,
      cost_price: variant.cost_price,
      purchased_qty: purchasedQty,
      sold_qty: soldQty,
      available_qty: Math.max(0, available)
    });
  }

  return items.sort((a, b) =>
    String(a.product_name).localeCompare(String(b.product_name)) ||
    String(a.size).localeCompare(String(b.size), undefined, { numeric: true })
  );
}

/**
 * Returns available qty for a single variant (purchased − sold).
 */
export async function getAvailableQtyForVariant(retailerId, variantId) {
  const [purchased, sold] = await Promise.all([
    getPurchasedQtyByVariant(retailerId),
    getSoldQtyByVariant(retailerId)
  ]);
  const vid = String(variantId);
  return Math.max(0, (purchased.get(vid) || 0) - (sold.get(vid) || 0));
}
