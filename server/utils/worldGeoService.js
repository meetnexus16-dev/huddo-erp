const WORLD_API = 'https://countriesnow.space/api/v0.1';

const cache = {
  countries: { data: null, expiresAt: 0 },
  states: new Map(),
  cities: new Map()
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STATES_CITIES_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) {
    throw new Error(`World geo API error (${res.status})`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.msg || 'World geo API request failed.');
  }
  return json;
}

function filterByQuery(items, query, key = 'name') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const value = typeof item === 'string' ? item : item[key];
    return String(value || '').toLowerCase().includes(q);
  });
}

export async function getWorldCountries(query = '') {
  const now = Date.now();
  if (!cache.countries.data || cache.countries.expiresAt < now) {
    const json = await fetchJson(`${WORLD_API}/countries/iso`);
    cache.countries.data = (json.data || []).map((row) => ({
      name: row.name,
      iso2: row.Iso2 || row.iso2 || '',
      iso3: row.Iso3 || row.iso3 || ''
    }));
    cache.countries.expiresAt = now + CACHE_TTL_MS;
  }
  return filterByQuery(cache.countries.data, query).slice(0, 50);
}

export async function getWorldStates(countryName, query = '') {
  const country = String(countryName || '').trim();
  if (!country) return [];

  const cacheKey = country.toLowerCase();
  const now = Date.now();
  let states = cache.states.get(cacheKey);
  if (!states || states.expiresAt < now) {
    const json = await fetchJson(`${WORLD_API}/countries/states`, {
      method: 'POST',
      body: JSON.stringify({ country })
    });
    states = {
      data: (json.data?.states || []).map((s) => ({
        name: s.name,
        state_code: s.state_code || ''
      })),
      expiresAt: now + STATES_CITIES_TTL_MS
    };
    cache.states.set(cacheKey, states);
  }

  return filterByQuery(states.data, query).slice(0, 80);
}

export async function getWorldCities(countryName, stateName, query = '') {
  const country = String(countryName || '').trim();
  const state = String(stateName || '').trim();
  if (!country || !state) return [];

  const cacheKey = `${country.toLowerCase()}::${state.toLowerCase()}`;
  const now = Date.now();
  let cities = cache.cities.get(cacheKey);
  if (!cities || cities.expiresAt < now) {
    const json = await fetchJson(`${WORLD_API}/countries/state/cities`, {
      method: 'POST',
      body: JSON.stringify({ country, state })
    });
    cities = {
      data: (json.data || []).map((name) => ({ name })),
      expiresAt: now + STATES_CITIES_TTL_MS
    };
    cache.cities.set(cacheKey, cities);
  }

  return filterByQuery(cities.data, query).slice(0, 80);
}
