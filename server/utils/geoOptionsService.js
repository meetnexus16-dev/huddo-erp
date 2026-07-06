import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import {
  cleanupOrphanedCityManager,
  cleanupOrphanedCountryManager,
  cleanupOrphanedStateManager,
  getActiveManagerUser
} from './managerAssignment.js';

/** All countries for territory pickers (State/City/Retailer country step). */
export async function listAllCountries() {
  const countries = await Country.find({ is_deleted: { $ne: true } }).sort({ name: 1 });
  return countries.map((country) => ({
    _id: country._id,
    name: country.name,
    code: country.code,
    available: true
  }));
}

/** Countries with manager-slot availability (Country Manager onboarding). */
export async function listCountriesForCountryManager() {
  const countries = await Country.find({ is_deleted: { $ne: true } }).sort({ name: 1 });
  const data = [];
  for (const country of countries) {
    await cleanupOrphanedCountryManager(country._id);
    const refreshed = await Country.findById(country._id);
    const manager = await getActiveManagerUser(refreshed?.manager);
    data.push({
      _id: country._id,
      name: country.name,
      code: country.code,
      available: !manager,
      manager_name: manager?.name || null
    });
  }
  return data;
}

export async function buildGeoOptions({ role, countryId, stateId }) {
  if (!role || role === 'list_countries') {
    return { countries: await listAllCountries() };
  }

  if (role === 'CountryManager') {
    return { countries: await listCountriesForCountryManager() };
  }

  if (role === 'StateManager') {
    if (!countryId) {
      return { countries: await listAllCountries() };
    }
    const country = await Country.findById(countryId).populate('manager');
    const states = await State.find({ country: countryId, is_deleted: { $ne: true } }).sort({ name: 1 });
    const stateData = [];
    for (const state of states) {
      await cleanupOrphanedStateManager(state._id);
      const refreshed = await State.findById(state._id);
      const manager = await getActiveManagerUser(refreshed?.manager);
      stateData.push({
        _id: state._id,
        name: state.name,
        available: !manager,
        manager_name: manager?.name || null
      });
    }
    return {
      countries: await listAllCountries(),
      country_manager_name: country?.manager?.name || null,
      states: stateData
    };
  }

  if (role === 'CityManager' || role === 'Retailer') {
    if (!countryId) {
      return { countries: await listAllCountries() };
    }

    const country = await Country.findById(countryId).populate('manager');
    let states = [];
    if (stateId) {
      const state = await State.findById(stateId).populate('manager');
      states = state ? [state] : [];
    } else {
      states = await State.find({ country: countryId, is_deleted: { $ne: true } }).sort({ name: 1 });
    }

    const statesPayload = [];
    for (const state of states) {
      await cleanupOrphanedStateManager(state._id);
      const refreshedState = await State.findById(state._id).populate('manager');
      const cities = await City.find({ state: refreshedState._id, is_deleted: { $ne: true } }).sort({ name: 1 });
      const cityData = [];
      for (const city of cities) {
        await cleanupOrphanedCityManager(city._id);
        const refreshedCity = await City.findById(city._id);
        const manager = await getActiveManagerUser(refreshedCity?.manager);
        cityData.push({
          _id: city._id,
          name: city.name,
          available: role === 'Retailer' ? true : !manager,
          manager_name: manager?.name || null
        });
      }
      statesPayload.push({
        _id: refreshedState._id,
        name: refreshedState.name,
        state_manager_name: refreshedState.manager?.name || null,
        cities: cityData
      });
    }

    const allStates = stateId
      ? []
      : (await State.find({ country: countryId, is_deleted: { $ne: true } }).sort({ name: 1 }))
        .map((s) => ({ _id: s._id, name: s.name }));

    return {
      countries: await listAllCountries(),
      country_manager_name: country?.manager?.name || null,
      states: stateId ? statesPayload : allStates,
      state_details: stateId ? statesPayload[0] : null
    };
  }

  throw new Error('Invalid role for geo options.');
}
