import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import {
  cleanupOrphanedCityManager,
  cleanupOrphanedCountryManager,
  cleanupOrphanedStateManager,
  getActiveManagerUser
} from './managerAssignment.js';
import { findCountryByName, findStateByName, findCityByName } from './geoResolve.js';

async function getCountryManagerInfo(countryName) {
  const country = await findCountryByName(countryName);
  if (!country) {
    return { exists: false, has_manager: false, manager_name: null };
  }
  await cleanupOrphanedCountryManager(country._id);
  const refreshed = await Country.findById(country._id);
  const manager = await getActiveManagerUser(refreshed?.manager);
  return {
    exists: true,
    has_manager: !!manager,
    manager_name: manager?.name || null
  };
}

async function getStateManagerInfo(countryName, stateName) {
  const country = await findCountryByName(countryName);
  if (!country) {
    return { exists: false, has_manager: false, manager_name: null };
  }
  const state = await findStateByName(stateName, country._id);
  if (!state) {
    return { exists: false, has_manager: false, manager_name: null };
  }
  await cleanupOrphanedStateManager(state._id);
  const refreshed = await State.findById(state._id);
  const manager = await getActiveManagerUser(refreshed?.manager);
  return {
    exists: true,
    has_manager: !!manager,
    manager_name: manager?.name || null
  };
}

async function getCityManagerInfo(countryName, stateName, cityName) {
  const country = await findCountryByName(countryName);
  if (!country) {
    return { exists: false, has_manager: false, manager_name: null };
  }
  const state = await findStateByName(stateName, country._id);
  if (!state) {
    return { exists: false, has_manager: false, manager_name: null };
  }
  const city = await findCityByName(cityName, state._id);
  if (!city) {
    return { exists: false, has_manager: false, manager_name: null };
  }
  await cleanupOrphanedCityManager(city._id);
  const refreshed = await City.findById(city._id);
  const manager = await getActiveManagerUser(refreshed?.manager);
  return {
    exists: true,
    has_manager: !!manager,
    manager_name: manager?.name || null
  };
}

function buildOptionMeta(role, level, { exists, has_manager, manager_name: managerName }) {
  let disabled = false;
  let sublabel = null;

  if (role === 'HierarchyCountry' && level === 'country' && exists) {
    disabled = true;
    sublabel = 'Already in hierarchy';
  }

  if (role === 'HierarchyState' && level === 'state' && exists) {
    disabled = true;
    sublabel = 'Already in hierarchy';
  }

  if (role === 'HierarchyCity' && level === 'city' && exists) {
    disabled = true;
    sublabel = 'Already in hierarchy';
  }

  if (role === 'CountryManager' && level === 'country' && has_manager) {
    disabled = true;
    sublabel = `${managerName} (assigned)`;
  }

  if (role === 'StateManager' && level === 'state' && has_manager) {
    disabled = true;
    sublabel = `${managerName} (assigned)`;
  }

  if (role === 'CityManager' && level === 'city' && has_manager) {
    disabled = true;
    sublabel = `${managerName} (assigned)`;
  }

  if (!disabled && has_manager && managerName) {
    if (role === 'Retailer') {
      if (level === 'country') sublabel = `Country Manager: ${managerName}`;
      if (level === 'state') sublabel = `State Manager: ${managerName}`;
      if (level === 'city') sublabel = `City Manager: ${managerName}`;
    } else if (role === 'StateManager' && level === 'country') {
      sublabel = `Country Manager: ${managerName}`;
    } else if (role === 'CityManager') {
      if (level === 'country') sublabel = `Country Manager: ${managerName}`;
      if (level === 'state') sublabel = `State Manager: ${managerName}`;
    }
  }

  return { disabled, sublabel, exists_in_db: exists, has_manager: has_manager, manager_name: managerName };
}

