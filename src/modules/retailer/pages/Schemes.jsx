import React, { useState } from 'react';
import { Tag, Calendar, ShoppingBag, ShieldAlert, Award, Star, CheckCircle, Flame } from 'lucide-react';

import { useRetailerAuth } from '../context/RetailerAuthContext';
import { mockSchemes } from '../mockData/mockSchemes';

export default function Schemes() {
  const { retailer } = useRetailerAuth();
  const [activeTab, setActiveTab] = useState('Active'); // Active | Expired
  const retailerTier = retailer?.category || 'Standard'; // e.g. Gold

  // Filter schemes
  const activeSchemes = mockSchemes.filter(s => s.isActive);
  const expiredSchemes = mockSchemes.filter(s => !s.isActive);

  const renderSchemeCard = (scheme, isExpired = false) => {
    const isApplicable = scheme.applicableTiers.includes(retailerTier) || scheme.applicableTiers.includes('All');
    
    return (
      <div 
        key={scheme.id} 
        className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 ${
          isExpired 
            ? 'opacity-60 border-slate-200 bg-slate-50/55' 
            : isApplicable 
              ? 'border-brand-orange/30 hover:border-brand-orange hover:shadow-md'
              : 'border-slate-200 opacity-80 hover:opacity-100'
        }`}
      >
        {/* Background Accent */}
        {!isExpired && isApplicable && (
          <div className="absolute -right-6 -top-6 w-16 h-16 bg-brand-orange/10 rounded-full blur-xl pointer-events-none"></div>
        )}

        <div className="space-y-3.5">
          {/* Header */}
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 font-mono block">SCHEME ID: {scheme.id}</span>
              <h3 className={`text-sm font-bold font-display mt-0.5 ${isExpired ? 'text-slate-505 line-through' : 'text-slate-850'}`}>
                {scheme.name}
              </h3>
            </div>
            
            {/* Discount Badge */}
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow-xs shrink-0 ${
              isExpired 
                ? 'bg-slate-200 text-slate-500' 
                : 'bg-orange-500 text-white'
            }`}>
              {scheme.discountType === 'Percentage' ? `${scheme.discountValue}% OFF` : 
               scheme.discountType === 'Flat' ? `₹${scheme.discountValue} OFF` :
               `${scheme.discountValue}x PTS`}
            </span>
          </div>

          <p className="text-[11px] text-slate-550 font-medium font-sans leading-relaxed">
            {scheme.description}
          </p>

          {/* Details */}
          <div className="space-y-1.5 text-[10px] font-semibold text-slate-605 border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Applicable Items: <span className="text-slate-800 font-bold">{scheme.applicableProducts}</span></span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Min. Order Qty: <span className="text-slate-800 font-bold">{scheme.minOrderQty} pairs</span></span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Validity: <span className="text-slate-800 font-bold">{scheme.validFrom} to {scheme.validTo}</span></span>
            </div>
          </div>
        </div>

        {/* Tier Badges Footer */}
        <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {scheme.applicableTiers.map(t => (
              <span 
                key={t}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                  t === 'Platinum' ? 'bg-purple-100 text-purple-700' :
                  t === 'Gold' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-650'
                }`}
              >
                {t}
              </span>
            ))}
          </div>

          <div>
            {isExpired ? (
              <span className="text-[9px] font-bold text-slate-400 uppercase">Expired Scheme</span>
            ) : isApplicable ? (
              <span className="flex items-center gap-0.5 text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">
                <CheckCircle className="w-3 h-3 fill-emerald-50" />
                <span>Applicable to you</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                <ShieldAlert className="w-3 h-3 text-slate-400" />
                <span>Restricted Tier</span>
              </span>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">Dealer Schemes & Discounts</h1>
          <p className="text-xs text-slate-550 font-medium">Browse tier-specific volume discounts, point-accrual multipliers, and ongoing clearance programs.</p>
        </div>
        
        <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveTab('Active')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'Active' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-755'
            }`}
          >
            Active Schemes ({activeSchemes.length})
          </button>
          <button
            onClick={() => setActiveTab('Expired')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'Expired' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-755'
            }`}
          >
            Expired Schemes ({expiredSchemes.length})
          </button>
        </div>
      </div>

      {/* Schemes Grid */}
      {activeTab === 'Active' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeSchemes.map(s => renderSchemeCard(s, false))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expiredSchemes.map(s => renderSchemeCard(s, true))}
        </div>
      )}
    </div>
  );
}
