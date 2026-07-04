import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Bell, User, Settings, LogOut, ChevronLeft, ChevronRight, X, Menu, Home,
  ArrowUpRight, ShoppingCart, Store, Award, AlertCircle, Users
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

// Theme Constants
export const Theme = {
  colors: {
    primary: '#f97316', // Brand orange
    primaryHover: '#ea580c',
    darkNavy: '#0b1329', // Sidebar background
    lightBg: '#f8fafc',  // Main canvas background
    white: '#ffffff',
    slateBorder: '#e2e8f0',
    textDark: '#0f172a',
    textMuted: '#64748b',
    emerald: '#10b981',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    rose: '#ef4444',
    amber: '#f59e0b',
  },
  chartColors: ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  shadows: 'shadow-xs hover:shadow-sm transition-shadow duration-200',
  borderRadius: 'rounded-xl',
  fonts: {
    sans: 'font-sans antialiased text-slate-800',
    display: 'font-display',
  }
};

// 1. Centralized Dashboard Layout Component
export function DashboardLayout({
  userRole = 'Founder',
  activeTab = 'Dashboard',
  setActiveTab,
  sidebarItems = [],
  onSwitchRole,
  notifications = [],
  onMarkAllNotificationsRead,
  profile,
  children
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-close dropdowns
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsNotifOpen(false);
      setIsProfileOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Global Keybindings (Ctrl+K for search command palette)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const stopPropagation = (e) => e.stopPropagation();

  const handleMarkAllRead = () => {
    if (onMarkAllNotificationsRead) {
      onMarkAllNotificationsRead();
    }
    setIsNotifOpen(false);
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Flattened sidebar items for search palette
  const flatSidebarItems = useMemo(() => {
    const items = [];
    sidebarItems.forEach(sec => {
      if (sec.items) {
        sec.items.forEach(item => items.push(item));
      } else {
        items.push(sec);
      }
    });
    return items;
  }, [sidebarItems]);

  const searchedItems = searchQuery.trim() === '' ? [] : flatSidebarItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeLabel = useMemo(() => {
    const matched = flatSidebarItems.find(item => item.id === activeTab);
    return matched ? matched.label : activeTab;
  }, [flatSidebarItems, activeTab]);

  return (
    <div className="min-h-screen flex bg-slate-50 relative font-sans antialiased text-slate-800 w-full">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* PERSISTENT SIDEBAR */}
      <aside 
        onClick={stopPropagation}
        className={`bg-slate-900 text-slate-350 h-screen sticky top-0 flex flex-col justify-between transition-all duration-305 z-30 shrink-0 ${
          sidebarCollapsed ? 'w-[64px]' : 'w-[256px]'
        } ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 bg-slate-900 w-[256px] block' : 'hidden lg:flex'}`}
      >
        <div>
          {/* Logo Brand area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center font-bold text-white font-display text-base shadow-md">H</span>
                <span className="font-extrabold text-base tracking-wider text-white font-display">HUDDO ERP</span>
              </div>
            )}
            {sidebarCollapsed && !mobileSidebarOpen && (
              <span className="w-8 h-8 mx-auto rounded-lg bg-brand-orange flex items-center justify-center font-extrabold text-white font-display text-sm">H</span>
            )}
            {mobileSidebarOpen && (
              <button className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer" onClick={() => setMobileSidebarOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Items list */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
            {sidebarItems.map((section, idx) => {
              if (section.section) {
                return (
                  <div key={idx} className="space-y-1">
                    {!sidebarCollapsed ? (
                      <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 py-1.5">{section.section}</span>
                    ) : (
                      <div className="border-t border-slate-800/85 my-2"></div>
                    )}
                    {section.items.map(item => {
                      const Icon = item.icon || Home;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileSidebarOpen(false);
                          }}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                            isActive 
                              ? 'bg-brand-orange text-white shadow-md' 
                              : 'hover:bg-slate-800 hover:text-white text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 shrink-0" />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                          </div>
                          {(!sidebarCollapsed || mobileSidebarOpen) && item.badge > 0 && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                              isActive ? 'bg-white text-brand-orange' : 'bg-brand-orange text-white'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {isActive && !sidebarCollapsed && !item.badge && (
                            <span className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"></span>
                          )}
                          {isActive && !sidebarCollapsed && item.badge > 0 && (
                            <span className="sr-only">Active</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              } else {
                const Icon = section.icon || Home;
                const isActive = activeTab === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveTab(section.id);
                      setMobileSidebarOpen(false);
                    }}
                    title={sidebarCollapsed ? section.label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                      isActive 
                        ? 'bg-brand-orange text-white shadow-md' 
                        : 'hover:bg-slate-800 hover:text-white text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      {(!sidebarCollapsed || mobileSidebarOpen) && <span>{section.label}</span>}
                    </div>
                    {(!sidebarCollapsed || mobileSidebarOpen) && section.badge > 0 && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                        isActive ? 'bg-white text-brand-orange' : 'bg-brand-orange text-white'
                      }`}>
                        {section.badge}
                      </span>
                    )}
                    {isActive && (!sidebarCollapsed || mobileSidebarOpen) && (
                      <span className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"></span>
                    )}
                  </button>
                );
              }
            })}
          </nav>
        </div>

        {/* Bottom Toggle switch */}
        <div className="p-3 border-t border-slate-800 flex justify-center">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* TOPBAR + MAIN CANVAS AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs select-none">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="hover:text-slate-600 cursor-pointer">HUDDO ERP</span>
            <span>/</span>
            <span className="hover:text-slate-600 uppercase tracking-wider">{userRole}</span>
            <span>/</span>
            <span className="text-slate-700 font-extrabold uppercase tracking-wider">{activeLabel}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            
            {/* Search Launcher */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50 rounded-lg text-slate-400 text-xs font-semibold w-56 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Search Module (Ctrl+K)</span>
            </button>

            {/* Mobile Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setMobileSidebarOpen(true); }}
              className="lg:hidden p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative font-sans" onClick={stopPropagation}>
              <button 
                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-brand-orange border-2 border-white rounded-full"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                    <span className="text-xs font-bold text-slate-805 font-display">System Notifications</span>
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-brand-orange font-bold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className="border-b border-slate-50 pb-2 last:border-b-0">
                          <span className={`font-bold block ${n.read ? 'text-slate-500' : 'text-slate-800'}`}>{n.title}</span>
                          <p className="text-slate-400 mt-0.5 font-medium leading-relaxed">{n.message}</p>
                          <span className="text-[9px] text-slate-400 font-bold block mt-1">{n.date || n.time || 'Just now'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-400 font-bold">No new notifications.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu dropdown */}
            <div className="relative font-sans" onClick={stopPropagation}>
              <button 
                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
                className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden shadow-xs cursor-pointer focus:outline-none"
              >
                <img src={profile?.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} alt="Profile" className="w-full h-full object-cover" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1.5 bg-slate-50/50 rounded-t-xl">
                    <span className="font-bold text-slate-800 block font-display">{profile?.name || 'Rohan Hudda'}</span>
                    <span className="text-[10px] text-brand-orange font-bold block">{profile?.subtitle || `${userRole} Session`}</span>
                  </div>

                  {onSwitchRole && (
                    <div className="px-4 py-2 border-b border-slate-100 mb-1.5">
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Switch Active Role (RBAC)</label>
                      <select
                        value={userRole}
                        onChange={(e) => { onSwitchRole(e.target.value); setIsProfileOpen(false); }}
                        className="w-full text-[10px] border border-slate-200 rounded p-1 bg-white font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="Founder">Founder</option>
                        <option value="CEO">CEO</option>
                        <option value="Admin">Admin</option>
                        <option value="Country Manager">Country Manager</option>
                        <option value="State Manager">State Manager</option>
                        <option value="City Manager">City Manager</option>
                        <option value="Sales Manager">Sales Manager</option>
                        <option value="Sales Executive">Sales Executive</option>
                        <option value="Purchase Manager">Purchase Manager</option>
                        <option value="Inventory Manager">Inventory Manager</option>
                        <option value="Finance Manager">Finance Manager</option>
                        <option value="HR Manager">HR Manager</option>
                        <option value="Retailer">Retailer</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Promoter">Promoter</option>
                        <option value="Team Member">Team Member</option>
                      </select>
                    </div>
                  )}

                  <button 
                    onClick={() => { setIsProfileOpen(false); setActiveTab('Profile'); }}
                    className="w-full text-left px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Profile</span>
                  </button>
                  <button 
                    onClick={() => { 
                      setIsProfileOpen(false); 
                      window.location.hash = 'change-password';
                      setActiveTab('Profile'); 
                    }}
                    className="w-full text-left px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Change Password</span>
                  </button>
                  <button 
                    onClick={() => { setIsProfileOpen(false); setActiveTab('Portal Settings'); }}
                    className="w-full text-left px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Portal Settings</span>
                  </button>
                  
                  <div className="border-t border-slate-100 my-1"></div>
                  
                  <button 
                    onClick={() => { setIsProfileOpen(false); if (onSwitchRole) onSwitchRole('Logout'); }}
                    className="w-full text-left px-4 py-2 font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout Session</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* main Dashboard canvas */}
        <main className="p-4 sm:p-6 overflow-y-auto flex-1 max-w-[1600px] w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Global Command Palette search modal */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-xs p-4 pt-16 animate-fade-in font-sans"
          onClick={(e) => e.target === e.currentTarget && setIsSearchOpen(false)}
        >
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm border-0 focus:outline-none w-full bg-white text-slate-800"
                autoFocus
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto p-2">
              {searchedItems.length > 0 ? (
                searchedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>Navigate to {item.label}</span>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  {searchQuery.trim() === '' ? "Type key concepts to search modules..." : "No modules found matches query."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// 2. Standardized KPI Stat Widget (Matching Founder Dashboard)
export function StatWidget({ title, value, delta, icon: Icon, colorClass, onClick }) {
  const resolvedColor = colorClass || 'text-brand-orange bg-orange-50';
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-350 hover:shadow-xs transition-all' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <span className={`p-2 rounded-lg ${resolvedColor}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-800 font-display">{value}</h3>
        {delta && <span className="text-[10px] text-slate-400 font-medium">{delta}</span>}
      </div>
    </div>
  );
}


// 3. Standardized Dashboard Card
export function DashboardCard({ title, subtitle, headerActions, children, className = '' }) {
  return (
    <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col ${className}`}>
      {(title || subtitle || headerActions) && (
        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-900 font-display">{title}</h3>}
            {subtitle && <p className="text-[11px] text-slate-400 font-medium font-sans mt-0.5">{subtitle}</p>}
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// 4. Standardized Table component
export function DashboardTable({ columns = [], data = [], onRowClick, emptyText = "No items found" }) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 font-sans">
            {columns.map((col, idx) => (
              <th key={idx} className={`pb-2 ${col.className || ''}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.length > 0 ? (
            data.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`text-xs text-slate-700 hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col, cIdx) => {
                  const cellVal = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                  return (
                    <td key={cIdx} className={`py-2.5 ${col.cellClassName || ''}`}>
                      {col.render ? col.render(cellVal, row) : cellVal}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-slate-400 font-bold">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// 5. Standardized Recharts Wrappers
const StandardGrid = () => <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />;
const StandardXAxis = ({ dataKey }) => <XAxis dataKey={dataKey} stroke="#94a3b8" fontSize={11} tickLine={false} />;
const StandardYAxis = ({ tickFormatter }) => <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={tickFormatter} />;
const StandardTooltip = ({ formatter }) => (
  <Tooltip 
    formatter={formatter}
    contentStyle={{ 
      backgroundColor: '#ffffff', 
      borderRadius: '12px', 
      border: '1px solid #e2e8f0', 
      fontSize: '11px', 
      fontWeight: 'bold',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
    }} 
  />
);

export function DashboardLineChart({ data, xKey, lineKey, stroke = '#f97316', tickFormatter, formatter }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 30, bottom: 25 }}>
          <StandardGrid />
          <StandardXAxis dataKey={xKey} />
          <StandardYAxis tickFormatter={tickFormatter} />
          <StandardTooltip formatter={formatter} />
          <Line type="monotone" dataKey={lineKey} stroke={stroke} strokeWidth={3} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardBarChart({ data, xKey, barKey, layout = 'horizontal', fill = '#3b82f6', tickFormatter, yKey, formatter }) {
  const isVertical = layout === 'vertical';
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout={layout} 
          margin={{ top: 5, right: 10, left: isVertical ? 65 : 30, bottom: 25 }}
        >
          {isVertical ? (
            <>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={tickFormatter} />
              <YAxis dataKey={yKey} type="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
            </>
          ) : (
            <>
              <StandardGrid />
              <StandardXAxis dataKey={xKey} />
              <StandardYAxis tickFormatter={tickFormatter} />
            </>
          )}
          <StandardTooltip formatter={formatter} />
          <Bar dataKey={barKey} fill={fill} radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? '#f97316' : fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardPieChart({ data, nameKey, valueKey, centerTextValue, centerTextLabel }) {
  return (
    <div className="h-56 relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey={valueKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={Theme.chartColors[index % Theme.chartColors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              fontSize: '11px', 
              fontWeight: 'bold' 
            }} 
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerTextValue || centerTextLabel) && (
        <div className="absolute flex flex-col items-center">
          {centerTextValue && <span className="text-2xl font-bold text-slate-800 font-display">{centerTextValue}</span>}
          {centerTextLabel && <span className="text-[10px] text-slate-400 uppercase font-semibold">{centerTextLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function DashboardAreaChart({ data, xKey, areaKey, fillGradientId = 'colorArea', stroke = '#f97316', formatter }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 30, bottom: 25 }}>
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={stroke} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <StandardGrid />
          <XAxis dataKey={xKey} fontSize={10} stroke="#94a3b8" />
          <YAxis fontSize={10} stroke="#94a3b8" />
          <StandardTooltip formatter={formatter} />
          <Area type="monotone" dataKey={areaKey} stroke={stroke} strokeWidth={2} fillOpacity={1} fill={`url(#${fillGradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// 6. Centralized Form components
export function TextInput({ label, ...props }) {
  return (
    <div className="space-y-1 text-left font-sans">
      {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <input 
        {...props} 
        className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
      />
    </div>
  );
}

export function SelectInput({ label, options = [], ...props }) {
  return (
    <div className="space-y-1 text-left font-sans">
      {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <select 
        {...props} 
        className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-white text-slate-855 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all cursor-pointer"
      >
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TextareaInput({ label, ...props }) {
  return (
    <div className="space-y-1 text-left font-sans">
      {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <textarea 
        {...props} 
        className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-white text-slate-850 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
      />
    </div>
  );
}

export function PrimaryButton({ children, icon: Icon, className = '', ...props }) {
  return (
    <button 
      {...props}
      className={`px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
    </button>
  );
}

export function SecondaryButton({ children, icon: Icon, className = '', ...props }) {
  return (
    <button 
      {...props}
      className={`px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
    </button>
  );
}

export function DestructiveButton({ children, icon: Icon, className = '', ...props }) {
  return (
    <button 
      {...props}
      className={`px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
    </button>
  );
}

// 7. Centralized Modal component
export function DashboardModal({ isOpen, onClose, title, children, onConfirm, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in font-sans"
      onClick={handleOverlayClick}
    >
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900 font-display">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 font-sans">
          <SecondaryButton onClick={onClose}>
            {cancelText}
          </SecondaryButton>
          {onConfirm && (
            <button 
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-sm cursor-pointer ${
                isDestructive 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-brand-orange hover:bg-brand-orange-hover'
              }`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
