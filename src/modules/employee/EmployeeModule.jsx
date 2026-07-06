import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Home, User, Clock, Calendar, Bell, ShoppingCart, 
  MapPin, Target, Percent, Users, Landmark, Award, 
  CreditCard, TrendingUp, Archive, RefreshCw, AlertTriangle, 
  BarChart3, CheckSquare, ShoppingBag
} from 'lucide-react';
import { DashboardLayout } from '../../components/DesignSystem';
import { useWorkspaceNav } from '../../hooks/useWorkspaceNav';
import { EMPLOYEE_ROUTES, ROUTES, buildPath } from '../../routes/routePaths';

// Import Context
import { EmployeeAuthProvider, useEmployeeAuth } from './context/EmployeeAuthContext';

// Import Pages
import Dashboard from './pages/Dashboard';
import Profile from '../MyProfile';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Orders from './pages/Orders';
import FieldTracking from './pages/FieldTracking';
import Targets from './pages/Targets';
import Commission from './pages/Commission';
import EmployeeDirectory from './pages/EmployeeDirectory';
import HrAttendance from './pages/HrAttendance';
import HrLeaves from './pages/HrLeaves';
import Payroll from './pages/Payroll';
import PerformanceReviews from './pages/PerformanceReviews';
import CommissionCalc from './pages/CommissionCalc';
import RevenueReports from './pages/RevenueReports';
import ExpenseTracking from './pages/ExpenseTracking';
import GstManagement from './pages/GstManagement';
import StockManagement from './pages/StockManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import StockTransfers from './pages/StockTransfers';
import StockAlerts from './pages/StockAlerts';
import InventoryReports from './pages/InventoryReports';
import VendorManagement from './pages/VendorManagement';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseApprovals from './pages/PurchaseApprovals';
import MaterialTracking from './pages/MaterialTracking';
import ProcurementReports from './pages/ProcurementReports';
import Tasks from './pages/Tasks';

// Import Mock Notifications
import { mockNotifications as initialNotifications } from './mockData/mockNotifications';

