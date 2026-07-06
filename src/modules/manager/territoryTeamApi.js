import { authFetch } from '../../utils/authFetch';

export async function fetchTerritoryCityManagers() {
  const res = await authFetch('/manager/me/city-managers');
  if (!res.success) throw new Error(res.message || 'Failed to load city managers.');
  return res.data;
}

export async function fetchTerritoryRetailers() {
  const res = await authFetch('/manager/me/retailers');
  if (!res.success) throw new Error(res.message || 'Failed to load retailers.');
  return res.data;
}

export async function fetchTerritoryStateManagers() {
  const res = await authFetch('/manager/me/state-managers');
  if (!res.success) throw new Error(res.message || 'Failed to load state managers.');
  return res.data;
}

export async function fetchTerritoryTeam() {
  const res = await authFetch('/manager/me/team');
  if (!res.success) throw new Error(res.message || 'Failed to load territory team.');
  return res.data;
}
