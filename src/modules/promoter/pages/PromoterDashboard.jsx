import React, { useState, useEffect } from 'react';
import { Home, Link2 } from 'lucide-react';
import { DashboardLayout } from '../../../components/DesignSystem';
import MyProfile from '../../MyProfile';
import NetworkWorkspace from '../../network/NetworkWorkspace';
import OnboardSharePanel from '../../network/OnboardSharePanel';
import { NETWORK_SIDEBAR_SECTION, getNetworkTab, isNetworkScreen } from '../../network/networkSidebarConfig';

export default function PromoterDashboard({ userRole = 'Promoter', showToast, onSwitchRole }) {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [profile, setProfile] = useState(null);

  const authFetch = (path) => fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('huddo_token') ? { Authorization: `Bearer ${localStorage.getItem('huddo_token')}` } : {})
    }
  }).then((r) => r.json());

  useEffect(() => {
    authFetch('/onboarding/referral-info').then((res) => {
      if (res.success && res.data) {
        setProfile((prev) => ({
          ...(prev || {}),
          user_code: res.data.user_code,
          approval_status: res.data.approval_status
        }));
      }
    }).catch(() => {});

    authFetch('/profile').then((res) => {
      if (res.success && res.data) {
        setProfile((prev) => ({
          ...(prev || {}),
          name: res.data.name,
          profile_photo: res.data.profile_photo
        }));
      }
    }).catch(() => {});
  }, [activeScreen]);

  const SIDEBAR_ITEMS = [
    {
      section: 'OVERVIEW',
      items: [{ id: 'Dashboard', label: 'My Dashboard', icon: Home }]
    },
    NETWORK_SIDEBAR_SECTION
  ];

  const renderScreen = () => {
    if (activeScreen === 'Profile') {
      return <MyProfile showToast={showToast} userRole={userRole} onSwitchRole={onSwitchRole} />;
    }
    if (activeScreen === 'Dashboard') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Promoter Dashboard</h1>
            <p className="text-sm text-slate-500">Share your referral code, track onboarded users, and view commissions from your network.</p>
          </div>
          <OnboardSharePanel
            showToast={showToast}
            title="Your Referral Code & Onboarding Link"
            description="Use this code or link when onboarding retailers and managers on their behalf."
          />
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
            <p className="font-bold flex items-center gap-2"><Link2 size={16} /> Quick tip</p>
            <p className="mt-1">Open <strong>My Users</strong>, <strong>My Referrals</strong>, <strong>Commissions</strong>, or <strong>Payment History</strong> from the sidebar for live data from your network.</p>
          </div>
        </div>
      );
    }
    if (isNetworkScreen(activeScreen)) {
      return (
        <NetworkWorkspace
          showToast={showToast}
          initialTab={getNetworkTab(activeScreen)}
          hideTabBar
          key={activeScreen}
        />
      );
    }
    return null;
  };

  return (
    <DashboardLayout
      userRole="Promoter"
      activeTab={activeScreen}
      setActiveTab={setActiveScreen}
      sidebarItems={SIDEBAR_ITEMS}
      onSwitchRole={onSwitchRole}
      notifications={[]}
      profile={{
        name: profile?.name || 'Promoter',
        subtitle: `Code: ${profile?.user_code || '—'}`,
        image: profile?.profile_photo || null
      }}
    >
      {renderScreen()}
    </DashboardLayout>
  );
}
