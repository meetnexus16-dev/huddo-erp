const STORAGE_KEYS = {
  access: 'huddo_token',
  refresh: 'huddo_refresh_token',
  user: 'huddo_user',
  role: 'huddo_role'
};

let refreshInFlight = null;

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
}

function rawFetch() {
  return window.originalFetch || window.fetch;
}

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh);
}

export function persistAuthSession({ user, access_token, refresh_token, role }) {
  if (access_token) {
    localStorage.setItem(STORAGE_KEYS.access, access_token);
  }
  if (refresh_token) {
    localStorage.setItem(STORAGE_KEYS.refresh, refresh_token);
  }
  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }
  if (role) {
    localStorage.setItem(STORAGE_KEYS.role, role);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.role);
}

export function hasPersistedSession() {
  return Boolean(getRefreshToken() && localStorage.getItem(STORAGE_KEYS.user));
}

function decodeJwtExpiryMs(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpiringSoon(token = getAccessToken(), withinMs = 60 * 60 * 1000) {
  const exp = decodeJwtExpiryMs(token);
  if (!exp) return true;
  return exp <= Date.now() + withinMs;
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await rawFetch()(`${getApiBaseUrl()}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.access_token) {
        localStorage.setItem(STORAGE_KEYS.access, data.data.access_token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureValidAccessToken() {
  const token = getAccessToken();
  if (token && !isAccessTokenExpiringSoon(token)) {
    return true;
  }
  return refreshAccessToken();
}

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    }
  } catch {
    // Best-effort server logout
  }
  clearAuthSession();
}

export function forceLoginRedirect() {
  clearAuthSession();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/** Call once on app boot to extend sessions without user action. */
export async function bootstrapAuthSession() {
  if (!hasPersistedSession()) return false;
  return ensureValidAccessToken();
}
