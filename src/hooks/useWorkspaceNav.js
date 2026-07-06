import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildPath, tabIdFromPath, withSidebarPaths } from '../routes/routePaths';

export function useWorkspaceNav(base, routeMap) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(
    () => tabIdFromPath(location.pathname, base, routeMap) || 'Dashboard',
    [location.pathname, base, routeMap]
  );

  const goToTab = useCallback(
    (tabId) => {
      if (!tabId) return;
      if (typeof tabId === 'string' && tabId.startsWith('/')) {
        navigate(tabId);
        return;
      }
      navigate(buildPath(base, tabId, routeMap));
    },
    [navigate, base, routeMap]
  );

  const attachPaths = useCallback(
    (sections) => withSidebarPaths(sections, base, routeMap),
    [base, routeMap]
  );

  const profilePath = buildPath(base, 'Profile', routeMap);
  const passwordPath = `${profilePath}/password`;
  const portalSettingsPath = buildPath(base, 'Portal Settings', routeMap);

  return {
    activeTab,
    goToTab,
    attachPaths,
    profilePath,
    passwordPath,
    portalSettingsPath,
    location
  };
}
