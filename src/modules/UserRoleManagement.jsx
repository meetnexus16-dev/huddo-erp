import React, { useState } from 'react';
import { Shield, UserPlus, FileText, CheckSquare, XSquare, Plus, Edit2, Eye } from 'lucide-react';
import { initialUsers, STANDARD_ROLES, MODULES_LIST, PERMISSIONS_LIST, initialRolePermissions } from '../mockData';
import { DataTable, Modal, DefaultPasswordNotice } from '../components/Common';
import OnboardingApplicationDetailModal from '../components/OnboardingApplicationDetailModal';
import GeoCascadeSelect from '../components/GeoCascadeSelect';
import { confirmGeoCreation, fetchGeoCreationPreview } from '../utils/geoPreview';
import { useConfirm } from '../context/ConfirmContext';
import { DEFAULT_USER_PASSWORD, getUserCreatedMessage } from '../constants/defaultCredentials';

const ROLE_DISPLAY_MAP = {
  CountryManager: 'Country Manager',
  StateManager: 'State Manager',
  CityManager: 'City Manager',
  TeamMember: 'Team Member',
  SalesExecutive: 'Sales Executive',
  SalesManager: 'Sales Manager',
  PurchaseManager: 'Purchase Manager',
  InventoryManager: 'Inventory Manager',
  FinanceManager: 'Finance Manager',
  HRManager: 'HR Manager'
};

const formatRoleForDisplay = (role) => ROLE_DISPLAY_MAP[role] || role;

const isCountryManagerRole = (role) =>
  role === 'Country Manager' || role === 'CountryManager';

const isStateManagerRole = (role) =>
  role === 'State Manager' || role === 'StateManager';

const isCityManagerRole = (role) =>
  role === 'City Manager' || role === 'CityManager';

const isGeoManagerRole = (role) =>
  isCountryManagerRole(role) || isStateManagerRole(role) || isCityManagerRole(role);

const getGeoCascadeRole = (role) => {
  if (isCountryManagerRole(role)) return 'CountryManager';
  if (isStateManagerRole(role)) return 'StateManager';
  if (isCityManagerRole(role)) return 'CityManager';
  return null;
};

const emptyGeo = () => ({
  country_name: '',
  state_name: '',
  city_name: '',
  country_iso: ''
});

const toApiRoleName = (role) => {
  const map = {
    'Country Manager': 'CountryManager',
    'State Manager': 'StateManager',
    'City Manager': 'CityManager'
  };
  return map[role] || role.replace(/\s+/g, '');
};

