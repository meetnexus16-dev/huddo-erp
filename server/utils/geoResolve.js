import mongoose from 'mongoose';
import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function geoNamePresent(...names) {
  return names.length > 0 && names.every((name) => String(name || '').trim().length > 0);
}

function buildCountryCode(name) {
  const cleaned = String(name).replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (cleaned.length >= 2) return cleaned.slice(0, 3);
  return `C${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

async function uniqueCountryCode(baseCode) {
  let code = baseCode;
  let suffix = 1;
  while (await Country.findOne({ code, is_deleted: { $ne: true } })) {
    code = `${baseCode.slice(0, 2)}${suffix}`;
    suffix += 1;
  }
  return code;
}

export async function findCountryByName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  return Country.findOne({
    name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i'),
    is_deleted: { $ne: true }
  });
}

export async function findStateByName(name, countryId) {
  const trimmed = String(name || '').trim();
  if (!trimmed || !countryId) return null;
  return State.findOne({
    name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i'),
    country: countryId,
    is_deleted: { $ne: true }
  });
}

export async function findCityByName(name, stateId) {
  const trimmed = String(name || '').trim();
  if (!trimmed || !stateId) return null;
  return City.findOne({
    name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i'),
    state: stateId,
    is_deleted: { $ne: true }
  });
}

export async function findOrCreateCountry(name, iso2 = null) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Country name is required.');

  const existing = await findCountryByName(trimmed);
  if (existing) return existing;

  const code = iso2
    ? await uniqueCountryCode(String(iso2).toUpperCase().slice(0, 3))
    : await uniqueCountryCode(buildCountryCode(trimmed));
  return Country.create({ name: trimmed, code, is_active: true });
}

export async function findOrCreateState(name, countryId) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('State name is required.');
  if (!countryId || !mongoose.isValidObjectId(countryId)) {
    throw new Error('Valid country is required to create a state.');
  }

  const existing = await findStateByName(trimmed, countryId);
  if (existing) return existing;

  return State.create({ name: trimmed, country: countryId, is_active: true });
}

export async function findOrCreateCity(name, stateId) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('City name is required.');
  if (!stateId || !mongoose.isValidObjectId(stateId)) {
    throw new Error('Valid state is required to create a city.');
  }

  const existing = await findCityByName(trimmed, stateId);
  if (existing) return existing;

  return City.create({ name: trimmed, state: stateId, is_active: true });
}

async function resolveCountryId(countryId, countryName, countryIso = null) {
  const rawId = countryId?._id || countryId;
  if (rawId && mongoose.isValidObjectId(rawId)) {
    const country = await Country.findById(rawId);
    if (!country) throw new Error('Selected country was not found.');
    return country._id;
  }
  const name = String(countryName || '').trim();
  if (!name) throw new Error('Country is required.');
  const country = await findOrCreateCountry(name, countryIso);
  return country._id;
}

async function resolveStateId(stateId, stateName, countryId) {
  const rawId = stateId?._id || stateId;
  if (rawId && mongoose.isValidObjectId(rawId)) {
    const state = await State.findById(rawId);
    if (!state) throw new Error('Selected state was not found.');
    if (state.country.toString() !== countryId.toString()) {
      throw new Error('Selected state does not belong to the chosen country.');
    }
    return state._id;
  }
  const name = String(stateName || '').trim();
  if (!name) throw new Error('State is required.');
  const state = await findOrCreateState(name, countryId);
  return state._id;
}

async function resolveCityId(cityId, cityName, stateId) {
  const rawId = cityId?._id || cityId;
  if (rawId && mongoose.isValidObjectId(rawId)) {
    const city = await City.findById(rawId);
    if (!city) throw new Error('Selected city was not found.');
    if (city.state.toString() !== stateId.toString()) {
      throw new Error('Selected city does not belong to the chosen state.');
    }
    return city._id;
  }
  const name = String(cityName || '').trim();
  if (!name) throw new Error('City is required.');
  const city = await findOrCreateCity(name, stateId);
  return city._id;
}

export async function previewGeoResolution(roleName, { countryName, stateName, cityName } = {}) {
  const willCreate = [];
  const existing = [];

  let country = null;
  let state = null;

  if (countryName?.trim()) {
    country = await findCountryByName(countryName);
    if (country) existing.push({ type: 'country', name: country.name });
    else willCreate.push({ type: 'country', name: countryName.trim() });
  }

  if (stateName?.trim() && countryName?.trim()) {
    if (!country) {
      willCreate.push({ type: 'state', name: stateName.trim(), parent: countryName.trim() });
    } else {
      state = await findStateByName(stateName, country._id);
      if (state) existing.push({ type: 'state', name: state.name });
      else willCreate.push({ type: 'state', name: stateName.trim(), parent: country.name });
    }
  }

  if (cityName?.trim() && stateName?.trim()) {
    if (!country || !state) {
      willCreate.push({
        type: 'city',
        name: cityName.trim(),
        parent: `${stateName.trim()}, ${countryName?.trim() || ''}`.trim()
      });
    } else {
      const city = await findCityByName(cityName, state._id);
      if (city) existing.push({ type: 'city', name: city.name });
      else willCreate.push({ type: 'city', name: cityName.trim(), parent: state.name });
    }
  }

  return {
    will_create: willCreate,
    existing,
    requires_confirmation: willCreate.length > 0,
    territory_label: [countryName, stateName, cityName].filter(Boolean).join(' → ')
  };
}

export async function resolveOnboardingTerritory(roleName, meta = {}) {
  const {
    requested_country: countryId,
    requested_state: stateId,
    requested_city: cityId,
    requested_country_name: countryName,
    requested_state_name: stateName,
    requested_city_name: cityName,
    requested_country_iso: countryIso
  } = meta;

  const result = { countryId: null, stateId: null, cityId: null, created: [] };

  if (roleName === 'CountryManager') {
    const before = await findCountryByName(countryName);
    result.countryId = await resolveCountryId(countryId, countryName, countryIso);
    if (!before) result.created.push('country');
    return result;
  }

  if (roleName === 'StateManager') {
    const countryBefore = await findCountryByName(countryName);
    result.countryId = await resolveCountryId(countryId, countryName, countryIso);
    if (!countryBefore) result.created.push('country');

    const stateBefore = countryBefore
      ? await findStateByName(stateName, result.countryId)
      : null;
    result.stateId = await resolveStateId(stateId, stateName, result.countryId);
    if (!stateBefore) result.created.push('state');
    return result;
  }

  if (roleName === 'CityManager' || roleName === 'Retailer') {
    const countryBefore = await findCountryByName(countryName);
    result.countryId = await resolveCountryId(countryId, countryName, countryIso);
    if (!countryBefore) result.created.push('country');

    const stateBefore = countryBefore
      ? await findStateByName(stateName, result.countryId)
      : null;
    result.stateId = await resolveStateId(stateId, stateName, result.countryId);
    if (!stateBefore) result.created.push('state');

    const cityBefore = stateBefore
      ? await findCityByName(cityName, result.stateId)
      : null;
    result.cityId = await resolveCityId(cityId, cityName, result.stateId);
    if (!cityBefore) result.created.push('city');
    return result;
  }

  return result;
}

function toRefId(value) {
  if (!value) return null;
  const raw = value._id || value;
  return mongoose.isValidObjectId(raw) ? raw : null;
}

function toRefName(value, explicitName) {
  if (explicitName) return explicitName;
  if (value && typeof value === 'object' && value.name) return value.name;
  return undefined;
}

export function hasTerritoryIntent(roleName, meta = {}) {
  if (!['CountryManager', 'StateManager', 'CityManager', 'Retailer'].includes(roleName)) {
    return false;
  }
  return Boolean(
    toRefId(meta.requested_country)
    || meta.requested_country_name
    || toRefId(meta.requested_state)
    || meta.requested_state_name
    || toRefId(meta.requested_city)
    || meta.requested_city_name
  );
}

export async function normalizeOnboardingMeta(meta = {}) {
  const normalized = {
    ...meta,
    requested_country: toRefId(meta.requested_country),
    requested_state: toRefId(meta.requested_state),
    requested_city: toRefId(meta.requested_city),
    requested_country_name: toRefName(meta.requested_country, meta.requested_country_name),
    requested_state_name: toRefName(meta.requested_state, meta.requested_state_name),
    requested_city_name: toRefName(meta.requested_city, meta.requested_city_name)
  };

  if (normalized.requested_city && (!normalized.requested_state || !normalized.requested_country)) {
    const city = await City.findById(normalized.requested_city);
    if (city) {
      normalized.requested_city_name = normalized.requested_city_name || city.name;
      if (!normalized.requested_state) {
        normalized.requested_state = city.state;
      }
    }
  }

  if (normalized.requested_state && (!normalized.requested_country || !normalized.requested_state_name)) {
    const state = await State.findById(normalized.requested_state);
    if (state) {
      normalized.requested_state_name = normalized.requested_state_name || state.name;
      if (!normalized.requested_country) {
        normalized.requested_country = state.country;
      }
    }
  }

  if (normalized.requested_country && !normalized.requested_country_name) {
    const country = await Country.findById(normalized.requested_country);
    if (country) normalized.requested_country_name = country.name;
  }

  return normalized;
}

export async function prepareHierarchyGeoCreate(modelName, body = {}) {
  if (modelName === 'Country') {
    const name = String(body.name || body.country_name || '').trim();
    if (!name) throw new Error('Country name is required.');
    const existing = await findCountryByName(name);
    if (existing) throw new Error(`Country "${name}" already exists in hierarchy.`);
    body.name = name;
    if (!body.code) {
      body.code = body.country_iso
        ? String(body.country_iso).toUpperCase().slice(0, 3)
        : buildCountryCode(name);
    }
    return body;
  }

  if (modelName === 'State') {
    const stateName = String(body.name || body.state_name || '').trim();
    const countryName = String(body.country_name || '').trim();
    if (!countryName || !stateName) throw new Error('Country and state are required.');
    const country = await findOrCreateCountry(countryName, body.country_iso);
    const existingState = await findStateByName(stateName, country._id);
    if (existingState) {
      throw new Error(`State "${stateName}" already exists in ${country.name}.`);
    }
    body.name = stateName;
    body.country = country._id;
    return body;
  }

  if (modelName === 'City') {
    const cityName = String(body.name || body.city_name || '').trim();
    const stateName = String(body.state_name || '').trim();
    const countryName = String(body.country_name || '').trim();
    if (!countryName || !stateName || !cityName) {
      throw new Error('Country, state, and city are required.');
    }
    const country = await findOrCreateCountry(countryName, body.country_iso);
    const state = await findOrCreateState(stateName, country._id);
    const existingCity = await findCityByName(cityName, state._id);
    if (existingCity) {
      throw new Error(`City "${cityName}" already exists in ${state.name}.`);
    }
    body.name = cityName;
    body.state = state._id;
    return body;
  }

  return body;
}

/** Resolve retailer / admin form geo fields (creates missing nodes immediately). */
export async function resolveRetailerGeo(body = {}) {
  const countryId = await resolveCountryId(
    body.country_id || body.country,
    body.country_name,
    body.country_iso
  );
  const stateId = await resolveStateId(
    body.state_id || body.state,
    body.state_name,
    countryId
  );
  const cityId = await resolveCityId(
    body.city_id || body.city,
    body.city_name,
    stateId
  );
  return { countryId, stateId, cityId };
}