function EmployeeWorkspace({ userRole, showToast, onSwitchRole }) {
  const { currentEmployee, activeRole, switchRole } = useEmployeeAuth();
  const {
    activeTab,
    goToTab,
    attachPaths,
    profilePath,
    passwordPath,
    portalSettingsPath,
    location
  } = useWorkspaceNav(ROUTES.EMPLOYEE, EMPLOYEE_ROUTES);
  
  // Notification States
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Sync state if activeRole changes via dev tools
  useEffect(() => {
    goToTab('Dashboard');
  }, [activeRole]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (notifId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notifId ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast("All notifications marked as read.", "success");
  };

  const handleDevRoleChange = (roleLabel) => {
    const keyMap = {
      "Sales Executive": "sales_executive",
      "Sales Manager": "sales_manager",
      "HR Manager": "hr_manager",
      "Finance Manager": "finance_manager",
      "Inventory Manager": "inventory_manager",
      "Purchase Manager": "purchase_manager",
      "Team Member": "team_member"
    };
    const key = keyMap[roleLabel] || 'sales_executive';
    switchRole(key);
    showToast(`Role switched to: ${roleLabel}`, "success");
  };

  // Nav configuration mapping
  const getNavItems = () => {
    const common = [
      { id: "Dashboard", label: "Dashboard", icon: Home },
      { id: "Profile", label: "Profile", icon: User },
      { id: "Leave", label: "Leave Management", icon: Calendar }
    ];

    switch (activeRole) {
      case 'sales_executive':
        return [
          ...common,
          { id: "Attendance", label: "My Attendance", icon: Clock },
          { id: "My Orders", label: "My Orders", icon: ShoppingCart },
          { id: "Retailer Visits", label: "Retailer Visits", icon: MapPin },
          { id: "Targets", label: "Targets & KPIs", icon: Target },
          { id: "Commission", label: "Commission Ledger", icon: Percent }
        ];
      case 'sales_manager':
        return [
          ...common,
          { id: "Attendance", label: "My Attendance", icon: Clock },
          { id: "Team Orders", label: "Team Orders", icon: ShoppingCart },
          { id: "Retailer Visits", label: "Retailer Visits", icon: MapPin },
          { id: "Targets", label: "Targets & KPIs", icon: Target },
          { id: "Commission", label: "Commission Ledger", icon: Percent }
        ];
      case 'hr_manager':
        return [
          { id: "Dashboard", label: "Dashboard", icon: Home },
          { id: "Profile", label: "Profile", icon: User },
          { id: "Employee Directory", label: "Employee Directory", icon: Users },
          { id: "Attendance HR", label: "Attendance (HR)", icon: Clock },
          { id: "Leave Approvals", label: "Leave Approvals", icon: Calendar },
          { id: "Payroll", label: "Payroll Control", icon: Landmark },
          { id: "Performance Reviews", label: "Performance Reviews", icon: Award }
        ];
      case 'finance_manager':
        return [
          ...common,
          { id: "Attendance", label: "My Attendance", icon: Clock },
          { id: "Commission Calculations", label: "Commission Calc", icon: Percent },
          { id: "Revenue Reports", label: "Revenue Reports", icon: TrendingUp },
          { id: "Expense Tracking", label: "Expense Tracking", icon: CreditCard },
          { id: "GST Management", label: "GST Management", icon: Landmark },
          { id: "Payroll View", label: "Payroll View", icon: Landmark }
        ];
      case 'inventory_manager':
        return [
          ...common,
          { id: "Attendance", label: "My Attendance", icon: Clock },
          { id: "Stock Management", label: "Stock Management", icon: Archive },
          { id: "Warehouse", label: "Warehouse status", icon: Landmark },
          { id: "Stock Transfers", label: "Stock Transfers", icon: RefreshCw },
          { id: "Stock Alerts", label: "Stock Alerts", icon: AlertTriangle },
          { id: "Inventory Reports", label: "Inventory Reports", icon: BarChart3 }
        ];
      case 'purchase_manager':
        return [
          ...common,
          { id: "Attendance", label: "My Attendance", icon: Clock },
          { id: "Vendor Management", label: "Vendor Management", icon: Users },
          { id: "Purchase Orders", label: "Purchase Orders", icon: ShoppingCart },
          { id: "Purchase Approvals", label: "Purchase Approvals", icon: CheckSquare },
          { id: "Material Tracking", label: "Material Tracking", icon: ShoppingBag },
          { id: "Procurement Reports", label: "Procurement Reports", icon: BarChart3 }
        ];
      case 'team_member':
      default:
        return [
          ...common,
          { id: "Attendance", label: "My Attendance", icon: Clock },
          { id: "My Tasks", label: "My Tasks", icon: CheckSquare }
        ];
    }
  };

  const navItems = attachPaths(getNavItems());
  const currentRoleLabel = {
    sales_executive: "Sales Executive",
    sales_manager: "Sales Manager",
    hr_manager: "HR Manager",
    finance_manager: "Finance Manager",
    inventory_manager: "Inventory Manager",
    purchase_manager: "Purchase Manager",
    team_member: "Team Member"
  }[activeRole] || "Sales Executive";

  const isPasswordRoute = location.pathname.endsWith('/profile/password');
  const currentTab = isPasswordRoute ? 'Profile' : activeTab;

  if (location.pathname === ROUTES.EMPLOYEE || location.pathname === `${ROUTES.EMPLOYEE}/`) {
    return <Navigate to={buildPath(ROUTES.EMPLOYEE, 'Dashboard', EMPLOYEE_ROUTES)} replace />;
  }

  if (!currentTab) {
    return <Navigate to={buildPath(ROUTES.EMPLOYEE, 'Dashboard', EMPLOYEE_ROUTES)} replace />;
  }

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'Dashboard':
        return <Dashboard onNavigate={goToTab} showToast={showToast} />;
      case 'Profile':
        return <Profile showToast={showToast} userRole={userRole} onSwitchRole={onSwitchRole} />;
      case 'Attendance':
        return <Attendance showToast={showToast} />;
      case 'Leave':
        return <Leave showToast={showToast} />;
      
      // Sales roles
      case 'My Orders':
      case 'Team Orders':
        return <Orders showToast={showToast} />;
      case 'Retailer Visits':
        return <FieldTracking showToast={showToast} />;
      case 'Targets':
        return <Targets />;
      case 'Commission':
        return <Commission showToast={showToast} />;

      // HR manager
      case 'Employee Directory':
        return <EmployeeDirectory showToast={showToast} />;
      case 'Attendance HR':
        return <HrAttendance showToast={showToast} />;
      case 'Leave Approvals':
        return <HrLeaves showToast={showToast} />;
      case 'Payroll':
        return <Payroll showToast={showToast} />;
      case 'Performance Reviews':
        return <PerformanceReviews showToast={showToast} />;

      // Finance manager
      case 'Commission Calculations':
        return <CommissionCalc showToast={showToast} />;
      case 'Revenue Reports':
        return <RevenueReports showToast={showToast} />;
      case 'Expense Tracking':
        return <ExpenseTracking showToast={showToast} />;
      case 'GST Management':
        return <GstManagement showToast={showToast} />;
      case 'Payroll View':
        return <Payroll showToast={showToast} />;

      // Inventory manager
      case 'Stock Management':
        return <StockManagement showToast={showToast} />;
      case 'Warehouse':
        return <WarehouseManagement />;
      case 'Stock Transfers':
        return <StockTransfers showToast={showToast} />;
      case 'Stock Alerts':
        return <StockAlerts showToast={showToast} />;
      case 'Inventory Reports':
        return <InventoryReports showToast={showToast} />;

      // Purchase manager
      case 'Vendor Management':
        return <VendorManagement showToast={showToast} />;
      case 'Purchase Orders':
        return <PurchaseOrders showToast={showToast} />;
      case 'Purchase Approvals':
        return <PurchaseApprovals showToast={showToast} />;
      case 'Material Tracking':
        return <MaterialTracking showToast={showToast} />;
      case 'Procurement Reports':
        return <ProcurementReports showToast={showToast} />;

      // Team Member
      case 'My Tasks':
        return <Tasks showToast={showToast} />;

      default:
        return <Dashboard onNavigate={goToTab} showToast={showToast} />;
    }
  };

  return (
    <DashboardLayout
      userRole={currentRoleLabel}
      activeTab={currentTab}
      goToTab={goToTab}
      sidebarItems={navItems}
      onSwitchRole={onSwitchRole}
      profilePath={profilePath}
      passwordPath={passwordPath}
      portalSettingsPath={portalSettingsPath}
      notifications={notifications.map(n => ({ id: n.id, title: n.title, message: n.message, read: n.read, date: `${n.date} ${n.time}` }))}
      onMarkAllNotificationsRead={handleMarkAllRead}
      profile={{
        name: currentEmployee?.name || 'Employee User',
        subtitle: currentEmployee?.designation || currentRoleLabel,
        image: null
      }}
    >
      {renderActiveScreen()}
    </DashboardLayout>
  );
}

export default function EmployeeModule({ userRole = 'Sales Executive', showToast, onSwitchRole }) {
  return (
    <EmployeeAuthProvider initialRole={userRole} onRoleChange={onSwitchRole}>
      <EmployeeWorkspace userRole={userRole} showToast={showToast} onSwitchRole={onSwitchRole} />
    </EmployeeAuthProvider>
  );
}