const mapUserFromApi = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  mobile: u.mobile,
  role: formatRoleForDisplay(u.role?.name || u.roleName || u.role || 'Team Member'),
  department: u.departmentName || u.department?.name || u.department || 'Sales',
  status: u.status || (u.is_active ? 'Active' : 'Inactive'),
  countryId: u.country?._id?.toString() || (typeof u.country === 'string' ? u.country : ''),
  countryName: u.country?.name || '',
  stateId: u.state?._id?.toString() || (typeof u.state === 'string' ? u.state : ''),
  stateName: u.state?.name || '',
  cityId: u.city?._id?.toString() || (typeof u.city === 'string' ? u.city : ''),
  cityName: u.city?.name || '',
  raw: u
});
export default function UserRoleManagement({ showToast }) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('users'); // users | roles
  const [users, setUsers] = useState([]);
  const [rolePermissions, setRolePermissions] = useState(initialRolePermissions);
  const [customRoles, setCustomRoles] = useState([]);

  const loadUsers = React.useCallback(() => {
    fetch('/api/users?limit=500&page=1')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setUsers(resData.data.map(mapUserFromApi));
        } else {
          setUsers(initialUsers);
        }
      })
      .catch(err => {
        console.error("Error loading users:", err);
        setUsers(initialUsers);
      });
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '', email: '', mobile: '', role: 'Team Member', department: 'Sales', status: 'Active',
    ...emptyGeo()
  });

  // Edit User Modal State
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editUserData, setEditUserData] = useState({
    id: '', name: '', email: '', mobile: '', role: 'Team Member', department: 'Sales', status: 'Active',
    ...emptyGeo()
  });
  const [editLoading, setEditLoading] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const openViewUser = (row) => {
    setViewLoading(true);
    setViewUser(row.raw || null);
    fetch(`/api/users/${row.id}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setViewUser(resData.data);
        }
      })
      .catch((err) => console.error('Failed to load user details:', err))
      .finally(() => setViewLoading(false));
  };

  // Custom Role Creator State
  const [isCustomRoleOpen, setIsCustomRoleOpen] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');

  // Edit Role Permission State
  const [editingRole, setEditingRole] = useState(null); // role name
  const [tempPermissions, setTempPermissions] = useState({}); // permissions copy

  const appendGeoPayload = (payload, userData) => {
    if (!isGeoManagerRole(userData.role)) return payload;
    if (userData.country_name) payload.country_name = userData.country_name;
    if (userData.state_name) payload.state_name = userData.state_name;
    if (userData.city_name) payload.city_name = userData.city_name;
    if (userData.country_iso) payload.country_iso = userData.country_iso;
    return payload;
  };

  const handleNewUserRoleChange = (role) => {
    setNewUserData((prev) => ({
      ...prev,
      role,
      ...(isGeoManagerRole(role) ? {} : emptyGeo())
    }));
  };

  const handleEditUserRoleChange = (role) => {
    setEditUserData((prev) => ({
      ...prev,
      role,
      ...(isGeoManagerRole(role) ? {} : emptyGeo())
    }));
  };

  const renderGeoFields = (userData, setUserData) => {
    const geoRole = getGeoCascadeRole(userData.role);
    if (!geoRole) return null;

    return (
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Territory Assignment (Optional)</p>
        <GeoCascadeSelect
          role={geoRole}
          value={{
            country_name: userData.country_name || userData.countryName || '',
            state_name: userData.state_name || userData.stateName || '',
            city_name: userData.city_name || userData.cityName || '',
            country_iso: userData.country_iso || ''
          }}
          onChange={(geo) => setUserData((prev) => ({ ...prev, ...geo }))}
        />
        <p className="text-[11px] text-slate-500 font-medium mt-1">
          Search worldwide locations. Missing entries are created automatically when you save.
        </p>
      </div>
    );
  };

  // Create User Handler
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email || !newUserData.mobile) {
      showToast("Please fill all fields.", "error");
      return;
    }
    try {
      if (isGeoManagerRole(newUserData.role) && newUserData.country_name) {
        const preview = await fetchGeoCreationPreview(toApiRoleName(newUserData.role), newUserData);
        if (!(await confirmGeoCreation(preview, confirm))) return;
      }

      const payload = appendGeoPayload({
        name: newUserData.name,
        email: newUserData.email,
        mobile: newUserData.mobile,
        roleName: newUserData.role,
        departmentName: newUserData.department,
        password: DEFAULT_USER_PASSWORD,
        is_active: newUserData.status === 'Active',
        status: newUserData.status
      }, newUserData);

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();

      if (!res.ok || !resData.success) {
        showToast(resData.message || "Failed to add user.", "error");
        return;
      }

      setIsAddUserOpen(false);
      setNewUserData({
        name: '', email: '', mobile: '', role: 'Team Member', department: 'Sales', status: 'Active',
        ...emptyGeo()
      });
      showToast(resData.message || 'User created successfully.', 'success');
    } catch (err) {
      console.error("Failed to save user to backend:", err);
      showToast("Failed to add user.", "error");
    }
  };

  const openEditUser = (user) => {
    setEditUserData({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      department: user.department,
      status: user.status,
      country_name: user.countryName || '',
      state_name: user.stateName || '',
      city_name: user.cityName || '',
      country_iso: ''
    });
    setIsEditUserOpen(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editUserData.name || !editUserData.email || !editUserData.mobile) {
      showToast("Please fill all required fields.", "error");
      return;
    }
    setEditLoading(true);
    try {
      if (isGeoManagerRole(editUserData.role) && editUserData.country_name) {
        const preview = await fetchGeoCreationPreview(toApiRoleName(editUserData.role), editUserData);
        if (!(await confirmGeoCreation(preview, confirm))) {
          setEditLoading(false);
          return;
        }
      }

      const payload = appendGeoPayload({
        name: editUserData.name,
        email: editUserData.email,
        mobile: editUserData.mobile,
        roleName: editUserData.role,
        departmentName: editUserData.department,
        status: editUserData.status,
        is_active: editUserData.status === 'Active'
      }, editUserData);

      const res = await fetch(`/api/users/${editUserData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();

      if (!res.ok || !resData.success) {
        showToast(resData.message || "Failed to update user.", "error");
        return;
      }

      const updated = resData.data ? mapUserFromApi(resData.data) : {
        ...editUserData,
        id: editUserData.id
      };
      setUsers((prev) => prev.map((u) => (u.id === editUserData.id ? updated : u)));
      setIsEditUserOpen(false);
      showToast("User updated successfully!", "success");
      loadUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
      showToast("Failed to update user.", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const isDeactivating = newStatus === 'Inactive';

    const confirmed = await confirm({
      title: isDeactivating ? 'Deactivate user?' : 'Activate user?',
      message: isDeactivating
        ? `Are you sure you want to set ${user.name} to Inactive? They will not be able to sign in.`
        : `Are you sure you want to set ${user.name} to Active?`,
      confirmText: isDeactivating ? 'Deactivate' : 'Activate',
      isDestructive: isDeactivating
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          is_active: newStatus === 'Active'
        })
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        showToast(resData.message || "Failed to update status.", "error");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      showToast(`Status updated to ${newStatus} for ${user.name}`, "success");
    } catch (err) {
      console.error("Failed to toggle user status:", err);
      showToast("Failed to update status.", "error");
    }
  };

  // Add Custom Role Handler
  const handleAddCustomRole = () => {    if (!customRoleName.trim()) {
      showToast("Please enter a valid role name.", "error");
      return;
    }
    const sanitizedRoleName = customRoleName.trim();
    if (STANDARD_ROLES.includes(sanitizedRoleName) || customRoles.includes(sanitizedRoleName)) {
      showToast("Role already exists.", "error");
      return;
    }

    setCustomRoles([...customRoles, sanitizedRoleName]);
    
    // Seed blank permission matrix for this custom role
    const blankPerms = MODULES_LIST.reduce((acc, mod) => {
      acc[mod] = PERMISSIONS_LIST.reduce((pAcc, perm) => {
        pAcc[perm] = false;
        return pAcc;
      }, {});
      return acc;
    }, {});

    setRolePermissions({
      ...rolePermissions,
      [sanitizedRoleName]: blankPerms
    });

    setIsCustomRoleOpen(false);
    setCustomRoleName('');
    showToast(`Custom role "${sanitizedRoleName}" created successfully!`, "success");
  };

  // Open Permission Matrix editor
  const handleEditRole = (role) => {
    setEditingRole(role);
    setTempPermissions(JSON.parse(JSON.stringify(rolePermissions[role] || {})));
  };

  // Toggle single permission checkbox
  const handlePermissionToggle = (module, permission) => {
    const isReadOnly = ["Founder", "CEO", "Admin"].includes(editingRole);
    if (isReadOnly) {
      showToast("Standard system administration roles are locked as full-access (read-only override).", "error");
      return;
    }
    setTempPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: !prev[module][permission]
      }
    }));
  };

  // Save Role Permissions Matrix
  const handleSavePermissions = () => {
    setRolePermissions(prev => ({
      ...prev,
      [editingRole]: tempPermissions
    }));
    setEditingRole(null);
    showToast(`Permissions for "${editingRole}" updated.`, "success");
  };

  // User table columns configuration
  const userColumns = [
    { header: "User ID", accessor: "id" },
    { header: "Full Name", accessor: "name" },
    { header: "Email Address", accessor: "email" },
    { header: "Role Mapping", accessor: "role", render: (val) => (
      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-brand-orange" />
        {val}
      </span>
    )},
    { header: "Department", accessor: "department" },
    { header: "Status", accessor: "status", render: (val, row) => (
      <button
        type="button"
        onClick={() => handleToggleUserStatus(row)}
        title={`Click to set ${val === 'Active' ? 'Inactive' : 'Active'}`}
        className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors hover:ring-2 hover:ring-offset-1 ${
          val === 'Active'
            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:ring-emerald-300'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:ring-slate-300'
        }`}
      >
        {val}
      </button>
    )},
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => openViewUser(row)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
          title="View user details"
          aria-label={`View details for ${row.name}`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => openEditUser(row)}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-brand-orange"
          title="Edit user"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>
    )}
  ];
  // Map role list for Role Management table
  const allAvailableRoles = [...STANDARD_ROLES, ...customRoles];
  const roleListData = allAvailableRoles.map(role => {
    const permissions = rolePermissions[role] || {};
    let activeCount = 0;
    Object.values(permissions).forEach(modulesMap => {
      Object.values(modulesMap).forEach(val => {
        if (val) activeCount++;
      });
    });
    return { name: role, count: activeCount };
  });

  const roleColumns = [
    { header: "Role Name", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Permissions Count", accessor: "count", render: (val) => <span className="font-semibold text-slate-600">{val} total nodes active</span> },
    { header: "Configuration", accessor: "name", sortable: false, render: (val) => (
      <button 
        onClick={() => handleEditRole(val)}
        className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded hover:bg-slate-200 transition-colors"
      >
        Edit Permissions Matrix
      </button>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">User & Role Management</h1>
          <p className="text-sm text-slate-500">Configure administrative system access, custom permission nodes, and department assignment matrices.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'users' ? (
            <button 
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add System User</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsCustomRoleOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'users' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Users Directory ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'roles' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Roles & Permissions Matrix ({allAvailableRoles.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'users' ? (
        <DataTable 
          columns={userColumns} 
          data={users} 
          searchKeys={["name", "email", "role", "department"]} 
          searchPlaceholder="Search by name, email, role or department..."
        />
      ) : (
        <DataTable 
          columns={roleColumns} 
          data={roleListData} 
          searchKeys={["name"]}
          searchPlaceholder="Search roles..."
        />
      )}

      {/* Add User Modal */}
      <Modal 
        isOpen={isAddUserOpen} 
        onClose={() => setIsAddUserOpen(false)} 
        title="Add New System User"
        onConfirm={handleAddUserSubmit}
      >
        <form className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input 
              type="text" 
              placeholder="e.g., Ramesh Bhatia"
              value={newUserData.name}
              onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                placeholder="ramesh@huddo.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
              <input 
                type="text" 
                placeholder="987654xxxx"
                value={newUserData.mobile}
                onChange={(e) => setNewUserData({...newUserData, mobile: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">System Role</label>
              <select 
                value={newUserData.role}
                onChange={(e) => handleNewUserRoleChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                {allAvailableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
              <select 
                value={newUserData.department}
                onChange={(e) => setNewUserData({...newUserData, department: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="Executive">Executive</option>
                <option value="Sales">Sales</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Inventory">Inventory</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>
          {renderGeoFields(newUserData, setNewUserData)}
          <DefaultPasswordNotice />
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-semibold text-slate-700">Account Access Status</span>
            <button 
              type="button"
              onClick={() => setNewUserData({...newUserData, status: newUserData.status === 'Active' ? 'Inactive' : 'Active'})}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${newUserData.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${newUserData.status === 'Active' ? 'translate-x-6' : ''}`}></span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditUserOpen}
        onClose={() => !editLoading && setIsEditUserOpen(false)}
        title="Edit System User"
        onConfirm={handleEditUserSubmit}
        confirmText={editLoading ? 'Saving...' : 'Save Changes'}
      >
        <form className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g., Ramesh Bhatia"
              value={editUserData.name}
              onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <input
                type="email"
                placeholder="ramesh@huddo.com"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
              <input
                type="text"
                placeholder="987654xxxx"
                value={editUserData.mobile}
                onChange={(e) => setEditUserData({ ...editUserData, mobile: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">System Role</label>
              <select
                value={editUserData.role}
                onChange={(e) => handleEditUserRoleChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                {allAvailableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
              <select
                value={editUserData.department}
                onChange={(e) => setEditUserData({ ...editUserData, department: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="Executive">Executive</option>
                <option value="Sales">Sales</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Inventory">Inventory</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>
          {renderGeoFields(editUserData, setEditUserData)}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-semibold text-slate-700">Account Access Status</span>
            <button
              type="button"
              onClick={() => setEditUserData({
                ...editUserData,
                status: editUserData.status === 'Active' ? 'Inactive' : 'Active'
              })}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${editUserData.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${editUserData.status === 'Active' ? 'translate-x-6' : ''}`}></span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Custom Role Modal */}
      <Modal
        isOpen={isCustomRoleOpen}
        onClose={() => setIsCustomRoleOpen(false)} 
        title="Create Custom System Role"
        onConfirm={handleAddCustomRole}
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-500 uppercase">Custom Role Name</label>
          <input 
            type="text" 
            placeholder="e.g., Regional Logistic Supervisor"
            value={customRoleName}
            onChange={(e) => setCustomRoleName(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
          />
          <p className="text-[10px] text-slate-400 font-medium">Creating this role initializes a complete, unpopulated permission matrix. You can customize modules access controls immediately after adding.</p>
        </div>
      </Modal>

      {/* Permissions Matrix Detail Drawer/Editor */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-4xl h-full shadow-2xl border-l border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Permissions Matrix: {editingRole}</h3>
                <p className="text-xs text-slate-500">Enable/disable module access codes across operations. Grayed items represent unavailable configurations.</p>
              </div>
              <button 
                onClick={() => setEditingRole(null)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XSquare className="w-6 h-6" />
              </button>
            </div>

            {/* Matrix grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-4 py-3">Module Name</th>
                      {PERMISSIONS_LIST.map(perm => (
                        <th key={perm} className="px-3 py-3 text-center">{perm}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {MODULES_LIST.map(mod => (
                      <tr key={mod} className="hover:bg-slate-50/30">
                        <td className="px-4 py-3 font-semibold text-slate-800">{mod}</td>
                        {PERMISSIONS_LIST.map(perm => {
                          const isChecked = tempPermissions[mod]?.[perm] || false;
                          const isLocked = ["Founder", "CEO", "Admin"].includes(editingRole);
                          return (
                            <td key={perm} className="px-3 py-3 text-center">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                disabled={isLocked}
                                onChange={() => handlePermissionToggle(mod, perm)}
                                className={`w-4 h-4 rounded text-brand-orange focus:ring-brand-orange/20 border-slate-300 ${isLocked ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matrix Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:border-slate-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePermissions}
                disabled={["Founder", "CEO", "Admin"].includes(editingRole)}
                className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Permissions Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      <OnboardingApplicationDetailModal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        application={viewUser}
        title="User Details"
        loading={viewLoading}
      />
    </div>
  );
}
