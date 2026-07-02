import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';
import Retailer from '../models/Retailer.js';
import State from '../models/State.js';
import City from '../models/City.js';
import ProductVariant from '../models/ProductVariant.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import PettyCash from '../models/PettyCash.js';
import ReturnLog from '../models/ReturnLog.js';
import Invoice from '../models/Invoice.js';
import { triggerNotification } from '../utils/triggerNotification.js';
import { saveFileToDisk, deleteFileFromDisk } from '../utils/fileUpload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toObjectId = (id) => {
  if (!id) return null;
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
};

// ==========================================
// 1. HIERARCHY REVENUE
// ==========================================
export const getStateRevenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    let stateDoc;
    if (mongoose.isValidObjectId(id)) {
      stateDoc = await State.findById(id);
    } else {
      stateDoc = await State.findOne({ name: new RegExp('^' + id + '$', 'i') });
    }

    if (!stateDoc) {
      return res.status(404).json({ error: "State not found" });
    }

    // Find retailers under this state
    const stateRetailers = await Retailer.find({ state: stateDoc._id });
    const retailerIds = stateRetailers.map(r => r._id);

    // Sum confirmed order revenue
    const confirmedOrders = await Order.aggregate([
      {
        $match: {
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grand_total' }
        }
      }
    ]);

    const revenue = confirmedOrders[0] ? confirmedOrders[0].totalRevenue : 0;
    return res.status(200).json({ state: stateDoc.name, revenue });
  } catch (error) {
    next(error);
  }
};

export const getCityRevenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    let cityDoc;
    if (mongoose.isValidObjectId(id)) {
      cityDoc = await City.findById(id);
    } else {
      cityDoc = await City.findOne({ name: new RegExp('^' + id + '$', 'i') });
    }

    if (!cityDoc) {
      return res.status(404).json({ error: "City not found" });
    }

    // Find retailers under this city
    const cityRetailers = await Retailer.find({ city: cityDoc._id });
    const retailerIds = cityRetailers.map(r => r._id);

    // Sum confirmed order revenue
    const confirmedOrders = await Order.aggregate([
      {
        $match: {
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grand_total' }
        }
      }
    ]);

    const revenue = confirmedOrders[0] ? confirmedOrders[0].totalRevenue : 0;
    return res.status(200).json({ city: cityDoc.name, revenue });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. INVENTORY & QR TRANSACTIONS
// ==========================================
export const qrIn = async (req, res, next) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity) {
      return res.status(400).json({ error: "Product ID and Quantity are required" });
    }

    // Resolve variant (it could be variant ID, product ID or SKU)
    let variant = await ProductVariant.findById(toObjectId(product_id));
    if (!variant) {
      variant = await ProductVariant.findOne({ sku_variant: product_id.toUpperCase() });
    }
    if (!variant) {
      // Look up by product's SKU or ID
      let product = await Product.findById(toObjectId(product_id));
      if (!product) {
        product = await Product.findOne({ sku: product_id.toUpperCase() });
      }
      if (product) {
        variant = await ProductVariant.findOne({ product: product._id });
      }
    }

    if (!variant) {
      return res.status(455).json({ error: "Product variant not found" });
    }

    variant.stock_quantity += Number(quantity);
    await variant.save();

    return res.status(200).json({ success: true, message: "Stock successfully updated", stock: variant.stock_quantity });
  } catch (error) {
    next(error);
  }
};

export const qrOut = async (req, res, next) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity) {
      return res.status(400).json({ error: "Product ID and Quantity are required" });
    }

    // Resolve variant
    let variant = await ProductVariant.findById(toObjectId(product_id));
    if (!variant) {
      variant = await ProductVariant.findOne({ sku_variant: product_id.toUpperCase() });
    }
    if (!variant) {
      let product = await Product.findById(toObjectId(product_id));
      if (!product) {
        product = await Product.findOne({ sku: product_id.toUpperCase() });
      }
      if (product) {
        variant = await ProductVariant.findOne({ product: product._id });
      }
    }

    if (!variant) {
      return res.status(404).json({ error: "Product variant not found" });
    }

    if (variant.stock_quantity < Number(quantity)) {
      return res.status(400).json({ error: `Insufficient stock! Current stock: ${variant.stock_quantity}` });
    }

    variant.stock_quantity -= Number(quantity);
    await variant.save();

    // Trigger low stock alert if it drops below threshold of 10
    if (variant.stock_quantity <= 10) {
      const product = await Product.findById(variant.product);
      const productName = product ? product.name : 'Unknown Product';
      triggerNotification('inventory_low_stock_alert', {
        product_name: `${productName} (${variant.size} / ${variant.color})`,
        amount: variant.stock_quantity,
        date: new Date().toLocaleDateString(),
        recipient_email: 'admin@huddoerp.in'
      }).catch(err => console.error('[Low Stock Alert] Failed to dispatch notification:', err));
    }

    return res.status(200).json({ success: true, message: "Stock successfully updated", stock: variant.stock_quantity });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. RETURN STOCK LEDGER
