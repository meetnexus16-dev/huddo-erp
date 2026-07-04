import { Link2, Users, UserCheck, ShoppingCart, Percent, CreditCard } from 'lucide-react';

export const NETWORK_TAB_MAP = {
  NetworkReferral: 'referral',
  NetworkUsers: 'users',
  NetworkReferrals: 'referrals',
  NetworkOrders: 'orders',
  NetworkCommissions: 'commissions',
  NetworkPayments: 'payments'
};

export const NETWORK_SIDEBAR_ITEMS = [
  { id: 'NetworkReferral', label: 'Referral Code', icon: Link2 },
  { id: 'NetworkUsers', label: 'My Users', icon: Users },
  { id: 'NetworkReferrals', label: 'My Referrals', icon: UserCheck },
  { id: 'NetworkOrders', label: 'Network Orders', icon: ShoppingCart },
  { id: 'NetworkCommissions', label: 'Commissions', icon: Percent },
  { id: 'NetworkPayments', label: 'Payment History', icon: CreditCard }
];

export const NETWORK_SIDEBAR_SECTION = {
  section: 'NETWORK & REFERRALS',
  items: NETWORK_SIDEBAR_ITEMS
};

export function isNetworkScreen(activeTab) {
  return Boolean(NETWORK_TAB_MAP[activeTab]);
}

export function getNetworkTab(activeTab) {
  return NETWORK_TAB_MAP[activeTab] || 'referral';
}
