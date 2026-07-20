import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { checkPermission } from '../middleware/rbac.js';
import { genericController } from '../controllers/genericController.js';
import { getProfile, updateProfile, uploadPhoto, removePhoto } from '../controllers/profileController.js';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import {
  getAllProductCategories,
  getProductCategoryById,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory
} from '../controllers/productCategoryController.js';

// Auth Controller imports
import {
  register,
  verifyOTP,
  sendOTP,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword
} from '../controllers/authController.js';

// Order Controller imports
import { approveOrder, rejectOrder, updateOrderStatus } from '../controllers/orderController.js';

// Dashboard Controller imports
import {
  getFounderDashboard,
  getCountryDashboard,
  getStateDashboard,
  getCityDashboard,
  getRetailerDashboard,
  getEmployeeDashboard,
  getPromoterDashboard,
  getMyDashboard
} from '../controllers/dashboardController.js';

import { getReport } from '../controllers/reportController.js';
import {
  assignHierarchyManager,
  createHierarchyManagerUser,
  getCeoCandidates,
  getAssignedManagers,
  getAvailableCountries,
  getCitiesWithHierarchyStats,
  getCountriesWithHierarchyStats,
  getStatesWithHierarchyStats,
  validateCountryForManager,
  getGeoCascade
} from '../controllers/hierarchyController.js';

// Custom business logic imports
import {
  getStateRevenue,
  getCityRevenue,
  qrIn,
  qrOut,
  getReturnStock,
  addReturnStock,
  getCustomers,
  getCustomerById,
  getPettyCash,
  getPettyCashSummary,
  addPettyCash,
  updatePettyCash,
  deletePettyCash,
  recordBillingCustomerInfo,
  getBillingPercentage
} from '../controllers/customController.js';

// Inventory add + label batch controller
import {
  addInventory,
  getInventoryTransactions,
  getLabelBatches,
  getLabelBatchById,
  markLabelBatchPrinted,
  markLabelBatchDownloaded,
  getStockLevels
} from '../controllers/inventoryController.js';

// Upload Middleware import
import upload from '../middleware/upload.js';

// Communication Settings imports
import {
  getCommunicationSettings,
  updateSMTPSettings,
  updateSMSSettings,
  updateWhatsAppSettings,
  updateGlobalPreferences,
  revealCredential,
  sendTestEmailController,
  sendTestSMSController,
  sendTestWhatsAppController,
  getCommunicationLogs,
  retryCommunicationLog,
  getNotificationTemplates,
  updateNotificationTemplate
} from '../controllers/communicationSettingsController.js';

// Model imports for registration
import CommunicationSetting from '../models/CommunicationSetting.js';
import SMTPSetting from '../models/SMTPSetting.js';
import SMSSetting from '../models/SMSSetting.js';
import WhatsAppSetting from '../models/WhatsAppSetting.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import CommunicationLog from '../models/CommunicationLog.js';

// Model imports
import User from '../models/User.js';
import Role from '../models/Role.js';
import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import Employee from '../models/Employee.js';
import Promoter from '../models/Promoter.js';
import Retailer from '../models/Retailer.js';
import ProductCategory from '../models/ProductCategory.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import CommissionStructure from '../models/CommissionStructure.js';
import CommissionRecord from '../models/CommissionRecord.js';
import TerritoryAllocation from '../models/TerritoryAllocation.js';
import Target from '../models/Target.js';
import Attendance from '../models/Attendance.js';
import GPSLog from '../models/GPSLog.js';
import RetailerVisit from '../models/RetailerVisit.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Team from '../models/Team.js';
import Vendor from '../models/Vendor.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Warehouse from '../models/Warehouse.js';
import StockRecord from '../models/StockRecord.js';
import StockTransfer from '../models/StockTransfer.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Payroll from '../models/Payroll.js';
import PerformanceReview from '../models/PerformanceReview.js';
import Customer from '../models/Customer.js';
import PettyCash from '../models/PettyCash.js';
import Lead from '../models/Lead.js';
import ReturnLog from '../models/ReturnLog.js';
import Upload from '../models/Upload.js';
import { saveFileToDisk } from '../utils/fileUpload.js';
import countryManagerRouter from './countryManagerRouter.js';
import promoterRouter from './promoterRouter.js';
import onboardingRouter from './onboardingRouter.js';
import geoRouter from './geoRouter.js';
import networkRouter from './networkRouter.js';
import stateManagerRouter from './stateManagerRouter.js';
import managerRouter from './managerRouter.js';
import {
  listPromoterBonusStructures,
  upsertPromoterBonusStructure,
  deletePromoterBonusStructure
} from '../controllers/promoterBonusController.js';
import { createManagerPayment, listManagerPayments } from '../controllers/managerPaymentController.js';
import {
  getRetailerBillingSummary,
  recordRetailerPayment,
  listRetailerPaymentsAdmin
} from '../controllers/billingController.js';
import {
  getMyStock,
  listMySales,
  getMySaleById,
  createSale
} from '../controllers/retailSaleController.js';
import { getProductPerformance } from '../controllers/productAnalyticsController.js';

