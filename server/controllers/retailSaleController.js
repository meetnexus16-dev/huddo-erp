import mongoose from 'mongoose';
import RetailSale from '../models/RetailSale.js';
import Retailer from '../models/Retailer.js';
import ProductVariant from '../models/ProductVariant.js';
import {
  getRetailerAvailableStock,
  getAvailableQtyForVariant
} from '../utils/retailerStockService.js';

/**
 * Resolve the Retailer document for the logged-in user.
 * Founders/admins may pass ?retailer= or body.retailer.
 */
async function resolveRetailerForRequest(req, { allowOverride = false } = {}) {
  const roleName = req.user?.role?.name || '';
  const isStaff = ['Founder', 'Admin', 'CEO', 'CountryManager', 'StateManager', 'CityManager'].includes(roleName);

  const overrideId = allowOverride
    ? (req.query.retailer || req.body?.retailer || null)
    : null;

  if (overrideId && isStaff) {
    const retailer = await Retailer.findById(overrideId)
      .populate({ path: 'city', populate: { path: 'state', populate: { path: 'country' } } })
      .populate({ path: 'state', populate: { path: 'country' } });
    if (!retailer) {
      const err = new Error('Retailer not found.');
      err.statusCode = 404;
      throw err;
    }
    return retailer;
  }

  const retailer = await Retailer.findOne({ user: req.user._id })
    .populate({ path: 'city', populate: { path: 'state', populate: { path: 'country' } } })
    .populate({ path: 'state', populate: { path: 'country' } });

  if (!retailer) {
    const err = new Error('No retailer profile linked to this user.');
    err.statusCode = 404;
    throw err;
  }
  return retailer;
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function clampPercent(n) {
  const v = Number(n) || 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/**
 * GET /api/v1/retailer/stock
 * Available inventory for the logged-in retailer (purchased − sold).
 */
export const getMyStock = async (req, res, next) => {
  try {
    const retailer = await resolveRetailerForRequest(req, { allowOverride: true });
    const stock = await getRetailerAvailableStock(retailer._id);
    res.status(200).json({
      success: true,
      data: stock,
      meta: {
        retailer_id: retailer._id,
        business_name: retailer.business_name,
        total_skus: stock.length,
        total_available_pairs: stock.reduce((s, i) => s + (i.available_qty || 0), 0)
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/v1/retailer/sales
 */
export const listMySales = async (req, res, next) => {
  try {
    const retailer = await resolveRetailerForRequest(req, { allowOverride: true });
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { retailer: retailer._id };
    const [rows, total] = await Promise.all([
      RetailSale.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.product', 'name sku')
        .populate('items.product_variant', 'size color sku_variant'),
      RetailSale.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: rows,
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/v1/retailer/sales/:id
 */
export const getMySaleById = async (req, res, next) => {
  try {
    const retailer = await resolveRetailerForRequest(req, { allowOverride: true });
    const sale = await RetailSale.findOne({ _id: req.params.id, retailer: retailer._id })
      .populate('items.product', 'name sku')
      .populate('items.product_variant', 'size color sku_variant mrp selling_price');

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/v1/retailer/sales
 * Body: {
 *   items: [{ product_variant, quantity, discount_percent? }],
 *   discount_mode?: 'none'|'line'|'bill',
 *   bill_discount_percent?: number,
 *   note?: string
 * }
 */
export const createSale = async (req, res, next) => {
  try {
    const retailer = await resolveRetailerForRequest(req, { allowOverride: false });
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one product to the sale.' });
    }

    let discountMode = String(req.body?.discount_mode || 'none').toLowerCase();
    if (!['none', 'line', 'bill'].includes(discountMode)) discountMode = 'none';
    const billDiscountPercent = discountMode === 'bill' ? clampPercent(req.body?.bill_discount_percent) : 0;

    // Merge duplicate variants
    const qtyByVariant = new Map();
    const lineDiscountByVariant = new Map();
    for (const row of rawItems) {
      const vid = String(row.product_variant || row.variant_id || '');
      if (!mongoose.Types.ObjectId.isValid(vid)) {
        return res.status(400).json({ success: false, message: `Invalid product variant: ${vid}` });
      }
      const qty = Math.floor(Number(row.quantity) || 0);
      if (qty <= 0) {
        return res.status(400).json({ success: false, message: 'Each item must have quantity ≥ 1.' });
      }
      qtyByVariant.set(vid, (qtyByVariant.get(vid) || 0) + qty);
      if (discountMode === 'line') {
        const existing = lineDiscountByVariant.get(vid) || 0;
        lineDiscountByVariant.set(vid, Math.max(existing, clampPercent(row.discount_percent)));
      }
    }

    const variantIds = [...qtyByVariant.keys()];
    const variants = await ProductVariant.find({ _id: { $in: variantIds } }).populate('product');
    if (variants.length !== variantIds.length) {
      return res.status(400).json({ success: false, message: 'One or more product variants were not found.' });
    }

    const variantMap = new Map(variants.map((v) => [String(v._id), v]));

    // Validate stock for each line
    for (const [vid, qty] of qtyByVariant.entries()) {
      const available = await getAvailableQtyForVariant(retailer._id, vid);
      if (qty > available) {
        const v = variantMap.get(vid);
        const name = v?.product?.name || 'Product';
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${name} (${v?.size}/${v?.color}). Available: ${available} pairs, requested: ${qty}.`
        });
      }
    }

    const saleItems = [];
    let subtotal = 0;

    for (const [vid, qty] of qtyByVariant.entries()) {
      const variant = variantMap.get(vid);
      const unitPrice = Number(variant.selling_price) || Number(variant.mrp) || 0;
      const lineDiscountPercent = discountMode === 'line' ? (lineDiscountByVariant.get(vid) || 0) : 0;
      const lineSubtotal = roundMoney(unitPrice * qty);
      const lineDiscountAmount = roundMoney(lineSubtotal * (lineDiscountPercent / 100));
      const lineTotal = roundMoney(lineSubtotal - lineDiscountAmount);
      subtotal = roundMoney(subtotal + lineTotal);

      saleItems.push({
        product: variant.product?._id || variant.product,
        product_variant: variant._id,
        product_name: variant.product?.name || '',
        sku_variant: variant.sku_variant,
        size: variant.size,
        color: variant.color,
        quantity: qty,
        unit_price: unitPrice,
        discount_percent: lineDiscountPercent,
        line_subtotal: lineSubtotal,
        line_discount_amount: lineDiscountAmount,
        line_total: lineTotal
      });
    }

    const billDiscountAmount = discountMode === 'bill'
      ? roundMoney(subtotal * (billDiscountPercent / 100))
      : 0;
    const grandTotal = roundMoney(subtotal - billDiscountAmount);
    const totalDiscount = discountMode === 'bill'
      ? billDiscountAmount
      : roundMoney(saleItems.reduce((s, i) => s + (Number(i.line_discount_amount) || 0), 0));

    // Geo snapshot
    const cityDoc = retailer.city;
    const stateDoc = retailer.state || cityDoc?.state;
    const countryDoc = stateDoc?.country || cityDoc?.state?.country;

    const sale = await RetailSale.create({
      retailer: retailer._id,
      items: saleItems,
      discount_mode: discountMode,
      bill_discount_percent: billDiscountPercent,
      subtotal,
      discount_amount: totalDiscount,
      grand_total: grandTotal,
      city: cityDoc?._id || cityDoc || null,
      state: stateDoc?._id || stateDoc || null,
      country: countryDoc?._id || countryDoc || null,
      city_name: cityDoc?.name || '',
      state_name: stateDoc?.name || '',
      country_name: countryDoc?.name || '',
      note: req.body?.note || '',
      created_by: req.user._id
    });

    const populated = await RetailSale.findById(sale._id)
      .populate('items.product', 'name sku')
      .populate('items.product_variant', 'size color sku_variant');

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully. Inventory updated.',
      data: populated
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};
