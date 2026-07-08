import mongoose from 'mongoose';
import ProductVariant from '../models/ProductVariant.js';
import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import LabelBatch from '../models/LabelBatch.js';
import { adjustVariantStock, findCanonicalVariantForSize } from '../utils/inventoryService.js';

/**
 * POST /api/v1/inventory/add
 * Body: { product, size, quantity, note?, generate_labels? }
 *       or legacy { product_variant, quantity, ... }
 * Stock is tracked per product + size (not per color).
 */
export const addInventory = async (req, res, next) => {
  try {
    const {
      product_variant: variantId,
      product: productId,
      size,
      quantity,
      note,
      generate_labels: generateLabels = true
    } = req.body;

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number.', data: null });
    }

    let variant = null;
    if (productId && size) {
      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ success: false, message: 'A valid product is required.', data: null });
      }
      variant = await findCanonicalVariantForSize(productId, size);
      if (!variant) {
        return res.status(404).json({ success: false, message: `No variant found for size ${size}.`, data: null });
      }
    } else if (variantId && mongoose.isValidObjectId(variantId)) {
      variant = await ProductVariant.findById(variantId).populate('product');
      if (!variant || variant.is_deleted) {
        return res.status(404).json({ success: false, message: 'Product variant not found.', data: null });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Product and size are required.',
        data: null
      });
    }

    const product = variant.product;

    const { transaction } = await adjustVariantStock({
      variant,
      delta: qty,
      type: 'add',
      source: 'manual',
      referenceType: 'manual',
      note: note || 'Manual inventory addition',
      user: req.user
    });

    let batch = null;
    if (generateLabels) {
      batch = await new LabelBatch({
        product: product?._id,
        product_variant: variant._id,
        inventory_transaction: transaction._id,
        product_name: product?.name,
        article_no: product?.sku,
        size: variant.size,
        color: variant.color,
        colors_text: product?.colour
          || (Array.isArray(product?.colors) ? product.colors.join(' | ') : variant.color),
        hsn_code: product?.hsn_code,
        mrp: Number(variant.mrp) || Number(product?.mrp) || 0,
        quantity: qty,
        barcode_value: variant.sku_variant,
        created_by: req.user?._id,
        created_by_name: req.user?.name
      }).save();

      transaction.reference_type = 'label-batch';
      transaction.reference_id = batch._id;
      transaction.reference_label = batch.batch_number;
      await transaction.save();
    }

    res.status(201).json({
      success: true,
      message: `Added ${qty} unit(s) to inventory. New stock: ${variant.stock_quantity}.`,
      data: {
        variant: {
          _id: variant._id,
          sku_variant: variant.sku_variant,
          size: variant.size,
          color: variant.color,
          stock_quantity: variant.stock_quantity
        },
        transaction,
        batch
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inventory/transactions
 * Query: product, product_variant, type, limit
 */
export const getInventoryTransactions = async (req, res, next) => {
  try {
    const { product, product_variant: variant, type, limit = 200 } = req.query;
    const criteria = { is_deleted: { $ne: true } };
    if (product && mongoose.isValidObjectId(product)) criteria.product = product;
    if (variant && mongoose.isValidObjectId(variant)) criteria.product_variant = variant;
    if (type) criteria.type = type;

    const transactions = await InventoryTransaction.find(criteria)
      .populate('product', 'name sku')
      .populate('product_variant', 'sku_variant size color')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({ success: true, message: 'Inventory transactions retrieved.', data: transactions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inventory/label-batches
 */
export const getLabelBatches = async (req, res, next) => {
  try {
    const { product, limit = 200 } = req.query;
    const criteria = { is_deleted: { $ne: true } };
    if (product && mongoose.isValidObjectId(product)) criteria.product = product;

    const batches = await LabelBatch.find(criteria)
      .populate('product', 'name sku image')
      .populate('product_variant', 'sku_variant size color')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({ success: true, message: 'Label batches retrieved.', data: batches });
  } catch (error) {
    next(error);
  }
};

export const getLabelBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID.', data: null });
    }
    const batch = await LabelBatch.findById(id)
      .populate('product', 'name sku image')
      .populate('product_variant', 'sku_variant size color');
    if (!batch || batch.is_deleted) {
      return res.status(404).json({ success: false, message: 'Label batch not found.', data: null });
    }
    res.status(200).json({ success: true, message: 'Label batch retrieved.', data: batch });
  } catch (error) {
    next(error);
  }
};

const markLabelBatch = (field, dateField) => async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID.', data: null });
    }
    const batch = await LabelBatch.findByIdAndUpdate(
      id,
      { $inc: { [field]: 1 }, $set: { [dateField]: new Date() } },
      { new: true }
    );
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Label batch not found.', data: null });
    }
    res.status(200).json({ success: true, message: 'Label batch updated.', data: batch });
  } catch (error) {
    next(error);
  }
};

export const markLabelBatchPrinted = markLabelBatch('print_count', 'last_printed_at');
export const markLabelBatchDownloaded = markLabelBatch('download_count', 'last_downloaded_at');

/**
 * GET /api/v1/inventory/stock-levels
 * Returns one row per product + size (color is not part of inventory tracking).
 */
export const getStockLevels = async (req, res, next) => {
  try {
    const variants = await ProductVariant.find({ is_deleted: { $ne: true } })
      .populate({
        path: 'product',
        select: 'name sku category',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ createdAt: 1 });

    const seen = new Set();
    const levels = [];

    for (const variant of variants) {
      if (!variant.product) continue;
      const key = `${variant.product._id}::${variant.size}`;
      if (seen.has(key)) continue;
      seen.add(key);

      levels.push({
        _id: key,
        product: variant.product,
        size: variant.size,
        stock_quantity: Number(variant.stock_quantity) || 0,
        canonical_variant: variant._id,
        sku_variant: variant.sku_variant
      });
    }

    levels.sort((a, b) => a.stock_quantity - b.stock_quantity);

    res.status(200).json({
      success: true,
      message: 'Stock levels retrieved.',
      data: levels
    });
  } catch (error) {
    next(error);
  }
};
