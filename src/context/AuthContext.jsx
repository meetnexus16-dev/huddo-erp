import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, getRoleHomePath, getRoleHomePathFromUser } from '../routes/routePaths';
import { getRoleDisplayName, resolveUserRole } from '../utils/roleRouting';
import {
  bootstrapAuthSession,
  clearAuthSession,
  ensureValidAccessToken,
  getAccessToken,
  getRefreshToken,
  hasPersistedSession,
  logoutSession,
  persistAuthSession
} from '../utils/authSession';

const NAV_MODULE_MAP = {
  Dashboard: 'dashboard',
  Hierarchy: 'hierarchy',
  Departments: 'departments',
  Employees: 'employees',
  Teams: 'teams',
  Promoters: 'promoters',
  CountryManagers: 'countries',
  Retailers: 'retailers',
  Products: 'products',
  ProductCategories: 'product-categories',
  Orders: 'orders',
  Billing: 'invoices',
  Commissions: 'commission-records',
  Sales: 'sales',
  Targets: 'targets',
  'Petty Cash': 'petty-cash',
  'Field Tracking': 'gps-logs',
  Approvals: 'orders',
  Inventory: 'stock-records',
  Purchase: 'purchase-orders',
  'Users & Roles': 'users',
  Notifications: 'notifications',
  Reports: 'reports',
  'Security & Audit': 'audit-logs',
  CommunicationSettings: 'communication-settings'
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [token, setToken] = useState(() => getAccessToken());
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('huddo_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [currentRole, setCurrentRole] = useState(
    () => localStorage.getItem('huddo_role') || 'Founder'
  );

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setToken(null);
    setUser(null);
    setCurrentRole('Founder');
    navigate(ROUTES.LOGIN, { replace: true });
    showToast('Logged out successfully.', 'success');
  }, [navigate, showToast]);

  const loginSuccess = useCallback((userData, accessToken, refreshToken) => {
    const displayRole = getRoleDisplayName(resolveUserRole(userData));
    persistAuthSession({
      user: userData,
      access_token: accessToken,
      refresh_token: refreshToken,
      role: displayRole
    });
    setToken(accessToken);
    setUser(userData);
    setCurrentRole(displayRole);
    navigate(getRoleHomePathFromUser(userData), { replace: true });
    showToast(`Logged in successfully as ${userData.name}!`, 'success');
  }, [navigate, showToast]);

  const handleRoleChange = useCallback(async (role) => {
    if (role === 'Logout') {
      await logout();
      return;
    }

    setCurrentRole(role);
    localStorage.setItem('huddo_role', role);
    showToast(`Session switched to: ${role}`, 'success');

    const roleEmailMap = {
      Founder: 'rohan@huddoerp.in',
      CEO: 'rohan@huddoerp.in',
      Admin: 'rohan@huddoerp.in',
      'Country Manager': 'rajesh@huddoerp.in',
      'State Manager': 'preeti@huddoerp.in',
      'City Manager': 'sanjay@huddoerp.in',
      'Finance Manager': 'vikram@huddoerp.in',
      'HR Manager': 'neha@huddoerp.in',
      'Inventory Manager': 'sunil@huddoerp.in',
      'Sales Executive': 'arjun@huddoerp.in',
      Promoter: 'suresh@promoter.com',
      Retailer: 'dinesh@walkeasy.in',
      Distributor: 'dinesh@walkeasy.in',
      'Team Member': 'arjun@huddoerp.in'
    };

    const email = roleEmailMap[role];
    if (email) {
      try {
        const fetchMethod = window.originalFetch || window.fetch;
        const res = await fetchMethod('http://localhost:5000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password123' })
        });
        const data = await res.json();
        if (data.success && data.data?.access_token) {
          const displayRole = getRoleDisplayName(resolveUserRole(data.data.user) || role);
          persistAuthSession({
            user: data.data.user,
            access_token: data.data.access_token,
            refresh_token: data.data.refresh_token,
            role: displayRole
          });
          setToken(data.data.access_token);
          setUser(data.data.user);
          setCurrentRole(displayRole);
          navigate(getRoleHomePathFromUser(data.data.user), { replace: true });
        }
      } catch (err) {
        console.warn(`[Auth] Backend login failed: ${err.message}`);
        navigate(getRoleHomePath(role), { replace: true });
      }
    } else {
      navigate(getRoleHomePath(role), { replace: true });
    }
  }, [logout, navigate, showToast]);

  const canViewItem = useCallback((itemId) => {
    if (!user || !user.role) return false;

    const roleName = user.role.name || user.role;

    if (itemId === 'CommunicationSettings') {
      return roleName === 'Founder';
    }

    const financialItems = ['Billing', 'Commissions', 'Sales', 'Targets', 'Petty Cash'];
    if (roleName === 'CEO' && financialItems.includes(itemId)) {
      return false;
    }

    if (roleName === 'Founder' || roleName === 'CEO' || roleName === 'Admin') {
      return true;
    }

    const permissions = user.role.permissions || [];
    const targetModule = NAV_MODULE_MAP[itemId];
    if (!targetModule) return true;

    const match = permissions.find((p) => p.module === targetModule || p.module === '*');
    if (!match) return false;

    return match.actions.includes('view') || match.actions.includes('*');
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!hasPersistedSession()) {
        if (!cancelled) setSessionReady(true);
        return;
      }

      const ok = await bootstrapAuthSession();
      if (!cancelled) {
        if (ok) {
          setToken(getAccessToken());
        } else {
          clearAuthSession();
          setToken(null);
          setUser(null);
        }
        setSessionReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !hasPersistedSession()) return undefined;

    const intervalId = setInterval(async () => {
      const ok = await ensureValidAccessToken();
      if (ok) {
        setToken(getAccessToken());
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [sessionReady, user]);

  useEffect(() => {
    if (user) {
      const displayRole = getRoleDisplayName(resolveUserRole(user));
      if (displayRole && displayRole !== currentRole) {
        setCurrentRole(displayRole);
        localStorage.setItem('huddo_role', displayRole);
      }
    }
  }, [user, currentRole]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const cached = localStorage.getItem('huddo_user');
      try {
        if (cached) setUser(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const isAuthenticated = Boolean(
    sessionReady && user && (token || getRefreshToken())
  );

  const value = useMemo(() => ({
    token,
    user,
    currentRole,
    sessionReady,
    toast,
    setToast,
    showToast,
    loginSuccess,
    logout,
    handleRoleChange,
    canViewItem,
    isAuthenticated
  }), [
    token,
    user,
    currentRole,
    sessionReady,
    toast,
    showToast,
    loginSuccess,
    logout,
    handleRoleChange,
    canViewItem,
    isAuthenticated
  ]);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">Restoring your session...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
