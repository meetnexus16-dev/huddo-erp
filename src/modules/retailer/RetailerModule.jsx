/**
 * HUDDO ERP - Retailer Panel Module
 * 
 * INTEGRATION INSTRUCTIONS:
 * To integrate this module into the main application, follow these steps:
 * 
 * 1. Open 'src/App.jsx'
 * 2. Import the RetailerModule at the top of the file:
 *    import RetailerModule from './modules/retailer/RetailerModule';
 * 3. Add the Retailer Panel entry under the BUSINESS section inside the NAV_MENU array (e.g., around line 68):
 *    { id: "RetailerPanel", label: "Retailer Panel (Mock)", icon: Store, component: RetailerModule }
 * 
 * No other code edits are required. The module is fully isolated and self-contained.
 */

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Home, ShoppingCart, FileText, CreditCard, Archive, 
  Tag, Award, User, Bell, Lock, RefreshCw, ShoppingBag
} from 'lucide-react';
import { DashboardLayout } from '../../components/DesignSystem';
import { useWorkspaceNav } from '../../hooks/useWorkspaceNav';
import { RETAILER_ROUTES, ROUTES, buildPath } from '../../routes/routePaths';

// Context & Mock Data
import { RetailerAuthProvider, useRetailerAuth } from './context/RetailerAuthContext';
import { mockNotifications as initialNotifications } from './mockData/mockNotifications';

// Subpages
import Dashboard from './pages/Dashboard';
import PlaceOrder from './pages/PlaceOrder';
import CreateSale from './pages/CreateSale';
import MyOrders from './pages/MyOrders';
import BillingPayments from './pages/BillingPayments';
import InventoryView from './pages/InventoryView';
import Schemes from './pages/Schemes';
import CommissionRewards from './pages/CommissionRewards';
import Profile from '../MyProfile';
import Notifications from './pages/Notifications';
import DistributorDashboard from './pages/DistributorDashboard';

