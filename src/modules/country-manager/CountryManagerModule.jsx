// CM-MODULE: Frontend entry point and router for the Country Manager Module
import React, { useState, useEffect } from 'react';
import { 
  Home, Layers, CheckSquare, Target, Users, BarChart3, Bell, 
  TrendingUp, ShoppingCart
} from 'lucide-react';

import CountryManagerList from './pages/CountryManagerList';
import CountryManagerForm from './pages/CountryManagerForm';
import CountryManagerDetail from './pages/CountryManagerDetail';
import CountryManagerDashboard from './pages/CountryManagerDashboard';
import AnalyticsDeepDive from './pages/AnalyticsDeepDive';
import { DashboardLayout } from '../../components/DesignSystem';
import MyProfile from '../MyProfile';
import NetworkWorkspace from '../network/NetworkWorkspace';
import { NETWORK_SIDEBAR_SECTION, getNetworkTab, isNetworkScreen } from '../network/networkSidebarConfig';
import ManagerOrdersLive from '../manager/ManagerOrdersLive';
import ManagerApprovalsLive from '../manager/ManagerApprovalsLive';
import { fetchPendingOrderCount } from '../manager/pendingOrderUtils';
import { isCountryManager } from '../../utils/roleRouting';

export default function CountryManagerModule({ userRole = 'Founder', showToast, onSwitchRole }) {
  const safeShowToast = showToast || ((msg, type) => console.log(`[Toast] type: ${type}, msg: ${msg}`));

  // Admin routing state
  const [adminScreen, setAdminScreen] = useState('list'); // list | add | edit | detail
  const [selectedCmId, setSelectedCmId] = useState(null);
  const [listVersion, setListVersion] = useState(0);

  // Own Workspace state (for Country Manager role)
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Stats / Badges for Own Workspace
  const [stats, setStats] = useState({ pendingApprovals: 0, unreadNotifications: 0 });
  const [profile, setProfile] = useState(null);

  // Mock notifications state for Country Manager
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Pending Shop Onboarding", message: "Apex Sole Distributors (Pune) registration request needs your Level 3 approval.", read: false, date: "10 mins ago" },
    { id: 2, title: "Large Order Approval Alert", message: "Order ORD-5509 exceeds normal credit limits and needs approval.", read: false, date: "2 hours ago" }
  ]);

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (isCountryManager(userRole)) {
      fetchPendingOrderCount().then((count) => {
        setStats((prev) => ({ ...prev, pendingApprovals: count }));
      });

      const token = localStorage.getItem('huddo_token');
      fetch('/api/profile', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data.data) {
            setProfile({
              full_name: data.data.name,
              profile_photo_url: data.data.profile_photo
            });
          }
        })
        .catch((err) => console.error(err));
    }
  }, [userRole, activeTab]);

  const handleAdminNavigate = (target) => {
    if (target === 'list') {
      setAdminScreen('list');
      setSelectedCmId(null);
      setListVersion((v) => v + 1);
    } else if (target === 'add') {
      setAdminScreen('add');
      setSelectedCmId(null);
    } else if (target.startsWith('edit-')) {
      setSelectedCmId(target.split('edit-')[1]);
      setAdminScreen('edit');
    } else if (target.startsWith('detail-')) {
      setSelectedCmId(target.split('detail-')[1]);
      setAdminScreen('detail');
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // A. RETAILER/FOUNDER/CEO/ADMIN WORKSPACE VIEW
  // ────────────────────────────────────────────────────────────────────────
  if (!isCountryManager(userRole)) {
    switch (adminScreen) {
      case 'list':
        return <CountryManagerList key={listVersion} onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
      case 'add':
        return <CountryManagerForm onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
      case 'edit':
        return <CountryManagerForm cmId={selectedCmId} onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
      case 'detail':
        return <CountryManagerDetail cmId={selectedCmId} onNavigate={handleAdminNavigate} showToast={safeShowToast} userRole={userRole} />;
      default:
        return <CountryManagerList onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // B. DEDICATED WORKSPACE FOR COUNTRY MANAGER ROLE (PAGE 4)
  // ────────────────────────────────────────────────────────────────────────
  
  const handlePendingCountChange = (count) => {
    setStats((prev) => ({ ...prev, pendingApprovals: count }));
  };

  const SIDEBAR_ITEMS = [
    {
      section: 'OVERVIEW',
      items: [{ id: 'Dashboard', label: 'My Dashboard', icon: Home }]
    },
    NETWORK_SIDEBAR_SECTION,
    {
      section: 'OPERATIONS',
      items: [
        { id: 'Orders', label: 'Orders', icon: ShoppingCart },
        { id: 'Approvals', label: 'Approvals Queue', icon: CheckSquare, badge: stats.pendingApprovals }
      ]
    },
    {
      section: 'MANAGEMENT',
      items: [
        { id: 'States', label: 'States Management', icon: Layers },
        { id: 'State Managers', label: 'State Managers', icon: Users },
        { id: 'Targets', label: 'My Targets', icon: Target },
        { id: 'Analytics', label: 'Analytics Deep-Dive', icon: TrendingUp }
      ]
    },
    {
      section: 'ACCOUNT',
      items: [
        { id: 'Notifications', label: 'Notifications Hub', icon: Bell, badge: notifications.filter(n => !n.read).length }
      ]
    }
  ];

  const renderActiveScreen = () => {
    if (activeTab === 'Profile') {
      return <MyProfile showToast={safeShowToast} userRole={userRole} onSwitchRole={onSwitchRole} />;
    }
    if (isNetworkScreen(activeTab)) {
      return (
        <NetworkWorkspace
          showToast={safeShowToast}
          initialTab={getNetworkTab(activeTab)}
          hideTabBar
          key={activeTab}
        />
      );
    }
    switch (activeTab) {
      case 'Dashboard':
        return <CountryManagerDashboard cmId={1} isTab={true} onNavigate={setActiveTab} showToast={safeShowToast} />;
      case 'Orders':
        return (
          <ManagerOrdersLive
            showToast={safeShowToast}
            title="Country Orders"
            onPendingCountChange={handlePendingCountChange}
          />
        );
      case 'States':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="States" />;
      case 'Approvals':
        return (
          <ManagerApprovalsLive
            showToast={safeShowToast}
            title="Order Approvals Queue"
            onPendingCountChange={handlePendingCountChange}
          />
        );
      case 'Targets':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="Targets" />;
      case 'State Managers':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="State Managers" />;
      case 'Analytics':
        return <AnalyticsDeepDive cmId={1} showToast={safeShowToast} />;
      case 'Notifications':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="Notifications" />;
      default:
        return <CountryManagerDashboard cmId={1} isTab={true} onNavigate={setActiveTab} showToast={safeShowToast} />;
    }
  };

  return (
    <DashboardLayout
      userRole="Country Manager"
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebarItems={SIDEBAR_ITEMS}
      onSwitchRole={onSwitchRole}
      notifications={notifications}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      profile={{
        name: profile?.full_name || 'Rajesh Sharma',
        subtitle: 'Country Manager',
        image: profile?.profile_photo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
      }}
    >
      {renderActiveScreen()}
    </DashboardLayout>
  );
}
