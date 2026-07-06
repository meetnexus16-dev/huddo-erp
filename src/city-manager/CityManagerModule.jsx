import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Home, Store, UserPlus, Clock, ShoppingCart, CheckSquare, 
  MapPin, Lightbulb, Award, TrendingUp, Target, Percent, BarChart3, Bell
} from 'lucide-react';

// Import Layout
import { DashboardLayout } from '../components/DesignSystem';
import { useWorkspaceNav } from '../hooks/useWorkspaceNav';
import { CITY_MANAGER_ROUTES, ROUTES, buildPath } from '../routes/routePaths';
import MyProfile from '../modules/MyProfile';
import { Toast, SkeletonLoader } from './components/Common';
import { formatCurrency } from './cityManagerUtils';

// Import Mock Data
import {
  orders as initialOrders,
  leads as initialLeads,
  visitLogs as initialVisitLogs,
  promoters as initialPromoters,
  myIncentive,
  cityTargets as initialCityTargets,
  monthlyRevenueData,
  retailerSalesData,
  pendingApprovals as initialPendingApprovals,
  notifications as initialNotifications
} from './cityManagerMockData';

// Import Pages
import Dashboard from './pages/Dashboard';
import Retailers from './pages/Retailers';
import Orders from './pages/Orders';
import Approvals from './pages/Approvals';
import VisitLogs from './pages/VisitLogs';
import Leads from './pages/Leads';
import PromoterView from './pages/PromoterView';
import SalesMonitoring from './pages/SalesMonitoring';
import TargetManagement from './pages/TargetManagement';
import MyIncentive from './pages/MyIncentive';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import NetworkWorkspace from '../modules/network/NetworkWorkspace';
import { NETWORK_SIDEBAR_SECTION, getNetworkTab, isNetworkScreen } from '../modules/network/networkSidebarConfig';
import OnboardSharePanel from '../modules/network/OnboardSharePanel';
import ManagerOrdersLive from '../modules/manager/ManagerOrdersLive';
import ManagerApprovalsLive from '../modules/manager/ManagerApprovalsLive';
import { fetchPendingOrderCount } from '../modules/manager/pendingOrderUtils';
import { fetchTerritoryRetailers } from '../modules/manager/territoryTeamApi';