const router = express.Router();

router.use('/country-managers', countryManagerRouter);
router.use('/promoters', promoterRouter);
router.use('/onboarding', onboardingRouter);
router.use('/geo', geoRouter);
router.use('/network', networkRouter);
router.use('/state-managers', stateManagerRouter);
router.use('/manager', managerRouter);

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/register', register);
router.post('/auth/verify-otp', verifyOTP);
router.post('/auth/send-otp', sendOTP);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.post('/auth/refresh-token', refreshToken);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/change-password', verifyJWT, changePassword);

// Profile Routes
router.get('/profile', verifyJWT, getProfile);
router.put('/profile', verifyJWT, updateProfile);
router.post('/profile/upload-photo', verifyJWT, upload.single('profile_photo'), uploadPhoto);
router.post('/profile/remove-photo', verifyJWT, removePhoto);

// ==========================================
// 2. DASHBOARD ROUTES (Protected)
// ==========================================
router.get('/dashboard/founder', verifyJWT, checkPermission('dashboard', 'view'), getFounderDashboard);
router.get('/dashboard/me', verifyJWT, getMyDashboard);
router.get('/dashboard/country/:id', verifyJWT, checkPermission('dashboard', 'view'), getCountryDashboard);
router.get('/dashboard/state/:id', verifyJWT, checkPermission('dashboard', 'view'), getStateDashboard);
router.get('/dashboard/city/:id', verifyJWT, checkPermission('dashboard', 'view'), getCityDashboard);
router.get('/dashboard/retailer/:id', verifyJWT, checkPermission('dashboard', 'view'), getRetailerDashboard);
router.get('/dashboard/employee/:id', verifyJWT, checkPermission('dashboard', 'view'), getEmployeeDashboard);
router.get('/dashboard/promoter/:id', verifyJWT, checkPermission('dashboard', 'view'), getPromoterDashboard);

// ==========================================
// 3. REPORT ROUTES (Protected)
// ==========================================
router.get('/reports/:type', verifyJWT, checkPermission('reports', 'export'), getReport);

// ==========================================
// 4. CUSTOM/SPECIAL ROUTES
// ==========================================
router.post('/orders/:id/approve', verifyJWT, checkPermission('orders', 'approve'), approveOrder);
router.post('/orders/:id/reject', verifyJWT, checkPermission('orders', 'reject'), rejectOrder);
router.post('/orders/:id/status', verifyJWT, checkPermission('orders', 'edit'), updateOrderStatus);

// Hierarchy Revenue & Manager Assignment
router.get('/hierarchy/state/:id/revenue', verifyJWT, getStateRevenue);
router.get('/hierarchy/city/:id/revenue', verifyJWT, getCityRevenue);
router.get('/hierarchy/assigned-managers', verifyJWT, getAssignedManagers);
router.get('/hierarchy/ceo-candidates', verifyJWT, getCeoCandidates);
router.get('/hierarchy/available-countries', verifyJWT, getAvailableCountries);
router.get('/hierarchy/geo-cascade', verifyJWT, getGeoCascade);
router.get('/hierarchy/validate-country', verifyJWT, validateCountryForManager);
router.post('/hierarchy/manager-users', verifyJWT, checkPermission('users', 'create'), createHierarchyManagerUser);
router.post('/hierarchy/assign-manager', verifyJWT, assignHierarchyManager);

