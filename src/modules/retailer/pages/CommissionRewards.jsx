import React, { useState, useEffect } from 'react';
import { Info, Landmark, Award, RefreshCw } from 'lucide-react';
import { useRetailerAuth } from '../context/RetailerAuthContext';

export default function CommissionRewards({ showToast }) {
  const { retailer } = useRetailerAuth();
  const [activeSubTab, setActiveSubTab] = useState('Info');
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/billing/retailer/summary')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setBillingSummary(res.data);
      })
      .catch((err) => {
        console.error('Error loading billing summary:', err);
        if (showToast) showToast('Error loading billing information.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xs min-h-[400px] flex flex-col justify-center items-center gap-2 text-slate-400 text-xs font-bold">
        <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
        Loading account information...
      </div>
    );
  }

  const summary = billingSummary?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Billing & Rewards</h1>
          <p className="text-xs text-slate-500">Retailers purchase at cost price and sell at their own markup — commission payouts apply to managers and referrers only.</p>
        </div>
        <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 self-start">
          {['Info', 'Billing'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === tab ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Info' ? 'How It Works' : 'Payment History'}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'Info' && (
        <>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex gap-4">
            <Info className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-indigo-900">
              <p className="font-bold">Retailers do not earn commission on orders</p>
              <p className="text-indigo-800/90">
                You buy products at the <strong>actual price (cost)</strong> from Huddo and set your own selling price above that.
                Your profit is the difference between your sale price and what you paid — not a system commission percentage.
              </p>
              <p className="text-indigo-800/90">
                Commission on <strong>Franchise Points</strong> is paid to city/state/country managers and users who referred new network members.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Outstanding Balance</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">₹{Number(summary.total_outstanding || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Invoiced</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">₹{Number(summary.total_invoiced || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Dealer Category</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{retailer?.category || 'Standard'}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'Billing' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Payment & Invoice History</h3>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(billingSummary?.payment_history || []).length > 0 ? (
                  billingSummary.payment_history.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="px-4 py-3 text-slate-500">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.reference || row.order_number || '—'}</td>
                      <td className="px-4 py-3 text-right">₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{row.status || '—'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                      No payment history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