export default function CityManagerModule({ showToast: parentShowToast, onSwitchRole }) {
  const {
    activeTab,
    goToTab,
    attachPaths,
    profilePath,
    passwordPath,
    portalSettingsPath,
    location
  } = useWorkspaceNav(ROUTES.CITY_MANAGER, CITY_MANAGER_ROUTES);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Global collections state
  const [retailers, setRetailers] = useState([]);
  const [retailersLoading, setRetailersLoading] = useState(true);
  const [orders, setOrders] = useState(initialOrders);
  const [leads, setLeads] = useState(initialLeads);
  const [visitLogs, setVisitLogs] = useState(initialVisitLogs);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [promoters] = useState(initialPromoters);
  const [cityTargets, setCityTargets] = useState(initialCityTargets);
  const [pendingApprovals, setPendingApprovals] = useState(initialPendingApprovals);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  // Prefilled / Deep Link States
  const [prefilledLead, setPrefilledLead] = useState(null);
  const [initialPlaceOrderOpen, setInitialPlaceOrderOpen] = useState(false);
  const [initialBookingRetailerId, setInitialBookingRetailerId] = useState('');
  const [initialLogVisitOpen, setInitialLogVisitOpen] = useState(false);
  const [initialTargetId, setInitialTargetId] = useState('');
  const [initialVisitType, setInitialVisitType] = useState('Retailer Visit');

  const [approvalHistory, setApprovalHistory] = useState([
    { id: "H001", item: "Order ORD-2026-0537 from Star Shoes", type: "Large Order", decision: "Approved", date: "2026-06-08", reason: "Payment receipt verified" },
    { id: "H002", item: "Retailer Classic Comfort", type: "Retailer Registration", decision: "Approved", date: "2026-06-05", reason: "Onboarding documents complete" }
  ]);

  const timerRef = useRef(null);

  const handleTabChange = (tab) => {
    setLoading(true);
    goToTab(tab);

    // Clear deep link configs unless they match the tab being navigated to
    if (tab !== 'Orders') {
      setInitialPlaceOrderOpen(false);
      setInitialBookingRetailerId('');
    }
    if (tab !== 'Visit Logs') {
      setInitialLogVisitOpen(false);
      setInitialTargetId('');
      setInitialVisitType('Retailer Visit');
    }

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

  useEffect(() => {
    setRetailersLoading(true);
    fetchTerritoryRetailers()
      .then((data) => {
        const mapped = (data.retailers || []).map((r) => ({
          ...r,
          shopAddress: r.address || '',
          pan: r.panNo || '',
          aadhaar: r.aadhaarNo || '',
          communicationHistory: [],
          lastVisitDate: null
        }));
        setRetailers(mapped);
      })
      .catch(() => showToast('Failed to load retailers.', 'error'))
      .finally(() => setRetailersLoading(false));
  }, []);

  const showToast = (message, type = 'success') => {
    if (parentShowToast) {
      parentShowToast(message, type);
    } else {
      setToast({ message, type });
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // BUSINESS OPERATIONS & MUTATIONS
  // ────────────────────────────────────────────────────────────────────────

  // 2. Base Approvals Actions
  const handleApproveApproval = (approvalId) => {
    const item = pendingApprovals.find(a => a.id === approvalId);
    if (!item) return;

    setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));

    let logItem = '';
    if (item.type === 'Large Order') {
      setOrders(prev => prev.map(o => {
        if (o.id === item.orderId) {
          return { ...o, status: 'Approved', requiresCityApproval: false };
        }
        return o;
      }));
      logItem = `Order ${item.orderId}`;
    } else if (item.type === 'Retailer Registration') {
      setRetailers(prev => prev.map(r => {
        if (r.businessName === item.retailer) {
          return { ...r, status: 'Active' };
        }
        return r;
      }));
      logItem = `Retailer ${item.retailer}`;
    }

    const newHistory = {
      id: `H-${Date.now()}`,
      item: logItem,
      type: item.type,
      decision: 'Approved',
      date: new Date().toISOString().split('T')[0],
      reason: 'Approved by City Manager'
    };
    setApprovalHistory(prev => [newHistory, ...prev]);
  };

  const handleRejectApproval = (approvalId, reason) => {
    const item = pendingApprovals.find(a => a.id === approvalId);
    if (!item) return;

    setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));

    let logItem = '';
    if (item.type === 'Large Order') {
      setOrders(prev => prev.map(o => {
        if (o.id === item.orderId) {
          return { ...o, status: 'Cancelled', requiresCityApproval: false };
        }
        return o;
      }));
      logItem = `Order ${item.orderId}`;
    } else if (item.type === 'Retailer Registration') {
      setRetailers(prev => prev.map(r => {
        if (r.businessName === item.retailer) {
          return { ...r, status: 'Rejected' };
        }
        return r;
      }));
      logItem = `Retailer ${item.retailer}`;
    }

    const newHistory = {
      id: `H-${Date.now()}`,
      item: logItem,
      type: item.type,
      decision: 'Rejected',
      date: new Date().toISOString().split('T')[0],
      reason: reason
    };
    setApprovalHistory(prev => [newHistory, ...prev]);
  };

  // 3. Retailers view Direct Verification Shortcuts
  const handleApproveRetailer = (retailerId) => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (!retailer) return;
    const match = pendingApprovals.find(a => a.retailer === retailer.businessName && a.type === 'Retailer Registration');
    if (match) {
      handleApproveApproval(match.id);
    } else {
      setRetailers(prev => prev.map(r => {
        if (r.id === retailerId) return { ...r, status: 'Active' };
        return r;
      }));
    }
  };

  const handleRejectRetailer = (retailerId, reason) => {
    const retailer = retailers.find(r => r.id === retailerId);
    if (!retailer) return;
    const match = pendingApprovals.find(a => a.retailer === retailer.businessName && a.type === 'Retailer Registration');
    if (match) {
      handleRejectApproval(match.id, reason);
    } else {
      setRetailers(prev => prev.map(r => {
        if (r.id === retailerId) return { ...r, status: 'Rejected' };
        return r;
      }));
    }
  };

  // 4. Retailer notes/communication logging
  const handleAddCommunication = (retailerId, commData) => {
    setRetailers(prev => prev.map(r => {
      if (r.id === retailerId) {
        return {
          ...r,
          communicationHistory: [commData, ...(r.communicationHistory || [])],
          lastVisitDate: commData.type === 'Visit' ? commData.date : r.lastVisitDate
        };
      }
      return r;
    }));
  };

  // 5. Retailers Outstanding clearing
  const handleMarkPaid = (retailerId) => {
    setRetailers(prev => prev.map(r => {
      if (r.id === retailerId) {
        return { ...r, pendingPayment: 0 };
      }
      return r;
    }));
  };

  // 6. Direct Place Order shortcut from Retailer card
  const handlePlaceOrderClick = (retailer) => {
    setInitialBookingRetailerId(retailer.id);
    setInitialPlaceOrderOpen(true);
    handleTabChange('Orders');
  };

  // 7. Direct Log Visit shortcut from Retailer card
  const handleLogVisitClick = (retailer) => {
    setInitialTargetId(retailer.id);
    setInitialVisitType('Retailer Visit');
    setInitialLogVisitOpen(true);
    handleTabChange('Visit Logs');
  };

  // 8. Place Order submits
  const handlePlaceOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);

    if (newOrder.requiresCityApproval) {
      const newApproval = {
        id: `APR00${pendingApprovals.length + 1}`,
        type: 'Large Order',
        orderId: newOrder.id,
        retailer: newOrder.retailerName,
        amount: newOrder.amount,
        items: newOrder.items.length,
        date: newOrder.orderDate,
        urgency: newOrder.amount > 30000 ? 'High' : 'Medium'
      };
      setPendingApprovals(prev => [newApproval, ...prev]);

      const newNotif = {
        id: `N00${notifications.length + 1}`,
        type: 'approval',
        message: `Order ${newOrder.id} from ${newOrder.retailerName} (${formatCurrency(newOrder.amount)}) awaiting your approval`,
        time: 'Just now',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    setRetailers(prev => prev.map(r => {
      if (r.id === newOrder.retailerId) {
        return {
          ...r,
          totalOrders: r.totalOrders + 1,
          totalRevenue: r.totalRevenue + newOrder.amount,
          lastOrderDate: newOrder.orderDate
        };
      }
      return r;
    }));
  };

  const handleApproveOrder = (orderId) => {
    const match = pendingApprovals.find(a => a.orderId === orderId);
    if (match) {
      handleApproveApproval(match.id);
    } else {
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) return { ...o, status: 'Approved', requiresCityApproval: false };
        return o;
      }));
    }
  };

  const handleRejectOrder = (orderId, reason) => {
    const match = pendingApprovals.find(a => a.orderId === orderId);
    if (match) {
      handleRejectApproval(match.id, reason);
    } else {
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) return { ...o, status: 'Cancelled', requiresCityApproval: false };
        return o;
      }));
    }
  };

  // 9. Visit logs submit
  const handleLogVisit = (newLog) => {
    setVisitLogs(prev => [newLog, ...prev]);

    if (newLog.visitType === 'Retailer Visit') {
      setRetailers(prev => prev.map(r => {
        if (r.businessName === newLog.retailerName) {
          const newComm = {
            date: newLog.date,
            type: 'Visit',
            note: `Logged via check-in: ${newLog.purpose}. Outcome: ${newLog.outcome}`
          };
          return {
            ...r,
            lastVisitDate: newLog.date,
            communicationHistory: [newComm, ...(r.communicationHistory || [])]
          };
        }
        return r;
      }));
    } else if (newLog.visitType === 'Lead Visit') {
      setLeads(prev => prev.map(l => {
        const cleanLeadName = newLog.retailerName.replace(' (Lead)', '');
        if (l.businessName === cleanLeadName) {
          return {
            ...l,
            lastContact: newLog.date,
            notes: newLog.outcome
          };
        }
        return l;
      }));
    }
  };

  // 10. Leads management
  const handleAddLead = (newLead) => {
    setLeads(prev => [newLead, ...prev]);
  };

  const handleUpdateLeadStage = (leadId, newStage) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) return { ...l, status: newStage };
      return l;
    }));
  };

  const handleConvertLead = (lead) => {
    setPrefilledLead(lead);
    handleTabChange('Onboard Retailer');
  };

  // 11. Target Quota Set
  const handleSaveRetailerTargets = (newTargets) => {
    setCityTargets(prev => {
      const updated = prev.retailerTargets.map(t => {
        if (newTargets[t.retailerId] !== undefined) {
          return { ...t, target: Number(newTargets[t.retailerId]) };
        }
        return t;
      });
      return { ...prev, retailerTargets: updated };
    });
  };

  // 12. Notifications Inbox mark read
  const handleMarkRead = (id) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) return { ...n, read: true };
      return n;
    }));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const isPasswordRoute = location.pathname.endsWith('/profile/password');
  const currentTab = isPasswordRoute ? 'Profile' : activeTab;

  if (location.pathname === ROUTES.CITY_MANAGER || location.pathname === `${ROUTES.CITY_MANAGER}/`) {
    return <Navigate to={buildPath(ROUTES.CITY_MANAGER, 'Dashboard', CITY_MANAGER_ROUTES)} replace />;
  }

  if (!currentTab) {
    return <Navigate to={buildPath(ROUTES.CITY_MANAGER, 'Dashboard', CITY_MANAGER_ROUTES)} replace />;
  }

  // Render tab contents
  const renderActiveTab = () => {
    if (currentTab === 'Profile') {
      return <MyProfile showToast={showToast} userRole="City Manager" onSwitchRole={onSwitchRole} />;
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
      case 'My Retailers':
        return (
          <Retailers
            key="all-retailers"
            retailers={retailers}
            orders={orders}
            promoters={promoters}
            onApproveRetailer={handleApproveRetailer}
            onRejectRetailer={handleRejectRetailer}
            onAddCommunication={handleAddCommunication}
            onLogVisitClick={handleLogVisitClick}
            onPlaceOrderClick={handlePlaceOrderClick}
            onMarkPaid={handleMarkPaid}
            onNavigate={handleTabChange}
            showToast={showToast}
          />
        );
      case 'Pending Verification':
        return (
          <Retailers
            key="pending-retailers"
            retailers={retailers}
            orders={orders}
            promoters={promoters}
            onApproveRetailer={handleApproveRetailer}
            onRejectRetailer={handleRejectRetailer}
            onAddCommunication={handleAddCommunication}
            onLogVisitClick={handleLogVisitClick}
            onPlaceOrderClick={handlePlaceOrderClick}
            onMarkPaid={handleMarkPaid}
            onNavigate={handleTabChange}
            showToast={showToast}
            initialCategoryTab="Pending"
          />
        );
      case 'Onboard Retailer':
        return (
          <OnboardSharePanel
            showToast={showToast}
            title="Onboard Retailer or Manager"
            description="Use the shared onboarding form to register retailers or managers on behalf of your referral. Admin approval is required before they can log in."
          />
        );
      case 'Orders':
        return (
          <ManagerOrdersLive
            showToast={showToast}
            title="City Orders"
            onPendingCountChange={setPendingOrderCount}
          />
        );
      case 'Approvals':
        return (
          <ManagerApprovalsLive
            showToast={showToast}
            title="Order Approvals"
            onPendingCountChange={setPendingOrderCount}
          />
        );
      case 'Visit Logs':
        return (
          <VisitLogs
            key={initialTargetId ? `visit-${initialTargetId}` : 'visit-default'}
            visitLogs={visitLogs}
            retailers={retailers}
            leads={leads}
            onLogVisit={handleLogVisit}
            showToast={showToast}
            initialLogVisitOpen={initialLogVisitOpen}
            initialTargetId={initialTargetId}
            initialVisitType={initialVisitType}
          />
        );
      case 'Market Leads':
        return (
          <Leads
            leads={leads}
            onAddLead={handleAddLead}
            onUpdateLeadStage={handleUpdateLeadStage}
            onConvertLead={handleConvertLead}
            onNavigate={handleTabChange}
            showToast={showToast}
          />
        );
      case 'Promoter View':
        return (
          <PromoterView
            promoters={promoters}
            retailers={retailers}
          />
        );
      case 'Sales Monitoring':
        return (
          <SalesMonitoring
            retailers={retailers}
            monthlyRevenueData={monthlyRevenueData}
            retailerSalesData={retailerSalesData}
            showToast={showToast}
          />
        );
      case 'Targets':
        return (
          <TargetManagement
            cityTargets={cityTargets}
            onSaveRetailerTargets={handleSaveRetailerTargets}
            showToast={showToast}
          />
        );
      case 'My Incentive':
        return (
          <MyIncentive
            myIncentive={myIncentive}
          />
        );
      case 'Reports':
        return (
          <Reports
            orders={orders}
            retailers={retailers}
            leads={leads}
            visitLogs={visitLogs}
            monthlyRevenueData={monthlyRevenueData}
            retailerSalesData={retailerSalesData}
            showToast={showToast}
          />
        );
      case 'Notifications':
        return (
          <Notifications
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            showToast={showToast}
          />
        );
      default:
        return (
          <Dashboard
            retailers={retailers}
            orders={orders}
            pendingApprovals={pendingApprovals}
            visitLogs={visitLogs}
            monthlyRevenueData={monthlyRevenueData}
            retailerSalesData={retailerSalesData}
            onApprove={handleApproveApproval}
            onReject={(id) => {
              handleTabChange('Approvals');
              showToast(`Review pending items to reject ID ${id}`, 'info');
            }}
            onNavigate={handleTabChange}
          />
        );
    }
  };

  const pendingApprovalsCount = pendingOrderCount;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const pendingRetailersCount = retailers.filter(r => r.status === 'Pending Verification').length;

  const SIDEBAR_ITEMS = attachPaths([
    {
      section: "OVERVIEW",
      items: [
        { id: "Dashboard", label: "Dashboard", icon: Home }
      ]
    },
    NETWORK_SIDEBAR_SECTION,
    {
      section: "RETAILERS",
      items: [
        { id: "My Retailers", label: "My Retailers", icon: Store },
        { id: "Onboard Retailer", label: "Onboard Retailer", icon: UserPlus },
        { id: "Pending Verification", label: "Pending Verification", icon: Clock, badge: pendingRetailersCount }
      ]
    },
    {
      section: "OPERATIONS",
      items: [
        { id: "Orders", label: "Orders", icon: ShoppingCart },
        { id: "Approvals", label: "Approvals", icon: CheckSquare, badge: pendingApprovalsCount || undefined }
      ]
    },
    {
      section: "FIELD WORK",
      items: [
        { id: "Visit Logs", label: "Visit Logs", icon: MapPin },
        { id: "Market Leads", label: "Market Leads", icon: Lightbulb }
      ]
    },
    {
      section: "PROMOTERS",
      items: [
        { id: "Promoter View", label: "Promoter View", icon: Award }
      ]
    },
    {
      section: "PERFORMANCE",
      items: [
        { id: "Sales Monitoring", label: "Sales Monitoring", icon: TrendingUp },
        { id: "Targets", label: "Targets", icon: Target },
        { id: "My Incentive", label: "My Incentive", icon: Percent }
      ]
    },
    {
      section: "REPORTS",
      items: [
        { id: "Reports", label: "Reports", icon: BarChart3 },
        { id: "Notifications", label: "Notifications", icon: Bell, badge: unreadNotificationsCount }
      ]
    }
  ]);

  return (
    <DashboardLayout
      userRole="City Manager"
      activeTab={currentTab}
      goToTab={handleTabChange}
      sidebarItems={SIDEBAR_ITEMS}
      onSwitchRole={onSwitchRole}
      profilePath={profilePath}
      passwordPath={passwordPath}
      portalSettingsPath={portalSettingsPath}
      notifications={notifications.map(n => ({ id: n.id, title: n.type || 'Alert', message: n.message, read: n.read, date: n.time }))}
      onMarkAllNotificationsRead={handleMarkAllRead}
      profile={{
        name: "Rahul Shinde",
        subtitle: "Ahmedabad City Manager",
        image: null
      }}
    >
      {loading ? (
        <SkeletonLoader type={currentTab === 'Dashboard' ? 'dashboard' : ['My Retailers', 'Pending Verification', 'Orders', 'Approvals', 'Visit Logs', 'Market Leads'].includes(currentTab) ? 'table' : 'cards'} />
      ) : (
        renderActiveTab()
      )}

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
