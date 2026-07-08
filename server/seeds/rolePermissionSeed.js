import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role.js';

dotenv.config();

const defaultRoles = [
  {
    name: 'Founder',
    permissions: [{ module: '*', actions: ['create', 'view', 'edit', 'delete', 'approve', 'reject', 'export', 'assign'] }],
    is_custom: false
  },
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
  {
    name: 'Admin',
    permissions: [{ module: '*', actions: ['create', 'view', 'edit', 'delete', 'approve', 'reject', 'export', 'assign'] }],
    is_custom: false
  },
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

const seedRoles = async () => {
  try {
    let connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/huddo-erp';
    if (connStr === 'your_mongodb_connection_string') {
      connStr = 'mongodb://localhost:27017/huddo-erp';
    }
    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(connStr);
    console.log('[Seeder] Connected successfully.');

    // Upsert by name so existing role _id values are preserved. Deleting and
    // re-inserting would orphan every user's `role` reference (they point to
    // the old _id), which breaks login and permission checks.
    console.log('[Seeder] Upserting default roles and permission matrices...');
    for (const role of defaultRoles) {
      await Role.updateOne(
        { name: role.name },
        { $set: { permissions: role.permissions, is_custom: role.is_custom } },
        { upsert: true }
      );
    }
    console.log('[Seeder] Roles seeded successfully.');

    await mongoose.disconnect();
    console.log('[Seeder] Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error seeding roles:', error);
    process.exit(1);
  }
};

seedRoles();
