import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductCategory, {
  DEFAULT_CATEGORY_COMMISSIONS,
  DEFAULT_PROMOTER_COMMISSIONS
} from '../models/ProductCategory.js';
import {
  normalizeCommissionInput,
  normalizePromoterCommissionInput,
  resolveCommissionsFromCategory
} from '../utils/categoryCommission.js';

const parseCommissionPayload = (body = {}) => {
  const commissions = normalizeCommissionInput(body.commissions || body);
  const promoterCommissions = normalizePromoterCommissionInput(
    body.commissions?.promoterCommissions || body.promoterCommissions || commissions.promoterCommissions || {}
  );

  const result = {
    ...DEFAULT_CATEGORY_COMMISSIONS,
    ...commissions,
    promoterCommissions: {
      ...DEFAULT_PROMOTER_COMMISSIONS,
      ...promoterCommissions
    }
  };

  for (const [key, value] of Object.entries(result)) {
    if (key === 'promoterCommissions') {
      for (const [promoKey, promoValue] of Object.entries(value)) {
        if (Number.isNaN(promoValue) || promoValue < 0 || promoValue > 100) {
          throw new Error(`Invalid promoter commission value for ${promoKey}. Must be between 0 and 100.`);
        }
      }
      continue;
    }
    if (Number.isNaN(value) || value < 0 || value > 100) {
      throw new Error(`Invalid commission value for ${key}. Must be between 0 and 100.`);
    }
  }

  return result;
};

const serializeCategory = async (categoryDoc) => {
  const doc = categoryDoc.toObject ? categoryDoc.toObject() : categoryDoc;
  const productCount = await Product.countDocuments({
    category: doc._id,
    is_deleted: { $ne: true }
  });

  return {
    ...doc,
    commissions: resolveCommissionsFromCategory(doc),
    product_count: productCount
  };
};

export const getAllProductCategories = async (req, res, next) => {
  try {
    const categories = await ProductCategory.find({ is_deleted: { $ne: true } }).sort({ name: 1 });
    const data = await Promise.all(categories.map((category) => serializeCategory(category)));

    res.status(200).json({
      success: true,
      message: 'Product categories retrieved successfully.',
      data,
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        pages: 1
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProductCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.', data: null });
    }

    const category = await ProductCategory.findById(id);
    if (!category || category.is_deleted) {
      return res.status(404).json({ success: false, message: 'Product category not found.', data: null });
    }

    res.status(200).json({
      success: true,
      message: 'Product category retrieved successfully.',
      data: await serializeCategory(category)
    });
  } catch (error) {
    next(error);
  }
};

export const createProductCategory = async (req, res, next) => {
  try {
    const { name, code, description, is_active: isActive } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.', data: null });
    }

    const commissions = parseCommissionPayload(req.body);

    const category = new ProductCategory({
      name: name.trim(),
      code: code?.trim()?.toUpperCase() || undefined,
      description: description?.trim() || '',
      commissions,
      is_active: isActive !== false
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Product category created successfully.',
      data: await serializeCategory(category)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name or code already exists.', data: null });
    }
    if (error.message?.includes('Invalid commission')) {
      return res.status(400).json({ success: false, message: error.message, data: null });
    }
    next(error);
  }
};

export const updateProductCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.', data: null });
    }

    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name.trim();
    if (req.body.code !== undefined) update.code = req.body.code?.trim()?.toUpperCase() || undefined;
    if (req.body.description !== undefined) update.description = req.body.description?.trim() || '';
    if (req.body.is_active !== undefined) update.is_active = req.body.is_active === true || req.body.is_active === 'true';

    if (req.body.commissions || req.body.retailer !== undefined) {
      const existing = await ProductCategory.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Product category not found.', data: null });
      }
      update.commissions = parseCommissionPayload({
        ...resolveCommissionsFromCategory(existing),
        ...(req.body.commissions || req.body),
        promoterCommissions: {
          ...(resolveCommissionsFromCategory(existing).promoterCommissions || {}),
          ...(req.body.commissions?.promoterCommissions || req.body.promoterCommissions || {})
        }
      });
    }

    const category = await ProductCategory.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Product category not found.', data: null });
    }

    res.status(200).json({
      success: true,
      message: 'Product category updated successfully. Commission changes apply to all products in this category.',
      data: await serializeCategory(category)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name or code already exists.', data: null });
    }
    if (error.message?.includes('Invalid commission')) {
      return res.status(400).json({ success: false, message: error.message, data: null });
    }
    next(error);
  }
};

export const deleteProductCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.', data: null });
    }

    const linkedProducts = await Product.countDocuments({ category: id, is_deleted: { $ne: true } });
    if (linkedProducts > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category linked to ${linkedProducts} product(s). Reassign products first.`,
        data: null
      });
    }

    const category = await ProductCategory.findByIdAndUpdate(
      id,
      { $set: { is_deleted: true, is_active: false } },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Product category not found.', data: null });
    }

    res.status(200).json({
      success: true,
      message: 'Product category deleted successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
