import React, { useEffect, useState } from 'react';
import { UserPlus, MapPin, Building, CheckCircle2, Loader2 } from 'lucide-react';
import GeoCascadeSelect from '../components/GeoCascadeSelect';
import { useConfirm } from '../context/ConfirmContext';

const ROLE_OPTIONS = [
  { value: 'CountryManager', label: 'Country Manager' },
  { value: 'StateManager', label: 'State Manager' },
  { value: 'CityManager', label: 'City Manager' },
  { value: 'Retailer', label: 'Retailer' }
];

const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return res.json();
}

export default function OnboardingForm() {
  const { alert } = useConfirm();
  const params = new URLSearchParams(window.location.search);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referrerValid, setReferrerValid] = useState(null);

  const [form, setForm] = useState({
    roleName: 'Retailer',
    name: '',
    email: '',
    mobile: '',
    referrer_code: params.get('ref') || '',
    country_name: '',
    state_name: '',
    city_name: '',
    country_iso: '',
    business_name: '',
    owner_name: '',
    shop_address: '',
    gst_number: '',
    pan_number: '',
    aadhaar_number: ''
  });

  useEffect(() => {
    if (form.referrer_code.trim().length >= 4) {
      apiFetch(`/onboarding/validate-referrer/${encodeURIComponent(form.referrer_code.trim())}`)
        .then((res) => setReferrerValid(res.success ? res.data : false))
        .catch(() => setReferrerValid(false));
    } else {
      setReferrerValid(null);
    }
  }, [form.referrer_code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!referrerValid) {
      await alert('Please enter a valid referrer user code.', 'Invalid referrer');
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
        await alert(res.message || 'Submission failed.', 'Submission failed');
      }
    } catch {
      await alert('Unable to submit onboarding form.', 'Error');
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
            Your request is pending admin approval. Selected locations will be added to the system automatically when approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <UserPlus size={28} />
              <div>
                <h1 className="text-2xl font-bold">User Onboarding</h1>
                <p className="text-orange-100 text-sm">Search and select territory from worldwide locations</p>
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
                    country_name: '',
                    state_name: '',
                    city_name: '',
                    country_iso: ''
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

            {form.roleName === 'Retailer' && (
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
              <GeoCascadeSelect
                role={form.roleName}
                value={{
                  country_name: form.country_name,
                  state_name: form.state_name,
                  city_name: form.city_name,
                  country_iso: form.country_iso
                }}
                onChange={(geo) => setForm((prev) => ({ ...prev, ...geo }))}
              />
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
