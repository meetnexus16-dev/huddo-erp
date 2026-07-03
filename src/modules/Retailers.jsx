import React, { useState } from 'react';
import { Store, Plus, Eye, CheckCircle, XCircle, AlertCircle, FileText, ChevronRight, X, PhoneCall } from 'lucide-react';
import { initialRetailers } from '../mockData';
import { DataTable, Modal } from '../components/Common';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Retailers({ showToast }) {
  const [retailers, setRetailers] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [promotersList, setPromotersList] = useState([]);
  const [cityManagersList, setCityManagersList] = useState([]);

  React.useEffect(() => {
    // 1. Fetch Retailers
    fetch('/api/retailers')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          const mapped = resData.data.map(ret => ({
            id: ret._id,
            shopName: ret.business_name,
            owner: ret.owner_name,
            email: ret.email,
            mobile: ret.mobile,
            address: ret.shop_address || '',
            state: ret.state?.name || ret.state || 'Not Assigned',
            city: ret.city?.name || ret.city || 'Not Assigned',
            category: ret.category || 'Standard',
            promoter: ret.assigned_promoter?.name || ret.assigned_promoter?.full_name || 'None',
            cityManager: ret.assigned_city_manager?.name || 'Not Assigned',
            ordersCount: ret.ordersCount || 10,
            revenue: ret.revenue || 0,
            status: ret.is_verified ? 'Approved' : 'Pending Verification',
            gstNo: ret.gst_number || '',
            panNo: ret.pan_number || '',
            aadhaarNo: ret.aadhaar_number || ''
          }));
          setRetailers(mapped);
        } else {
          setRetailers(initialRetailers);
        }
      })
      .catch(err => {
        console.error("Error loading retailers from database:", err);
        setRetailers(initialRetailers);
      });

    // 2. Fetch States
    fetch('/api/states?limit=500')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setStatesList(resData.data.map(s => ({ id: s._id, name: s.name })));
        }
      })
      .catch(err => console.error("Error loading states:", err));

    // 3. Fetch Cities
    fetch('/api/cities?limit=500')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setCitiesList(resData.data.map(c => ({ id: c._id, name: c.name, stateId: c.state?._id || c.state })));
        }
      })
      .catch(err => console.error("Error loading cities:", err));

    // 4. Fetch Promoters
    fetch('/api/promoters')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setPromotersList(resData.data.map(p => ({ id: p.promoter_id || p._id, name: p.full_name || p.name })));
        }
      })
      .catch(err => console.error("Error loading promoters:", err));

    // 5. Fetch Users (filter CityManager)
    fetch('/api/users?limit=500&page=1')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          const managers = resData.data
            .filter(u => u.roleName === 'CityManager' || u.role?.name === 'CityManager')
            .map(u => ({ id: u._id, name: u.name }));
          setCityManagersList(managers);
        }
      })
      .catch(err => console.error("Error loading city managers:", err));
  }, []);

  const [activeCategoryTab, setActiveCategoryTab] = useState('All'); // All | Platinum | Gold | Silver | Standard | Pending

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingRetailer, setViewingRetailer] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    shopName: '', owner: '', email: '', mobile: '', address: '',
    state: '', city: '', category: 'Standard',
    promoter: '', cityManager: '',
    gstNo: '', panNo: '', aadhaarNo: ''
  });

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkChangeOpen, setIsBulkChangeOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('Gold');
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkManager, setBulkManager] = useState('');

  const handleStateChange = (stateId) => {
    const matchedCities = citiesList.filter(c => c.stateId === stateId);
    setFormData(prev => ({
      ...prev,
      state: stateId,
      city: matchedCities[0]?.id || ''
    }));
  };

  const handleOpenAddModal = () => {
    const firstState = statesList[0]?.id || '';
    const filteredCities = citiesList.filter(c => c.stateId === firstState);
    setFormData({
      shopName: '', owner: '', email: '', mobile: '', address: '',
      state: firstState,
      city: filteredCities[0]?.id || '',
      category: 'Standard',
      promoter: '',
      cityManager: cityManagersList[0]?.id || '',
      gstNo: '', panNo: '', aadhaarNo: ''
    });
    setIsAddOpen(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.shopName || !formData.owner || !formData.mobile) {
      showToast("Please fill all required field parameters.", "error");
      return;
    }

    fetch('/api/retailers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        business_name: formData.shopName,
        owner_name: formData.owner,
        email: formData.email,
        mobile: formData.mobile,
        shop_address: formData.address,
        state: formData.state || null,
        city: formData.city || null,
        category: formData.category,
        assigned_promoter: formData.promoter && formData.promoter !== '' ? formData.promoter : null,
        assigned_city_manager: formData.cityManager || null,
        gst_number: formData.gstNo,
        pan_number: formData.panNo,
        aadhaar_number: formData.aadhaarNo,
        is_verified: true,
        is_active: true
      })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success && resData.data) {
        const ret = resData.data;
        const newRetailer = {
          id: ret._id,
          shopName: ret.business_name,
          owner: ret.owner_name,
          email: ret.email,
          mobile: ret.mobile,
          address: ret.shop_address || '',
          state: ret.state?.name || 'Not Assigned',
          city: ret.city?.name || 'Not Assigned',
          category: ret.category || 'Standard',
          promoter: ret.assigned_promoter?.name || ret.assigned_promoter?.full_name || 'None',
          cityManager: ret.assigned_city_manager?.name || 'Not Assigned',
          ordersCount: ret.ordersCount || 0,
          revenue: ret.revenue || 0,
          status: ret.is_verified ? 'Approved' : 'Pending Verification',
          gstNo: ret.gst_number || '',
          panNo: ret.pan_number || '',
          aadhaarNo: ret.aadhaar_number || ''
        };
        setRetailers(prev => [...prev, newRetailer]);
        setIsAddOpen(false);
        showToast(`Retailer "${newRetailer.shopName}" registered successfully!`, "success");
      } else {
        showToast(resData.message || "Failed to register retailer.", "error");
      }
    })
    .catch(err => {
      console.error("Failed to save retailer:", err);
      showToast("Error registering retailer.", "error");
    });
  };

  const handleApprove = (id) => {
    fetch(`/api/retailers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_verified: true })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        setRetailers(prev => prev.map(r => r.id === id ? { ...r, status: "Approved" } : r));
        showToast("Shop registration approved and added to active channel.", "success");
      } else {
        showToast("Failed to approve retailer.", "error");
      }
    })
    .catch(err => {
      console.error("Error approving retailer:", err);
      showToast("Error approving retailer.", "error");
    });
  };

  const handleReject = (id) => {
    fetch(`/api/retailers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_verified: false, is_active: false })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        setRetailers(prev => prev.map(r => r.id === id ? { ...r, status: "Rejected" } : r));
        showToast("Shop registration rejected.", "error");
      } else {
        showToast("Failed to reject retailer.", "error");
      }
    })
    .catch(err => {
      console.error("Error rejecting retailer:", err);
      showToast("Error rejecting retailer.", "error");
    });
  };

  const handleBulkCategoryChange = () => {
    if (selectedIds.length === 0) {
      showToast("No retailers selected.", "error");
      return;
    }
    showToast(`Updating categories for ${selectedIds.length} retailers...`, "info");
    Promise.all(
      selectedIds.map(id =>
        fetch(`/api/retailers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: bulkCategory })
        }).then(res => res.json())
      )
    )
    .then(results => {
      const successfulIds = results
        .filter(res => res.success && res.data)
        .map(res => res.data._id);
      setRetailers(prev => prev.map(r => selectedIds.includes(r.id) ? { ...r, category: bulkCategory } : r));
      setSelectedIds([]);
      setIsBulkChangeOpen(false);
      showToast(`Bulk updated category for ${successfulIds.length} retailers to ${bulkCategory}.`, "success");
    })
    .catch(err => {
      console.error("Error bulk updating categories:", err);
      showToast("Error updating retailer categories.", "error");
    });
  };

  const handleBulkAssignManager = () => {
    if (selectedIds.length === 0) {
      showToast("No retailers selected.", "error");
      return;
    }
    const matchedManager = cityManagersList.find(m => m.id === bulkManager);
    const managerName = matchedManager ? matchedManager.name : 'Not Assigned';
    showToast(`Assigning manager to ${selectedIds.length} retailers...`, "info");
    Promise.all(
      selectedIds.map(id =>
        fetch(`/api/retailers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_city_manager: bulkManager })
        }).then(res => res.json())
      )
    )
    .then(results => {
      const successfulIds = results
        .filter(res => res.success && res.data)
        .map(res => res.data._id);
      setRetailers(prev => prev.map(r => selectedIds.includes(r.id) ? { ...r, cityManager: managerName } : r));
      setSelectedIds([]);
      setIsBulkAssignOpen(false);
      showToast(`Assigned manager to ${successfulIds.length} retailers.`, "success");
    })
    .catch(err => {
      console.error("Error bulk assigning manager:", err);
      showToast("Error assigning manager to retailers.", "error");
    });
  };

  const toggleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Filter criteria
  const filteredRetailers = retailers.filter(ret => {
    if (activeCategoryTab === 'Pending') {
      return ret.status === 'Pending Verification';
    }
    const matchesStatus = ret.status === 'Approved';
    const matchesCategory = activeCategoryTab === 'All' || ret.category === activeCategoryTab;
    return matchesStatus && matchesCategory;
  });

  const columns = [
    { header: "Select", accessor: "id", sortable: false, render: (val) => (
      <input 
        type="checkbox" 
        checked={selectedIds.includes(val)} 
        onChange={() => toggleSelectRow(val)}
        className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
      />
    )},
    { header: "Shop Name", accessor: "shopName", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Owner", accessor: "owner" },
    { header: "City", accessor: "city" },
    { header: "Category", accessor: "category", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        val === 'Platinum' ? 'bg-purple-50 text-purple-700 border-purple-200' :
        val === 'Gold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
        val === 'Silver' ? 'bg-slate-50 text-slate-700 border-slate-200' :
        'bg-slate-50 text-slate-500 border-slate-100'
      }`}>
        {val}
      </span>
    )},
    { header: "Assigned Promoter", accessor: "promoter" },
    { header: "City Manager", accessor: "cityManager" },
    { header: "Total Orders", accessor: "ordersCount" },
    { header: "Status", accessor: "status", render: (val, row) => {
      if (val === 'Pending Verification') {
        return (
          <div className="flex gap-2">
            <button onClick={() => handleApprove(row.id)} className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Approve</button>
            <button onClick={() => handleReject(row.id)} className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Reject</button>
          </div>
        );
      }
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${val === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {val}
        </span>
      );
    }},
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <button onClick={() => setViewingRetailer(row)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors" title="Inspect Shop Profile">
        <Eye className="w-4 h-4" />
      </button>
    )}
  ];

  // Mock Retailer sales growth chart data
  const mockRetailerChartData = [
    { month: 'Jan', sales: 120000 },
    { month: 'Feb', sales: 250000 },
    { month: 'Mar', sales: 180000 },
    { month: 'Apr', sales: 340000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Retailer Management</h1>
          <p className="text-sm text-slate-500">Monitor shop tiers, assign local field managers, verify pending dealer registrations, and audit order metrics.</p>
        </div>
        
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Register Retailer Shop</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        {['All', 'Platinum', 'Gold', 'Silver', 'Standard', 'Pending'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveCategoryTab(tab); setSelectedIds([]); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeCategoryTab === tab ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab} {tab === 'Pending' ? `(${retailers.filter(r => r.status === 'Pending Verification').length})` : ''}
          </button>
        ))}
      </div>

      {/* Bulk actions controls */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between shadow-md">
          <span className="text-xs font-semibold">{selectedIds.length} retailers selected for bulk updates</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsBulkChangeOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded border border-slate-700 transition-colors"
            >
              Change Tier Category
            </button>
            <button 
              onClick={() => {
                setBulkManager(cityManagersList[0]?.id || '');
                setIsBulkAssignOpen(true);
              }}
              className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-xs font-bold rounded transition-colors"
            >
              Assign Local Manager
            </button>
          </div>
        </div>
      )}

      {/* Retailers table */}
      <DataTable 
        columns={columns} 
        data={filteredRetailers}
        searchKeys={["shopName", "owner", "city", "state", "promoter", "cityManager"]}
        searchPlaceholder="Search by shop name, owner, city or managers..."
      />

      {/* Add Retailer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Retailer Shop"
        onConfirm={handleAddSubmit}
      >
        <form className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Business / Shop Name *</label>
            <input type="text" placeholder="Metro Footwear" value={formData.shopName} onChange={(e) => setFormData({...formData, shopName: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Owner Full Name *</label>
              <input type="text" placeholder="Mukesh Patel" value={formData.owner} onChange={(e) => setFormData({...formData, owner: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Mobile Number *</label>
              <input type="text" placeholder="981234xxxx" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Email Address</label>
              <input type="email" placeholder="mukesh@metro.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">GST Identification No</label>
              <input type="text" placeholder="24DDDDD4444D4Z4" value={formData.gstNo} onChange={(e) => setFormData({...formData, gstNo: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Shop Address</label>
            <textarea rows="2" placeholder="Suite details, Local bazaar..." value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">State Allocation</label>
              <select value={formData.state} onChange={(e) => handleStateChange(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white">
                {statesList.length === 0 && <option value="">No States Found</option>}
                {statesList.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">City Location</label>
              <select value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white">
                {citiesList.filter(c => c.stateId === formData.state).length === 0 && <option value="">No Cities Found</option>}
                {citiesList.filter(c => c.stateId === formData.state).map(ct => (
                  <option key={ct.id} value={ct.id}>{ct.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Category Tier</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full text-[11px] border border-slate-200 rounded p-1.5 bg-white">
                <option value="Platinum">Platinum</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Promoter</label>
              <select value={formData.promoter} onChange={(e) => setFormData({...formData, promoter: e.target.value})} className="w-full text-[11px] border border-slate-200 rounded p-1.5 bg-white">
                <option value="">None</option>
                {promotersList.map(pr => (
                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">City Manager</label>
              <select value={formData.cityManager} onChange={(e) => setFormData({...formData, cityManager: e.target.value})} className="w-full text-[11px] border border-slate-200 rounded p-1.5 bg-white">
                {cityManagersList.length === 0 && <option value="">No Managers Found</option>}
                {cityManagersList.map(mgr => (
                  <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Bulk Change Category Modal */}
      <Modal
        isOpen={isBulkChangeOpen}
        onClose={() => setIsBulkChangeOpen(false)}
        title="Bulk Change Tier Category"
        onConfirm={handleBulkCategoryChange}
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-500 uppercase">Select Target Tier</label>
          <select 
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
          >
            <option value="Platinum">Platinum</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Standard">Standard</option>
          </select>
        </div>
      </Modal>

      {/* Bulk Assign Manager Modal */}
      <Modal
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        title="Bulk Assign Local Manager"
        onConfirm={handleBulkAssignManager}
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-500 uppercase">Select City Manager</label>
          <select 
            value={bulkManager}
            onChange={(e) => setBulkManager(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
          >
            {cityManagersList.map(mgr => (
              <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Detailed Retailer view drawer */}
      {viewingRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-200 rounded-full">{viewingRetailer.category} Category</span>
                <h3 className="text-lg font-bold text-slate-900 font-display mt-1">{viewingRetailer.shopName}</h3>
                <p className="text-xs text-slate-500">Owner: {viewingRetailer.owner} • {viewingRetailer.city}, {viewingRetailer.state}</p>
              </div>
              <button onClick={() => setViewingRetailer(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile specifications */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" /> Business Profile & Documents</h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                  <div><span className="text-slate-400 font-medium">GST Identification No</span><p className="font-bold text-slate-800">{viewingRetailer.gstNo || "27ABCDE1234F1Z0"}</p></div>
                  <div><span className="text-slate-400 font-medium">PAN Number</span><p className="font-bold text-slate-800">{viewingRetailer.panNo || "ABCDE1234F"}</p></div>
                  <div><span className="text-slate-400 font-medium">Aadhaar Card No</span><p className="font-bold text-slate-800">{viewingRetailer.aadhaarNo || "xxxx-xxxx-xxxx"}</p></div>
                  <div><span className="text-slate-400 font-medium">Mobile Contact</span><p className="font-bold text-slate-800">{viewingRetailer.mobile}</p></div>
                </div>
                <div className="text-xs border-t border-slate-200/50 pt-2 text-slate-600">
                  <span className="text-slate-400 font-medium">Registered Outlet Address: </span>
                  <p className="font-semibold text-slate-800 mt-0.5">{viewingRetailer.address}, {viewingRetailer.city}</p>
                </div>
              </div>

              {/* Sales growth line chart */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Outlet Monthly Sales Performance (₹)</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockRetailerChartData} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" />
                      <YAxis fontSize={10} stroke="#94a3b8" />
                      <Tooltip />
                      <Line type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2} activeDot={{ r: 6 }} name="Sales (₹)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Order History Preview</h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Order ID</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Invoice Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-2.5 text-slate-900 font-bold">ORD-9281</td>
                        <td className="px-4 py-2.5 text-slate-400">2026-06-01</td>
                        <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px]">Delivered</span></td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹85,000</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-900 font-bold">ORD-5509</td>
                        <td className="px-4 py-2.5 text-slate-400">2026-06-08</td>
                        <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded text-[9px]">Submitted</span></td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹1,50,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Communication timeline */}
              <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-slate-400" /> Communication Log</h4>
                <div className="relative border-l-2 border-slate-200 pl-4 space-y-4 text-xs font-semibold text-slate-700">
                  <div className="relative">
                    <span className="absolute -left-[22px] top-1 w-2.5 h-2.5 bg-brand-orange border-2 border-white rounded-full"></span>
                    <span className="text-[10px] text-slate-400">2026-06-08 11:30 AM</span>
                    <p className="text-slate-800 font-bold">Sales rep visit by Amit Kumar</p>
                    <p className="text-slate-500 font-normal">Collected cheque for outstanding invoice INV-2026-001. Shop owner requested catalogues for new sports shoes.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[22px] top-1 w-2.5 h-2.5 bg-slate-300 border-2 border-white rounded-full"></span>
                    <span className="text-[10px] text-slate-400">2026-06-05 03:00 PM</span>
                    <p className="text-slate-800 font-bold">Outstanding Payment Reminder Sent</p>
                    <p className="text-slate-500 font-normal">System generated auto-whatsapp alert sent regarding pending invoice amount ₹97,960.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
