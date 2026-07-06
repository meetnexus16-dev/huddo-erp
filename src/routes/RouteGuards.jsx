import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, getRoleHomePath, getRoleHomePathFromUser } from './routePaths';
import { normalizeRoleKey } from '../utils/roleRouting';

export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children;
}

export function GuestOnly({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    return <Navigate to={from || ROUTES.HOME} replace />;
  }

  return children;
}

export function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={getRoleHomePathFromUser(user)} replace />;
}

const DEDICATED_WORKSPACE_KEYS = new Set([
  'retailer', 'distributor', 'countrymanager', 'statemanager', 'citymanager', 'promoter',
  'salesexecutive', 'salesmanager', 'hrmanager', 'financemanager', 'inventorymanager',
  'purchasemanager', 'teammember'
]);

export function isAdminWorkspaceRole(role) {
  return !DEDICATED_WORKSPACE_KEYS.has(normalizeRoleKey(role));
}

export function RequireAdminWorkspace({ children }) {
  const { currentRole } = useAuth();
  if (!isAdminWorkspaceRole(currentRole)) {
    return <Navigate to={getRoleHomePath(currentRole)} replace />;
  }
  return children;
}

export function RequireWorkspace({ matchRole, children }) {
  const { currentRole } = useAuth();
  if (!matchRole(currentRole)) {
    return <Navigate to={getRoleHomePath(currentRole)} replace />;
  }
  return children;
}
