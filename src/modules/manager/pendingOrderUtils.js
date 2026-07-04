export const PENDING_ORDER_STATUSES = ['Submitted', 'Draft'];

export function fetchPendingOrderCount() {
  const token = localStorage.getItem('huddo_token');
  return fetch('/api/network/orders', {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
    .then((r) => r.json())
    .then((res) => {
      if (!res.success) return 0;
      return (res.data || []).filter((o) => PENDING_ORDER_STATUSES.includes(o.status)).length;
    })
    .catch(() => 0);
}
