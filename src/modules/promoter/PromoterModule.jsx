// PROMO-MODULE: Main module entry point directing routing for both Admin/Founder management and the Promoter full-screen workspace.

import React, { useState } from 'react';
import PromoterList from './pages/PromoterList';
import PromoterForm from './pages/PromoterForm';
import PromoterDetail from './pages/PromoterDetail';
import PromoterDashboard from './pages/PromoterDashboard';
import PromoterAnalytics from './pages/PromoterAnalytics';

export default function PromoterModule({ userRole = 'Founder', showToast, onSwitchRole }) {
  const [adminScreen, setAdminScreen] = useState('list'); // list | add | edit | detail | analytics
  const [selectedPromoterId, setSelectedPromoterId] = useState(null);

  const safeShowToast = showToast || ((msg, type) => console.log(`[Toast] type: ${type}, msg: ${msg}`));

  const handleAdminNavigate = (target) => {
    // PROMO-MODULE: Sub-page router dispatching
    if (target === 'list') {
      setAdminScreen('list');
      setSelectedPromoterId(null);
    } else if (target === 'add') {
      setAdminScreen('add');
      setSelectedPromoterId(null);
    } else if (target === 'analytics') {
      setAdminScreen('analytics');
      setSelectedPromoterId(null);
    } else if (target.startsWith('edit-')) {
      const id = target.split('edit-')[1];
      setSelectedPromoterId(id);
      setAdminScreen('edit');
    } else if (target.startsWith('detail-')) {
      const id = target.split('detail-')[1];
      setSelectedPromoterId(id);
      setAdminScreen('detail');
    }
  };

  // PROMO-MODULE: If user role is Promoter, display own dedicated full-page dashboard workspace
  if (userRole.toLowerCase() === 'promoter') {
    return (
      <PromoterDashboard 
        userRole={userRole} 
        showToast={safeShowToast} 
        onSwitchRole={onSwitchRole} 
      />
    );
  }

  // Otherwise, render Admin/Manager perspective
  switch (adminScreen) {
    case 'list':
      return <PromoterList onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
    case 'add':
      return <PromoterForm onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
    case 'edit':
      return <PromoterForm promoterId={selectedPromoterId} onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
    case 'detail':
      return <PromoterDetail promoterId={selectedPromoterId} onNavigate={handleAdminNavigate} showToast={safeShowToast} userRole={userRole} />;
    case 'analytics':
      return <PromoterAnalytics onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
    default:
      return <PromoterList onNavigate={handleAdminNavigate} showToast={safeShowToast} />;
  }
}