// Hierarchy geo lists with live child counts (must register before generic CRUD)
router.get('/countries', verifyJWT, checkPermission('countries', 'view'), getCountriesWithHierarchyStats);
router.get('/states', verifyJWT, checkPermission('states', 'view'), getStatesWithHierarchyStats);
router.get('/cities', verifyJWT, checkPermission('cities', 'view'), getCitiesWithHierarchyStats);

// Inventory QR & Returns
router.post('/inventory/qr-in', verifyJWT, qrIn);
router.post('/inventory/qr-out', verifyJWT, qrOut);
router.get('/inventory/return-stock', verifyJWT, getReturnStock);
router.post('/inventory/return-stock', verifyJWT, addReturnStock);

// Inventory add + history + barcode label batches
router.post('/inventory/add', verifyJWT, checkPermission('stock-records', 'create'), addInventory);
router.get('/inventory/stock-levels', verifyJWT, checkPermission('stock-records', 'view'), getStockLevels);
router.get('/inventory/transactions', verifyJWT, checkPermission('stock-records', 'view'), getInventoryTransactions);
router.get('/inventory/label-batches', verifyJWT, checkPermission('stock-records', 'view'), getLabelBatches);
router.get('/inventory/label-batches/:id', verifyJWT, checkPermission('stock-records', 'view'), getLabelBatchById);
router.post('/inventory/label-batches/:id/printed', verifyJWT, checkPermission('stock-records', 'view'), markLabelBatchPrinted);
router.post('/inventory/label-batches/:id/downloaded', verifyJWT, checkPermission('stock-records', 'view'), markLabelBatchDownloaded);

// Customers Directory
router.get('/customers', verifyJWT, getCustomers);
router.get('/customers/:id', verifyJWT, getCustomerById);

// Petty Cash Ledger
router.get('/petty-cash', verifyJWT, checkPermission('petty-cash', 'view'), getPettyCash);
router.get('/petty-cash/summary', verifyJWT, checkPermission('petty-cash', 'view'), getPettyCashSummary);
router.post('/petty-cash/add', verifyJWT, checkPermission('petty-cash', 'create'), upload.single('receipt_image'), addPettyCash);
router.put('/petty-cash/:id', verifyJWT, checkPermission('petty-cash', 'edit'), upload.single('receipt_image'), updatePettyCash);
router.delete('/petty-cash/:id', verifyJWT, checkPermission('petty-cash', 'delete'), deletePettyCash);

// Billing & Payments Customer Sync
router.post('/billing/retailer/customer-info', verifyJWT, recordBillingCustomerInfo);
router.patch('/billing/:id/get-percentage', verifyJWT, getBillingPercentage);
router.get('/billing/retailer/summary', verifyJWT, getRetailerBillingSummary);
router.post('/billing/retailer/payments', verifyJWT, checkPermission('invoices', 'edit'), recordRetailerPayment);
router.get('/billing/retailer/payments', verifyJWT, checkPermission('invoices', 'view'), listRetailerPaymentsAdmin);

// Retailer POS sell-out (shop → customer) + stock (purchased − sold)
router.get('/retailer/stock', verifyJWT, getMyStock);
router.get('/retailer/sales', verifyJWT, listMySales);
router.get('/retailer/sales/:id', verifyJWT, getMySaleById);
router.post('/retailer/sales', verifyJWT, createSale);

// Product performance by country / state / city (from retail sell-out)
router.get('/analytics/product-performance', verifyJWT, checkPermission('reports', 'view'), getProductPerformance);

router.get('/promoter-bonus-structures', verifyJWT, checkPermission('commission-records', 'view'), listPromoterBonusStructures);
router.post('/promoter-bonus-structures', verifyJWT, checkPermission('commission-records', 'edit'), upsertPromoterBonusStructure);
router.delete('/promoter-bonus-structures/:id', verifyJWT, checkPermission('commission-records', 'delete'), deletePromoterBonusStructure);

