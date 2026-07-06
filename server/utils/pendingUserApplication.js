import mongoose from 'mongoose';
import {
  findCityByName,
  findCountryByName,
  findStateByName
} from './geoResolve.js';

export const PENDING_USER_DEFAULTS = {
  approval_status: 'Pending',
  is_verified: false,
  is_active: false,
  status: 'Inactive'
};

export async function lookupExistingTerritoryIds({
  countryId,
  stateId,
  cityId,
  countryName,
  stateName,
  cityName
}) {
  let resolvedCountryId = countryId && mongoose.isValidObjectId(countryId) ? countryId : null;
  let resolvedStateId = stateId && mongoose.isValidObjectId(stateId) ? stateId : null;
  let resolvedCityId = cityId && mongoose.isValidObjectId(cityId) ? cityId : null;

  if (!resolvedCountryId && countryName) {
    const country = await findCountryByName(countryName);
    resolvedCountryId = country?._id || null;
  }
  if (!resolvedStateId && stateName && resolvedCountryId) {
    const state = await findStateByName(stateName, resolvedCountryId);
    resolvedStateId = state?._id || null;
  }
  if (!resolvedCityId && cityName && resolvedStateId) {
    const city = await findCityByName(cityName, resolvedStateId);
    resolvedCityId = city?._id || null;
  }

  return {
    countryId: resolvedCountryId,
    stateId: resolvedStateId,
    cityId: resolvedCityId
  };
}

export function buildOnboardingMeta(body, territoryIds = {}) {
  const meta = {
    requested_country: territoryIds.countryId || body.country || body.assigned_country_id || undefined,
    requested_state: territoryIds.stateId || body.state || body.assigned_state_id || undefined,
    requested_city: territoryIds.cityId || body.city || body.assigned_city_id || undefined,
    requested_country_name: body.country_name?.trim() || undefined,
    requested_state_name: body.state_name?.trim() || undefined,
    requested_city_name: body.city_name?.trim() || undefined,
    requested_country_iso: body.country_iso || undefined,
    business_name: body.business_name?.trim() || undefined,
    shop_address: body.shop_address?.trim() || body.address?.trim() || undefined,
    gst_number: body.gst_number?.trim() || undefined,
    pan_number: body.pan_number?.trim() || undefined,
    aadhaar_number: body.aadhaar_number?.trim() || undefined,
    owner_name: body.owner_name?.trim() || undefined,
    category: body.category || undefined,
    assigned_promoter: body.assigned_promoter || undefined,
    assigned_city_manager: body.assigned_city_manager || undefined
  };

  Object.keys(meta).forEach((key) => {
    if (meta[key] === undefined) delete meta[key];
  });

  return meta;
}

export async function buildPendingUserPayload(body, { onboardingSource = 'admin', roleName } = {}) {
  const territoryIds = await lookupExistingTerritoryIds({
    countryId: body.assigned_country_id || body.country_id || body.country,
    stateId: body.assigned_state_id || body.state_id || body.state,
    cityId: body.assigned_city_id || body.city_id || body.city,
    countryName: body.country_name,
    stateName: body.state_name,
    cityName: body.city_name
  });

  const onboardingMeta = buildOnboardingMeta(body, territoryIds);

  return {
    ...PENDING_USER_DEFAULTS,
    onboarding_source: onboardingSource,
    onboarding_meta: Object.keys(onboardingMeta).length ? onboardingMeta : undefined,
    country: undefined,
    state: undefined,
    city: undefined
  };
}

export const PENDING_APPROVAL_MESSAGE =
  'Application submitted successfully. It will appear in Approvals until an administrator approves it.';
