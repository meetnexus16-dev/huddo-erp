import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Upload from '../models/Upload.js';
import { saveFileToDisk } from '../utils/fileUpload.js';
import {
  enrichProductWithCommissions,
  getCategoryCommissions
} from '../utils/categoryCommission.js';

// Helper to generate SKU variant string
const generateVariantSku = (productSku, color, size) => {
  const cleanColor = String(color).replace('#', '').toUpperCase().substring(0, 8);
  const cleanSize = String(size).toUpperCase().replace(/\s+/g, '');
  return `${productSku.toUpperCase()}-${cleanColor}-SZ${cleanSize}`;
};

const parseJsonField = (field) => {
  if (!field) return undefined;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      return field;
    }
  }
  return field;
};

const processMultipartFiles = async (req) => {
  // Always parse JSON fields that might be stringified from FormData
  req.body.colorConfigs = parseJsonField(req.body.colorConfigs) || {};
  req.body.sizes = parseJsonField(req.body.sizes);
  req.body.colors = parseJsonField(req.body.colors);

  if (req.body.category !== undefined && req.body.category !== null && String(req.body.category).trim() !== '') {
    if (!mongoose.isValidObjectId(req.body.category)) {
      const ProductCategory = mongoose.model('ProductCategory');
      const catDoc = await ProductCategory.findOne({
        name: { $regex: new RegExp(`^${String(req.body.category).trim()}$`, 'i') },
        is_deleted: { $ne: true }
      });
      req.body.category = catDoc?._id || null;
    }
  } else {
    req.body.category = null;
  }

  if (req.files && req.files.length > 0) {
    // 1. Process main product image file
    const mainImageFile = req.files.find(f => f.fieldname === 'image');
    if (mainImageFile) {
      const fileUrl = await saveFileToDisk(mainImageFile, 'products');
      req.body.image = fileUrl;
    }

    // 2. Process colorConfigs files
    for (const file of req.files) {
      if (file.fieldname.startsWith('colorImage_')) {
        const color = file.fieldname.substring('colorImage_'.length);
        const fileUrl = await saveFileToDisk(file, 'products');
        
        if (!req.body.colorConfigs[color]) {
          req.body.colorConfigs[color] = {};
        }
        req.body.colorConfigs[color].image = fileUrl;
        req.body.colorConfigs[color].mode = 'custom';
      }
    }
  }

  if (req.body.mrp !== undefined && req.body.mrp !== '') req.body.mrp = Number(req.body.mrp);
  if (req.body.costPrice !== undefined && req.body.costPrice !== '') req.body.costPrice = Number(req.body.costPrice);
  if (req.body.margin !== undefined && req.body.margin !== '') req.body.margin = Number(req.body.margin);
  if (req.body.franchise_points !== undefined && req.body.franchise_points !== '') req.body.franchise_points = Number(req.body.franchise_points);

  delete req.body.retailerMargin;
  delete req.body.cityManagerIncentive;
  delete req.body.stateManagerIncentive;
  delete req.body.countryManagerIncentive;
  delete req.body.promoterRoyalty;
};

