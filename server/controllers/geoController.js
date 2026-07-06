import { getWorldCountries, getWorldStates, getWorldCities } from '../utils/worldGeoService.js';
import { previewGeoResolution } from '../utils/geoResolve.js';
import {
  annotateWorldCities,
  annotateWorldCountries,
  annotateWorldStates,
  lookupTerritoryManager,
  resolveManagerSlotMessage
} from '../utils/geoWorldAnnotate.js';

export const searchWorldCountries = async (req, res, next) => {
  try {
    const { q = '', role = '' } = req.query;
    const countries = await getWorldCountries(q);
    const data = await annotateWorldCountries(countries, role);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const searchWorldStates = async (req, res, next) => {
  try {
    const { country, q = '', role = '' } = req.query;
    if (!country?.trim()) {
      return res.status(400).json({ success: false, message: 'country query param is required.' });
    }
    const states = await getWorldStates(country, q);
    const data = await annotateWorldStates(states, country, role);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const searchWorldCities = async (req, res, next) => {
  try {
    const { country, state, q = '', role = '' } = req.query;
    if (!country?.trim() || !state?.trim()) {
      return res.status(400).json({ success: false, message: 'country and state query params are required.' });
    }
    const cities = await getWorldCities(country, state, q);
    const data = await annotateWorldCities(cities, country, state, role);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getManagerSlotStatus = async (req, res, next) => {
  try {
    const {
      role,
      country_name: countryName,
      state_name: stateName,
      city_name: cityName
    } = req.query;

    const message = await resolveManagerSlotMessage(role, {
      countryName,
      stateName,
      cityName
    });

    const managerName = await lookupTerritoryManager(role, {
      countryName,
      stateName,
      cityName
    });

    const isBlocked = message && (
      message.includes('already has manager') ||
      message.includes('already in the hierarchy')
    );

    const result = {
      available: !isBlocked,
      manager_name: managerName,
      message
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const previewGeoCreation = async (req, res, next) => {
  try {
    const {
      roleName,
      country_name: countryName,
      state_name: stateName,
      city_name: cityName
    } = req.body;

    const preview = await previewGeoResolution(roleName, {
      countryName,
      stateName,
      cityName
    });

    res.status(200).json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
};
