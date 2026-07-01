import React, { useState, useEffect } from 'react';
import { GitBranch, MapPin, Award, User, Layers, Plus, ExternalLink, ShieldAlert } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';

export default function Hierarchy({ showToast, userRole }) {
  const [activeTab, setActiveTab] = useState('tree'); // tree | countries | states | cities
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState(''); // Country | State | City
  const [formData, setFormData] = useState({ name: '', code: '', manager: '', parent: '', stateName: '', countryName: '' });

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null); // { type, name, currentManager }
  const [assignedManagerName, setAssignedManagerName] = useState('');

  // Edit Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { id, type, name, code, manager }
  const [editFormData, setEditFormData] = useState({ name: '', code: '', manager: '' });

  // Node expand state in the visual tree
  const [expandedNodes, setExpandedNodes] = useState({ founder: true, country: true, state: true });

  // CEO state
  const [ceoManager, setCeoManager] = useState("Not Assigned");

  // State / City revenues loaded from GET API endpoints
  const [stateRevenues, setStateRevenues] = useState({});
  const [cityRevenues, setCityRevenues] = useState({});

  const loadHierarchy = () => {
    fetch('/api/countries')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setCountries(resData.data.map(c => ({
            id: c._id,
            name: c.name,
            code: c.code,
            manager: c.manager?.full_name || c.manager?.name || (typeof c.manager === 'string' ? c.manager : 'Not Assigned'),
            managerId: c.manager?._id || c.manager,
            statesCount: c.statesCount || 0,
            retailersCount: c.retailersCount || 0,
            revenue: c.revenue || 0
          })));
        }
      })
      .catch(err => console.error("Error loading countries:", err));

    fetch('/api/states')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setStates(resData.data.map(s => ({
            id: s._id,
            name: s.name,
            country: s.country?.name || (typeof s.country === 'string' ? s.country : 'India'),
            countryId: s.country?._id || s.country,
            manager: s.manager?.full_name || s.manager?.name || (typeof s.manager === 'string' ? s.manager : 'Not Assigned'),
            managerId: s.manager?._id || s.manager,
            citiesCount: s.citiesCount || 0,
            retailersCount: s.retailersCount || 0,
            revenue: s.revenue || 0
          })));
        }
      })
      .catch(err => console.error("Error loading states:", err));

    fetch('/api/cities')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setCities(resData.data.map(ct => ({
            id: ct._id,
            name: ct.name,
            state: ct.state?.name || (typeof ct.state === 'string' ? ct.state : 'Maharashtra'),
            stateId: ct.state?._id || ct.state,
            manager: ct.manager?.full_name || ct.manager?.name || (typeof ct.manager === 'string' ? ct.manager : 'Not Assigned'),
            managerId: ct.manager?._id || ct.manager,
            retailersCount: ct.retailersCount || 0,
            revenue: ct.revenue || 0
          })));
        }
      })
      .catch(err => console.error("Error loading cities:", err));
  };

  useEffect(() => {
    loadHierarchy();

    fetch('/api/employees')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setEmployees(resData.data);
        }
      })
      .catch(err => console.error("Error loading employees:", err));

    fetch('/api/users')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setUsers(resData.data);
        }
      })
      .catch(err => console.error("Error loading users:", err));
  }, []);

  useEffect(() => {
    const empCeo = employees.find(emp => 
      emp.designation?.title === 'CEO' || 
      emp.user?.role?.name === 'CEO' ||
      (typeof emp.designation === 'object' && emp.designation?.title === 'CEO')
    );
    const userCeo = users.find(u => 
      u.role?.name === 'CEO' || 
      u.roleName === 'CEO'
    );
    
    if (empCeo) {
      setCeoManager(empCeo.full_name || empCeo.name);
    } else if (userCeo) {
      setCeoManager(userCeo.name);
    } else {
      setCeoManager("Not Assigned");
    }
  }, [employees, users]);

  useEffect(() => {
    // Fetch state revenues
    states.forEach(st => {
      fetch(`/api/hierarchy/state/${st.id}/revenue`)
        .then(res => res.json())
        .then(data => {
          setStateRevenues(prev => ({ ...prev, [st.id]: data.revenue }));
        })
        .catch(err => console.error("Error fetching state revenue", err));
    });

    // Fetch city revenues
    cities.forEach(ct => {
      fetch(`/api/hierarchy/city/${ct.id}/revenue`)
        .then(res => res.json())
        .then(data => {
          setCityRevenues(prev => ({ ...prev, [ct.id]: data.revenue }));
        })
        .catch(err => console.error("Error fetching city revenue", err));
    });
  }, [states, cities]);

  const getManagerOptions = (type) => {
    const normalizedType = (type || '').toLowerCase();
    
    // 1. Check users list
    const filteredUsers = users.filter(u => {
      const roleName = u.role?.name || u.roleName || '';
      const designationName = u.designationName || u.designation?.title || '';
      
      if (normalizedType === 'country') {
        return roleName.toLowerCase() === 'countrymanager' || 
               roleName.toLowerCase() === 'country manager' ||
               designationName.toLowerCase() === 'country manager';
      }
      if (normalizedType === 'state') {
        return roleName.toLowerCase() === 'statemanager' || 
               roleName.toLowerCase() === 'state manager' ||
               designationName.toLowerCase() === 'state manager';
      }
      if (normalizedType === 'city') {
        return roleName.toLowerCase() === 'citymanager' || 
               roleName.toLowerCase() === 'city manager' ||
               designationName.toLowerCase() === 'city manager';
      }
      if (normalizedType === 'ceo') {
        return true;
      }
      return false;
    });

    // 2. Check employees list
    const filteredEmployees = employees.filter(emp => {
      const roleName = emp.user?.role?.name || emp.user?.roleName || '';
      const designationName = emp.designation?.title || '';
      
      if (normalizedType === 'country') {
        return designationName.toLowerCase() === 'country manager' || 
               roleName.toLowerCase() === 'countrymanager' ||
               roleName.toLowerCase() === 'country manager';
      }
      if (normalizedType === 'state') {
        return designationName.toLowerCase() === 'state manager' || 
               roleName.toLowerCase() === 'statemanager' ||
               roleName.toLowerCase() === 'state manager';
      }
      if (normalizedType === 'city') {
        return designationName.toLowerCase() === 'city manager' || 
               roleName.toLowerCase() === 'citymanager' ||
               roleName.toLowerCase() === 'city manager';
      }
      if (normalizedType === 'ceo') {
        return true;
      }
      return false;
    });

    const map = new Map();
    filteredUsers.forEach(u => {
      map.set(u._id, { _id: u._id, name: u.name });
    });
    filteredEmployees.forEach(emp => {
      const id = emp.user?._id || emp._id;
      map.set(id, { _id: id, name: emp.full_name || emp.name });
    });

    return Array.from(map.values());
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToast("Please enter a name.", "error");
      return;
    }

    const selectedUserObj = users.find(u => u.name === formData.manager);
    const selectedEmpObj = employees.find(emp => (emp.full_name || emp.name) === formData.manager);
    const managerId = selectedUserObj?._id || selectedEmpObj?.user?._id || selectedEmpObj?.user || null;

    if (addType === 'Country') {
      const countryCode = formData.code?.trim() || formData.name.slice(0, 3).toUpperCase();
      const payload = { name: formData.name, code: countryCode, manager: managerId };
      fetch('/api/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast("Country added successfully.", "success");
            loadHierarchy();
            setIsAddOpen(false);
            setFormData({ name: '', code: '', manager: '', parent: '', stateName: '', countryName: '' });
          } else {
            showToast(resData.message || "Error adding country.", "error");
          }
        })
        .catch(err => console.error(err));
    } else if (addType === 'State') {
      const parentCountryObj = countries.find(c => c.name === formData.countryName) || countries[0];
      if (!parentCountryObj) {
        showToast("Please select a valid Country first.", "error");
        return;
      }
      const payload = { name: formData.name, country: parentCountryObj.id, manager: managerId };
      fetch('/api/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast("State added successfully.", "success");
            loadHierarchy();
            setIsAddOpen(false);
            setFormData({ name: '', code: '', manager: '', parent: '', stateName: '', countryName: '' });
          } else {
            showToast(resData.message || "Error adding state.", "error");
          }
        })
        .catch(err => console.error(err));
    } else if (addType === 'City') {
      const parentStateObj = states.find(s => s.name === formData.stateName) || states[0];
      if (!parentStateObj) {
        showToast("Please select a valid State first.", "error");
        return;
      }
      const payload = { name: formData.name, state: parentStateObj.id, manager: managerId };
      fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast("City added successfully.", "success");
            loadHierarchy();
            setIsAddOpen(false);
            setFormData({ name: '', code: '', manager: '', parent: '', stateName: '', countryName: '' });
          } else {
            showToast(resData.message || "Error adding city.", "error");
          }
        })
        .catch(err => console.error(err));
    }
  };

  const handleAssignManager = (e) => {
    e.preventDefault();
    if (!assignedManagerName) return;

    const selectedUserObj = users.find(u => u.name === assignedManagerName);
    const selectedEmpObj = employees.find(emp => (emp.full_name || emp.name) === assignedManagerName);
    const managerId = selectedUserObj?._id || selectedEmpObj?.user?._id || selectedEmpObj?.user || null;

    if (assignTarget.type === 'CEO') {
      if (!managerId) {
        showToast("Could not resolve manager ID.", "error");
        return;
      }

      // Find any current CEOs in the users list
      const currentCeos = users.filter(u => u.role?.name === 'CEO' || u.roleName === 'CEO');
      
      // Demote them to TeamMember
      const demotePromises = currentCeos.map(u => 
        fetch(`/api/users/${u._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleName: 'TeamMember' })
        }).then(res => res.json())
      );

      Promise.all(demotePromises)
        .then(() => {
          // Promote the new CEO
          return fetch(`/api/users/${managerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleName: 'CEO' })
          });
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast(`Assigned ${assignedManagerName} as CEO.`, "success");
            setCeoManager(assignedManagerName);
            setIsAssignOpen(false);
            
            // Reload users & employees to reflect changes
            fetch('/api/users')
              .then(res => res.json())
              .then(data => {
                if (data.success && Array.isArray(data.data)) {
                  setUsers(data.data);
                }
              });
            fetch('/api/employees')
              .then(res => res.json())
              .then(data => {
                if (data.success && Array.isArray(data.data)) {
                  setEmployees(data.data);
                }
              });
          } else {
            showToast(resData.message || "Failed to promote user to CEO.", "error");
          }
        })
        .catch(err => {
          console.error("Error setting CEO manager:", err);
          showToast("Failed to assign CEO manager.", "error");
        });
    } else {
      let endpoint = '';
      if (assignTarget.type === 'Country') endpoint = `/api/countries/${assignTarget.id}`;
      else if (assignTarget.type === 'State') endpoint = `/api/states/${assignTarget.id}`;
      else if (assignTarget.type === 'City') endpoint = `/api/cities/${assignTarget.id}`;

      fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager: managerId })
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast(`Assigned ${assignedManagerName} as ${assignTarget.type} Manager.`, "success");
            loadHierarchy();
            setIsAssignOpen(false);
          } else {
            showToast(resData.message || "Assignment failed.", "error");
          }
        })
        .catch(err => console.error(err));
    }
  };

  const triggerAssign = (row, type) => {
    setAssignTarget({ id: row.id, type, name: row.name, currentManager: row.manager });
    setAssignedManagerName(row.manager);
    setIsAssignOpen(true);
  };

  const triggerEdit = (row, type) => {
    setEditTarget({ id: row.id, type, name: row.name, code: row.code, manager: row.manager });
    setEditFormData({ name: row.name, code: row.code || '', manager: row.manager });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editFormData.name) {
      showToast("Please complete the form.", "error");
      return;
    }

    const selectedUserObj = users.find(u => u.name === editFormData.manager);
    const selectedEmpObj = employees.find(emp => (emp.full_name || emp.name) === editFormData.manager);
    const managerId = selectedUserObj?._id || selectedEmpObj?.user?._id || selectedEmpObj?.user || null;

    let endpoint = '';
    if (editTarget.type === 'Country') endpoint = `/api/countries/${editTarget.id}`;
    else if (editTarget.type === 'State') endpoint = `/api/states/${editTarget.id}`;
    else if (editTarget.type === 'City') endpoint = `/api/cities/${editTarget.id}`;

    const payload = { name: editFormData.name, manager: managerId };
    if (editTarget.type === 'Country') {
      payload.code = editFormData.code?.trim() || editTarget.code;
    }

    fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(`${editTarget.type} updated successfully.`, "success");
          loadHierarchy();
          setIsEditOpen(false);
        } else {
          showToast(resData.message || "Failed to update.", "error");
        }
      })
      .catch(err => console.error(err));
  };

  // Define Columns
  const countryColumns = [
    { header: "Country", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Country Manager", accessor: "manager", render: (val) => <span className="font-medium text-slate-700 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{val}</span> },
    { header: "Total States", accessor: "statesCount" },
    { header: "Mapped Retailers", accessor: "retailersCount" },
    ...(userRole === 'CEO' ? [] : [{ header: "Annual Revenue", accessor: "revenue", render: (val) => <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span> }]),
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button onClick={() => triggerAssign(row, 'Country')} className="text-xs font-bold text-brand-orange hover:underline">Assign Manager</button>
        <button onClick={() => triggerEdit(row, 'Country')} className="text-xs font-bold text-slate-500 hover:underline">Edit</button>
      </div>
    )}
  ];

  const stateColumns = [
    { header: "State / UT", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Country Link", accessor: "country" },
    { header: "State Manager", accessor: "manager", render: (val) => <span className="font-medium text-slate-700 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{val}</span> },
    { header: "Total Cities", accessor: "citiesCount" },
    { header: "Retailers", accessor: "retailersCount" },
    ...(userRole === 'CEO' ? [] : [{ 
      header: "Revenue", 
      accessor: "id", 
      render: (val, row) => {
        const rev = stateRevenues[val];
        return rev !== undefined ? (
          <span className="font-bold text-slate-900">₹{rev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        ) : (
          <span className="text-slate-400 font-medium">—</span>
        );
      } 
    }]),
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button onClick={() => triggerAssign(row, 'State')} className="text-xs font-bold text-brand-orange hover:underline">Assign Manager</button>
        <button onClick={() => triggerEdit(row, 'State')} className="text-xs font-bold text-slate-500 hover:underline">Edit</button>
      </div>
    )}
  ];

  const cityColumns = [
    { header: "City", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "State Region", accessor: "state" },
    { header: "City Manager", accessor: "manager", render: (val) => <span className="font-medium text-slate-700 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{val}</span> },
    { header: "Retailers", accessor: "retailersCount" },
    ...(userRole === 'CEO' ? [] : [{ 
      header: "Revenue", 
      accessor: "id", 
      render: (val, row) => {
        const rev = cityRevenues[val];
        return rev !== undefined ? (
          <span className="font-bold text-slate-900">₹{rev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        ) : (
          <span className="text-slate-400 font-medium">—</span>
        );
      } 
    }]),
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button onClick={() => triggerAssign(row, 'City')} className="text-xs font-bold text-brand-orange hover:underline">Assign Manager</button>
        <button onClick={() => triggerEdit(row, 'City')} className="text-xs font-bold text-slate-500 hover:underline">Edit</button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Organizational Hierarchy</h1>
          <p className="text-sm text-slate-500">Configure distribution tiers, map geographic layers, and delegate managerial coverage controls.</p>
        </div>
        
        {activeTab !== 'tree' && (
          <button 
            onClick={() => {
              setAddType(activeTab === 'countries' ? 'Country' : activeTab === 'states' ? 'State' : 'City');
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add {activeTab === 'countries' ? 'Country' : activeTab === 'states' ? 'State' : 'City'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button 
          onClick={() => setActiveTab('tree')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'tree' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Visual Hierarchy Tree
        </button>
        <button 
          onClick={() => setActiveTab('countries')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'countries' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Countries List ({countries.length})
        </button>
        <button 
          onClick={() => setActiveTab('states')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'states' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          States / Regions ({states.length})
        </button>
        <button 
          onClick={() => setActiveTab('cities')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'cities' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Cities Database ({cities.length})
        </button>
      </div>

      {/* Contents */}
      {activeTab === 'tree' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs flex flex-col items-center">
          <h2 className="text-lg font-bold text-slate-800 font-display mb-6">Interactive Channel Node Mapping</h2>
          
          <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
            {/* FOUNDER */}
            <div className="flex flex-col items-center">
              <div className="bg-brand-dark text-white px-6 py-3 rounded-lg border-2 border-brand-orange shadow-md text-center">
                <span className="text-[10px] uppercase font-bold text-brand-orange">Founder</span>
                <h4 className="font-bold text-sm font-display mt-0.5">Rohan Hudda</h4>
                <p className="text-[10px] text-slate-400">Owner side controls active</p>
              </div>
              <div className="w-0.5 h-6 bg-slate-300"></div>
            </div>

            {/* CEO */}
            <div className="flex flex-col items-center w-full">
              <div className="bg-slate-800 text-white px-6 py-3 rounded-lg border border-slate-700 shadow-md text-center relative group w-64">
                <span className="text-[9px] uppercase font-bold text-emerald-400">CEO</span>
                <h4 className="font-bold text-sm font-display mt-0.5">{ceoManager}</h4>
                <p className="text-[10px] text-slate-400">Coverage: Global Operations</p>
                <button 
                  onClick={() => triggerAssign({ id: 'ceo', name: 'CEO', manager: ceoManager }, 'CEO')} 
                  className="hidden group-hover:block absolute right-2 top-2 text-[10px] bg-brand-orange text-white px-1.5 py-0.5 rounded font-bold"
                >
                  Assign
                </button>
              </div>
            </div>

            {/* CEO to Countries Connection Line */}
            {countries.length > 0 && <div className="w-0.5 h-6 bg-slate-300"></div>}

            {/* Countries Grid */}
            {countries.length === 0 ? (
              <div className="flex flex-col items-center w-full">
                <div className="bg-slate-900 text-white px-6 py-3 rounded-lg border border-slate-700 shadow-md text-center relative group w-64">
                  <span className="text-[9px] uppercase font-bold text-blue-400">
                    Country Manager (Not Configured)
                  </span>
                  <h4 className="font-bold font-display mt-0.5 huddo-v2-country-node-label">Not Assigned</h4>
                  <p className="text-[10px] text-slate-400">Coverage: 0 Active States</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full justify-items-center">
                {countries.map(country => {
                  const countryStates = states.filter(s => s.countryId === country.id || s.country === country.name);
                  return (
                    <div key={country.id} className="flex flex-col items-center w-full border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 max-w-xl">
                      <div className="bg-slate-900 text-white px-6 py-3 rounded-lg border border-slate-700 shadow-md text-center relative group w-64">
                        <span className="text-[9px] uppercase font-bold text-blue-400">
                          Country Manager ({country.name})
                        </span>
                        <h4 className="font-bold font-display mt-0.5 huddo-v2-country-node-label">{country.manager || "Not Assigned"}</h4>
                        <p className="text-[10px] text-slate-400">Coverage: {countryStates.length} Active States</p>
                        <div className="hidden group-hover:flex gap-1 absolute right-2 top-2">
                          <button 
                            onClick={() => triggerAssign(country, 'Country')} 
                            className="text-[9px] bg-brand-orange text-white px-1.5 py-0.5 rounded font-bold hover:bg-brand-orange-hover transition-colors"
                          >
                            Assign
                          </button>
                          <button 
                            onClick={() => triggerEdit(country, 'Country')} 
                            className="text-[9px] bg-slate-700 text-white px-1.5 py-0.5 rounded font-bold hover:bg-slate-600 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      
                      {/* States under this Country */}
                      {countryStates.length > 0 && (
                        <>
                          <div className="w-0.5 h-6 bg-slate-300"></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full justify-items-center">
                            {countryStates.map(st => {
                              const stateCities = cities.filter(ct => ct.stateId === st.id || ct.state === st.name);
                              return (
                                <div key={st.id} className="flex flex-col items-center w-full">
                                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm w-full text-center relative group">
                                    <span className="text-[9px] uppercase font-bold text-slate-500">State Manager ({st.name})</span>
                                    <h4 className="font-bold text-slate-800 font-display mt-0.5 huddo-v2-state-node-label">{st.manager}</h4>
                                    <p className="text-[10px] text-slate-400">{st.citiesCount} Cities Managed</p>
                                    <div className="hidden group-hover:flex gap-1 absolute right-2 top-2">
                                      <button 
                                        onClick={() => triggerAssign(st, 'State')} 
                                        className="text-[9px] bg-brand-orange text-white px-1.5 py-0.5 rounded font-bold hover:bg-brand-orange-hover transition-colors"
                                      >
                                        Assign
                                      </button>
                                      <button 
                                        onClick={() => triggerEdit(st, 'State')} 
                                        className="text-[9px] bg-slate-700 text-white px-1.5 py-0.5 rounded font-bold hover:bg-slate-600 transition-colors"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Cities under this State */}
                                  {stateCities.length > 0 && (
                                    <>
                                      <div className="w-0.5 h-6 bg-slate-300"></div>
                                      <div className="space-y-3 w-full max-w-[180px]">
                                        {stateCities.map(ct => (
                                          <div key={ct.id} className="bg-orange-50/50 border border-orange-200 p-3 rounded-lg text-center relative group">
                                            <span className="text-[8px] uppercase font-bold text-brand-orange">City Manager ({ct.name})</span>
                                            <h5 className="font-bold text-slate-800 font-display mt-0.5 huddo-v2-city-node-label">{ct.manager}</h5>
                                            <p className="text-[9px] text-slate-500">{ct.retailersCount || 0} Retailers</p>
                                            <div className="hidden group-hover:flex gap-1 absolute right-2 top-2">
                                              <button 
                                                onClick={() => triggerAssign(ct, 'City')} 
                                                className="text-[8px] bg-brand-orange text-white px-1.5 py-0.5 rounded font-bold hover:bg-brand-orange-hover transition-colors"
                                              >
                                                Assign
                                              </button>
                                              <button 
                                                onClick={() => triggerEdit(ct, 'City')} 
                                                className="text-[8px] bg-slate-700 text-white px-1.5 py-0.5 rounded font-bold hover:bg-slate-600 transition-colors"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'countries' ? (
        <DataTable 
          columns={countryColumns} 
          data={countries} 
          searchKeys={["name", "manager"]} 
          searchPlaceholder="Search countries..."
        />
      ) : activeTab === 'states' ? (
        <DataTable 
          columns={stateColumns} 
          data={states} 
          searchKeys={["name", "country", "manager"]} 
          searchPlaceholder="Search states..."
        />
      ) : (
        <DataTable 
          columns={cityColumns} 
          data={cities} 
          searchKeys={["name", "state", "manager"]} 
          searchPlaceholder="Search cities..."
        />
      )}

      {/* Add Geo Level Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={`Add New ${addType}`}
        onConfirm={handleAddSubmit}
      >
        <form className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{addType} Name</label>
            <input 
              type="text" 
              placeholder={`e.g., ${addType === 'Country' ? 'Nepal' : addType === 'State' ? 'Rajasthan' : 'Jaipur'}`}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
            />
          </div>

          {addType === 'Country' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country Code</label>
              <input 
                type="text" 
                placeholder="e.g., IN, NP, US"
                value={formData.code || ''}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
              />
            </div>
          )}

          {addType === 'State' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parent Country</label>
              <select 
                value={formData.countryName}
                onChange={(e) => setFormData({...formData, countryName: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
              >
                <option value="">Select country...</option>
                {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          {addType === 'City' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parent State</label>
              <select 
                value={formData.stateName}
                onChange={(e) => setFormData({...formData, stateName: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
              >
                <option value="">Select state...</option>
                {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign {addType} Manager</label>
            <select 
              value={formData.manager}
              onChange={(e) => setFormData({...formData, manager: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
            >
              <option value="">Select Manager...</option>
              {getManagerOptions(addType).map(opt => (
                <option key={opt._id} value={opt.name}>{opt.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Assign Manager Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Assign Manager to ${assignTarget?.name}`}
        onConfirm={handleAssignManager}
      >
        <div className="space-y-4 text-left">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2.5 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Updating the assigned manager transfers control privileges for that region immediately. Please confirm details.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Manager Name</label>
            <select 
              value={assignedManagerName}
              onChange={(e) => setAssignedManagerName(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
            >
              <option value="">Select Manager...</option>
              {getManagerOptions(assignTarget?.type).map(opt => (
                <option key={opt._id} value={opt.name}>{opt.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit Geo Level Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit ${editTarget?.type}: ${editTarget?.name}`}
        onConfirm={handleEditSubmit}
      >
        <form className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{editTarget?.type} Name</label>
            <input 
              type="text" 
              value={editFormData.name}
              onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
            />
          </div>

          {editTarget?.type === 'Country' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country Code</label>
              <input 
                type="text" 
                value={editFormData.code || ''}
                onChange={(e) => setEditFormData({...editFormData, code: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Manager</label>
            <select 
              value={editFormData.manager}
              onChange={(e) => setEditFormData({...editFormData, manager: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
            >
              <option value="">Select Manager...</option>
              {getManagerOptions(editTarget?.type).map(opt => (
                <option key={opt._id} value={opt.name}>{opt.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

    </div>
  );
}
