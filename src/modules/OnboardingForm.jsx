import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, MapPin, Building, CheckCircle2, Loader2, Search } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'CountryManager', label: 'Country Manager' },
  { value: 'StateManager', label: 'State Manager' },
  { value: 'CityManager', label: 'City Manager' },
  { value: 'Retailer', label: 'Retailer' }
];

const API_BASE = 'http://localhost:5000/api/v1';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return res.json();
}

function SearchableSelect({ label, options, value, onChange, disabled, placeholder, hint }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o._id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : (selected?.name || '')}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>
      {hint && <p className="text-xs text-indigo-600 mt-1">{hint}</p>}
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {filtered.map((option) => (
            <button
              key={option._id}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return;
                onChange(option._id);
                setQuery('');
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-0 ${
                option.disabled ? 'text-slate-400 bg-slate-50 cursor-not-allowed' : 'hover:bg-orange-50 text-slate-700'
              }`}
            >
              {option.name}
              {option.disabled && option.manager_name ? ` — ${option.manager_name} (assigned)` : ''}
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No matches</div>}
        </div>
      )}
    </div>
  );
}

export default function OnboardingForm() {
  const params = new URLSearchParams(window.location.search);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [referrerValid, setReferrerValid] = useState(null);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [countryManagerName, setCountryManagerName] = useState('');
  const [stateManagerName, setStateManagerName] = useState('');

  const [form, setForm] = useState({
    roleName: 'Retailer',
    name: '',
    email: '',
    mobile: '',
    referrer_code: params.get('ref') || '',
    country_id: '',
    state_id: '',
    city_id: '',
    business_name: '',
    owner_name: '',
    shop_address: '',
    gst_number: '',
    pan_number: '',
    aadhaar_number: ''
  });

  const loadGeo = async (role, countryId, stateId) => {
    setGeoLoading(true);
    try {
      const query = new URLSearchParams({ role });
      if (countryId) query.set('country_id', countryId);
      if (stateId) query.set('state_id', stateId);
      const res = await apiFetch(`/onboarding/geo-options?${query.toString()}`);
      if (!res.success) return;

      if (role === 'CountryManager') {
        setCountries(res.data.countries || []);
      } else if (role === 'StateManager') {
        setCountryManagerName(res.data.country_manager_name || '');
        setStates((res.data.states || []).map((s) => ({
          ...s,
          disabled: !s.available,
          manager_name: s.manager_name
        })));
      } else {
        setCountryManagerName(res.data.country_manager_name || '');
        const stateRows = res.data.states || [];
        if (stateId) {
          const match = stateRows.find((s) => s._id === stateId) || stateRows[0];
          setStateManagerName(match?.state_manager_name || '');
          setCities((match?.cities || []).map((c) => ({
            ...c,
            disabled: form.roleName === 'CityManager' ? !c.available : false,
            manager_name: c.manager_name
          })));
        } else {
          setStates(stateRows.map((s) => ({ _id: s._id, name: s.name })));
          setCities([]);
          setStateManagerName('');
        }
      }
    } finally {
      setGeoLoading(false);
    }
  };

  useEffect(() => {
    apiFetch('/onboarding/geo-options?role=CountryManager').then((res) => {
      if (res.success) setCountries(res.data.countries || []);
    });
  }, []);

  useEffect(() => {
    if (form.referrer_code.trim().length >= 4) {
      apiFetch(`/onboarding/validate-referrer/${encodeURIComponent(form.referrer_code.trim())}`)
        .then((res) => setReferrerValid(res.success ? res.data : false))
        .catch(() => setReferrerValid(false));
    } else {
      setReferrerValid(null);
    }
  }, [form.referrer_code]);

  useEffect(() => {
    if (form.roleName === 'CountryManager') {
      loadGeo('CountryManager');
    } else if (form.roleName === 'StateManager' && form.country_id) {
      loadGeo('StateManager', form.country_id);
    } else if ((form.roleName === 'CityManager' || form.roleName === 'Retailer') && form.country_id) {
      loadGeo(form.roleName, form.country_id, form.state_id || undefined);
    }
  }, [form.roleName, form.country_id, form.state_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!referrerValid) {
      alert('Please enter a valid referrer user code.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/onboarding/submit', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (res.success) {
        setSubmitted(true);
      } else {
        alert(res.message || 'Submission failed.');
      }
    } catch (err) {
      alert('Unable to submit onboarding form.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Registration Submitted</h1>
          <p className="text-slate-600">
            The onboarding request has been sent for admin approval. The referred user will receive login access after approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <UserPlus size={28} />
              <div>
                <h1 className="text-2xl font-bold">User Onboarding</h1>
                <p className="text-orange-100 text-sm">Fill this form on behalf of the user you are referring</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Referrer User Code *</label>
                <input
                  required
                  value={form.referrer_code}
                  onChange={(e) => setForm({ ...form, referrer_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                  placeholder="USR-2026-1234"
                />
                {referrerValid && (
                  <p className="text-xs text-emerald-600 mt-1">Referrer: {referrerValid.name} ({referrerValid.role})</p>
                )}
                {referrerValid === false && (
                  <p className="text-xs text-red-600 mt-1">Invalid or unapproved referrer code</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={form.roleName}
                  onChange={(e) => setForm({
                    ...form,
                    roleName: e.target.value,
                    country_id: '',
                    state_id: '',
                    city_id: ''
                  })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile *</label>
                <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>

            {(form.roleName === 'Retailer') && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building size={18} /> Business Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input required placeholder="Business Name *" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                  <input placeholder="Owner Name" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                  <input placeholder="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                  <input placeholder="PAN Number" value={form.pan_number} onChange={(e) => setForm({ ...form, pan_number: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                  <input placeholder="Aadhaar Number" value={form.aadhaar_number} onChange={(e) => setForm({ ...form, aadhaar_number: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                  <input placeholder="Shop Address" value={form.shop_address} onChange={(e) => setForm({ ...form, shop_address: e.target.value })} className="md:col-span-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
            )}

            <div className="border-t pt-6 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin size={18} /> Territory</h3>
              {geoLoading && <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading locations...</p>}

              {form.roleName === 'CountryManager' && (
                <SearchableSelect
                  label="Country *"
                  options={countries.map((c) => ({
                    _id: c._id,
                    name: c.name,
                    disabled: !c.available,
                    manager_name: c.manager_name
                  }))}
                  value={form.country_id}
                  onChange={(id) => setForm({ ...form, country_id: id })}
                  placeholder="Search country..."
                />
              )}

              {form.roleName === 'StateManager' && (
                <>
                  <SearchableSelect
                    label="Country *"
                    options={countries.map((c) => ({ _id: c._id, name: c.name, disabled: false }))}
                    value={form.country_id}
                    onChange={(id) => setForm({ ...form, country_id: id, state_id: '' })}
                    placeholder="Search country..."
                    hint={countryManagerName ? `Country Manager: ${countryManagerName}` : ''}
                  />
                  {form.country_id && (
                    <SearchableSelect
                      label="State *"
                      options={states}
                      value={form.state_id}
                      onChange={(id) => setForm({ ...form, state_id: id })}
                      placeholder="Search state..."
                    />
                  )}
                </>
              )}

              {(form.roleName === 'CityManager' || form.roleName === 'Retailer') && (
                <>
                  <SearchableSelect
                    label="Country *"
                    options={countries.map((c) => ({ _id: c._id, name: c.name, disabled: false }))}
                    value={form.country_id}
                    onChange={(id) => setForm({ ...form, country_id: id, state_id: '', city_id: '' })}
                    placeholder="Search country..."
                    hint={countryManagerName ? `Country Manager: ${countryManagerName}` : ''}
                  />
                  {form.country_id && (
                    <SearchableSelect
                      label="State *"
                      options={states}
                      value={form.state_id}
                      onChange={(id) => setForm({ ...form, state_id: id, city_id: '' })}
                      placeholder="Search state..."
                    />
                  )}
                  {form.state_id && (
                    <SearchableSelect
                      label="City *"
                      options={cities}
                      value={form.city_id}
                      onChange={(id) => setForm({ ...form, city_id: id })}
                      placeholder="Search city..."
                      hint={stateManagerName ? `State Manager: ${stateManagerName}` : ''}
                    />
                  )}
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              Submit for Admin Approval
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
