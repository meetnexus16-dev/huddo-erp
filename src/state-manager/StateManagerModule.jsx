import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Home, Users, Store, ShoppingCart, 
  TrendingUp, Target, MapPin, Percent, BarChart3, Bell
} from 'lucide-react';

// Import Layout
import { DashboardLayout } from '../components/DesignSystem';
import { useWorkspaceNav } from '../hooks/useWorkspaceNav';
import { ROUTES, STATE_MANAGER_ROUTES, buildPath } from '../routes/routePaths';
import MyProfile from '../modules/MyProfile';
import NetworkWorkspace from '../modules/network/NetworkWorkspace';
import { NETWORK_SIDEBAR_SECTION, getNetworkTab, isNetworkScreen } from '../modules/network/networkSidebarConfig';
import OnboardSharePanel from '../modules/network/OnboardSharePanel';
import { Toast, SkeletonLoader } from './components/Common';

// Import Mock Data (fallback for pages not yet wired to API)
import { 
  orders as initialOrders, 
  monthlyRevenueData, 
  cityPerformanceData, 
  fieldForceData as initialFieldForceData, 
  pendingApprovals as initialPendingApprovals, 
  myIncentive, 
  notifications as initialNotifications 
} from './mockData';

// Import Pages
import Dashboard from './pages/Dashboard';
import CityManagers from './pages/CityManagers';
import Retailers from './pages/Retailers';
import Orders from './pages/Orders';
import Approvals from './pages/Approvals';
import SalesMonitoring from './pages/SalesMonitoring';
import TargetManagement from './pages/TargetManagement';
import FieldForce from './pages/FieldForce';
import MyIncentive from './pages/MyIncentive';
import Reports from './pages/Reports';
import NotificationsPage from './pages/NotificationsPage';
import ManagerOrdersLive from '../modules/manager/ManagerOrdersLive';
import { fetchPendingOrderCount } from '../modules/manager/pendingOrderUtils';
import { authFetch } from '../utils/authFetch';
import { fetchTerritoryRetailers } from '../modules/manager/territoryTeamApi';