// Main Layout Component
function RetailerPanelLayout({ userRole, showToast, onSwitchRole }) {
  const { user, loading: authLoading } = useRetailerAuth();
  const {
    activeTab,
    goToTab,
    attachPaths,
    profilePath,
    passwordPath,
    portalSettingsPath,
    location
  } = useWorkspaceNav(ROUTES.RETAILER, RETAILER_ROUTES);
  const [loading, setLoading] = useState(false);

  // Central Notification State to keep Bell and Page synchronized
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = () => {};
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  if (location.pathname === ROUTES.RETAILER || location.pathname === `${ROUTES.RETAILER}/`) {
    return <Navigate to={buildPath(ROUTES.RETAILER, 'Dashboard', RETAILER_ROUTES)} replace />;
  }

  if (!activeTab) {
    return <Navigate to={buildPath(ROUTES.RETAILER, 'Dashboard', RETAILER_ROUTES)} replace />;
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-xs animate-pulse space-y-4 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-brand-orange animate-spin" />
            <span className="text-sm font-bold text-slate-700 font-display">Initializing Retailer Workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const isDistributor = user.role.toLowerCase() === 'distributor';

  const handleTabChange = (tabId) => goToTab(tabId);

  // Notification management handlers
  const handleMarkAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    showToast("Notification marked as read.", "success");
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast("Marked all notifications as read.", "success");
  };

  const handleDeleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast("Notification deleted.", "success");
  };

  // RBAC Role Security check
  const allowedRoles = ['retailer', 'distributor'];
  if (!allowedRoles.includes(user.role.toLowerCase())) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 animate-pulse">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 font-display">Access Denied (RBAC Protected)</h2>
        <p className="text-xs text-slate-550 font-medium max-w-sm mt-2">
          Your current session role is <span className="font-extrabold text-slate-850">"{user.role}"</span>. Only users with the <span className="font-bold text-brand-orange">"retailer" or "distributor"</span> role are authorized to access this Portal.
        </p>
        <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-xl text-left mt-6 max-w-md text-xs font-semibold text-slate-605">
          <span className="font-extrabold text-slate-850 block mb-1">To access this panel:</span>
          Use the role dropdown in the Admin panel to switch your role to <span className="font-bold text-brand-orange">"Retailer" or "Distributor"</span>. This will load the full portal view.
        </div>
      </div>
    );
  }

  // Sidebar navigation schema
  const SIDEBAR_ITEMS = attachPaths(isDistributor ? [
    { id: 'Dashboard', label: 'Wholesale Dashboard', icon: Home },
    { id: 'Place Order', label: 'Bulk Purchase', icon: ShoppingCart },
    { id: 'Create Sale', label: 'Create Sale', icon: ShoppingBag },
    { id: 'My Orders', label: 'Bulk Orders', icon: FileText },
    { id: 'Billing & Invoices', label: 'Statement Ledger', icon: CreditCard },
    { id: 'Inventory', label: 'Warehouse Stock', icon: Archive },
    { id: 'Schemes & Discounts', label: 'Trade Schemes', icon: Tag },
    { id: 'Commission & Rewards', label: 'Incentive Ledger', icon: Award },
    { id: 'Profile', label: 'Profile Settings', icon: User },
    { id: 'Notifications', label: 'System Alerts', icon: Bell, badge: unreadCount }
  ] : [
    { id: 'Dashboard', label: 'Dashboard', icon: Home },
    { id: 'Place Order', label: 'Place Order', icon: ShoppingCart },
    { id: 'Create Sale', label: 'Create Sale', icon: ShoppingBag },
    { id: 'My Orders', label: 'My Orders', icon: FileText },
    { id: 'Billing & Invoices', label: 'Billing & Invoices', icon: CreditCard },
    { id: 'Inventory', label: 'Inventory', icon: Archive },
    { id: 'Schemes & Discounts', label: 'Schemes & Discounts', icon: Tag },
    { id: 'Profile', label: 'Profile', icon: User },
    { id: 'Notifications', label: 'Notifications', icon: Bell, badge: unreadCount }
  ]);

  const isPasswordRoute = location.pathname.endsWith('/profile/password');
  const currentTab = isPasswordRoute ? 'Profile' : activeTab;

  // Helper to render active component
  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'Dashboard':
        return isDistributor 
          ? <DistributorDashboard onNavigate={handleTabChange} /> 
          : <Dashboard onNavigate={handleTabChange} />;
      case 'Place Order':
        return <PlaceOrder showToast={showToast} onNavigate={handleTabChange} />;
      case 'Create Sale':
        return <CreateSale showToast={showToast} />;
      case 'My Orders':
        return <MyOrders showToast={showToast} />;
      case 'Billing & Invoices':
        return <BillingPayments showToast={showToast} />;
      case 'Inventory':
        return <InventoryView />;
      case 'Schemes & Discounts':
        return <Schemes />;
      case 'Commission & Rewards':
        // Commission ledger is only available to distributors, not retailers.
        return isDistributor
          ? <CommissionRewards />
          : <Navigate to={buildPath(ROUTES.RETAILER, 'Dashboard', RETAILER_ROUTES)} replace />;
      case 'Profile':
        return <Profile showToast={showToast} userRole={userRole} onSwitchRole={onSwitchRole} />;
      case 'Notifications':
        return (
          <Notifications 
            notifications={notifications} 
            onMarkAsRead={handleMarkAsRead} 
            onMarkAllAsRead={handleMarkAllAsRead} 
            onDeleteNotification={handleDeleteNotification}
          />
        );
      default:
        return isDistributor 
          ? <DistributorDashboard onNavigate={handleTabChange} /> 
          : <Dashboard onNavigate={handleTabChange} />;
    }
  };

  return (
    <DashboardLayout
      userRole={isDistributor ? 'Distributor' : 'Retailer'}
      activeTab={currentTab}
      goToTab={goToTab}
      sidebarItems={SIDEBAR_ITEMS}
      onSwitchRole={onSwitchRole}
      profilePath={profilePath}
      passwordPath={passwordPath}
      portalSettingsPath={portalSettingsPath}
      notifications={notifications.map(n => ({ id: n.id, title: n.title, message: n.message, read: n.read, date: n.timestamp }))}
      onMarkAllNotificationsRead={handleMarkAllAsRead}
      profile={{
        name: isDistributor ? 'Huddo Mega Distributors' : user.name,
        subtitle: isDistributor ? 'Platinum Tier Distributor' : `${user.category || 'Standard'} Tier Retailer`,
        image: isDistributor 
          ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" 
          : (user.rawUser?.profile_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150")
      }}
    >
      {loading ? (
        /* Premium simulated skeleton loader */
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-4 min-h-[400px] flex flex-col justify-center">
          <div className="flex items-center justify-center gap-2.5 text-slate-400 text-xs font-bold font-display">
            <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
            <span>Fetching retailer secure node statistics...</span>
          </div>
          <div className="space-y-3 max-w-md mx-auto w-full mt-4">
            <div className="h-4.5 bg-slate-100 rounded-md w-full"></div>
            <div className="h-4.5 bg-slate-100 rounded-md w-5/6"></div>
            <div className="h-4.5 bg-slate-100 rounded-md w-4/5"></div>
          </div>
        </div>
      ) : (
        renderActiveScreen()
      )}
    </DashboardLayout>
  );
}

// Wrapper to export RetailerModule with context
export default function RetailerModule({ userRole = "retailer", showToast, onSwitchRole }) {
  // Safe wrapper fallback if parent doesn't supply showToast hook
  const safeShowToast = showToast || ((msg, type) => {
    console.log(`[Toast Fallback] type: ${type}, msg: ${msg}`);
  });

  return (
    <RetailerAuthProvider currentRole={userRole}>
      <RetailerPanelLayout userRole={userRole} showToast={safeShowToast} onSwitchRole={onSwitchRole} />
    </RetailerAuthProvider>
  );
}