router.get('/manager-payments', verifyJWT, listManagerPayments);
router.post('/manager-payments', verifyJWT, checkPermission('commission-records', 'create'), createManagerPayment);

// ==========================================
// 4B. COMMUNICATION SETTINGS ROUTES (Founder Only)
// ==========================================
const verifyFounder = (req, res, next) => {
  if (req.user && req.user.role && req.user.role.name === 'Founder') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Founder role required.' });
};

router.get('/communication-settings', verifyJWT, verifyFounder, getCommunicationSettings);
router.post('/communication-settings/smtp', verifyJWT, verifyFounder, updateSMTPSettings);
router.post('/communication-settings/sms', verifyJWT, verifyFounder, updateSMSSettings);
router.post('/communication-settings/whatsapp', verifyJWT, verifyFounder, updateWhatsAppSettings);
router.post('/communication-settings/global', verifyJWT, verifyFounder, updateGlobalPreferences);
router.post('/communication-settings/reveal', verifyJWT, verifyFounder, revealCredential);
router.post('/communication-settings/test-email', verifyJWT, verifyFounder, sendTestEmailController);
router.post('/communication-settings/test-sms', verifyJWT, verifyFounder, sendTestSMSController);
router.post('/communication-settings/test-whatsapp', verifyJWT, verifyFounder, sendTestWhatsAppController);
router.get('/communication-settings/logs', verifyJWT, verifyFounder, getCommunicationLogs);
router.post('/communication-settings/logs/retry/:id', verifyJWT, verifyFounder, retryCommunicationLog);
router.get('/communication-settings/templates', verifyJWT, verifyFounder, getNotificationTemplates);
router.put('/communication-settings/templates/:id', verifyJWT, verifyFounder, updateNotificationTemplate);

// ==========================================
// 5. FILE UPLOAD ROUTES (Protected)
// ==========================================
router.post('/upload/single', verifyJWT, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Allow callers to choose a target sub-folder (sanitized to prevent path traversal).
    const folder = String(req.body.folder || 'general').replace(/[^a-z0-9-_]/gi, '') || 'general';
    const fileUrl = await saveFileToDisk(req.file, folder);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully.',
      data: {
        url: fileUrl,
        original_name: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upload/multiple', verifyJWT, upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const uploadedFiles = [];
    for (const file of req.files) {
      const fileUrl = await saveFileToDisk(file, 'general');
      uploadedFiles.push({
        url: fileUrl,
        original_name: file.originalname,
        size: file.size
      });
    }

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully.',
      data: uploadedFiles
    });
  } catch (error) {
    next(error);
  }
});

