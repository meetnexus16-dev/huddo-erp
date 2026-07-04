import './mockApi'; // Global window.fetch interceptor
import React, { useState, useEffect } from 'react';
import { 
  Home, GitBranch, LayoutGrid, Users, UsersRound, Award, Store, Package, 
  ShoppingCart, CreditCard, Percent, TrendingUp, Target, MapPin, CheckSquare, 
  Archive, Shield, Bell, BarChart3, Lock, ChevronLeft, ChevronRight, Search, 
  Menu, LogOut, Settings, User, X, ShoppingBag, Layers
} from 'lucide-react';
import { Toast } from './components/Common';
import { DashboardLayout } from './components/DesignSystem';
import Login from './components/Login';

// Import All 21 Modules
import Dashboard from './modules/Dashboard';
import UserRoleManagement from './modules/UserRoleManagement';
import Hierarchy from './modules/Hierarchy';
import Employees from './modules/Employees';
import Teams from './modules/Teams';
import Departments from './modules/Departments';
import Promoters from './modules/Promoters';
import Retailers from './modules/Retailers';
import Products from './modules/Products';
import ProductCategories from './modules/ProductCategories';
import Orders from './modules/Orders';
import BillingPayments from './modules/BillingPayments';
import Commissions from './modules/Commissions';
import Sales from './modules/Sales';
import Targets from './modules/Targets';
import Approvals from './modules/Approvals';
import FieldTracking from './modules/FieldTracking';
import Notifications from './modules/Notifications';
import Reports from './modules/Reports';
import Security from './modules/Security';
import Inventory from './modules/Inventory';
import Purchase from './modules/Purchase';
import PettyCash from './modules/PettyCash';
import RetailerModule from './modules/retailer/RetailerModule';
// CM-MODULE: Import Country Manager Module
import CountryManagerModule from './modules/country-manager/CountryManagerModule';
// SM-MODULE: Import State Manager Module
import StateManagerModule from './state-manager/StateManagerModule';
// CTY-MODULE: Import City Manager Module
import CityManagerModule from './city-manager/CityManagerModule';
// PROMO-MODULE: Import Promoter Module
import PromoterModule from './modules/promoter/PromoterModule';
// EMPLOYEE-MODULE: Import Employee Module
import EmployeeModule from './modules/employee/EmployeeModule';
import CommunicationSettings from './modules/CommunicationSettings';
import MyProfile from './modules/MyProfile';



// Navigation Schema with Sections & Mapped Icons
const NAV_MENU = [
  {
    section: "OVERVIEW",
    items: [
      { id: "Dashboard", label: "Dashboard", icon: Home, component: Dashboard }
    ]
  },
  {
    section: "ORGANIZATION",
    items: [
      { id: "Hierarchy", label: "Hierarchy", icon: GitBranch, component: Hierarchy },
      { id: "Departments", label: "Departments", icon: LayoutGrid, component: Departments }
    ]
  },
  {
    section: "PEOPLE",
    items: [
      { id: "Employees", label: "Employees", icon: Users, component: Employees },
      { id: "Teams", label: "Teams", icon: UsersRound, component: Teams },
      { id: "Promoters", label: "Promoters", icon: Award, component: PromoterModule },
      { id: "CountryManagers", label: "Country Managers", icon: Users, component: CountryManagerModule }
    ]
  },
  {
    section: "BUSINESS",
    items: [
      { id: "Retailers", label: "Retailers", icon: Store, component: Retailers },
      { id: "Products", label: "Products", icon: Package, component: Products },
      { id: "ProductCategories", label: "Product Categories", icon: Layers, component: ProductCategories },
      { id: "Orders", label: "Orders", icon: ShoppingCart, component: Orders }
    ]
  },
  {
    section: "FINANCE",
    items: [
      { id: "Billing", label: "Billing & Payments", icon: CreditCard, component: BillingPayments },
      { id: "Commissions", label: "Commissions", icon: Percent, component: Commissions },
      { id: "Sales", label: "Sales", icon: TrendingUp, component: Sales },
      { id: "Targets", label: "Targets", icon: Target, component: Targets },
      { id: "Petty Cash", label: "Petty Cash", icon: CreditCard, component: PettyCash }
    ]
  },
  {
    section: "OPERATIONS",
    items: [
      { id: "Field Tracking", label: "Field Tracking", icon: MapPin, component: FieldTracking },
      { id: "Approvals", label: "Approvals", icon: CheckSquare, component: Approvals },
      { id: "Inventory", label: "Inventory", icon: Archive, component: Inventory },
      { id: "Purchase", label: "Purchase & QR", icon: ShoppingBag, component: Purchase }
    ]
  },
  {
    section: "ADMINISTRATION",
    items: [
      { id: "Users & Roles", label: "Users & Roles", icon: Shield, component: UserRoleManagement },
      { id: "Notifications", label: "Notifications", icon: Bell, component: Notifications },
      { id: "Reports", label: "Reports", icon: BarChart3, component: Reports },
      { id: "Security & Audit", label: "Security & Audit", icon: Lock, component: Security }
    ]
  },
  {
    section: "FOUNDER",
    items: [
      { id: "CommunicationSettings", label: "Communication Settings", icon: Settings, component: CommunicationSettings }
    ]
  }
];