export default function StateManagerModule({ showToast: parentShowToast, onSwitchRole }) {
  const {
    activeTab,
    goToTab,
    attachPaths,
    profilePath,
    passwordPath,
    portalSettingsPath,
    location
  } = useWorkspaceNav(ROUTES.STATE_MANAGER, STATE_MANAGER_ROUTES);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Search state managed globally
  const [searchQuery, setSearchQuery] = useState('');

  // Global Collections State (enabling mutations)
  const [cityManagers, setCityManagers] = useState([]);
  const [territoryLabel, setTerritoryLabel] = useState('');
  const [teamDataLoading, setTeamDataLoading] = useState(true);
  const [managerProfile, setManagerProfile] = useState({ name: 'State Manager', subtitle: 'State Manager' });
  const [retailers, setRetailers] = useState([]);
  const [retailersLoading, setRetailersLoading] = useState(true);
  const [orders, setOrders] = useState(initialOrders);
  const [pendingApprovals, setPendingApprovals] = useState(initialPendingApprovals);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [fieldForceData] = useState(initialFieldForceData);
  
  const [approvalHistory, setApprovalHistory] = useState([
    { id: "H001", item: "ORD-2026-0539 from Classic Comfort", type: "Large Order", decision: "Approved", date: "2026-06-09", reason: null },
    { id: "H002", item: "ORD-2026-0534 from Star Shoes", type: "Large Order", decision: "Approved", date: "2026-06-07", reason: null }
  ]);

  // Filter override when navigating from map to managers
  const [cityFilterOverride, setCityFilterOverride] = useState('');

  // Simulated Skeleton Loader on Tab Switch
  const timerRef = useRef(null);

  const handleTabChange = (tab) => {
    goToTab(tab);
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLoading(false), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname]);

  useEffect(() => {
    fetchPendingOrderCount().then(setPendingOrderCount);
  }, [activeTab]);

  const handleNavigateWithFilter = (targetTab, filterVal) => {
    setCityFilterOverride(filterVal);
    handleTabChange(targetTab);
  };

  // Toast handler
  const showToast = (message, type = 'success') => {
    if (parentShowToast) {
      parentShowToast(message, type);
    } else {
      setToast({ message, type });
    }
  };

  const loadCityManagers = () => {
    setTeamDataLoading(true);
    authFetch('/manager/me/city-managers')
      .then((res) => {
        if (res.success && res.data) {
          setCityManagers(res.data.cityManagers || []);
          setTerritoryLabel(res.data.territoryLabel || '');
        } else {
          showToast(res.message || 'Failed to load city managers.', 'error');
        }
      })
      .catch(() => showToast('Failed to load city managers.', 'error'))
      .finally(() => setTeamDataLoading(false));
  };

  const loadRetailers = () => {
    setRetailersLoading(true);
    fetchTerritoryRetailers()
      .then((data) => setRetailers(data.retailers || []))
      .catch(() => showToast('Failed to load retailers.', 'error'))
      .finally(() => setRetailersLoading(false));
  };

  useEffect(() => {
    loadCityManagers();
    loadRetailers();
    authFetch('/profile')
      .then((res) => {
        if (res.success && res.data) {
          setManagerProfile({
            name: res.data.name || 'State Manager',
            subtitle: territoryLabel ? `${territoryLabel} State Manager` : 'State Manager',
            image: res.data.profile_photo || ''
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (territoryLabel) {
      setManagerProfile((prev) => ({
        ...prev,
        subtitle: `${territoryLabel} State Manager`
      }));
    }
  }, [territoryLabel]);

  // ────────────────────────────────────────────────────────────────────────
  // CORE BUSINESS MUTATORS (State management across components)
  // ────────────────────────────────────────────────────────────────────────
  
  // 1. Order Approvals
  const handleApproveOrder = (orderId) => {
    // Update order status to Approved
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'Approved', requiresStateApproval: false };
      }
      return o;
    }));
    
    // Find item details
    const order = orders.find(o => o.id === orderId);
    
    // Remove from pending approvals
    setPendingApprovals(prev => prev.filter(a => a.orderId !== orderId));
    
    // Add to history log
    if (order) {
      const histItem = {
        id: `H-${Date.now()}`,
        item: `${order.id} from ${order.retailerName}`,
        type: 'Large Order',
        decision: 'Approved',
        date: new Date().toISOString().split('T')[0],
        reason: 'Authorized by State Manager'
      };
      setApprovalHistory(prev => [histItem, ...prev]);
    }
  };

  const handleRejectOrder = (orderId, reason) => {
    // Update order status to Cancelled
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'Cancelled', requiresStateApproval: false };
      }
      return o;
    }));

    // Find item details
    const order = orders.find(o => o.id === orderId);

    // Remove from pending approvals
    setPendingApprovals(prev => prev.filter(a => a.orderId !== orderId));

    // Add to history log
    if (order) {
      const histItem = {
        id: `H-${Date.now()}`,
        item: `${order.id} from ${order.retailerName}`,
        type: 'Large Order',
        decision: 'Rejected',
        date: new Date().toISOString().split('T')[0],
        reason: reason
      };
      setApprovalHistory(prev => [histItem, ...prev]);
    }
  };

  // 2. Generic Approvals (from Approvals Page Workspace)
  const handleApproveApproval = (approvalId) => {
    const item = pendingApprovals.find(a => a.id === approvalId);
    if (!item) return;

    if (item.type === 'Large Order') {
      handleApproveOrder(item.orderId);
    } else if (item.type === 'Retailer Registration') {
      // Approve retailer registration
      setRetailers(prev => prev.map(r => {
        if (r.businessName === item.retailer) {
          return { ...r, status: 'Active' };
        }
        return r;
      }));
      
      // Remove from pending approvals
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));

      // Add to history log
      const histItem = {
        id: `H-${Date.now()}`,
        item: item.retailer,
        type: item.type,
        decision: 'Approved',
        date: new Date().toISOString().split('T')[0],
        reason: 'Verified and registered active in system'
      };
      setApprovalHistory(prev => [histItem, ...prev]);
    }
  };

  const handleRejectApproval = (approvalId, reason) => {
    const item = pendingApprovals.find(a => a.id === approvalId);
    if (!item) return;

    if (item.type === 'Large Order') {
      handleRejectOrder(item.orderId, reason);
    } else if (item.type === 'Retailer Registration') {
      // Reject retailer registration
      setRetailers(prev => prev.map(r => {
        if (r.businessName === item.retailer) {
          return { ...r, status: 'Rejected' };
        }
        return r;
      }));

      // Remove from pending approvals
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));

      // Add to history log
      const histItem = {
        id: `H-${Date.now()}`,
        item: item.retailer,
        type: item.type,
        decision: 'Rejected',
        date: new Date().toISOString().split('T')[0],
        reason: reason
      };
      setApprovalHistory(prev => [histItem, ...prev]);
    }
  };

  // 3. Retailer onboarding verification direct hooks
  const handleApproveRetailer = (retailerId) => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (!retailer) return;

    // Set Retailer status to Active
    setRetailers(prev => prev.map(r => {
      if (r.id === retailerId) {
        return { ...r, status: 'Active' };
      }
      return r;
    }));

    // Find and remove matching pending approval item
    setPendingApprovals(prev => prev.filter(a => a.retailer !== retailer.businessName));

    // Log in History
    const histItem = {
      id: `H-${Date.now()}`,
      item: retailer.businessName,
      type: 'Retailer Registration',
      decision: 'Approved',
      date: new Date().toISOString().split('T')[0],
      reason: 'Shop profile and GSTIN verified active'
    };
    setApprovalHistory(prev => [histItem, ...prev]);
  };

  const handleRejectRetailer = (retailerId) => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (!retailer) return;

    // Set Retailer status to Rejected
    setRetailers(prev => prev.map(r => {
      if (r.id === retailerId) {
        return { ...r, status: 'Rejected' };
      }
      return r;
    }));

    // Find and remove matching pending approval item
    setPendingApprovals(prev => prev.filter(a => a.retailer !== retailer.businessName));

    // Log in History
    const histItem = {
      id: `H-${Date.now()}`,
      item: retailer.businessName,
      type: 'Retailer Registration',
      decision: 'Rejected',
      date: new Date().toISOString().split('T')[0],
      reason: 'Registration requirements deficit'
    };
    setApprovalHistory(prev => [histItem, ...prev]);
  };

  // 5. Targets inline save
  const handleSaveTargets = (newTargets) => {
    setCityManagers(prev => prev.map(cm => {
      if (newTargets[cm.id] !== undefined) {
        return {
          ...cm,
          monthlyTarget: Number(newTargets[cm.id])
        };
      }
      return cm;
    }));
  };

  // 6. Notifications hub mark read
  const handleMarkRead = (notifId) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === notifId) {
        return { ...n, read: true };
      }
      return n;
    }));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Helper counts for layout badges
  const pendingApprovalsCount = pendingOrderCount;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const SIDEBAR_ITEMS = attachPaths([
    {
      section: "OVERVIEW",
      items: [
        { id: "Dashboard", label: "Dashboard", icon: Home }
      ]
    },
    NETWORK_SIDEBAR_SECTION,
    {
      section: "MY REGION",
      items: [
        { id: "City Managers", label: "City Managers", icon: Users },
        { id: "Retailers", label: "Retailers", icon: Store }
      ]
    },
    {
      section: "OPERATIONS",
      items: [
        { id: "Orders", label: "Orders", icon: ShoppingCart }
      ]
    },
    {
      section: "PERFORMANCE",
      items: [
        { id: "Sales Monitoring", label: "Sales Monitoring", icon: TrendingUp },
        { id: "Targets", label: "Targets", icon: Target },
        { id: "Field Force", label: "Field Force", icon: MapPin }
      ]
    },
    {
      section: "FINANCIALS",
      items: [
        { id: "My Incentive", label: "My Incentive", icon: Percent }
      ]
    },
    {
      section: "ADMIN",
      items: [
        { id: "Reports", label: "Reports", icon: BarChart3 },
        { id: "Notifications", label: "Notifications", icon: Bell, badge: unreadNotificationsCount }
      ]
    }
  ]);

  const isPasswordRoute = location.pathname.endsWith('/profile/password');
  const currentTab = isPasswordRoute ? 'Profile' : activeTab;

  if (location.pathname === ROUTES.STATE_MANAGER || location.pathname === `${ROUTES.STATE_MANAGER}/`) {
    return <Navigate to={buildPath(ROUTES.STATE_MANAGER, 'Dashboard', STATE_MANAGER_ROUTES)} replace />;
  }

  if (!currentTab) {
    return <Navigate to={buildPath(ROUTES.STATE_MANAGER, 'Dashboard', STATE_MANAGER_ROUTES)} replace />;
  }

  // Render active route components
  const renderActiveTab = () => {
    if (currentTab === 'Profile') {
      return <MyProfile showToast={showToast} userRole="State Manager" onSwitchRole={onSwitchRole} />;
    }
    if (isNetworkScreen(currentTab)) {
      return (
        <NetworkWorkspace
          showToast={showToast}
          initialTab={getNetworkTab(currentTab)}
          hideTabBar
          key={currentTab}
        />
      );
    }
    switch (currentTab) {
      case 'Dashboard':
        return (
          <Dashboard
            onNavigate={handleTabChange}
            showToast={showToast}
          />
        );
      case 'City Managers':
        return (
          <CityManagers 
            cityManagers={cityManagers}
            retailers={retailers}
            territoryLabel={territoryLabel}
            loading={teamDataLoading}
            onRefresh={loadCityManagers}
            onNavigate={handleTabChange}
            showToast={showToast}
            initialCityFilter={cityFilterOverride}
          />
        );
      case 'Retailers':
        return (
          <Retailers 
            retailers={retailers}
            cityManagers={cityManagers}
            orders={orders}
            onApproveRetailer={handleApproveRetailer}
            onRejectRetailer={handleRejectRetailer}
            showToast={showToast}
            territoryLabel={territoryLabel}
            loading={retailersLoading}
          />
        );

      case 'Orders':
        return (
          <ManagerOrdersLive
            showToast={showToast}
            title="State Orders"
            onPendingCountChange={setPendingOrderCount}
          />
        );
      case 'Sales Monitoring':
        return (
          <SalesMonitoring 
            orders={orders}
            retailers={retailers}
            cityManagers={cityManagers}
            monthlyRevenueData={monthlyRevenueData}
            cityPerformanceData={cityPerformanceData}
            showToast={showToast}
          />
        );
      case 'Targets':
        return (
          <TargetManagement 
            cityManagers={cityManagers}
            onSaveTargets={handleSaveTargets}
            showToast={showToast}
          />
        );
      case 'Field Force':
        return (
          <FieldForce 
            fieldForceData={fieldForceData}
            showToast={showToast}
          />
        );
      case 'My Incentive':
        return (
          <MyIncentive 
            monthlyRevenueData={monthlyRevenueData}
            myIncentive={myIncentive}
            showToast={showToast}
          />
        );
      case 'Reports':
        return (
          <Reports 
            orders={orders}
            retailers={retailers}
            cityManagers={cityManagers}
            cityPerformanceData={cityPerformanceData}
            monthlyRevenueData={monthlyRevenueData}
            fieldForceData={fieldForceData}
            showToast={showToast}
          />
        );
      case 'Notifications':
        return (
          <NotificationsPage 
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            showToast={showToast}
          />
        );
      default:
        return (
          <Dashboard
            onNavigate={handleTabChange}
            showToast={showToast}
          />
        );
    }
  };

  return (
    <DashboardLayout
      userRole="State Manager"
      activeTab={currentTab}
      goToTab={handleTabChange}
      sidebarItems={SIDEBAR_ITEMS}
      onSwitchRole={onSwitchRole}
      profilePath={profilePath}
      passwordPath={passwordPath}
      portalSettingsPath={portalSettingsPath}
      notifications={notifications.map(n => ({ id: n.id, title: n.title || 'System Alert', message: n.message, read: n.read, date: n.date }))}
      onMarkAllNotificationsRead={handleMarkAllRead}
      profile={{
        name: managerProfile.name,
        subtitle: managerProfile.subtitle,
        image: managerProfile.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
      }}
    >
      {loading ? (
        <SkeletonLoader type={currentTab === 'Dashboard' ? 'dashboard' : currentTab === 'City Managers' || currentTab === 'Retailers' || currentTab === 'Orders' ? 'table' : 'cards'} />
      ) : (
        renderActiveTab()
      )}
      
      {/* Toast Manager */}
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