router.get('/upload/files/:id', async (req, res, next) => {
  try {
    const fileDoc = await Upload.findById(req.params.id);
    if (!fileDoc) {
      return res.status(404).send('File not found');
    }
    const fileBuffer = Buffer.from(fileDoc.data, 'base64');
    res.set('Content-Type', fileDoc.mimetype);
    res.set('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. CUSTOM PRODUCT ROUTES (Pre-empting dynamic registration)
// ==========================================
router.get('/products', verifyJWT, checkPermission('products', 'view'), getAllProducts);
router.get('/products/:id', verifyJWT, checkPermission('products', 'view'), getProductById);
router.post('/products', verifyJWT, checkPermission('products', 'create'), upload.any(), createProduct);
router.put('/products/:id', verifyJWT, checkPermission('products', 'edit'), upload.any(), updateProduct);
router.delete('/products/:id', verifyJWT, checkPermission('products', 'delete'), deleteProduct);

router.get('/product-categories', verifyJWT, checkPermission('product-categories', 'view'), getAllProductCategories);
router.get('/product-categories/:id', verifyJWT, checkPermission('product-categories', 'view'), getProductCategoryById);
router.post('/product-categories', verifyJWT, checkPermission('product-categories', 'create'), createProductCategory);
router.put('/product-categories/:id', verifyJWT, checkPermission('product-categories', 'edit'), updateProductCategory);
router.delete('/product-categories/:id', verifyJWT, checkPermission('product-categories', 'delete'), deleteProductCategory);

// ==========================================
// 7. DYNAMIC CRUD REGISTRATION FOR ALL MODULES
// ==========================================
const modules = [
  { path: 'users', model: User, populate: ['role', 'country', 'state', 'city', 'department', 'designation', 'promoted_by'] },
  { path: 'roles', model: Role },
  { path: 'countries', model: Country, populate: ['manager'] },
  { path: 'states', model: State, populate: ['country', 'manager'] },
  { path: 'cities', model: City, populate: ['state', 'manager'] },
  { path: 'employees', model: Employee, populate: ['user', 'department', 'designation', 'reporting_manager'] },
  { path: 'retailers', model: Retailer, populate: ['user', 'state', 'city', 'assigned_promoter', 'assigned_city_manager'] },
  { path: 'product-variants', model: ProductVariant, populate: ['product'] },
  { path: 'orders', model: Order, populate: [
    { path: 'retailer', populate: [
      { path: 'city', populate: { path: 'state', populate: { path: 'country' } } },
      { path: 'state', populate: { path: 'country' } }
    ] },
    { path: 'items.product_variant', populate: { path: 'product', populate: { path: 'category' } } },
    { path: 'status_history.changed_by', select: 'name roleName' },
    'created_by'
  ] },
  { path: 'invoices', model: Invoice, populate: ['order', 'retailer'] },
  { path: 'commission-structures', model: CommissionStructure, populate: ['product'] },
  { path: 'commission-records', model: CommissionRecord, populate: ['user', 'order'] },
  { path: 'territory-allocations', model: TerritoryAllocation, populate: ['user', 'country', 'state', 'city', 'transferred_from'] },
  { path: 'targets', model: Target, populate: ['assigned_to'] },
  { path: 'attendance', model: Attendance, populate: ['employee'] },
  { path: 'gps-logs', model: GPSLog, populate: ['user'] },
  { path: 'retailer-visits', model: RetailerVisit, populate: ['employee', 'retailer', 'order_taken'] },
  { path: 'departments', model: Department, populate: ['head'] },
  { path: 'designations', model: Designation, populate: ['department'] },
  { path: 'teams', model: Team, populate: ['department', 'leader', 'members'] },
  { path: 'vendors', model: Vendor },
  { path: 'purchase-orders', model: PurchaseOrder, populate: ['vendor', 'approved_by'] },
  { path: 'warehouses', model: Warehouse, populate: ['manager'] },
  { path: 'stock-records', model: StockRecord, populate: ['product_variant', 'warehouse'] },
  { path: 'stock-transfers', model: StockTransfer, populate: ['from_warehouse', 'to_warehouse', 'product_variant', 'transferred_by'] },
  { path: 'notifications', model: Notification, populate: ['recipient'] },
  { path: 'audit-logs', model: AuditLog, populate: ['user'] },
  { path: 'leave-requests', model: LeaveRequest, populate: ['employee', 'approved_by'] },
  { path: 'payrolls', model: Payroll, populate: ['employee'] },
  { path: 'performance-reviews', model: PerformanceReview, populate: ['employee', 'reviewer'] },
  { path: 'leads', model: Lead },
  { path: 'return-logs', model: ReturnLog },
  { path: 'customers', model: Customer }
];

modules.forEach(({ path, model, populate = [] }) => {
  const controller = genericController(model, populate);
  
  // Register generic CRUD endpoints with RBAC checks
  // Module parameter to checkPermission is path itself (e.g. 'users', 'roles', 'orders')
  router.get(`/${path}`, verifyJWT, checkPermission(path, 'view'), controller.getAll);
  router.get(`/${path}/:id`, verifyJWT, checkPermission(path, 'view'), controller.getById);
  router.post(`/${path}`, verifyJWT, checkPermission(path, 'create'), controller.create);
  router.put(`/${path}/:id`, verifyJWT, checkPermission(path, 'edit'), controller.update);
  router.delete(`/${path}/:id`, verifyJWT, checkPermission(path, 'delete'), controller.delete);
});

export default router;
