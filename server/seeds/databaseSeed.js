import mongoose from 'mongoose';
import { loadEnv } from '../utils/loadEnv.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import Employee from '../models/Employee.js';
import Promoter from '../models/Promoter.js';
import PromoterBonusStructure from '../models/PromoterBonusStructure.js';
import Retailer from '../models/Retailer.js';
import ProductCategory from '../models/ProductCategory.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Target from '../models/Target.js';
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
import ReturnLog from '../models/ReturnLog.js';
import Attendance from '../models/Attendance.js';
import RetailerVisit from '../models/RetailerVisit.js';
import CommissionStructure from '../models/CommissionStructure.js';
import CommissionRecord from '../models/CommissionRecord.js';
import Lead from '../models/Lead.js';
import CommunicationSetting from '../models/CommunicationSetting.js';
import SMTPSetting from '../models/SMTPSetting.js';
import SMSSetting from '../models/SMSSetting.js';
import WhatsAppSetting from '../models/WhatsAppSetting.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import CommunicationLog from '../models/CommunicationLog.js';
import { encrypt } from '../utils/crypto.js';


loadEnv();

const defaultRoles = [
  { name: 'Founder', permissions: [{ module: '*', actions: ['create', 'view', 'edit', 'delete', 'approve', 'reject', 'export', 'assign'] }], is_custom: false },
  {
    name: 'CEO',
    permissions: [
      'users', 'roles', 'countries', 'states', 'cities',
      'employees', 'promoters', 'retailers', 'product-categories',
      'products', 'product-variants', 'orders', 'attendance',
      'gps-logs', 'retailer-visits', 'departments', 'designations',
      'teams', 'vendors', 'purchase-orders', 'warehouses',
      'stock-records', 'stock-transfers', 'notifications', 'audit-logs',
      'leave-requests', 'performance-reviews', 'leads', 'return-logs',
      'customers', 'dashboard', 'reports'
    ].map(mod => ({ module: mod, actions: ['create', 'view', 'edit', 'approve', 'reject', 'export', 'assign'] })),
    is_custom: false
  },
  { name: 'Admin', permissions: [{ module: '*', actions: ['create', 'view', 'edit', 'delete', 'approve', 'reject', 'export', 'assign'] }], is_custom: false },
  {
    name: 'CountryManager',
    permissions: [
      { module: 'countries', actions: ['view', 'assign'] },
      { module: 'states', actions: ['view', 'assign'] },
      { module: 'cities', actions: ['view', 'assign'] },
      { module: 'retailers', actions: ['view', 'approve'] },
      { module: 'orders', actions: ['view', 'approve', 'reject'] },
      { module: 'dashboard', actions: ['view'] },
      { module: 'reports', actions: ['view', 'export'] }
    ],
    is_custom: false
  },
  {
    name: 'StateManager',
    permissions: [
      { module: 'states', actions: ['view'] },
      { module: 'cities', actions: ['view', 'assign'] },
      { module: 'retailers', actions: ['view', 'approve'] },
      { module: 'orders', actions: ['view', 'approve', 'reject'] },
      { module: 'dashboard', actions: ['view'] },
      { module: 'reports', actions: ['view', 'export'] }
    ],
    is_custom: false
  },
  {
    name: 'CityManager',
    permissions: [
      { module: 'cities', actions: ['view'] },
      { module: 'retailers', actions: ['view', 'approve'] },
      { module: 'orders', actions: ['view', 'approve', 'reject'] },
      { module: 'dashboard', actions: ['view'] },
      { module: 'reports', actions: ['view', 'export'] }
    ],
    is_custom: false
  },
  {
    name: 'SalesManager',
    permissions: [
      { module: 'retailers', actions: ['create', 'view', 'edit'] },
      { module: 'orders', actions: ['create', 'view', 'edit', 'approve'] },
      { module: 'retailer-visits', actions: ['view'] },
      { module: 'targets', actions: ['view'] },
      { module: 'commissions', actions: ['view'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'SalesExecutive',
    permissions: [
      { module: 'retailers', actions: ['view'] },
      { module: 'orders', actions: ['create', 'view'] },
      { module: 'retailer-visits', actions: ['create', 'view'] },
      { module: 'targets', actions: ['view'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'PurchaseManager',
    permissions: [
      { module: 'vendors', actions: ['create', 'view', 'edit'] },
      { module: 'purchase-orders', actions: ['create', 'view', 'edit', 'approve', 'reject'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'InventoryManager',
    permissions: [
      { module: 'warehouses', actions: ['view'] },
      { module: 'stock-records', actions: ['create', 'view', 'edit'] },
      { module: 'stock-transfers', actions: ['create', 'view', 'edit', 'approve'] },
      { module: 'products', actions: ['view'] },
      { module: 'product-variants', actions: ['view'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'FinanceManager',
    permissions: [
      { module: 'invoices', actions: ['view', 'edit', 'approve'] },
      { module: 'commissions', actions: ['view', 'approve', 'reject'] },
      { module: 'payrolls', actions: ['create', 'view', 'edit'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'HRManager',
    permissions: [
      { module: 'employees', actions: ['create', 'view', 'edit'] },
      { module: 'attendance', actions: ['view', 'edit'] },
      { module: 'leave-requests', actions: ['view', 'approve', 'reject'] },
      { module: 'payrolls', actions: ['create', 'view', 'edit'] },
      { module: 'performance-reviews', actions: ['create', 'view', 'edit'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'Retailer',
    permissions: [
      { module: 'orders', actions: ['create', 'view'] },
      { module: 'invoices', actions: ['view'] },
      { module: 'dashboard', actions: ['view'] },
      { module: 'product-variants', actions: ['view'] },
      { module: 'products', actions: ['view'] },
      { module: 'retailers', actions: ['view'] },
      { module: 'retail-sales', actions: ['create', 'view'] }
    ],
    is_custom: false
  },
  {
    name: 'Distributor',
    permissions: [
      { module: 'orders', actions: ['create', 'view'] },
      { module: 'invoices', actions: ['view'] },
      { module: 'dashboard', actions: ['view'] },
      { module: 'product-variants', actions: ['view'] },
      { module: 'products', actions: ['view'] },
      { module: 'retailers', actions: ['view'] },
      { module: 'retail-sales', actions: ['create', 'view'] }
    ],
    is_custom: false
  },
  {
    name: 'TeamMember',
    permissions: [
      { module: 'attendance', actions: ['view'] },
      { module: 'leave-requests', actions: ['create', 'view'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'Promoter',
    permissions: [
      { module: 'retailers', actions: ['view'] },
      { module: 'orders', actions: ['view'] },
      { module: 'commissions', actions: ['view'] },
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  }
];

const seedData = async () => {
  try {
    let connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/huddo-erp';
    if (connStr === 'your_mongodb_connection_string') {
      connStr = 'mongodb://localhost:27017/huddo-erp';
    }

    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(connStr);
    console.log('[Seeder] Connected successfully.');

    // Clear existing data
    console.log('[Seeder] Cleaning existing collections...');
    await Role.deleteMany({});
    await User.deleteMany({});
    await Country.deleteMany({});
    await State.deleteMany({});
    await City.deleteMany({});
    await Employee.deleteMany({});
    await Promoter.deleteMany({});
    await PromoterBonusStructure.deleteMany({});
    await Retailer.deleteMany({});
    await ProductCategory.deleteMany({});
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});
    await Order.deleteMany({});
    await Invoice.deleteMany({});
    await Target.deleteMany({});
    await Department.deleteMany({});
    await Designation.deleteMany({});
    await Team.deleteMany({});
    await Vendor.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await Warehouse.deleteMany({});
    await StockRecord.deleteMany({});
    await StockTransfer.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    await LeaveRequest.deleteMany({});
    await Payroll.deleteMany({});
    await PerformanceReview.deleteMany({});
    await Customer.deleteMany({});
    await PettyCash.deleteMany({});
    await ReturnLog.deleteMany({});
    await Attendance.deleteMany({});
    await RetailerVisit.deleteMany({});
    await CommissionStructure.deleteMany({});
    await CommissionRecord.deleteMany({});
    await CommunicationSetting.deleteMany({});
    await SMTPSetting.deleteMany({});
    await SMSSetting.deleteMany({});
    await WhatsAppSetting.deleteMany({});
    await NotificationTemplate.deleteMany({});
    await CommunicationLog.deleteMany({});

    // 1. Seed Roles
    console.log('[Seeder] Seeding Roles...');
    const rolesMap = {};
    for (const r of defaultRoles) {
      const dbRole = new Role(r);
      await dbRole.save();
      rolesMap[r.name] = dbRole._id;
    }

    // Help resolve custom-scoped roles from UI labels
    rolesMap['Country Manager'] = rolesMap['CountryManager'];
    rolesMap['State Manager'] = rolesMap['StateManager'];
    rolesMap['City Manager'] = rolesMap['CityManager'];
    rolesMap['Sales Manager'] = rolesMap['SalesManager'];
    rolesMap['Sales Executive'] = rolesMap['SalesExecutive'];
    rolesMap['Purchase Manager'] = rolesMap['PurchaseManager'];
    rolesMap['Inventory Manager'] = rolesMap['InventoryManager'];
    rolesMap['Finance Manager'] = rolesMap['FinanceManager'];
    rolesMap['HR Manager'] = rolesMap['HRManager'];
    rolesMap['Team Member'] = rolesMap['TeamMember'];

    // 2. Seed default system users
    console.log('[Seeder] Seeding Users...');
    const usersMap = {};
    const defaultUsers = [
      { name: "Rohan Hudda", email: "rohan@huddoerp.in", mobile: "9876543210", roleName: "Founder", password: "password123" },
      { name: "Rajesh Sharma", email: "rajesh@huddoerp.in", mobile: "9812345678", roleName: "Country Manager", password: "password123" },
      { name: "Preeti Verma", email: "preeti@huddoerp.in", mobile: "9988776655", roleName: "State Manager", password: "password123" },
      { name: "Sanjay Joshi", email: "sanjay@huddoerp.in", mobile: "9560412345", roleName: "City Manager", password: "password123" },
      { name: "Vikram Malhotra", email: "vikram@huddoerp.in", mobile: "9123456789", roleName: "Finance Manager", password: "password123" },
      { name: "Neha Sen", email: "neha@huddoerp.in", mobile: "9001122334", roleName: "HR Manager", password: "password123" },
      { name: "Sunil Mehta", email: "sunil@huddoerp.in", mobile: "9777888999", roleName: "Inventory Manager", password: "password123" },
      { name: "Arjun Dev", email: "arjun@huddoerp.in", mobile: "8889990001", roleName: "Sales Executive", password: "password123" },
      // Add retailer and promoter users
      { name: "Suresh Raina", email: "suresh@promoter.com", mobile: "9820129034", roleName: "Promoter", password: "password123" },
      { name: "Harbhajan Singh", email: "harbhajan@promoter.com", mobile: "9910456723", roleName: "Promoter", password: "password123" },
      { name: "Gautam Gambhir", email: "gautam@promoter.com", mobile: "9560901234", roleName: "Promoter", password: "password123" },
      { name: "Walk Easy Footwear", email: "dinesh@walkeasy.in", mobile: "9821012345", roleName: "Retailer", password: "password123" },
      { name: "Lakhani Shoe Emporium", email: "vijay@lakhani.com", mobile: "9930412345", roleName: "Retailer", password: "password123" },
      { name: "Metro Steps", email: "gowda@metrosteps.co.in", mobile: "9560412323", roleName: "Retailer", password: "password123" },
      { name: "Rajkot Footwear Mart", email: "kirit@rajkotfoot.com", mobile: "9001122556", roleName: "Retailer", password: "password123" },
      { name: "Apex Sole Distributors", email: "manish@apexsole.com", mobile: "9810101010", roleName: "Retailer", password: "password123" }
    ];

    const roleNameByLabel = {
      'Founder': 'Founder',
      'Country Manager': 'CountryManager',
      'State Manager': 'StateManager',
      'City Manager': 'CityManager',
      'Finance Manager': 'FinanceManager',
      'HR Manager': 'HRManager',
      'Inventory Manager': 'InventoryManager',
      'Sales Executive': 'SalesExecutive',
      'Promoter': 'Promoter',
      'Retailer': 'Retailer'
    };

    for (const u of defaultUsers) {
      const year = new Date().getFullYear();
      const codeSuffix = Math.floor(1000 + Math.random() * 9000);
      const userCode = `USR-${year}-${codeSuffix}`;
      const dbUser = new User({
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: rolesMap[u.roleName],
        roleName: roleNameByLabel[u.roleName] || u.roleName,
        password: u.password,
        user_code: userCode,
        employee_id: userCode,
        is_verified: true,
        is_active: true,
        approval_status: 'Approved',
        onboarding_source: 'admin'
      });
      await dbUser.save();
      usersMap[u.name] = dbUser;
    }

    // 3. Seed Geography
    console.log('[Seeder] Seeding Geography (Country, State, City)...');
    const india = new Country({
      name: 'India',
      code: 'IN',
      manager: usersMap['Rajesh Sharma']?._id,
      is_active: true
    });
    await india.save();

    const states = [
      { name: "Maharashtra", managerName: "Preeti Verma" },
      { name: "Delhi", managerName: "Preeti Verma" },
      { name: "Karnataka", managerName: "Preeti Verma" },
      { name: "Gujarat", managerName: "Preeti Verma" },
      { name: "Tamil Nadu", managerName: "Preeti Verma" }
    ];

    const stateDocs = {};
    for (const s of states) {
      const stateDoc = new State({
        name: s.name,
        country: india._id,
        manager: usersMap[s.managerName]?._id,
        is_active: true
      });
      await stateDoc.save();
      stateDocs[s.name] = stateDoc;
    }

    const cities = [
      { name: "Mumbai", stateName: "Maharashtra", managerName: "Sanjay Joshi" },
      { name: "Pune", stateName: "Maharashtra", managerName: "Sanjay Joshi" },
      { name: "New Delhi", stateName: "Delhi", managerName: "Sanjay Joshi" },
      { name: "Bengaluru", stateName: "Karnataka", managerName: "Sanjay Joshi" },
      { name: "Ahmedabad", stateName: "Gujarat", managerName: "Sanjay Joshi" },
      { name: "Chennai", stateName: "Tamil Nadu", managerName: "Sanjay Joshi" }
    ];

    const cityDocs = {};
    for (const c of cities) {
      const cityDoc = new City({
        name: c.name,
        state: stateDocs[c.stateName]._id,
        manager: usersMap[c.managerName]?._id,
        is_active: true
      });
      await cityDoc.save();
      cityDocs[c.name] = cityDoc;
    }

    await User.findByIdAndUpdate(usersMap['Rajesh Sharma']._id, { country: india._id, roleName: 'CountryManager' });
    for (const s of states) {
      await User.findByIdAndUpdate(usersMap[s.managerName]._id, {
        country: india._id,
        state: stateDocs[s.name]._id,
        roleName: 'StateManager'
      });
    }
    for (const c of cities) {
      await User.findByIdAndUpdate(usersMap[c.managerName]._id, {
        country: india._id,
        state: stateDocs[c.stateName]._id,
        city: cityDocs[c.name]._id,
        roleName: 'CityManager'
      });
    }

    // 4. Seed Departments & Designations
    console.log('[Seeder] Seeding Departments & Designations...');
    const depts = [
      { 
        name: "Sales", 
        code: "SLS", 
        head: "Rajesh Sharma",
        features: { "Sales Targets": true, "Retailer Visits": true, "Lead Generation": true, "Order Collection": true, "Performance Tracking": true }
      },
      { 
        name: "Finance", 
        code: "FIN", 
        head: "Vikram Malhotra",
        features: { "Commission Calculations": true, "Incentive Management": true, "Revenue Reports": true, "GST Management": true }
      },
      { 
        name: "HR", 
        code: "HRM", 
        head: "Neha Sen",
        features: { "Attendance Tracking": true, "Leave Management": true, "Payroll Management": true, "Performance Reviews": false }
      },
      { 
        name: "Inventory", 
        code: "INV", 
        head: "Sunil Mehta",
        features: { "Stock Management": true, "Warehouse Management": true, "Stock Transfers": true, "Stock Alerts": true }
      },
      { 
        name: "Purchase", 
        code: "PUR", 
        head: "Rohan Hudda",
        features: { "Vendor Management": true, "Purchase Orders": true, "Purchase Approvals": false, "Material Tracking": true, "Quality Check": true }
      },
      { 
        name: "Marketing", 
        code: "MKT", 
        head: "Rohan Hudda",
        features: { "Campaign Management": true, "Scheme Management": true, "Promotional Activities": true }
      }
    ];

    const deptDocs = {};
    for (const d of depts) {
      const deptDoc = new Department({
        name: d.name,
        code: d.code,
        head: usersMap[d.head]?._id,
        features: d.features,
        is_active: true
      });
      await deptDoc.save();
      deptDocs[d.name] = deptDoc;
    }

    const designations = [
      { title: "Sales Executive", department: "Sales" },
      { title: "Sales Manager", department: "Sales" },
      { title: "Finance Executive", department: "Finance" },
      { title: "Warehouse In-charge", department: "Inventory" },
      { title: "Purchase Manager", department: "Purchase" },
      { title: "Marketing Lead", department: "Marketing" }
    ];

    const desDocs = {};
    for (const dg of designations) {
      const desDoc = new Designation({
        title: dg.title,
        department: deptDocs[dg.department]._id,
        is_active: true
      });
      await desDoc.save();
      desDocs[dg.title] = desDoc;
    }

    // 5. Seed Employees
    console.log('[Seeder] Seeding Employees...');
    const empDocs = {};
    const defaultEmployees = [
      {
        code: "EMP001",
        name: "Amit Kumar",
        email: "amit.kumar@huddoerp.in",
        mobile: "9988771122",
        userName: "Arjun Dev", // Link user profile
        department: "Sales",
        designation: "Sales Executive",
        manager: "Sanjay Joshi",
        salary: 45000,
        bankName: "HDFC Bank",
        accountNo: "50100412345678",
        ifsc: "HDFC0000020"
      },
      {
        code: "EMP002",
        name: "Sunita Rao",
        email: "sunita.rao@huddoerp.in",
        mobile: "9876541212",
        userName: "Neha Sen",
        department: "Finance",
        designation: "Finance Executive",
        manager: "Vikram Malhotra",
        salary: 55000,
        bankName: "ICICI Bank",
        accountNo: "000401567890",
        ifsc: "ICIC0000004"
      },
      {
        code: "EMP003",
        name: "Karan Johar",
        email: "karan@huddoerp.in",
        mobile: "9560123456",
        userName: "Sunil Mehta",
        department: "Inventory",
        designation: "Warehouse In-charge",
        manager: "Sunil Mehta",
        salary: 38000,
        bankName: "State Bank of India",
        accountNo: "30234567890",
        ifsc: "SBIN0001822"
      }
    ];

    for (const e of defaultEmployees) {
      const empDoc = new Employee({
        user: usersMap[e.userName]?._id || usersMap['Rohan Hudda']._id,
        employee_code: e.code,
        full_name: e.name,
        mobile: e.mobile,
        email: e.email,
        department: deptDocs[e.department]._id,
        designation: desDocs[e.designation]._id,
        salary_structure: { basic: e.salary * 0.5, hra: e.salary * 0.3, allowances: e.salary * 0.2, deductions: 0 },
        bank_details: { bank_name: e.bankName, account_no: e.accountNo, ifsc: e.ifsc, account_holder: e.name },
        is_active: true
      });
      await empDoc.save();
      empDocs[e.name] = empDoc;
    }

    // 6. Seed Promoters
    console.log('[Seeder] Seeding Promoters...');
    const promoterDocs = {};
    const promotersData = [
      { name: "Suresh Raina", code: "HUDDOPR01", mobile: "9820129034", cities: ["Mumbai", "Pune"], totalEarned: 77000 },
      { name: "Harbhajan Singh", code: "HUDDOPR02", mobile: "9910456723", cities: ["New Delhi"], totalEarned: 64000 },
      { name: "Gautam Gambhir", code: "HUDDOPR03", mobile: "9560901234", cities: ["Ahmedabad"], totalEarned: 44500 }
    ];

    for (const p of promotersData) {
      const promoterDoc = new Promoter({
        user: usersMap[p.name]?._id,
        promoter_code: p.code,
        name: p.name,
        full_name: p.name,
        mobile: p.mobile,
        email: `${p.name.toLowerCase().replace(' ', '')}@promoter.com`,
        royalty_percentage: 5.0,
        total_royalty_earned: p.totalEarned,
        is_active: true
      });
      await promoterDoc.save();
      promoterDocs[p.name] = promoterDoc;
    }

    // 7. Seed Retailers
    console.log('[Seeder] Seeding Retailers...');
    const retailerDocs = {};
    const retailersData = [
      { shopName: "Walk Easy Footwear", owner: "Dinesh Shah", email: "dinesh@walkeasy.in", mobile: "9821012345", state: "Maharashtra", city: "Mumbai", category: "Platinum", promoter: "Suresh Raina", cityManager: "Sanjay Joshi", limit: 500000 },
      { shopName: "Lakhani Shoe Emporium", owner: "Vijay Lakhani", email: "vijay@lakhani.com", mobile: "9930412345", state: "Delhi", city: "New Delhi", category: "Platinum", promoter: "Harbhajan Singh", cityManager: "Sanjay Joshi", limit: 600000 },
      { shopName: "Metro Steps", owner: "Suresh Gowda", email: "gowda@metrosteps.co.in", mobile: "9560412323", state: "Karnataka", city: "Bengaluru", category: "Gold", promoter: "None", cityManager: "Sanjay Joshi", limit: 300000 },
      { shopName: "Rajkot Footwear Mart", owner: "Kirit Bhai", email: "kirit@rajkotfoot.com", mobile: "9001122556", state: "Gujarat", city: "Ahmedabad", category: "Silver", promoter: "Gautam Gambhir", cityManager: "Sanjay Joshi", limit: 200000 },
      { shopName: "Apex Sole Distributors", owner: "Manish Joshi", email: "manish@apexsole.com", mobile: "9810101010", state: "Maharashtra", city: "Pune", category: "Standard", promoter: "Suresh Raina", cityManager: "Sanjay Joshi", limit: 100000 }
    ];

    for (const r of retailersData) {
      const retDoc = new Retailer({
        user: usersMap[r.shopName]?._id,
        business_name: r.shopName,
        owner_name: r.owner,
        mobile: r.mobile,
        email: r.email,
        state: stateDocs[r.state]._id,
        city: cityDocs[r.city]._id,
        category: r.category,
        assigned_promoter: promoterDocs[r.promoter]?._id,
        assigned_city_manager: usersMap[r.cityManager]?._id,
        credit_limit: { amount: r.limit, is_enabled: true },
        is_verified: r.shopName !== 'Apex Sole Distributors',
        is_active: true
      });
      await retDoc.save();
      retailerDocs[r.shopName] = retDoc;
    }

    // 8. Seed Product Categories, Products, and Variants
    console.log('[Seeder] Seeding Products & Variants...');
    const catSports = new ProductCategory({
      name: 'Sports Shoes',
      code: 'SPT',
      is_active: true,
      commissions: {
        retailer: 22,
        cityManager: 2,
        stateManager: 1,
        countryManager: 0.5,
        promoterCommissions: { retailer: 8, cityManager: 6.5, stateManager: 6, countryManager: 5.5 }
      }
    });
    await catSports.save();
    const catFormal = new ProductCategory({
      name: 'Formal Shoes',
      code: 'FRM',
      is_active: true,
      commissions: {
        retailer: 18,
        cityManager: 2.5,
        stateManager: 1.2,
        countryManager: 0.6,
        promoterCommissions: { retailer: 7.5, cityManager: 6, stateManager: 5.5, countryManager: 5 }
      }
    });
    await catFormal.save();
    const catCasual = new ProductCategory({
      name: 'Casual Shoes',
      code: 'CSL',
      is_active: true,
      commissions: {
        retailer: 20,
        cityManager: 2,
        stateManager: 1,
        countryManager: 0.5,
        promoterCommissions: { retailer: 8, cityManager: 6.5, stateManager: 6, countryManager: 5.5 }
      }
    });
    await catCasual.save();
    const catSandals = new ProductCategory({
      name: 'Sandals',
      code: 'SND',
      is_active: true,
      commissions: {
        retailer: 25,
        cityManager: 1.5,
        stateManager: 0.8,
        countryManager: 0.4,
        promoterCommissions: { retailer: 9, cityManager: 7.5, stateManager: 7, countryManager: 6.5 }
      }
    });
    await catSandals.save();

    console.log('[Seeder] Seeding Referrer Commission Fallbacks...');
    const bonusDefaults = [
      { promoted_role: 'Retailer', extra_bonus_percentage: 8, description: 'Global fallback referrer % when category has no promoted-retailer rate' },
      { promoted_role: 'CityManager', extra_bonus_percentage: 6.5, description: 'Global fallback referrer % when category has no promoted-city-manager rate' },
      { promoted_role: 'StateManager', extra_bonus_percentage: 6, description: 'Global fallback referrer % when category has no promoted-state-manager rate' },
      { promoted_role: 'CountryManager', extra_bonus_percentage: 5.5, description: 'Global fallback referrer % when category has no promoted-country-manager rate' }
    ];
    for (const bonus of bonusDefaults) {
      await PromoterBonusStructure.create(bonus);
    }

    const catsMap = {
      "Sports Shoes": catSports._id,
      "Formal Shoes": catFormal._id,
      "Casual Shoes": catCasual._id,
      "Sandals": catSandals._id
    };

    const productsData = [
      { id: "P1", name: "Huddo Air Classic", sku: "SKU-AC-01", category: "Sports Shoes", mrp: 2999, cost: 1200, margin: 25, franchise_points: 1000 },
      { id: "P2", name: "Huddo Flex Runner", sku: "SKU-FR-02", category: "Sports Shoes", mrp: 2499, cost: 1000, margin: 22, franchise_points: 800 },
      { id: "P3", name: "Huddo Elegant Derby", sku: "SKU-ED-03", category: "Formal Shoes", mrp: 4999, cost: 2000, margin: 28, franchise_points: 1500 },
      { id: "P4", name: "Huddo Leather Loafer", sku: "SKU-LL-04", category: "Casual Shoes", mrp: 3499, cost: 1400, margin: 24, franchise_points: 1100 },
      { id: "P5", name: "Huddo Comfort Slide", sku: "SKU-CS-05", category: "Sandals", mrp: 1299, cost: 500, margin: 20, franchise_points: 400 }
    ];

    const variantDocs = {};
    for (const p of productsData) {
      const prodDoc = new Product({
        name: p.name,
        sku: p.sku,
        category: catsMap[p.category],
        description: `${p.name} premium footwear description.`,
        mrp: p.mrp,
        costPrice: p.cost,
        margin: p.margin,
        franchise_points: p.franchise_points,
        is_active: true
      });
      await prodDoc.save();

      // Create variants (different sizes)
      const sizes = [6, 7, 8, 9, 10, 11];
      for (const size of sizes) {
        const variantDoc = new ProductVariant({
          product: prodDoc._id,
          size: String(size),
          color: "Standard",
          mrp: p.mrp,
          selling_price: p.mrp * (1 - p.margin / 100),
          cost_price: p.cost,
          margin_percentage: p.margin,
          stock_quantity: 100, // starting stock
          sku_variant: `${p.sku}-SZ${size}`,
          is_active: true
        });
        await variantDoc.save();
        variantDocs[`${p.name}-${size}`] = variantDoc;
      }
    }

    // 9. Seed Warehouses & Stock Records
    console.log('[Seeder] Seeding Warehouses & Stock Records...');
    const warehouse = new Warehouse({
      name: "Main Distribution Center - Mumbai",
      code: "MUM-WH-01",
      location: "GIDC Industrial Zone, Thane, Mumbai",
      address: "GIDC Industrial Zone, Thane, Mumbai",
      manager: usersMap['Sunil Mehta']?._id,
      is_active: true
    });
    await warehouse.save();

    const allVariants = await ProductVariant.find();
    for (const v of allVariants) {
      const stock = new StockRecord({
        product_variant: v._id,
        warehouse: warehouse._id,
        quantity: 120,
        min_threshold: 15
      });
      await stock.save();
    }

    // 10. Seed Orders, Invoices
    console.log('[Seeder] Seeding Orders & Invoices...');
    const ordersData = [
      {
        id: "ORD-9281",
        retailerName: "Walk Easy Footwear",
        amount: 85000,
        paymentStatus: "Verified",
        utr: "UTR123456789",
        date: "2026-06-01",
        status: "Delivered",
        items: [
          { name: "Huddo Air Classic", size: 8, qty: 10, price: 2999 },
          { name: "Huddo Elegant Derby", size: 9, qty: 5, price: 4999 },
          { name: "Huddo Leather Loafer", size: 7, qty: 10, price: 3499 }
        ]
      },
      {
        id: "ORD-8712",
        retailerName: "Lakhani Shoe Emporium",
        amount: 124000,
        paymentStatus: "Verified",
        utr: "UTR987654321",
        date: "2026-06-03",
        status: "Shipped",
        items: [
          { name: "Huddo Elegant Derby", size: 8, qty: 20, price: 4999 },
          { name: "Huddo Flex Runner", size: 9, qty: 10, price: 2499 }
        ]
      },
      {
        id: "ORD-7391",
        retailerName: "Metro Steps",
        amount: 49990,
        paymentStatus: "Pending Verification",
        utr: "UTR445566778",
        date: "2026-06-06",
        status: "Approved",
        items: [
          { name: "Huddo Elegant Derby", size: 10, qty: 10, price: 4999 }
        ]
      }
    ];

    for (const o of ordersData) {
      const orderItems = o.items.map(item => {
        const variant = variantDocs[`${item.name}-${item.size}`];
        return {
          product_variant: variant?._id || allVariants[0]._id,
          quantity: item.qty,
          unit_price: item.price,
          total_price: item.price * item.qty
        };
      });

      const orderDoc = new Order({
        order_number: o.id,
        retailer: retailerDocs[o.retailerName]._id,
        items: orderItems,
        subtotal: o.amount,
        tax_amount: o.amount * 0.18,
        discount_amount: 0,
        grand_total: o.amount * 1.18,
        utr_number: o.utr,
        payment_status: o.paymentStatus === 'Verified' ? 'Verified' : 'Pending',
        status: o.status,
        created_by: usersMap['Rohan Hudda']._id
      });
      await orderDoc.save();

      // Create matching invoices
      const invoiceDoc = new Invoice({
        order: orderDoc._id,
        retailer: retailerDocs[o.retailerName]._id,
        invoice_number: `INV-${o.id.replace('ORD-', '')}`,
        amount: o.amount,
        tax: o.amount * 0.18,
        total: o.amount * 1.18,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_paid: o.paymentStatus === 'Verified'
      });
      await invoiceDoc.save();
    }

    // 11. Seed Petty Cash Logs
    console.log('[Seeder] Seeding Petty Cash...');
    const pettyCashData = [
      { date: "2026-06-11", description: "Office stationary printing", category: "Stationery", type: "expense", amount: 450.00, notes: "Bought from local printing press" },
      { date: "2026-06-10", description: "Client travel reimbursement", category: "Travel", type: "expense", amount: 1500.00, notes: "Pune client visit" },
      { date: "2026-06-09", description: "Inbound budget allocation", category: "Miscellaneous", type: "income", amount: 5000.00, notes: "Approved by Finance Dept" }
    ];

    for (const pc of pettyCashData) {
      const pcDoc = new PettyCash(pc);
      await pcDoc.save();
    }

    // 12. Seed Customers Directory
    console.log('[Seeder] Seeding Customers...');
    const customerData = [
      { customer_name: "John Doe", mobile: "9820000001", email: "john@doe.com", city: "Mumbai", totalOrders: 5, totalSpend: 25000, lastOrderDate: "2026-06-01" },
      { customer_name: "Jane Smith", mobile: "9820000002", email: "jane@smith.com", city: "Pune", totalOrders: 3, totalSpend: 15000, lastOrderDate: "2026-06-05" },
      { customer_name: "Rajesh Kumar", mobile: "9820000003", email: "rajesh@kumar.com", city: "Bengaluru", totalOrders: 10, totalSpend: 85000, lastOrderDate: "2026-06-08" }
    ];

    for (const c of customerData) {
      const cDoc = new Customer(c);
      await cDoc.save();
    }

    // 13. Seed Leads pipeline
    console.log('[Seeder] Seeding Funnel Leads...');
    const leadsData = [
      { businessName: "Sunrise Sports", ownerName: "Kamal Thakkar", mobile: "+91 99001 00111", area: "Gota, Ahmedabad", status: "Contacted", notes: "Interested in sports range. Follow up next week.", lastContact: "2026-06-09", source: "Field Visit" },
      { businessName: "City Shoe Hub", ownerName: "Farida Bano", mobile: "+91 99002 00222", area: "Maninagar, Ahmedabad", status: "Interested", notes: "Wants product catalog and pricing. Sending today.", lastContact: "2026-06-11", source: "Referral" },
      { businessName: "Comfort Zone", ownerName: "Raj Trivedi", mobile: "+91 99003 00333", area: "Bopal, Ahmedabad", status: "Meeting Scheduled", notes: "Meeting on 15th June at their shop.", lastContact: "2026-06-12", source: "Field Visit" },
      { businessName: "Walk Easy Shop", ownerName: "Sonal Mehta", mobile: "+91 99004 00444", area: "Thaltej, Ahmedabad", status: "Not Interested", notes: "Currently tied up with another brand. Revisit in 3 months.", lastContact: "2026-06-01", source: "Cold Call" },
      { businessName: "Step Right", ownerName: "Bharat Patel", mobile: "+91 99005 00555", area: "Naroda, Ahmedabad", status: "Contacted", notes: "Initial contact made. Needs follow-up.", lastContact: "2026-06-13", source: "Field Visit" }
    ];

    for (const l of leadsData) {
      const lDoc = new Lead(l);
      await lDoc.save();
    }

    // 14. Seed Targets
    console.log('[Seeder] Seeding Targets...');
    const targetDoc = new Target({
      title: "June 2026 Sales Target",
      assigned_to: usersMap['Arjun Dev']?._id,
      kpi_type: "Revenue",
      target_value: 500000,
      achieved_value: 350000,
      period_type: "Monthly",
      period_start: new Date(2026, 5, 1),
      period_end: new Date(2026, 5, 30),
      scope_level: "Employee",
      is_active: true
    });

    await targetDoc.save();

    console.log('[Seeder] Seeding Communication Preferences & Settings...');
    const globalPref = new CommunicationSetting({
      enable_emails: true,
      enable_sms: true,
      enable_whatsapp: true,
      enable_otp: true,
      enable_marketing: true,
      enable_transactional: true
    });
    await globalPref.save();

    const smtp = new SMTPSetting({
      sender_name: 'Huddo Shoes',
      sender_email: process.env.SMTP_FROM_EMAIL || 'noreply@huddoerp.in',
      smtp_host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      smtp_port: parseInt(process.env.SMTP_PORT) || 2525,
      smtp_username: process.env.SMTP_USER || 'dummy_username',
      smtp_password: encrypt(process.env.SMTP_PASS || 'dummy_password'),
      encryption: 'TLS',
      is_enabled: true
    });
    await smtp.save();

    const sms = new SMSSetting({
      provider_name: 'Twilio',
      api_url: 'https://api.twilio.com',
      api_key: encrypt(process.env.TWILIO_ACCOUNT_SID || 'dummy_key'),
      api_secret_token: encrypt(process.env.TWILIO_AUTH_TOKEN || 'dummy_token'),
      sender_id: 'HUDDOS',
      country_code: '+91',
      is_enabled: true
    });
    await sms.save();

    const wa = new WhatsAppSetting({
      provider: 'Twilio',
      phone_number_id: '123456789',
      business_phone_number: process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886',
      access_token: encrypt(process.env.TWILIO_AUTH_TOKEN || 'dummy_token'),
      api_version: 'v19.0',
      webhook_url: 'http://localhost:5000/api/v1/whatsapp/webhook',
      is_enabled: true
    });
    await wa.save();

    console.log('[Seeder] Seeding Notification Templates...');
    const templates = [
      {
        name: 'Welcome Email',
        slug: 'welcome_email',
        type: 'email',
        subject: 'Welcome to {{company_name}}!',
        body: 'Hello {{user_name}},\n\nWelcome to {{company_name}}! We are thrilled to have you join us. Your account is now active.\n\nBest regards,\nThe Team',
        variables: ['user_name', 'company_name']
      },
      {
        name: 'Password Reset',
        slug: 'password_reset',
        type: 'email',
        subject: 'Reset Your Password - {{company_name}}',
        body: 'Hello {{user_name}},\n\nWe received a request to reset your password. Use the OTP below to complete the reset:\n\nOTP: {{otp}}\n\nThis OTP is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.',
        variables: ['user_name', 'company_name', 'otp']
      },
      {
        name: 'OTP Email',
        slug: 'otp_email',
        type: 'email',
        subject: 'Your Verification OTP - {{company_name}}',
        body: 'Hello {{user_name}},\n\nYour OTP for verification is: {{otp}}\n\nThis is valid for 10 minutes. Do not share this OTP with anyone.',
        variables: ['user_name', 'company_name', 'otp']
      },
      {
        name: 'OTP SMS',
        slug: 'otp_sms',
        type: 'sms',
        body: 'Your {{company_name}} verification OTP is {{otp}}. Valid for 10 minutes.',
        variables: ['company_name', 'otp']
      },
      {
        name: 'OTP WhatsApp',
        slug: 'otp_whatsapp',
        type: 'whatsapp',
        body: 'Your {{company_name}} verification OTP is {{otp}}. Valid for 10 minutes.',
        variables: ['company_name', 'otp']
      },
      {
        name: 'Appointment Confirmation',
        slug: 'appointment_confirmation',
        type: 'email',
        subject: 'Appointment Confirmed - {{company_name}}',
        body: 'Hello {{user_name}},\n\nYour appointment has been confirmed for {{date}}.\n\nThank you for choosing {{company_name}}.',
        variables: ['user_name', 'company_name', 'date']
      },
      {
        name: 'Order Confirmation',
        slug: 'order_confirmation',
        type: 'email',
        subject: 'Order Confirmed: #{{order_id}}',
        body: 'Hello {{user_name}},\n\nThank you for your order! Your order #{{order_id}} has been received and is being processed.\nOrder Date: {{date}}\nTotal Amount: {{amount}}\n\nWe will notify you when it ships.',
        variables: ['user_name', 'order_id', 'date', 'amount']
      },
      {
        name: 'Invoice',
        slug: 'invoice',
        type: 'email',
        subject: 'Invoice {{invoice_no}} from {{company_name}}',
        body: 'Hello {{user_name}},\n\nPlease find attached invoice {{invoice_no}} for your order.\nInvoice Date: {{date}}\nTotal Amount Due: {{amount}}\n\nThank you for your business!',
        variables: ['user_name', 'invoice_no', 'date', 'amount', 'company_name']
      },
      {
        name: 'Payment Success',
        slug: 'payment_success',
        type: 'email',
        subject: 'Payment Received: Invoice {{invoice_no}}',
        body: 'Hello {{user_name}},\n\nWe have successfully processed your payment of {{amount}} for invoice {{invoice_no}} on {{date}}.\n\nThank you for your payment!',
        variables: ['user_name', 'invoice_no', 'amount', 'date']
      },
      {
        name: 'Payment Failed',
        slug: 'payment_failed',
        type: 'email',
        subject: 'Payment Failed: Invoice {{invoice_no}}',
        body: 'Hello {{user_name}},\n\nWe were unable to process your payment of {{amount}} for invoice {{invoice_no}} on {{date}}. Please update your payment method or try again.',
        variables: ['user_name', 'invoice_no', 'amount', 'date']
      },
      {
        name: 'Inventory Low Stock Alert',
        slug: 'inventory_low_stock_alert',
        type: 'email',
        subject: 'ALERT: Low Stock for {{product_name}}',
        body: 'Hello Team,\n\nThis is an automated alert that the stock for {{product_name}} has dropped below the threshold. Current stock level: {{amount}}.\nDate: {{date}}.\n\nPlease place a purchase order soon.',
        variables: ['product_name', 'amount', 'date']
      },
      {
        name: 'Purchase Order',
        slug: 'purchase_order',
        type: 'email',
        subject: 'Purchase Order {{order_id}} - {{company_name}}',
        body: 'Hello Partner,\n\nPlease find attached our purchase order {{order_id}} generated on {{date}}.\n\nKindly acknowledge receipt and confirm shipment date.',
        variables: ['order_id', 'date', 'company_name']
      },
      {
        name: 'Shipment Status',
        slug: 'shipment_status',
        type: 'email',
        subject: 'Shipment Update: Order #{{order_id}}',
        body: 'Hello {{user_name}},\n\nGood news! Your order #{{order_id}} has been shipped on {{date}}.\n\nThank you for choosing us!',
        variables: ['user_name', 'order_id', 'date']
      },
      {
        name: 'Custom Notification',
        slug: 'custom_notification',
        type: 'email',
        subject: 'Notification from {{company_name}}',
        body: 'Hello {{user_name}},\n\n{{date}}: This is a custom notification sent from the administration panel.',
        variables: ['user_name', 'company_name', 'date']
      }
    ];

    for (const t of templates) {
      const tDoc = new NotificationTemplate(t);
      await tDoc.save();
    }

    console.log('[Seeder] Seeding Communication Logs...');
    const sampleLogs = [
      {
        type: 'Email',
        recipient: 'founder@huddoerp.in',
        subject_template: 'Welcome Email',
        status: 'Sent',
        provider_response: '{"messageId":"<mock-id-1234@huddoerp.in>"}',
        sent_by: usersMap['Rohan Hudda']?._id
      },
      {
        type: 'SMS',
        recipient: '+919876543210',
        subject_template: 'OTP SMS',
        status: 'Sent',
        provider_response: '{"sid":"SMabc123"}',
        sent_by: usersMap['Rohan Hudda']?._id
      },
      {
        type: 'WhatsApp',
        recipient: 'whatsapp:+919876543210',
        subject_template: 'OTP WhatsApp',
        status: 'Failed',
        provider_response: 'Twilio Auth failure: Invalid Account SID',
        sent_by: usersMap['Rohan Hudda']?._id
      }
    ];

    for (const log of sampleLogs) {
      const logDoc = new CommunicationLog(log);
      await logDoc.save();
    }

    console.log('[Seeder] Seeding completed successfully!');
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
