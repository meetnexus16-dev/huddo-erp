import React, { useState, useEffect } from 'react';
import { Home, Link2, Users, Percent, CreditCard, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '../../../components/DesignSystem';
import MyProfile from '../../MyProfile';
import NetworkWorkspace from '../../network/NetworkWorkspace';
import OnboardSharePanel from '../../network/OnboardSharePanel';
import { NETWORK_SIDEBAR_SECTION, getNetworkTab, isNetworkScreen } from '../../network/networkSidebarConfig';
import { authFetch, formatInr } from '../../../utils/authFetch';

export default function PromoterDashboard({ userRole = 'Promoter', showToast, onSwitchRole }) {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [profile, setProfile] = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  const authFetchLocal = (path) => authFetch(path);

  useEffect(() => {
    authFetchLocal('/onboarding/referral-info').then((res) => {
      if (res.success && res.data) {
        setProfile((prev) => ({
          ...(prev || {}),
          user_code: res.data.user_code,
          approval_status: res.data.approval_status
        }));
      }
    }).catch(() => {});

    authFetchLocal('/profile').then((res) => {
      if (res.success && res.data) {
        setProfile((prev) => ({
          ...(prev || {}),
          name: res.data.name,
          profile_photo: res.data.profile_photo
        }));
      }
    }).catch(() => {});

    if (activeScreen === 'Dashboard') {
      setDashLoading(true);
      authFetchLocal('/dashboard/me')
        .then((res) => {
          if (res.success) setDashStats(res.data);
        })
        .finally(() => setDashLoading(false));
    }
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
          {dashLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
              <RefreshCw className="animate-spin text-orange-500" size={18} />
              Loading network stats...
            </div>
          ) : dashStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Referrals</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{dashStats.referralTotal || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Approved</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{dashStats.referralApproved || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{dashStats.referralPending || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Commission Earned</p>
                <p className="text-2xl font-extrabold text-indigo-600 mt-1">{formatInr(dashStats.totalEarned)}</p>
              </div>
            </div>
          ) : null}
          <OnboardSharePanel
            showToast={showToast}
            title="Your Referral Code & Onboarding Link"
            description="Use this code or link when onboarding retailers and managers on their behalf."
          />
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
            <p className="font-bold flex items-center gap-2"><Link2 size={16} /> Quick tip</p>
            <p className="mt-1">Open <strong>My Referrals</strong>, <strong>Commissions</strong>, or <strong>Payment History</strong> from the sidebar for full live data.</p>
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
