import React, { useEffect, useState } from 'react';
import { UserPlus, Copy, ExternalLink, Link2 } from 'lucide-react';

function authFetch(path) {
  const token = localStorage.getItem('huddo_token');
  return fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }).then((res) => res.json());
}

export default function OnboardSharePanel({ showToast, title = 'Onboard a User', description }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    authFetch('/onboarding/referral-info').then((res) => {
      if (res.success) setInfo(res.data);
    });
  }, []);

  const copy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast?.(`${label} copied.`, 'success');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="text-orange-500" size={22} />
          {title}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {description || 'Fill the onboarding form on behalf of the user you are referring. Their account will be activated after admin approval.'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
          <p className="text-xs font-bold uppercase text-indigo-500">Your User Code</p>
          <div className="flex items-center justify-between mt-2">
            <code className="text-lg font-bold text-indigo-700">{info?.user_code || '—'}</code>
            <button type="button" onClick={() => copy(info?.user_code, 'User code')} className="text-indigo-600 text-sm font-semibold flex items-center gap-1">
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
          <p className="text-xs font-bold uppercase text-orange-600">Onboarding Link</p>
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-sm text-slate-700 truncate">{info?.onboarding_link || '—'}</span>
            <button type="button" onClick={() => copy(info?.onboarding_link, 'Link')} className="text-orange-600 text-sm font-semibold flex items-center gap-1 shrink-0">
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={info?.onboarding_link || '/onboard'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm"
        >
          <ExternalLink size={16} /> Open Onboarding Form
        </a>
        <button
          type="button"
          onClick={() => copy(`${info?.onboarding_link || ''}`, 'Share link')}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50"
        >
          <Link2 size={16} /> Copy Share Link
        </button>
      </div>

      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4">
        <strong>Note:</strong> Commissions are calculated from <strong>Franchise Points</strong> on approved orders.
        Referrer bonus depends on the role you onboard (configure under Admin → Commissions → Referrer Bonus Structure).
      </div>
    </div>
  );
}
