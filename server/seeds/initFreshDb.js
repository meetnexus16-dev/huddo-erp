import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role.js';
import User from '../models/User.js';
import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import Employee from '../models/Employee.js';
import Promoter from '../models/Promoter.js';
import Retailer from '../models/Retailer.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import CommunicationSetting from '../models/CommunicationSetting.js';
import SMTPSetting from '../models/SMTPSetting.js';
import SMSSetting from '../models/SMSSetting.js';
import WhatsAppSetting from '../models/WhatsAppSetting.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import { encrypt } from '../utils/crypto.js';

dotenv.config();

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
      { module: 'dashboard', actions: ['view'] }
    ],
    is_custom: false
  },
  {
    name: 'Distributor',
    permissions: [
      { module: 'orders', actions: ['create', 'view'] },
      { module: 'invoices', actions: ['view'] },
      { module: 'dashboard', actions: ['view'] }
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

const seedFreshDatabase = async () => {
  try {
    let connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/huddo-erp';
    if (connStr === 'your_mongodb_connection_string') {
      connStr = 'mongodb://localhost:27017/huddo-erp';
    }

    console.log('[InitFreshDB] Connecting to MongoDB...');
    await mongoose.connect(connStr);
    console.log('[InitFreshDB] Connected successfully.');

    // 1. Clear ALL collections
    console.log('[InitFreshDB] Wiping existing database collections...');
    const { connection } = mongoose;
    
    // Explicit model clears
    await Role.deleteMany({});
    await User.deleteMany({});
    await Country.deleteMany({});
    await State.deleteMany({});
    await City.deleteMany({});
    await Employee.deleteMany({});
    await Promoter.deleteMany({});
    await Retailer.deleteMany({});
    await Department.deleteMany({});
    await Designation.deleteMany({});
    await CommunicationSetting.deleteMany({});
    await SMTPSetting.deleteMany({});
    await SMSSetting.deleteMany({});
    await WhatsAppSetting.deleteMany({});
    await NotificationTemplate.deleteMany({});

    // Dynamic collection clears (e.g. transactional tables)
    const collectionsToClear = [
      'products', 'productvariants', 'productcategories', 'orders', 'invoices', 
      'targets', 'teams', 'vendors', 'purchaseorders', 'warehouses', 
      'stockrecords', 'stocktransfers', 'notifications', 'auditlogs', 
      'leaverequests', 'payrolls', 'performancereviews', 'customers', 
      'pettycashes', 'returnlogs', 'attendances', 'retailervisits', 
      'commissionstructures', 'commissionrecords', 'communicationlogs', 
      'uploads'
    ];
    for (const name of collectionsToClear) {
      if (connection.collections[name]) {
        await connection.collections[name].deleteMany({});
        console.log(`[InitFreshDB] Cleared collection: ${name}`);
      }
    }

    // 2. Seed Default Roles
    console.log('[InitFreshDB] Seeding roles...');
    const rolesMap = {};
    for (const r of defaultRoles) {
      const dbRole = new Role(r);
      await dbRole.save();
      rolesMap[r.name] = dbRole._id;
    }

    // Map UI names with spaces to the database role IDs
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

    // 3. Seed Core Default Users (Rohan, Rajesh, Preeti, Sanjay, Vikram, Neha, Sunil, Arjun, Suresh, Dinesh)
    console.log('[InitFreshDB] Seeding default system users...');
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
      { name: "Suresh Raina", email: "suresh@promoter.com", mobile: "9820129034", roleName: "Promoter", password: "password123" },
      { name: "Walk Easy Footwear", email: "dinesh@walkeasy.in", mobile: "9821012345", roleName: "Retailer", password: "password123" }
    ];

    for (const u of defaultUsers) {
      const dbUser = new User({
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: rolesMap[u.roleName],
        password: u.password,
        is_verified: true,
        is_active: true
      });
      await dbUser.save();
      usersMap[u.name] = dbUser;
    }

    // 4. Seed Core Geography (Base references for managers)
    console.log('[InitFreshDB] Seeding core geography...');
    const india = new Country({
      name: 'India',
      code: 'IN',
      manager: usersMap['Rajesh Sharma']?._id,
      is_active: true
    });
    await india.save();

    const maharashtra = new State({
      name: "Maharashtra",
      country: india._id,
      manager: usersMap['Preeti Verma']?._id,
      is_active: true
    });
    await maharashtra.save();

    const mumbai = new City({
      name: "Mumbai",
      state: maharashtra._id,
      manager: usersMap['Sanjay Joshi']?._id,
      is_active: true
    });
    await mumbai.save();

    // 5. Seed Core Departments & Designations
    console.log('[InitFreshDB] Seeding departments & designations...');
    const depts = [
      { name: "Sales", code: "SLS", head: "Rajesh Sharma" },
      { name: "Finance", code: "FIN", head: "Vikram Malhotra" },
      { name: "HR", code: "HRM", head: "Neha Sen" },
      { name: "Inventory", code: "INV", head: "Sunil Mehta" },
      { name: "Purchase", code: "PUR", head: "Rohan Hudda" },
      { name: "Marketing", code: "MKT", head: "Rohan Hudda" }
    ];

    const deptDocs = {};
    for (const d of depts) {
      const deptDoc = new Department({
        name: d.name,
        code: d.code,
        head: usersMap[d.head]?._id,
        features: { "View": true },
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

    // 6. Seed default Promoter and Retailer profiles linked to their user records
    console.log('[InitFreshDB] Seeding default promoter and retailer profiles...');
    const sureshPromoter = new Promoter({
      user: usersMap['Suresh Raina']?._id,
      promoter_code: 'HUDDOPR01',
      name: 'Suresh Raina',
      full_name: 'Suresh Raina',
      mobile: '9820129034',
      email: 'suresh@promoter.com',
      royalty_percentage: 5.0,
      total_royalty_earned: 0,
      is_active: true
    });
    await sureshPromoter.save();

    const walkEasyRetailer = new Retailer({
      user: usersMap['Walk Easy Footwear']?._id,
      business_name: 'Walk Easy Footwear',
      owner_name: 'Dinesh Shah',
      mobile: '9821012345',
      email: 'dinesh@walkeasy.in',
      state: maharashtra._id,
      city: mumbai._id,
      category: 'Platinum',
      assigned_promoter: sureshPromoter._id,
      assigned_city_manager: usersMap['Sanjay Joshi']?._id,
      credit_limit: { amount: 500000, is_enabled: true },
      is_verified: true,
      is_active: true
    });
    await walkEasyRetailer.save();

    // 7. Seed Settings & Communication Templates (necessary for login, OTP, and workflow notifications)
    console.log('[InitFreshDB] Seeding core settings & communication configurations...');
    const globalPref = new CommunicationSetting({
      enable_emails: true,
      enable_sms: true,
      enable_whatsapp: true,
      enable_otp: true,
      enable_marketing: false,
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

    // Seed templates for OTP and Password Reset
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
      }
    ];

    for (const t of templates) {
      const tDoc = new NotificationTemplate(t);
      await tDoc.save();
    }

    console.log('[InitFreshDB] Fresh database initialization completed successfully!');
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[InitFreshDB] Initialization failed:', error);
    process.exit(1);
  }
};

seedFreshDatabase();