export const getAllProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100, // Show a larger page limit by default or respect query
      sort = 'createdAt',
      order = 'desc',
      search = '',
      ...filters
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const criteria = { is_deleted: { $ne: true } };

    if (req.user && req.user.company_id) {
      criteria.company_id = req.user.company_id;
    }

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== '') {
        if (mongoose.isValidObjectId(filters[key])) {
          criteria[key] = new mongoose.Types.ObjectId(filters[key]);
        } else if (filters[key] === 'true' || filters[key] === 'false') {
          criteria[key] = filters[key] === 'true';
        } else {
          criteria[key] = filters[key];
        }
      }
    });

    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortCriteria = { [sort]: sortOrder };

    const data = await Product.find(criteria)
      .populate('category')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum);

    const enrichedData = data.map((product) => enrichProductWithCommissions(product));

    const total = await Product.countDocuments(criteria);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully.',
      data: enrichedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID.',
        data: null
      });
    }

    const product = await Product.findById(id).populate('category');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        data: null
      });
    }

    const variants = await ProductVariant.find({ product: id, is_deleted: { $ne: true } });

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully.',
      data: enrichProductWithCommissions({
        ...product.toObject(),
        variants
      })
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    if (req.user && req.user.company_id) {
      req.body.company_id = req.user.company_id;
    }

    // Process uploaded files and parse JSON strings
    await processMultipartFiles(req);

    if (!req.body.category) {
      return res.status(400).json({
        success: false,
        message: 'Product category is required. Add a category in Product Categories first.',
        data: null
      });
    }

    const ProductCategory = mongoose.model('ProductCategory');
    const categoryDoc = await ProductCategory.findOne({
      _id: req.body.category,
      is_deleted: { $ne: true }
    });
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: 'Selected product category not found.',
        data: null
      });
    }

    // Extract size and color configs for variants
    const { sizes = [], colors = [], colorConfigs = {}, mrp, costPrice, margin } = req.body;
    const categoryCommissions = await getCategoryCommissions(req.body.category);
    const retailerMargin = categoryCommissions.retailer;

    const product = new Product(req.body);
    await product.save();

    // Variants require a size and color. When the category has no sizes/colors,
    // fall back to a single placeholder so a scannable variant still exists.
    const effectiveSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['One Size'];
    const effectiveColors = Array.isArray(colors) && colors.length > 0 ? colors : ['Default'];

    // Generate variants for each size/color combination
    const variants = [];
    for (const color of effectiveColors) {
      // Determine image for this color
      let colorImages = [];
      if (colorConfigs && colorConfigs[color] && colorConfigs[color].image) {
        colorImages = [colorConfigs[color].image];
      } else if (product.image) {
        colorImages = [product.image];
      }

      for (const size of effectiveSizes) {
        const skuVariant = generateVariantSku(product.sku, color, size);
        
        const variant = new ProductVariant({
          product: product._id,
          size: String(size),
          color,
          mrp: mrp || 0,
          selling_price: mrp ? (mrp * (1 - (retailerMargin || 20) / 100)) : 0,
          cost_price: costPrice || 0,
          margin_percentage: margin || 0,
          sku_variant: skuVariant,
          images: colorImages,
          stock_quantity: 0, // starts empty; stock is added via Add Inventory
          is_active: true
        });

        await variant.save();
        variants.push(variant);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Product and variants created successfully.',
      data: enrichProductWithCommissions({
        ...product.toObject(),
        variants
      })
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID.',
        data: null
      });
    }

    // Process uploaded files and parse JSON strings
    await processMultipartFiles(req);

    if (req.body.category !== undefined) {
      if (!req.body.category) {
        return res.status(400).json({
          success: false,
          message: 'Product category is required.',
          data: null
        });
      }

      const ProductCategory = mongoose.model('ProductCategory');
      const categoryDoc = await ProductCategory.findOne({
        _id: req.body.category,
        is_deleted: { $ne: true }
      });
      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: 'Selected product category not found.',
          data: null
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        data: null
      });
    }

    // Sync variants: sizes, colors, colorConfigs
    const { sizes = [], colors = [], colorConfigs = {}, mrp, costPrice, margin } = req.body;
    const categoryCommissions = await getCategoryCommissions(product.category);
    const retailerMargin = categoryCommissions.retailer;

    const effectiveSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['One Size'];
    const effectiveColors = Array.isArray(colors) && colors.length > 0 ? colors : ['Default'];

    const existingVariants = await ProductVariant.find({ product: id });
    const existingMap = new Map();
    existingVariants.forEach(v => {
      existingMap.set(`${v.color}-${v.size}`, v);
    });

    const activeKeys = new Set();
    const updatedVariants = [];

    for (const color of effectiveColors) {
      // Determine image for this color
      let colorImages = [];
      if (colorConfigs && colorConfigs[color] && colorConfigs[color].image) {
        colorImages = [colorConfigs[color].image];
      } else if (product.image) {
        colorImages = [product.image];
      }

      for (const size of effectiveSizes) {
        const key = `${color}-${size}`;
        activeKeys.add(key);

        const skuVariant = generateVariantSku(product.sku, color, size);
        let variant = existingMap.get(key);

        if (variant) {
          // Update existing variant
          variant.mrp = mrp || 0;
          variant.selling_price = mrp ? (mrp * (1 - (retailerMargin || 20) / 100)) : 0;
          variant.cost_price = costPrice || 0;
          variant.margin_percentage = margin || 0;
          variant.sku_variant = skuVariant;
          variant.images = colorImages;
          variant.is_deleted = false;
          variant.is_active = true;
          await variant.save();
        } else {
          // Create new variant
          variant = new ProductVariant({
            product: product._id,
            size: String(size),
            color,
            mrp: mrp || 0,
            selling_price: mrp ? (mrp * (1 - (retailerMargin || 20) / 100)) : 0,
            cost_price: costPrice || 0,
            margin_percentage: margin || 0,
            sku_variant: skuVariant,
            images: colorImages,
            stock_quantity: 0, // starts empty; stock is added via Add Inventory
            is_active: true
          });
          await variant.save();
        }
        updatedVariants.push(variant);
      }
    }

    // Soft delete any variants that are no longer active
    for (const variant of existingVariants) {
      const key = `${variant.color}-${variant.size}`;
      if (!activeKeys.has(key)) {
        variant.is_deleted = true;
        variant.is_active = false;
        await variant.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Product and variants updated successfully.',
      data: enrichProductWithCommissions({
        ...product.toObject(),
        variants: updatedVariants
      })
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID.',
        data: null
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        data: null
      });
    }

    product.is_deleted = true;
    await product.save();

    // Soft delete variants too
    await ProductVariant.updateMany(
      { product: id },
      { $set: { is_deleted: true, is_active: false } }
    );

    res.status(200).json({
      success: true,
      message: 'Product and associated variants deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
