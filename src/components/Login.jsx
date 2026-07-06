import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, RefreshCw, LogIn, ArrowRight } from 'lucide-react';
import { DEFAULT_USER_PASSWORD } from '../constants/defaultCredentials';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState('');

  const demoAccounts = [
    { role: 'Founder', email: 'rohan@huddoerp.in', label: 'Founder (Super Admin)' },
    { role: 'CEO', email: 'rohan@huddoerp.in', label: 'CEO' },
    { role: 'Admin', email: 'rohan@huddoerp.in', label: 'Administrator' },
    { role: 'Country Manager', email: 'rajesh@huddoerp.in', label: 'Country Mgr (India)' },
    { role: 'State Manager', email: 'preeti@huddoerp.in', label: 'State Mgr (MH/KA)' },
    { role: 'City Manager', email: 'sanjay@huddoerp.in', label: 'City Mgr (Mumbai)' },
    { role: 'Sales Executive', email: 'arjun@huddoerp.in', label: 'Sales Exec (Pune)' },
    { role: 'Finance Manager', email: 'vikram@huddoerp.in', label: 'Finance Manager' },
    { role: 'HR Manager', email: 'neha@huddoerp.in', label: 'HR Manager' },
    { role: 'Inventory Manager', email: 'sunil@huddoerp.in', label: 'Inventory Manager' },
    { role: 'Promoter', email: 'suresh@promoter.com', label: 'Promoter (Mumbai)' },
    { role: 'Retailer', email: 'dinesh@walkeasy.in', label: 'Retailer (Walk Easy)' }
  ];

  const handleDemoSelect = (e) => {
    const roleName = e.target.value;
    setSelectedDemoRole(roleName);
    const demo = demoAccounts.find(d => d.role === roleName);
    if (demo) {
      setEmail(demo.email);
      setPassword(DEFAULT_USER_PASSWORD);
    } else {
      setEmail('');
      setPassword('');
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email, mobile number, or employee ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const resData = await response.json();

      if (resData.success && resData.data) {
        const { user, access_token, refresh_token } = resData.data;
        onLoginSuccess(user, access_token, refresh_token);
      } else {
        setError(resData.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('[Login Error]', err);
      setError('Connection refused. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Decorative background radial gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Brand Identity */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight font-display flex items-center justify-center gap-1">
            HUDDO <span className="text-brand-orange">ERP</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase mt-1.5">
            Brand Management & Distribution System
          </p>
        </div>

        {/* Login Glassmorphic Container */}
        <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-white font-display mb-1 flex items-center gap-2">
            Secure Portal Sign In
          </h2>
          <p className="text-xs text-slate-400 mb-6 font-medium">
            Enter your organization credentials to access authorized modules.
          </p>

          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username/Email Input */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                Email Address, Mobile Number or Employee ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="name@huddoerp.in or 9821012345"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Secret Credentials Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                />
              </div>
            </div>

            {/* Demo Accounts Quick-Switch for Reviewers */}
            <div className="pt-2">
              <label className="block text-[10px] uppercase font-bold text-brand-orange mb-1.5 tracking-wider">
                ERP Role Simulation Quick-Login
              </label>
              <select
                value={selectedDemoRole}
                onChange={handleDemoSelect}
                disabled={loading}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-slate-300 focus:outline-none focus:border-brand-orange transition-all cursor-pointer"
              >
                <option value="">-- Choose Role Demo Credentials --</option>
                {demoAccounts.map((d, index) => (
                  <option key={index} value={d.role}>
                    {d.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Newly created accounts use the default password <span className="font-mono font-semibold text-slate-400">{DEFAULT_USER_PASSWORD}</span> until changed in My Profile.
              </p>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl py-3.5 text-xs font-bold font-display tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-orange-600/10 cursor-pointer mt-6"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating secure node...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In Securely</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-500 font-bold mt-8 tracking-wider uppercase">
          SECURED BY SSL & ROLE-BASED ACCESS CONTROL (RBAC)
        </p>
      </div>
    </div>
  );
}