// Database-to-navigation module permissions mapping
const NAV_MODULE_MAP = {
  'Dashboard': 'dashboard',
  'Hierarchy': 'hierarchy',
  'Departments': 'departments',
  'Employees': 'employees',
  'Teams': 'teams',
  'Promoters': 'promoters',
  'CountryManagers': 'countries',
  'Retailers': 'retailers',
  'Products': 'products',
  'ProductCategories': 'product-categories',
  'Orders': 'orders',
  'Billing': 'invoices',
  'Commissions': 'commission-records',
  'Sales': 'sales',
  'Targets': 'targets',
  'Petty Cash': 'petty-cash',
  'Field Tracking': 'gps-logs',
  'Approvals': 'orders',
  'Inventory': 'stock-records',
  'Purchase': 'purchase-orders',
  'Users & Roles': 'users',
  'Notifications': 'notifications',
  'Reports': 'reports',
  'Security & Audit': 'audit-logs',
  'CommunicationSettings': 'communication-settings'
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Real authentication & session persistence states
  const [token, setToken] = useState(() => localStorage.getItem('huddo_token'));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('huddo_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('huddo_role') || 'Founder');

  useEffect(() => {
    const handleProfileUpdate = () => {
      const cached = localStorage.getItem('huddo_user');
      try {
        if (cached) setUser(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleRoleChange = async (role) => {
    if (role === 'Logout') {
      localStorage.removeItem('huddo_token');
      localStorage.removeItem('huddo_user');
      localStorage.removeItem('huddo_role');
      setToken(null);
      setUser(null);
      setCurrentRole('Founder');
      showToast("Logged out successfully.", "success");
      return;
    }

    setCurrentRole(role);
    localStorage.setItem('huddo_role', role);
    showToast(`Session switched to: ${role}`, "success");

    const roleEmailMap = {
      'Founder': 'rohan@huddoerp.in',
      'CEO': 'rohan@huddoerp.in',
      'Admin': 'rohan@huddoerp.in',
      'Country Manager': 'rajesh@huddoerp.in',
      'State Manager': 'preeti@huddoerp.in',
      'City Manager': 'sanjay@huddoerp.in',
      'Finance Manager': 'vikram@huddoerp.in',
      'HR Manager': 'neha@huddoerp.in',
      'Inventory Manager': 'sunil@huddoerp.in',
      'Sales Executive': 'arjun@huddoerp.in',
      'Promoter': 'suresh@promoter.com',
      'Retailer': 'dinesh@walkeasy.in',
      'Distributor': 'dinesh@walkeasy.in',
      'Team Member': 'arjun@huddoerp.in'
    };

    const email = roleEmailMap[role];
    if (email) {
      try {
        const fetchMethod = window.originalFetch || window.fetch;
        const res = await fetchMethod('http://localhost:5000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password123' })
        });
        const data = await res.json();
        if (data.success && data.data.access_token) {
          localStorage.setItem('huddo_token', data.data.access_token);
          localStorage.setItem('huddo_user', JSON.stringify(data.data.user));
          setToken(data.data.access_token);
          setUser(data.data.user);
          console.log(`[Auth] Backend JWT authenticated successfully for ${role}`);
        }
      } catch (err) {
        console.warn(`[Auth] Backend login failed: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    // Authenticate initial role on mount if logged in
    if (token) {
      handleRoleChange(currentRole);
    }
  }, []);

  const canViewItem = (itemId) => {
    if (!user || !user.role) return false;
    
    const roleName = user.role.name || user.role;
    
    // Strict restriction: only Founder can view Communication Settings
    if (itemId === 'CommunicationSettings') {
      return roleName === 'Founder';
    }
    
    // CEO has no access to financial modules
    const financialItems = ['Billing', 'Commissions', 'Sales', 'Targets', 'Petty Cash'];
    if (roleName === 'CEO' && financialItems.includes(itemId)) {
      return false;
    }
    
    // Founder, CEO, and Admin have superadmin view rights across routing on client side
    if (roleName === 'Founder' || roleName === 'CEO' || roleName === 'Admin') {
      return true;
    }
    
    const permissions = user.role.permissions || [];
    const targetModule = NAV_MODULE_MAP[itemId];
    if (!targetModule) return true; // Default true if not explicitly mapped
    
    const match = permissions.find(p => p.module === targetModule || p.module === '*');
    if (!match) return false;
    
    return match.actions.includes('view') || match.actions.includes('*');
  };

  useEffect(() => {
    if (token && !canViewItem(activeScreen)) {
      setActiveScreen('Dashboard');
    }
  }, [currentRole, activeScreen, token]);

  // Mock notifications state for Admin/Founder/CEO
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Pending Shop Verification", message: "Apex Sole Distributors requested Silver category authorization in Pune.", read: false, date: "10 mins ago" },
    { id: 2, title: "Large Order Review Required", message: "Order ORD-5509 of value ₹1,50,000 exceeds standard limit limits.", read: false, date: "2 hours ago" }
  ]);

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast("Marked all notifications as read.", "success");
  };

  // If not logged in, render the login page
  if (!token || !user) {
    return (
      <Login 
        onLoginSuccess={(userData, userToken) => {
          localStorage.setItem('huddo_token', userToken);
          localStorage.setItem('huddo_user', JSON.stringify(userData));
          localStorage.setItem('huddo_role', userData.role?.name || userData.role || 'Founder');
          setToken(userToken);
          setUser(userData);
          setCurrentRole(userData.role?.name || userData.role || 'Founder');
          showToast(`Logged in successfully as ${userData.name}!`, "success");
        }} 
      />
    );
  }

  // Find active screen component details
  let ActiveComponent = Dashboard;
  if (activeScreen === 'Profile') {
    ActiveComponent = MyProfile;
  } else {
    for (const sect of NAV_MENU) {
      const match = sect.items.find(item => item.id === activeScreen);
      if (match) {
        ActiveComponent = match.component;
        break;
      }
    }
  }

  // HUDDO-UPDATE: Retailer & Distributor Panel - Full Screen override
  if (currentRole.toLowerCase() === 'retailer' || currentRole.toLowerCase() === 'distributor') {
    return (
      <RetailerModule 
        userRole={currentRole} 
        showToast={showToast} 
        onSwitchRole={(role) => handleRoleChange(role)}
      />
    );
  }

  // CM-MODULE: Country Manager Workspace - Full Screen override
  if (currentRole.toLowerCase() === 'country manager') {
    return (
      <CountryManagerModule 
        userRole={currentRole} 
        showToast={showToast} 
        onSwitchRole={(role) => handleRoleChange(role)}
      />
    );
  }

  // SM-MODULE: State Manager Workspace - Full Screen override
  if (currentRole.toLowerCase() === 'state manager') {
    return (
      <StateManagerModule 
        userRole={currentRole} 
        showToast={showToast} 
        onSwitchRole={(role) => handleRoleChange(role)}
      />
    );
  }

  // CTY-MODULE: City Manager Workspace - Full Screen override
  if (currentRole.toLowerCase() === 'city manager') {
    return (
      <CityManagerModule 
        userRole={currentRole} 
        showToast={showToast} 
        onSwitchRole={(role) => handleRoleChange(role)}
      />
    );
  }

  // PROMO-MODULE: Promoter Workspace - Full Screen override
  if (currentRole.toLowerCase() === 'promoter') {
    return (
      <PromoterModule 
        userRole={currentRole} 
        showToast={showToast} 
        onSwitchRole={(role) => handleRoleChange(role)}
      />
    );
  }

  // EMPLOYEE-MODULE: Employee Workspace - Full Screen override
  const employeeRoles = [
    'sales executive', 'sales manager', 'hr manager', 
    'finance manager', 'inventory manager', 'purchase manager', 
    'team member'
  ];
  if (employeeRoles.includes(currentRole.toLowerCase())) {
    return (
      <EmployeeModule 
        userRole={currentRole} 
        showToast={showToast} 
        onSwitchRole={(role) => handleRoleChange(role)}
      />
    );
  }

  // Filter navigation sections based on RBAC permissions
  const filteredSidebarItems = NAV_MENU.map(section => ({
    ...section,
    items: section.items.filter(item => canViewItem(item.id))
  })).filter(section => section.items.length > 0);

  return (
    <DashboardLayout
      userRole={currentRole}
      activeTab={activeScreen}
      setActiveTab={setActiveScreen}
      sidebarItems={filteredSidebarItems}
      onSwitchRole={handleRoleChange}
      notifications={notifications}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      profile={{
        name: user?.name || "Rohan Hudda",
        subtitle: `${currentRole} Session`,
        image: user?.profile_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
      }}
    >
      <ActiveComponent onNavigate={(target) => setActiveScreen(target)} showToast={showToast} userRole={currentRole} />
      
      {/* Global Success/Error toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </DashboardLayout>
  );
}