// ==========================================
export const getReturnStock = async (req, res, next) => {
  try {
    const logs = await ReturnLog.find().sort({ createdAt: -1 });
    return res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

export const addReturnStock = async (req, res, next) => {
  try {
    const { product_id, quantity, reason, reference_no, notes, returned_by } = req.body;
    if (!product_id || !quantity || !reason) {
      return res.status(400).json({ error: "Product ID, Quantity, and Reason are required" });
    }

    // Resolve product variant info for logging
    let variant = await ProductVariant.findById(toObjectId(product_id)).populate('product');
    if (!variant) {
      variant = await ProductVariant.findOne({ sku_variant: product_id.toUpperCase() }).populate('product');
    }

    const productName = variant ? variant.product.name : 'Unknown Product';
    const sku = variant ? variant.sku_variant : product_id;

    // Log the return
    const log = new ReturnLog({
      product_id,
      productName,
      sku,
      quantity: Number(quantity),
      reason,
      reference_no,
      notes,
      returned_by
    });
    await log.save();

    // Increment stock level of variant as it is returned to inventory
    if (variant) {
      variant.stock_quantity += Number(quantity);
      await variant.save();
    }

    return res.status(201).json({ success: true, log });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. CUSTOMERS DIRECTORY
// ==========================================
export const getCustomers = async (req, res, next) => {
  try {
    const { search, city } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { customer_name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }
    if (city && city !== 'All') {
      query.city = { $regex: '^' + city + '$', $options: 'i' };
    }

    const customers = await Customer.find(query);
    return res.status(200).json(customers);
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Get order history from invoices
    const history = await Invoice.find({ customer_mobile: customer.mobile });
    return res.status(200).json({ customer, history });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. PETTY CASH LEDGER
// ==========================================
export const getPettyCash = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate } = req.query;
    const criteria = {};

    if (type && type !== 'All') {
      criteria.type = type.toLowerCase();
    }
    if (category && category !== 'All') {
      criteria.category = { $regex: '^' + category + '$', $options: 'i' };
    }
    if (startDate && endDate) {
      criteria.date = { $gte: startDate, $lte: endDate };
    }

    const list = await PettyCash.find(criteria).sort({ date: -1 });
    return res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

export const getPettyCashSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const criteria = {};

    if (startDate && endDate) {
      criteria.date = { $gte: startDate, $lte: endDate };
    }

    const list = await PettyCash.find(criteria);
    const totalIn = list.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const totalOut = list.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const netBalance = totalIn - totalOut;

    return res.status(200).json({ totalIn, totalOut, netBalance });
  } catch (error) {
    next(error);
  }
};

const handleReceiptUpload = async (file) => {
  if (!file) return null;

  // Validate allowed extensions: jpg, jpeg, png, webp, pdf
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF are allowed.');
  }

  // Validate maximum size: 5 MB
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File size exceeds the 5 MB limit.');
  }

  return await saveFileToDisk(file, 'petty-cash');
};

const deleteReceiptFile = (relativeFilePath) => {
  if (!relativeFilePath) return;
  let pathToDelete = relativeFilePath;
  if (!pathToDelete.startsWith('/')) {
    pathToDelete = '/' + pathToDelete;
  }
  deleteFileFromDisk(pathToDelete);
};

export const addPettyCash = async (req, res, next) => {
  try {
    const { date, description, amount, type, category, notes, receipt } = req.body;
    if (!description || !amount || !type || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let receipt_image = null;
    if (req.file) {
      try {
        receipt_image = await handleReceiptUpload(req.file);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const newEntry = new PettyCash({
      date: date || new Date().toISOString().split('T')[0],
      description,
      amount: Number(amount),
      type,
      category,
      notes,
      receipt_url: receipt,
      receipt_image
    });
    await newEntry.save();

    return res.status(201).json(newEntry);
  } catch (error) {
    next(error);
  }
};

export const updatePettyCash = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, description, amount, type, category, notes, receipt, delete_image } = req.body;

    const entry = await PettyCash.findById(id);
    if (!entry) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (description !== undefined) entry.description = description;
    if (amount !== undefined) entry.amount = Number(amount);
    if (type !== undefined) entry.type = type;
    if (category !== undefined) entry.category = category;
    if (notes !== undefined) entry.notes = notes;
    if (receipt !== undefined) entry.receipt_url = receipt;
    if (date !== undefined) entry.date = date;

    // Handle receipt image replacement or deletion
    if (req.file) {
      // User uploaded a replacement file
      try {
        const oldImage = entry.receipt_image;
        entry.receipt_image = await handleReceiptUpload(req.file);
        if (oldImage) {
          deleteReceiptFile(oldImage);
        }
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    } else if (delete_image === 'true' || delete_image === true) {
      // User requested deletion of current image
      const oldImage = entry.receipt_image;
      entry.receipt_image = null;
      if (oldImage) {
        deleteReceiptFile(oldImage);
      }
    }

    await entry.save();
    return res.status(200).json(entry);
  } catch (error) {
    next(error);
  }
};

export const deletePettyCash = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entry = await PettyCash.findById(id);
    if (!entry) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Delete associated file from server if it exists
    if (entry.receipt_image) {
      deleteReceiptFile(entry.receipt_image);
    }

    // Soft delete database record
    entry.is_deleted = true;
    await entry.save();

    return res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. BILLING CUSTOMER INFO SYNC & PERCENTAGE
// ==========================================
export const recordBillingCustomerInfo = async (req, res, next) => {
  try {
    const { invoice_id, customer_name, mobile, email, city, amount } = req.body;

    let customer = await Customer.findOne({ mobile });
    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpend += Number(amount);
      customer.lastOrderDate = new Date().toISOString().split('T')[0];
      await customer.save();
    } else {
      customer = new Customer({
        customer_name,
        mobile,
        email,
        city,
        totalOrders: 1,
        totalSpend: Number(amount),
        lastOrderDate: new Date().toISOString().split('T')[0]
      });
      await customer.save();
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getBillingPercentage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { percentage } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Apply the tax percentage calculation
    const tax = Math.round(invoice.amount * (Number(percentage) / 100));
    invoice.tax = tax;
    invoice.total = invoice.amount + tax;
    await invoice.save();

    return res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
};
