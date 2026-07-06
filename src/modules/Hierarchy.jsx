import React, { useState, useEffect } from 'react';
import { GitBranch, MapPin, Award, User, Layers, Plus, ExternalLink, ShieldAlert } from 'lucide-react';
import { DataTable, Modal, DefaultPasswordNotice } from '../components/Common';
import GeoCascadeSelect from '../components/GeoCascadeSelect';
import { confirmGeoCreation, fetchGeoCreationPreview } from '../utils/geoPreview';
import { useConfirm } from '../context/ConfirmContext';
import { getUserCreatedMessage } from '../constants/defaultCredentials';

export default function Hierarchy({ showToast, userRole }) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('tree'); // tree | countries | states | cities
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState(''); // Country | State | City
  const [formData, setFormData] = useState({
    manager: '',
    country_name: '',
    state_name: '',
    city_name: '',
    country_iso: ''
  });

  const emptyGeoForm = () => ({
    manager: '',
    country_name: '',
    state_name: '',
    city_name: '',
    country_iso: ''
  });

  const hierarchyGeoRole = addType === 'Country'
    ? 'HierarchyCountry'
    : addType === 'State'
      ? 'HierarchyState'
      : 'HierarchyCity';

  const previewRoleForAdd = addType === 'Country'
    ? 'CountryManager'
    : addType === 'State'
      ? 'StateManager'
      : 'CityManager';

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
  const [assignedManagers, setAssignedManagers] = useState([]);
  const [ceoCandidates, setCeoCandidates] = useState([]);
  const [assignMode, setAssignMode] = useState('select');
  const [newManagerUser, setNewManagerUser] = useState({ name: '', email: '', mobile: '' });
  const [assignLoading, setAssignLoading] = useState(false);

  // State / City revenues loaded from GET API endpoints
  const [stateRevenues, setStateRevenues] = useState({});
  const [cityRevenues, setCityRevenues] = useState({});

  const loadHierarchy = () => {
    fetch('/api/countries?limit=500')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setCountries(resData.data.map(c => ({
            id: c._id,
            name: c.name,
            code: c.code,
            manager: c.manager?.full_name || c.manager?.name || (typeof c.manager === 'string' ? c.manager : 'Not Assigned'),
            managerId: c.manager?._id || c.manager,
            statesCount: c.statesCount ?? 0,
            retailersCount: c.retailersCount ?? 0,
            revenue: c.revenue || 0
          })));
        }
      })
      .catch(err => console.error("Error loading countries:", err));

    fetch('/api/states?limit=500')
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
            citiesCount: s.citiesCount ?? 0,
            retailersCount: s.retailersCount ?? 0,
            revenue: s.revenue || 0
          })));
        }
      })
      .catch(err => console.error("Error loading states:", err));

    fetch('/api/cities?limit=500')
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
            retailersCount: ct.retailersCount ?? 0,
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

    fetch('/api/users?limit=500&page=1')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setUsers(resData.data);
        }
      })
      .catch(err => console.error("Error loading users:", err));

    fetch('/api/hierarchy/ceo-candidates')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setCeoCandidates(resData.data);
        }
      })
      .catch(err => console.error("Error loading CEO candidates:", err));

    fetch('/api/hierarchy/assigned-managers')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setAssignedManagers(resData.data);
        }
      })
      .catch(err => console.error("Error loading assigned managers:", err));
  }, []);

  useEffect(() => {
    const empCeo = employees.find(emp => 
      emp.designation?.title === 'CEO' || 
      emp.user?.role?.name === 'CEO' ||
      (typeof emp.designation === 'object' && emp.designation?.title === 'CEO')
    );

    const ceoUsers = ceoCandidates.length > 0
      ? ceoCandidates
      : users.filter(u =>
          u.role?.name === 'CEO' ||
          u.roleName === 'CEO' ||
          (u.designationName || '').toLowerCase() === 'ceo'
        );

    const activeCeoUser = ceoUsers[0];
    const userCeo = users.find(u => 
      u.role?.name === 'CEO' || 
      u.roleName === 'CEO'
    );
    
    if (activeCeoUser) {
      setCeoManager(activeCeoUser.name);
    } else if (empCeo) {
      setCeoManager(empCeo.full_name || empCeo.name);
    } else if (userCeo) {
      setCeoManager(userCeo.name);
    } else {
      setCeoManager("Not Assigned");
    }
  }, [employees, users, ceoCandidates]);

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

  const getRoleNameForType = (type) => {
    const map = {
      CEO: 'CEO',
      Country: 'CountryManager',
      State: 'StateManager',
      City: 'CityManager'
    };
    return map[type] || 'TeamMember';
  };

  const isUserAssignedElsewhere = (userId, currentTarget = null) => {
    if (!userId) return false;
    const normalizedId = userId?.toString?.() || userId;
    const assignment = assignedManagers.find(
      (item) => (item.user_id?.toString?.() || item.user_id) === normalizedId
    );
    if (!assignment) return false;
    if (!currentTarget) return true;
    return !(
      assignment.type === currentTarget.type &&
      (assignment.entityId?.toString?.() || assignment.entityId) === (currentTarget.id?.toString?.() || currentTarget.id)
    );
  };

  const getManagerOptions = (type, currentTarget = null) => {
    const normalizedType = (type || '').toLowerCase();

    if (normalizedType === 'ceo') {
      const map = new Map();
      ceoCandidates.forEach((u) => {
        map.set(u._id?.toString(), { _id: u._id, name: u.name });
      });
      users
        .filter((u) => {
          const roleName = (u.role?.name || u.roleName || '').toLowerCase().replace(/\s+/g, '');
          const designationName = (u.designationName || u.designation?.title || '').toLowerCase();
          return roleName === 'ceo' || designationName === 'ceo';
        })
        .forEach((u) => {
          map.set(u._id?.toString(), { _id: u._id, name: u.name });
        });
      employees
        .filter((emp) => {
          const roleName = (emp.user?.role?.name || emp.user?.roleName || '').toLowerCase().replace(/\s+/g, '');
          const designationName = (emp.designation?.title || '').toLowerCase();
          return roleName === 'ceo' || designationName === 'ceo';
        })
        .forEach((emp) => {
          const id = emp.user?._id || emp._id;
          map.set(id?.toString(), { _id: id, name: emp.full_name || emp.name });
        });
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // 1. Check users list
    const filteredUsers = users.filter(u => {
      const roleName = (u.role?.name || u.roleName || '').toLowerCase().replace(/\s+/g, '');
      const designationName = (u.designationName || u.designation?.title || '').toLowerCase();
      
      if (normalizedType === 'country') {
        return roleName === 'countrymanager' || designationName === 'country manager';
      }
      if (normalizedType === 'state') {
        return roleName === 'statemanager' || designationName === 'state manager';
      }
      if (normalizedType === 'city') {
        return roleName === 'citymanager' || designationName === 'city manager';
      }
      return false;
    });

    // 2. Check employees list
    const filteredEmployees = employees.filter(emp => {
      const roleName = (emp.user?.role?.name || emp.user?.roleName || '').toLowerCase().replace(/\s+/g, '');
      const designationName = (emp.designation?.title || '').toLowerCase();
      
      if (normalizedType === 'country') {
        return designationName === 'country manager' || roleName === 'countrymanager';
      }
      if (normalizedType === 'state') {
        return designationName === 'state manager' || roleName === 'statemanager';
      }
      if (normalizedType === 'city') {
        return designationName === 'city manager' || roleName === 'citymanager';
      }
      return false;
    });

    const map = new Map();
    filteredUsers.forEach(u => {
      if (!isUserAssignedElsewhere(u._id, currentTarget)) {
        map.set(u._id, { _id: u._id, name: u.name });
      }
    });
    filteredEmployees.forEach(emp => {
      const id = emp.user?._id || emp._id;
      if (!isUserAssignedElsewhere(id, currentTarget)) {
        map.set(id, { _id: id, name: emp.full_name || emp.name });
      }
    });

    return Array.from(map.values());
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    if (addType === 'Country' && !formData.country_name) {
      showToast('Please select a country.', 'error');
      return;
    }
    if (addType === 'State' && (!formData.country_name || !formData.state_name)) {
      showToast('Please select country and state.', 'error');
      return;
    }
    if (addType === 'City' && (!formData.country_name || !formData.state_name || !formData.city_name)) {
      showToast('Please select country, state, and city.', 'error');
      return;
    }

    try {
      const preview = await fetchGeoCreationPreview(previewRoleForAdd, formData);
      if (!(await confirmGeoCreation(preview, confirm))) return;
    } catch (err) {
      console.error(err);
      showToast('Could not verify territory.', 'error');
      return;
    }

    const selectedUserObj = users.find(u => u.name === formData.manager);
    const selectedEmpObj = employees.find(emp => (emp.full_name || emp.name) === formData.manager);
    const managerId = selectedUserObj?._id || selectedEmpObj?.user?._id || selectedEmpObj?.user || null;

    let endpoint = '';
    let payload = { manager: managerId };

    if (addType === 'Country') {
      endpoint = '/api/countries';
      payload = {
        ...payload,
        name: formData.country_name,
        country_name: formData.country_name,
        country_iso: formData.country_iso,
        code: formData.country_iso || formData.country_name.slice(0, 3).toUpperCase()
      };
    } else if (addType === 'State') {
      endpoint = '/api/states';
      payload = {
        ...payload,
        name: formData.state_name,
        state_name: formData.state_name,
        country_name: formData.country_name,
        country_iso: formData.country_iso
      };
    } else if (addType === 'City') {
      endpoint = '/api/cities';
      payload = {
        ...payload,
        name: formData.city_name,
        city_name: formData.city_name,
        state_name: formData.state_name,
        country_name: formData.country_name,
        country_iso: formData.country_iso
      };
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(`${addType} added successfully.`, 'success');
          loadHierarchy();
          setIsAddOpen(false);
          setFormData(emptyGeoForm());
        } else {
          showToast(resData.message || `Error adding ${addType.toLowerCase()}.`, 'error');
        }
      })
      .catch(err => console.error(err));
  };

  const reloadUsersAndAssignments = () => {
    fetch('/api/users?limit=500&page=1')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setUsers(data.data);
        }
      });
    fetch('/api/hierarchy/ceo-candidates')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setCeoCandidates(data.data);
        }
      });
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setEmployees(data.data);
        }
      });
    fetch('/api/hierarchy/assigned-managers')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setAssignedManagers(data.data);
        }
      });
  };

  const resolveManagerIdByName = (name) => {
    if (!name?.trim() || name === 'Not Assigned') return null;
    const selectedUserObj = users.find(u => u.name === name);
    const selectedEmpObj = employees.find(emp => (emp.full_name || emp.name) === name);
    return selectedUserObj?._id || selectedEmpObj?.user?._id || selectedEmpObj?.user || null;
  };

  const isUnassignManagerSelection = (name) => {
    const trimmed = (name || '').trim();
    return !trimmed || trimmed === 'Not Assigned';
  };

  const performManagerUnassign = async () => {
    const assignRes = await fetch('/api/hierarchy/assign-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: assignTarget.type,
        entity_id: assignTarget.id,
        manager_id: null
      })
    });
    const assignData = await assignRes.json();

    if (!assignRes.ok || !assignData.success) {
      showToast(assignData.message || "Failed to remove manager.", "error");
      return false;
    }

    showToast(`Manager removed from ${assignTarget.name}.`, "success");
    if (assignTarget.type === 'CEO') {
      setCeoManager("Not Assigned");
    } else {
      loadHierarchy();
    }
    setIsAssignOpen(false);
    setAssignMode('select');
    setNewManagerUser({ name: '', email: '', mobile: '' });
    setAssignedManagerName('');
    reloadUsersAndAssignments();
    return true;
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    setAssignLoading(true);

    try {
      let managerId = null;
      let managerName = assignedManagerName;

      if (assignMode === 'select' && isUnassignManagerSelection(assignedManagerName)) {
        await performManagerUnassign();
        return;
      }

      if (assignMode === 'create') {
        if (!newManagerUser.name || !newManagerUser.email || !newManagerUser.mobile) {
          showToast("Please fill in name, email, and mobile to create a new user.", "error");
          return;
        }

        const createRes = await fetch('/api/hierarchy/manager-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newManagerUser,
            roleName: getRoleNameForType(assignTarget?.type)
          })
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.success) {
          showToast(createData.message || "Failed to create manager user.", "error");
          return;
        }
        managerId = createData.data._id;
        managerName = createData.data.name;
        const createdUser = {
          _id: createData.data._id,
          name: createData.data.name,
          email: createData.data.email,
          mobile: createData.data.mobile,
          roleName: createData.data.roleName || getRoleNameForType(assignTarget?.type),
          role: createData.data.role || { name: getRoleNameForType(assignTarget?.type) },
          designationName: createData.data.designationName || getRoleNameForType(assignTarget?.type)
        };
        setUsers((prev) => [...prev, createdUser]);
        if (assignTarget?.type === 'CEO') {
          setCeoCandidates((prev) => [createdUser, ...prev.filter((u) => u._id !== createdUser._id)]);
        }
      } else {
        managerId = resolveManagerIdByName(assignedManagerName);

        if (!managerId) {
          // Stale or unresolvable name (e.g. CEO shown in UI but not in dropdown options) — treat as unassign
          if (assignMode === 'select') {
            await performManagerUnassign();
            return;
          }
          showToast("Could not resolve manager ID.", "error");
          return;
        }

        if (assignTarget?.type !== 'CEO' && isUserAssignedElsewhere(managerId, assignTarget)) {
          showToast("This user is already assigned elsewhere. Create a new user instead.", "error");
          return;
        }
      }

      const assignRes = await fetch('/api/hierarchy/assign-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: assignTarget.type,
          entity_id: assignTarget.id,
          manager_id: managerId
        })
      });
      const assignData = await assignRes.json();

      if (!assignRes.ok || !assignData.success) {
        showToast(assignData.message || "Assignment failed.", "error");
        return;
      }

      showToast(assignData.message || getUserCreatedMessage(`Assigned ${managerName} as ${assignTarget.type} Manager.`), 'success');
      if (assignTarget.type === 'CEO') {
        setCeoManager(managerName);
      } else {
        loadHierarchy();
      }
      setIsAssignOpen(false);
      setAssignMode('select');
      setNewManagerUser({ name: '', email: '', mobile: '' });
      setAssignedManagerName('');
      reloadUsersAndAssignments();
    } catch (err) {
      console.error("Error assigning manager:", err);
      showToast("Failed to assign manager.", "error");
    } finally {
      setAssignLoading(false);
    }
  };

  const triggerAssign = (row, type) => {
    const target = { id: row.id, type, name: row.name, currentManager: row.manager };
    const managerName = row.manager === 'Not Assigned' ? '' : (row.manager || '');
    const managerId = resolveManagerIdByName(managerName);
    const availableOptions = getManagerOptions(type, target);
    const canPreselect = managerId || availableOptions.some((opt) => opt.name === managerName);

    setAssignTarget(target);
    setAssignedManagerName(canPreselect ? managerName : '');
    setAssignMode('select');
    setNewManagerUser({ name: '', email: '', mobile: '' });
    setIsAssignOpen(true);
  };

  const triggerEdit = (row, type) => {
    setEditTarget({ id: row.id, type, name: row.name, code: row.code, manager: row.manager });
    setEditFormData({
      name: row.name,
      code: row.code || '',
      manager: row.manager === 'Not Assigned' ? '' : row.manager
    });
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
    const managerId = (!editFormData.manager || editFormData.manager === 'Not Assigned')
      ? null
      : (selectedUserObj?._id || selectedEmpObj?.user?._id || selectedEmpObj?.user || null);

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
          showToast(
            managerId === null && editFormData.manager !== editTarget.manager
              ? `${editTarget.type} manager removed successfully.`
              : `${editTarget.type} updated successfully.`,
            "success"
          );
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

  const matchGeoId = (left, right) => {
    if (!left || !right) return false;
    return left.toString() === right.toString();
  };

  const showTreeRevenue = userRole !== 'CEO';

  const formatTreeRevenue = (value) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return null;
    return `₹${Number(value).toLocaleString('en-IN')}`;
  };

  const TreeNodeActions = ({ onAssign, onEdit, compact = false }) => (
    <div className="hidden group-hover:flex gap-1 absolute right-2 top-2 z-10">
      <button
        type="button"
        onClick={onAssign}
        className={`${compact ? 'text-[8px]' : 'text-[9px]'} bg-brand-orange text-white px-1.5 py-0.5 rounded font-bold hover:bg-brand-orange-hover transition-colors`}
      >
        Assign
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`${compact ? 'text-[8px]' : 'text-[9px]'} bg-slate-700 text-white px-1.5 py-0.5 rounded font-bold hover:bg-slate-600 transition-colors`}
        >
          Edit
        </button>
      )}
    </div>
  );

  const TreeNodeCard = ({ level, badge, title, subtitle, meta = [], onAssign, onEdit, compact = false }) => {
    const shellClass = {
      founder: 'bg-brand-dark text-white border-2 border-brand-orange shadow-md',
      ceo: 'bg-slate-800 text-white border border-slate-700 shadow-md',
      country: 'bg-slate-900 text-white border border-slate-700 shadow-md',
      state: 'bg-white border border-slate-200 text-slate-800 shadow-sm',
      city: 'bg-orange-50/50 border border-orange-200 text-slate-800 shadow-sm'
    }[level];

    const badgeClass = {
      founder: 'text-brand-orange',
      ceo: 'text-emerald-400',
      country: 'text-blue-400',
      state: 'text-slate-500',
      city: 'text-brand-orange'
    }[level];

    const titleClass = {
      founder: 'text-sm font-display',
      ceo: 'text-sm font-display',
      country: 'huddo-v2-country-node-label font-display',
      state: 'huddo-v2-state-node-label font-display',
      city: 'huddo-v2-city-node-label font-display'
    }[level];

    const metaClass = level === 'country' ? 'text-slate-400' : level === 'state' ? 'text-slate-400' : 'text-slate-500';

    return (
      <div className={`tree-node-card relative group text-center px-5 py-3.5 rounded-lg ${shellClass} ${compact ? 'tree-node-card--city' : ''}`}>
        <span className={`text-[9px] uppercase font-bold tracking-wide ${badgeClass} ${compact ? 'text-[8px]' : ''}`}>
          {badge}
        </span>
        {subtitle && (
          <p className={`mt-0.5 font-mono ${level === 'country' ? 'text-[9px] text-slate-500' : 'text-[10px] text-slate-400'}`}>
            {subtitle}
          </p>
        )}
        <h4 className={`font-bold mt-1 break-words ${titleClass}`}>{title}</h4>
        {meta.length > 0 && (
          <div className={`mt-2 space-y-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'} ${metaClass}`}>
            {meta.map((line) => (
              <p key={line} className={line.includes('₹') ? 'text-emerald-400 font-semibold' : undefined}>{line}</p>
            ))}
          </div>
        )}
        {onAssign && (
          <TreeNodeActions onAssign={onAssign} onEdit={onEdit} compact={compact} />
        )}
      </div>
    );
  };

  const renderCityNodes = (stateCities) => (
    <ul>
      {stateCities.map((ct) => {
        const cityRevenue = formatTreeRevenue(cityRevenues[ct.id] ?? ct.revenue);
        const meta = [`${ct.retailersCount || 0} Retailers`];
        if (showTreeRevenue && cityRevenue) meta.push(cityRevenue);

        return (
          <li key={ct.id}>
            <TreeNodeCard
              level="city"
              compact
              badge={`City Manager · ${ct.name}`}
              title={ct.manager || 'Not Assigned'}
              meta={meta}
              onAssign={() => triggerAssign(ct, 'City')}
              onEdit={() => triggerEdit(ct, 'City')}
            />
          </li>
        );
      })}
    </ul>
  );

  const renderStateNodes = (countryStates) => (
    <ul>
      {countryStates.map((st) => {
        const stateCities = cities.filter(
          (ct) => matchGeoId(ct.stateId, st.id) || ct.state === st.name
        );
        const stateRevenue = formatTreeRevenue(stateRevenues[st.id] ?? st.revenue);
        const meta = [
          `${st.citiesCount || stateCities.length} Cities`,
          `${st.retailersCount || 0} Retailers`
        ];
        if (showTreeRevenue && stateRevenue) meta.push(stateRevenue);

        return (
          <li key={st.id}>
            <TreeNodeCard
              level="state"
              badge={`State Manager · ${st.name}`}
              title={st.manager || 'Not Assigned'}
              meta={meta}
              onAssign={() => triggerAssign(st, 'State')}
              onEdit={() => triggerEdit(st, 'State')}
            />
            {stateCities.length > 0 && renderCityNodes(stateCities)}
          </li>
        );
      })}
    </ul>
  );

  const renderCountryNodes = () => (
    <ul>
      {countries.map((country) => {
        const countryStates = states.filter(
          (s) => matchGeoId(s.countryId, country.id) || s.country === country.name
        );
        const countryRevenue = formatTreeRevenue(country.revenue);
        const meta = [
          `${countryStates.length} Active States`,
          `${country.retailersCount || 0} Retailers`
        ];
        if (showTreeRevenue && countryRevenue) meta.push(`${countryRevenue} Revenue`);

        return (
          <li key={country.id}>
            <TreeNodeCard
              level="country"
              badge={`Country Manager · ${country.name}`}
              subtitle={country.code || null}
              title={country.manager || 'Not Assigned'}
              meta={meta}
              onAssign={() => triggerAssign(country, 'Country')}
              onEdit={() => triggerEdit(country, 'Country')}
            />
            {countryStates.length > 0 && renderStateNodes(countryStates)}
          </li>
        );
      })}
    </ul>
  );

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
              setFormData(emptyGeoForm());
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Interactive Channel Node Mapping</h2>
              <p className="text-xs text-slate-500 mt-0.5">Scroll horizontally to explore countries, states, and city coverage.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 shrink-0">
              ← Drag / scroll to navigate →
            </span>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-16rem)] bg-slate-50/40">
            <div className="p-8 min-w-max inline-block">
              <div className="hierarchy-org-tree">
                <ul>
                  <li>
                    <TreeNodeCard
                      level="founder"
                      badge="Founder"
                      title="Rohan Hudda"
                      meta={['Owner side controls active']}
                    />
                    <ul>
                      <li>
                        <TreeNodeCard
                          level="ceo"
                          badge="CEO"
                          title={ceoManager}
                          meta={['Coverage: Global Operations']}
                          onAssign={() => triggerAssign({ id: 'ceo', name: 'CEO', manager: ceoManager }, 'CEO')}
                        />
                        {countries.length === 0 ? (
                          <ul>
                            <li>
                              <TreeNodeCard
                                level="country"
                                badge="Country Manager (Not Configured)"
                                title="Not Assigned"
                                meta={['Coverage: 0 Active States']}
                              />
                            </li>
                          </ul>
                        ) : (
                          renderCountryNodes()
                        )}
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
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
          <p className="text-xs text-slate-500">
            Search and select from worldwide locations. Parent countries or states are created automatically when needed.
          </p>

          <GeoCascadeSelect
            role={hierarchyGeoRole}
            value={{
              country_name: formData.country_name,
              state_name: formData.state_name,
              city_name: formData.city_name,
              country_iso: formData.country_iso
            }}
            onChange={(geo) => setFormData((prev) => ({ ...prev, ...geo }))}
          />

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign {addType} Manager</label>
            <select 
              value={formData.manager}
              onChange={(e) => setFormData({...formData, manager: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
            >
              <option value="">Not Assigned</option>
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
        onClose={() => {
          setIsAssignOpen(false);
          setAssignMode('select');
          setNewManagerUser({ name: '', email: '', mobile: '' });
        }}
        title={`Assign Manager to ${assignTarget?.name}`}
        onConfirm={handleAssignManager}
        confirmText={assignLoading ? 'Saving...' : 'Save'}
      >
        <div className="space-y-4 text-left">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2.5 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Leave the manager field blank to remove the current assignment. Users already assigned elsewhere cannot be reused — create a new dedicated user instead.</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAssignMode('create')}
              className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                assignMode === 'create'
                  ? 'bg-brand-orange text-white border-brand-orange'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Create New User
            </button>
            <button
              type="button"
              onClick={() => setAssignMode('select')}
              className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                assignMode === 'select'
                  ? 'bg-brand-orange text-white border-brand-orange'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Select Existing
            </button>
          </div>

          {assignMode === 'create' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newManagerUser.name}
                  onChange={(e) => setNewManagerUser({ ...newManagerUser, name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email *</label>
                <input
                  type="email"
                  value={newManagerUser.email}
                  onChange={(e) => setNewManagerUser({ ...newManagerUser, email: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile *</label>
                <input
                  type="text"
                  value={newManagerUser.mobile}
                  onChange={(e) => setNewManagerUser({ ...newManagerUser, mobile: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>
              <DefaultPasswordNotice />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Manager</label>
              <select 
                value={assignedManagerName}
                onChange={(e) => setAssignedManagerName(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
              >
                <option value="">Not Assigned</option>
                {assignTarget?.currentManager && assignTarget.currentManager !== 'Not Assigned' &&
                  !getManagerOptions(assignTarget?.type, assignTarget).some(opt => opt.name === assignTarget.currentManager) && (
                  <option value={assignTarget.currentManager}>{assignTarget.currentManager} (current)</option>
                )}
                {getManagerOptions(assignTarget?.type, assignTarget).map(opt => (
                  <option key={opt._id} value={opt.name}>{opt.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 font-medium mt-2">Select &quot;Not Assigned&quot; to remove the current manager from this position.</p>
              {getManagerOptions(assignTarget?.type, assignTarget).length === 0 && !assignTarget?.currentManager && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">No unassigned users available. Use Create New User to assign someone.</p>
              )}
            </div>
          )}
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
              value={editFormData.manager === 'Not Assigned' ? '' : editFormData.manager}
              onChange={(e) => setEditFormData({...editFormData, manager: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
            >
              <option value="">Not Assigned</option>
              {editTarget?.manager && editTarget.manager !== 'Not Assigned' &&
                !getManagerOptions(editTarget?.type, editTarget).some(opt => opt.name === editTarget.manager) && (
                <option value={editTarget.manager}>{editTarget.manager} (current)</option>
              )}
              {getManagerOptions(editTarget?.type, editTarget).map(opt => (
                <option key={opt._id} value={opt.name}>{opt.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

    </div>
  );
}