export async function annotateWorldCountries(countries, role = '') {
  if (!Array.isArray(countries) || countries.length === 0) return [];

  const needsLookup = ['HierarchyCountry', 'CountryManager', 'StateManager', 'CityManager', 'Retailer'].includes(role);
  if (!needsLookup) {
    return countries.map((row) => ({ ...row, disabled: false, sublabel: null }));
  }

  const annotated = [];
  for (const row of countries) {
    const info = await getCountryManagerInfo(row.name);
    const meta = buildOptionMeta(role, 'country', info);
    annotated.push({ ...row, ...meta });
  }
  return annotated;
}

export async function annotateWorldStates(states, countryName, role = '') {
  if (!Array.isArray(states) || states.length === 0) return [];

  const needsLookup = ['HierarchyState', 'StateManager', 'CityManager', 'Retailer'].includes(role);
  if (!needsLookup || !countryName) {
    return states.map((row) => ({ ...row, disabled: false, sublabel: null }));
  }

  const annotated = [];
  for (const row of states) {
    const info = await getStateManagerInfo(countryName, row.name);
    const meta = buildOptionMeta(role, 'state', info);
    annotated.push({ ...row, ...meta });
  }
  return annotated;
}

export async function annotateWorldCities(cities, countryName, stateName, role = '') {
  if (!Array.isArray(cities) || cities.length === 0) return [];

  const needsLookup = ['HierarchyCity', 'CityManager', 'Retailer'].includes(role);
  if (!needsLookup || !countryName || !stateName) {
    return cities.map((row) => ({ ...row, disabled: false, sublabel: null }));
  }

  const annotated = [];
  for (const row of cities) {
    const info = await getCityManagerInfo(countryName, stateName, row.name);
    const meta = buildOptionMeta(role, 'city', info);
    annotated.push({ ...row, ...meta });
  }
  return annotated;
}

export async function resolveManagerSlotMessage(role, { countryName, stateName, cityName }) {
  if (role === 'HierarchyCountry' && countryName) {
    const info = await getCountryManagerInfo(countryName);
    if (info.exists) {
      return `${countryName} is already in the hierarchy.`;
    }
  }

  if (role === 'HierarchyState' && countryName && stateName) {
    const info = await getStateManagerInfo(countryName, stateName);
    if (info.exists) {
      return `${stateName} is already in the hierarchy.`;
    }
    if (info.has_manager && info.manager_name) {
      return `State manager for ${stateName}: ${info.manager_name}`;
    }
  }

  if (role === 'HierarchyCity' && countryName && stateName && cityName) {
    const info = await getCityManagerInfo(countryName, stateName, cityName);
    if (info.exists) {
      return `${cityName} is already in the hierarchy.`;
    }
    if (info.has_manager && info.manager_name) {
      return `City manager for ${cityName}: ${info.manager_name}`;
    }
  }

  if (role === 'CountryManager' && countryName) {
    const info = await getCountryManagerInfo(countryName);
    if (info.has_manager) {
      return `${countryName} already has manager ${info.manager_name}.`;
    }
  }

  if (role === 'StateManager' && countryName && stateName) {
    const info = await getStateManagerInfo(countryName, stateName);
    if (info.has_manager) {
      return `${stateName} already has manager ${info.manager_name}.`;
    }
  }

  if (role === 'CityManager' && countryName && stateName && cityName) {
    const info = await getCityManagerInfo(countryName, stateName, cityName);
    if (info.has_manager) {
      return `${cityName} already has manager ${info.manager_name}.`;
    }
  }

  return null;
}

export async function lookupTerritoryManager(role, { countryName, stateName, cityName } = {}) {
  if (role === 'CountryManager' && countryName) {
    return (await getCountryManagerInfo(countryName)).manager_name;
  }
  if (role === 'StateManager' && countryName && stateName) {
    return (await getStateManagerInfo(countryName, stateName)).manager_name;
  }
  if (role === 'CityManager' && countryName && stateName && cityName) {
    return (await getCityManagerInfo(countryName, stateName, cityName)).manager_name;
  }
  return null;
}
