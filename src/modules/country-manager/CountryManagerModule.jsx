// CM-MODULE: Frontend entry point and router for the Country Manager Module
import React, { useState, useEffect } from 'react';
import { 
  Home, Layers, CheckSquare, Target, Percent, Users, BarChart3, Bell, 
  TrendingUp, Shield, LogOut, Settings, Menu, X, ChevronLeft, ChevronRight, RefreshCw, Lock
} from 'lucide-react';

import CountryManagerList from './pages/CountryManagerList';
import CountryManagerForm from './pages/CountryManagerForm';
import CountryManagerDetail from './pages/CountryManagerDetail';
import CountryManagerDashboard from './pages/CountryManagerDashboard';
import AnalyticsDeepDive from './pages/AnalyticsDeepDive';
import { DashboardLayout } from '../../components/DesignSystem';
import MyProfile from '../MyProfile';

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
    if (userRole.toLowerCase() === 'country manager') {
      const fetchOwnStats = async () => {
        try {
          const res = await fetch('/api/country-managers/1/profile'); // hardcoded CM ID 1 for Rajesh Sharma
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
            setStats({
              pendingApprovals: data.pending_approval_count || 0,
              unreadNotifications: data.unread_notification_count || 0
            });
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchOwnStats();
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
  if (userRole.toLowerCase() !== 'country manager') {
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
  
  const SIDEBAR_ITEMS = [
    { id: 'Dashboard', label: 'My Dashboard', icon: Home },
    { id: 'States', label: 'States Management', icon: Layers },
    { id: 'Approvals', label: 'Approvals Queue', icon: CheckSquare, badge: stats.pendingApprovals },
    { id: 'Targets', label: 'My Targets', icon: Target },
    { id: 'Commissions', label: 'Commission Ledger', icon: Percent },
    { id: 'State Managers', label: 'State Managers', icon: Users },
    { id: 'Analytics', label: 'Analytics Deep-Dive', icon: TrendingUp },
    { id: 'Notifications', label: 'Notifications Hub', icon: Bell, badge: notifications.filter(n => !n.read).length }
  ];

  const renderActiveScreen = () => {
    if (activeTab === 'Profile') {
      return <MyProfile showToast={safeShowToast} userRole={userRole} onSwitchRole={onSwitchRole} />;
    }
    switch (activeTab) {
      case 'Dashboard':
        return <CountryManagerDashboard cmId={1} isTab={true} onNavigate={setActiveTab} showToast={safeShowToast} />;
      case 'States':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="States" />;
      case 'Approvals':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="Approvals" />;
      case 'Targets':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="Targets" />;
      case 'Commissions':
        return <CountryManagerDetail cmId={1} onNavigate={() => {}} showToast={safeShowToast} userRole={userRole} initialTab="Commissions" />;
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
