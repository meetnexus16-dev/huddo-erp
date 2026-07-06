import {
  ensureValidAccessToken,
  getAccessToken
} from './authSession';

export async function authFetch(path, options = {}) {
  await ensureValidAccessToken();
  const token = getAccessToken();
  return fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  }).then((res) => res.json());
}

export function formatInr(value) {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
