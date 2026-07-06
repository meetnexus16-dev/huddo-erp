import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  Home, GitBranch, LayoutGrid, Users, UsersRound, Award, Store, Package,
  ShoppingCart, CreditCard, Percent, TrendingUp, Target, MapPin, CheckSquare,
  Archive, Shield, Bell, BarChart3, Lock, Settings, ShoppingBag, Layers
} from 'lucide-react';
import { Toast } from '../components/Common';
import { DashboardLayout } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useWorkspaceNav } from '../hooks/useWorkspaceNav';
import { ADMIN_ROUTES, ROUTES, buildPath } from './routePaths';

import Dashboard from '../modules/Dashboard';
import UserRoleManagement from '../modules/UserRoleManagement';
import Hierarchy from '../modules/Hierarchy';
import Employees from '../modules/Employees';
import Teams from '../modules/Teams';
import Departments from '../modules/Departments';
import PromoterModule from '../modules/promoter/PromoterModule';
import Retailers from '../modules/Retailers';
import Products from '../modules/Products';
import ProductCategories from '../modules/ProductCategories';
import Orders from '../modules/Orders';
import BillingPayments from '../modules/BillingPayments';
import Commissions from '../modules/Commissions';
import Sales from '../modules/Sales';
import Targets from '../modules/Targets';
import Approvals from '../modules/Approvals';
import FieldTracking from '../modules/FieldTracking';
import Notifications from '../modules/Notifications';
import Reports from '../modules/Reports';
import Security from '../modules/Security';
import Inventory from '../modules/Inventory';
import Purchase from '../modules/Purchase';
import PettyCash from '../modules/PettyCash';
import CountryManagerModule from '../modules/country-manager/CountryManagerModule';
import CommunicationSettings from '../modules/CommunicationSettings';
import MyProfile from '../modules/MyProfile';

const NAV_MENU = [
  {
    section: 'OVERVIEW',
    items: [
      { id: 'Dashboard', label: 'Dashboard', icon: Home, component: Dashboard }
    ]
  },
  {
    section: 'ORGANIZATION',
    items: [
      { id: 'Hierarchy', label: 'Hierarchy', icon: GitBranch, component: Hierarchy },
      { id: 'Departments', label: 'Departments', icon: LayoutGrid, component: Departments }
    ]
  },
  {
    section: 'PEOPLE',
    items: [
      { id: 'Employees', label: 'Employees', icon: Users, component: Employees },
      { id: 'Teams', label: 'Teams', icon: UsersRound, component: Teams },
      { id: 'Promoters', label: 'Promoters', icon: Award, component: PromoterModule },
      { id: 'CountryManagers', label: 'Country Managers', icon: Users, component: CountryManagerModule }
    ]
  },
  {
    section: 'BUSINESS',
    items: [
      { id: 'Retailers', label: 'Retailers', icon: Store, component: Retailers },
      { id: 'Products', label: 'Products', icon: Package, component: Products },
      { id: 'ProductCategories', label: 'Product Categories', icon: Layers, component: ProductCategories },
      { id: 'Orders', label: 'Orders', icon: ShoppingCart, component: Orders }
    ]
  },
  {
    section: 'FINANCE',
    items: [
      { id: 'Billing', label: 'Billing & Payments', icon: CreditCard, component: BillingPayments },
      { id: 'Commissions', label: 'Commissions', icon: Percent, component: Commissions },
      { id: 'Sales', label: 'Sales', icon: TrendingUp, component: Sales },
      { id: 'Targets', label: 'Targets', icon: Target, component: Targets },
      { id: 'Petty Cash', label: 'Petty Cash', icon: CreditCard, component: PettyCash }
    ]
  },
  {
    section: 'OPERATIONS',
    items: [
      { id: 'Field Tracking', label: 'Field Tracking', icon: MapPin, component: FieldTracking },
      { id: 'Approvals', label: 'Approvals', icon: CheckSquare, component: Approvals },
      { id: 'Inventory', label: 'Inventory', icon: Archive, component: Inventory },
      { id: 'Purchase', label: 'Purchase & QR', icon: ShoppingBag, component: Purchase }
    ]
  },
  {
    section: 'ADMINISTRATION',
    items: [
      { id: 'Users & Roles', label: 'Users & Roles', icon: Shield, component: UserRoleManagement },
      { id: 'Notifications', label: 'Notifications', icon: Bell, component: Notifications },
      { id: 'Reports', label: 'Reports', icon: BarChart3, component: Reports },
      { id: 'Security & Audit', label: 'Security & Audit', icon: Lock, component: Security }
    ]
  },
  {
    section: 'FOUNDER',
    items: [
      { id: 'CommunicationSettings', label: 'Communication Settings', icon: Settings, component: CommunicationSettings }
    ]
  }
];

const COMPONENT_MAP = NAV_MENU.reduce((acc, section) => {
  section.items.forEach((item) => {
    acc[item.id] = item.component;
  });
  return acc;
}, {});

function PortalSettingsPlaceholder() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
      <h2 className="text-lg font-bold text-slate-800">Portal Settings</h2>
      <p className="text-sm text-slate-500 mt-2">Workspace preferences will be available here.</p>
    </div>
  );
}

export default function AdminApp() {
  const location = useLocation();
  const { user, currentRole, showToast, handleRoleChange, canViewItem, toast, setToast } = useAuth();
  const {
    activeTab,
    goToTab,
    attachPaths,
    profilePath,
    passwordPath,
    portalSettingsPath
  } = useWorkspaceNav(ROUTES.ADMIN, ADMIN_ROUTES);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Pending Shop Verification', message: 'Apex Sole Distributors requested Silver category authorization in Pune.', read: false, date: '10 mins ago' },
    { id: 2, title: 'Large Order Review Required', message: 'Order ORD-5509 of value ₹1,50,000 exceeds standard limit limits.', read: false, date: '2 hours ago' }
  ]);

  const filteredSidebarItems = useMemo(() => {
    const filtered = NAV_MENU.map((section) => ({
      ...section,
      items: section.items.filter((item) => canViewItem(item.id))
    })).filter((section) => section.items.length > 0);
    return attachPaths(filtered);
  }, [canViewItem, attachPaths]);

  useEffect(() => {
    if (activeTab !== 'Profile' && activeTab !== 'Portal Settings' && !canViewItem(activeTab)) {
      goToTab('Dashboard');
    }
  }, [activeTab, canViewItem, goToTab]);

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('Marked all notifications as read.', 'success');
  };

  const isPasswordRoute = location.pathname.endsWith('/profile/password');
  const ActiveComponent = isPasswordRoute || activeTab === 'Profile'
    ? MyProfile
    : activeTab === 'Portal Settings'
      ? PortalSettingsPlaceholder
      : COMPONENT_MAP[activeTab] || Dashboard;

  if (location.pathname === ROUTES.ADMIN || location.pathname === `${ROUTES.ADMIN}/`) {
    return <Navigate to={buildPath(ROUTES.ADMIN, 'Dashboard', ADMIN_ROUTES)} replace />;
  }

  return (
    <DashboardLayout
      userRole={currentRole}
      activeTab={isPasswordRoute ? 'Profile' : activeTab}
      goToTab={goToTab}
      sidebarItems={filteredSidebarItems}
      onSwitchRole={handleRoleChange}
      notifications={notifications}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      profilePath={profilePath}
      passwordPath={passwordPath}
      portalSettingsPath={portalSettingsPath}
      profile={{
        name: user?.name || 'Rohan Hudda',
        subtitle: `${currentRole} Session`,
        image: user?.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      }}
    >
      <Routes>
        <Route
          path="*"
          element={(
            <ActiveComponent
              onNavigate={goToTab}
              showToast={showToast}
              userRole={currentRole}
              onSwitchRole={handleRoleChange}
            />
          )}
        />
      </Routes>

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
