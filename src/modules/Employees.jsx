import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Eye, Edit2, CheckCircle, XCircle, AlertCircle, FileText, 
  ChevronRight, X, PhoneCall, CreditCard, Percent, Award, Briefcase, 
  DollarSign, Building2, Shield, Calendar, Search, ArrowUpRight, RefreshCw,
  User, UserPlus, Landmark
} from 'lucide-react';
import { initialEmployees, initialPromoters } from '../mockData';
import { DataTable, Modal } from '../components/Common';
import { useConfirm } from '../context/ConfirmContext';
import { getAccessToken } from '../utils/authSession';
import Payroll from './employee/pages/Payroll';

export default function Employees({ showToast }) {
  const { confirm } = useConfirm();
  const [activeModuleTab, setActiveModuleTab] = useState('directory'); // 'directory' | 'payroll'
  const [employees, setEmployees] = useState([]);
  const [promotersList, setPromotersList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPromoters, setLoadingPromoters] = useState(false);
  const [promoterSearchQuery, setPromoterSearchQuery] = useState('');

  // Quick Add User Account Modal State
  const [isQuickAddUserOpen, setIsQuickAddUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    mobile: '',
    roleName: 'TeamMember',
    password: 'User@123'
  });

  // Filters & Search
  const [activeDeptTab, setActiveDeptTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null); // null = Add, non-null = Edit
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [formTab, setFormTab] = useState('personal'); // personal | job | salary | bank | promoters

  // Manual Incentive Grant State (Founder privilege)
  const [manualIncentiveEmp, setManualIncentiveEmp] = useState(null);
  const [manualIncentiveAmount, setManualIncentiveAmount] = useState('');
  const [manualIncentiveNote, setManualIncentiveNote] = useState('');
  const [submittingIncentive, setSubmittingIncentive] = useState(false);

  // Form State
  const emptyForm = {
    userId: '',
    name: '',
    email: '',
    mobile: '',
    address: '',
    aadhaar: '',
    pan: '',
    department: 'Sales',
    designation: 'Sales Executive',
    manager: 'Sanjay Joshi',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    // Salary & Incentives
    basicSalary: '',
    hra: '',
    allowances: '',
    incentivePct: '', // % incentive per product sale
    promoterOverridePct: '', // % override on supervised promoters' sales
    // Bank Details
    bankName: '',
    accountNo: '',
    ifsc: '',
    accountHolder: '',
    branchName: '',
    upiId: '',
    // Assigned Promoters
    assignedPromoters: []
  };

  const [formData, setFormData] = useState(emptyForm);

  // Dynamic fetch users list from database for user account linking
  const fetchUsersList = async () => {
    setLoadingUsers(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/users?limit=500&page=1', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const resData = await res.json();
        const raw = Array.isArray(resData?.data) ? resData.data : (Array.isArray(resData) ? resData : []);
        setUsersList(raw);
      }
    } catch (err) {
      console.warn("Error loading users list:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // User dropdown selection handler
  const handleSelectUser = (selectedId) => {
    if (!selectedId) {
      setFormData(prev => ({
        ...prev,
        userId: '',
        name: '',
        email: '',
        mobile: ''
      }));
      return;
    }

    const found = usersList.find(u => String(u._id || u.id) === String(selectedId));
    if (found) {
      setFormData(prev => ({
        ...prev,
        userId: found._id || found.id,
        name: found.name || prev.name,
        email: found.email || prev.email,
        mobile: found.mobile || prev.mobile,
        designation: found.designationName || found.designation || prev.designation
      }));
    }
  };

  // Quick User Account Creation handler
  const handleQuickCreateUser = async () => {
    if (!newUserData.name?.trim() || !newUserData.email?.trim() || !newUserData.mobile?.trim()) {
      showToast?.("Name, Email, and Mobile are required.", "error");
      return;
    }

    setCreatingUser(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newUserData.name.trim(),
          email: newUserData.email.trim(),
          mobile: newUserData.mobile.trim(),
          password: newUserData.password || 'User@123',
          roleName: newUserData.roleName || 'TeamMember',
          designationName: newUserData.roleName === 'TeamMember' ? 'Sales Executive' : newUserData.roleName,
          approval_status: 'Approved',
          is_active: true
        })
      });

      const data = await res.json();
      if (res.ok && (data.success || data._id || data.data)) {
        const created = data.data || data;
        showToast?.(`User account created for "${created.name}".`, "success");
        setUsersList(prev => [created, ...prev]);
        setFormData(prev => ({
          ...prev,
          userId: created._id || created.id,
          name: created.name,
          email: created.email,
          mobile: created.mobile
        }));
        setIsQuickAddUserOpen(false);
        setNewUserData({
          name: '',
          email: '',
          mobile: '',
          roleName: 'TeamMember',
          password: 'User@123'
        });
      } else {
        showToast?.(data.message || 'Could not create user account.', 'error');
      }
    } catch (err) {
      console.error("Error creating user:", err);
      showToast?.('Error creating user account.', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  // Dynamic fetch promoters list for supervisory assignment
  const fetchPromotersList = async () => {
    setLoadingPromoters(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/promoters?limit=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const resData = await res.json();
      
      const rawList = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.promoters)
            ? resData.promoters
            : [];

      if (rawList.length > 0) {
        const mapped = rawList.map(p => ({
          id: p.promoter_id || p._id || p.id,
          code: p.promoter_code || p.code || `PRO-${p.id || ''}`,
          name: p.full_name || p.name || 'Unnamed Promoter',
          revenue: Number(p.current_month_revenue ?? p.revenue ?? p.total_revenue_generated ?? 0),
          retailers: Number(p.total_retailers_mapped ?? p.retailersAdded ?? p.retailers_count ?? 0),
          status: p.status || (p.is_active ? 'Active' : 'Inactive'),
          assignedEmployee: p.assigned_employee_name || p.assigned_employee || null,
          city: p.allocated_city_name || p.city || '',
          state: p.allocated_state_name || p.state || ''
        }));
        setPromotersList(mapped);
      } else {
        setPromotersList(initialPromoters.map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          revenue: p.revenue || 0,
          retailers: p.retailersAdded || 0,
          status: p.status || 'Active',
          assignedEmployee: p.assigned_employee || null
        })));
      }
    } catch (err) {
      console.error("Error dynamically loading promoters:", err);
      setPromotersList(initialPromoters.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        revenue: p.revenue || 0,
        retailers: p.retailersAdded || 0,
        status: p.status || 'Active',
        assignedEmployee: p.assigned_employee || null
      })));
    } finally {
      setLoadingPromoters(false);
    }
  };

  // Fetch employees & promoters list
  const loadData = () => {
    setLoading(true);
    const token = getAccessToken();
    fetch('/api/employees', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setEmployees(resData.data.map(mapEmployeeRecord));
        } else if (Array.isArray(resData)) {
          setEmployees(resData.map(mapEmployeeRecord));
        } else {
          setEmployees(initialEmployees.map(mapEmployeeRecord));
        }
      })
      .catch(err => {
        console.error("Error loading employees:", err);
        setEmployees(initialEmployees.map(mapEmployeeRecord));
      })
      .finally(() => setLoading(false));

    fetchPromotersList();
    fetchUsersList();
  };

  useEffect(() => {
    loadData();
  }, []);

  const mapEmployeeRecord = (emp) => {
    const salary = emp.salary_structure || {};
    const bank = emp.bank_details || emp.bankInfo || {};
    const personal = emp.personalInfo || {};

    const basic = salary.basic !== undefined ? Number(salary.basic) : (emp.jobInfo?.salary ? parseInt(String(emp.jobInfo.salary).replace(/\D/g, '')) : 45000);
    const hra = salary.hra !== undefined ? Number(salary.hra) : 15000;
    const allowances = salary.allowances !== undefined ? Number(salary.allowances) : 5000;
    const deductions = salary.deductions !== undefined ? Number(salary.deductions) : 0;
    const incentivePct = salary.incentive_pct !== undefined ? Number(salary.incentive_pct) : 5.0;
    const incentiveEarned = salary.incentive_earned !== undefined ? Number(salary.incentive_earned) : 0;
    const promoterOverridePct = salary.promoter_override_pct !== undefined ? Number(salary.promoter_override_pct) : 1.0;

    return {
      id: emp.id || emp.employee_code || emp._id,
      mongoId: emp._id,
      userId: emp.user?._id || emp.user || '',
      name: emp.name || emp.full_name,
      avatar: emp.avatar || emp.profile_photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      email: emp.email,
      mobile: emp.mobile,
      department: emp.department?.name || emp.department || "Sales",
      designation: emp.designation?.title || emp.designation || "Sales Executive",
      manager: emp.manager || emp.reporting_manager?.full_name || emp.reporting_manager || "Sanjay Joshi",
      joiningDate: emp.joiningDate || (emp.joining_date ? new Date(emp.joining_date).toISOString().split('T')[0] : "2024-01-15"),
      status: emp.status || (emp.is_active ? "Active" : "Inactive"),
      personalInfo: {
        address: personal.address || emp.residential_address || '',
        aadhaar: personal.aadhaar || emp.aadhaar_number || '',
        pan: personal.pan || emp.pan_number || ''
      },
      salary_structure: {
        basic: isNaN(basic) ? 45000 : basic,
        hra: isNaN(hra) ? 15000 : hra,
        allowances: isNaN(allowances) ? 5000 : allowances,
        deductions: isNaN(deductions) ? 0 : deductions,
        incentive_pct: isNaN(incentivePct) ? 5.0 : incentivePct,
        incentive_earned: isNaN(incentiveEarned) ? 0 : incentiveEarned,
        promoter_override_pct: isNaN(promoterOverridePct) ? 1.0 : promoterOverridePct
      },
      assigned_promoters: Array.isArray(emp.assigned_promoters) ? emp.assigned_promoters : [],
      bank_details: {
        bank_name: bank.bank_name || bank.bankName || '',
        account_no: bank.account_no || bank.accountNo || '',
        ifsc_code: bank.ifsc_code || bank.ifsc || '',
        account_holder: bank.account_holder || emp.name || emp.full_name || '',
        branch_name: bank.branch_name || '',
        upi_id: bank.upi_id || ''
      },
      performance: emp.performance || [{ month: "Current", target: 500000, achieved: 450000 }],
      history: emp.history || [{ date: "2024-01-15", event: "Joined Huddo Shoes organizational roster." }]
    };
  };

  // Award Manual Performance Incentive by Founder
  const handleAwardManualIncentive = async () => {
    if (!manualIncentiveEmp) return;
    const amt = Number(manualIncentiveAmount);
    if (!amt || amt <= 0) {
      showToast?.('Please enter a valid positive incentive amount.', 'error');
      return;
    }

    setSubmittingIncentive(true);
    try {
      const token = getAccessToken();
      const targetId = manualIncentiveEmp.mongoId || manualIncentiveEmp.id;
      const res = await fetch(`/api/employees/${targetId}/manual-incentive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          amount: amt,
          note: manualIncentiveNote.trim() || 'Performance bonus awarded by Founder'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(data.message || `₹${amt.toLocaleString('en-IN')} incentive credited!`, 'success');
        setEmployees(prev => prev.map(e => {
          if (e.id === manualIncentiveEmp.id || (manualIncentiveEmp.mongoId && e.mongoId === manualIncentiveEmp.mongoId)) {
            return {
              ...e,
              salary_structure: {
                ...e.salary_structure,
                incentive_earned: (e.salary_structure.incentive_earned || 0) + amt
              }
            };
          }
          return e;
        }));

        if (viewingEmployee && (viewingEmployee.id === manualIncentiveEmp.id || viewingEmployee.mongoId === targetId)) {
          setViewingEmployee(prev => ({
            ...prev,
            salary_structure: {
              ...prev.salary_structure,
              incentive_earned: (prev.salary_structure.incentive_earned || 0) + amt
            }
          }));
        }

        setManualIncentiveEmp(null);
        setManualIncentiveAmount('');
        setManualIncentiveNote('');
      } else {
        showToast?.(data.message || 'Failed to award incentive.', 'error');
      }
    } catch (err) {
      console.error('Error awarding manual incentive:', err);
      showToast?.('Failed to submit manual incentive.', 'error');
    } finally {
      setSubmittingIncentive(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingEmpId(null);
    setFormData(emptyForm);
    setFormTab('personal');
    setPromoterSearchQuery('');
    fetchUsersList();
    fetchPromotersList();
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp) => {
    setEditingEmpId(emp.mongoId || emp.id);
    setFormData({
      userId: emp.userId || '',
      name: emp.name,
      email: emp.email,
      mobile: emp.mobile,
      address: emp.personalInfo.address,
      aadhaar: emp.personalInfo.aadhaar,
      pan: emp.personalInfo.pan,
      department: emp.department,
      designation: emp.designation,
      manager: emp.manager,
      joiningDate: emp.joiningDate,
      status: emp.status,
      basicSalary: emp.salary_structure.basic,
      hra: emp.salary_structure.hra,
      allowances: emp.salary_structure.allowances,
      incentivePct: emp.salary_structure.incentive_pct,
      promoterOverridePct: emp.salary_structure.promoter_override_pct,
      bankName: emp.bank_details.bank_name,
      accountNo: emp.bank_details.account_no,
      ifsc: emp.bank_details.ifsc_code,
      accountHolder: emp.bank_details.account_holder,
      branchName: emp.bank_details.branch_name,
      upiId: emp.bank_details.upi_id,
      assignedPromoters: [...emp.assigned_promoters]
    });
    setFormTab('personal');
    setPromoterSearchQuery('');
    fetchUsersList();
    fetchPromotersList();
    setIsAddEditOpen(true);
  };

  // Submit Add / Edit
  const handleSaveEmployee = async () => {
    if (!formData.name || !formData.email || !formData.mobile) {
      showToast?.("Full name, email, and mobile are required.", "error");
      return;
    }

    const payload = {
      user: formData.userId || undefined,
      full_name: formData.name,
      name: formData.name,
      email: formData.email,
      mobile: formData.mobile,
      department: formData.department,
      designation: formData.designation,
      manager: formData.manager,
      joining_date: formData.joiningDate,
      status: formData.status,
      is_active: formData.status === 'Active',
      residential_address: formData.address,
      aadhaar_number: formData.aadhaar,
      pan_number: formData.pan,
      salary_structure: {
        basic: Number(formData.basicSalary || 0),
        hra: Number(formData.hra || 0),
        allowances: Number(formData.allowances || 0),
        incentive_pct: Number(formData.incentivePct || 0),
        incentive_earned: editingEmpId ? (employees.find(e => (e.mongoId === editingEmpId || e.id === editingEmpId))?.salary_structure.incentive_earned || 0) : 0,
        promoter_override_pct: Number(formData.promoterOverridePct || 0)
      },
      assigned_promoters: formData.assignedPromoters,
      bank_details: {
        bank_name: formData.bankName,
        account_no: formData.accountNo,
        ifsc_code: formData.ifsc,
        ifsc: formData.ifsc,
        account_holder: formData.accountHolder || formData.name,
        branch_name: formData.branchName,
        upi_id: formData.upiId
      }
    };

    try {
      const token = getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const isMongoId = editingEmpId && /^[0-9a-fA-F]{24}$/.test(String(editingEmpId));

      if (isMongoId) {
        // Edit PUT
        const res = await fetch(`/api/employees/${editingEmpId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          showToast?.(`Employee "${formData.name}" updated successfully.`, "success");
          setIsAddEditOpen(false);
          loadData();
        } else {
          showToast?.(resData.message || "Failed to update employee record.", "error");
        }
      } else {
        // Create POST
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          showToast?.(`New employee "${formData.name}" added to roster.`, "success");
          setIsAddEditOpen(false);
          loadData();
        } else {
          showToast?.(resData.message || "Failed to save employee record.", "error");
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast?.("Failed to save employee record.", "error");
    }
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    const confirmed = await confirm({
      title: `${nextStatus === 'Inactive' ? 'Deactivate' : 'Activate'} Employee?`,
      message: `Are you sure you want to change ${emp.name}'s status to ${nextStatus}?`,
      confirmText: nextStatus === 'Inactive' ? 'Deactivate' : 'Activate',
      isDestructive: nextStatus === 'Inactive'
    });
    if (!confirmed) return;

    try {
      const token = getAccessToken();
      const targetId = emp.mongoId || emp.id;
      const isMongoId = targetId && /^[0-9a-fA-F]{24}$/.test(String(targetId));
      if (!isMongoId) {
        // Local mock item update
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: nextStatus } : e));
        showToast?.(`Status set to ${nextStatus} for ${emp.name}`, "success");
        return;
      }

      const res = await fetch(`/api/employees/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: nextStatus, is_active: nextStatus === 'Active' })
      });
      if (res.ok) {
        showToast?.(`Status set to ${nextStatus} for ${emp.name}`, "success");
        setEmployees(prev => prev.map(e => (e.id === emp.id || (e.mongoId && e.mongoId === targetId)) ? { ...e, status: nextStatus } : e));
        if (viewingEmployee?.id === emp.id || viewingEmployee?.mongoId === targetId) {
          setViewingEmployee(prev => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (err) {
      showToast?.("Failed to update employee status.", "error");
    }
  };

  // Promoter selection toggle in form
  const togglePromoterAssignment = (promoterName) => {
    setFormData(prev => {
      const exists = prev.assignedPromoters.includes(promoterName);
      return {
        ...prev,
        assignedPromoters: exists 
          ? prev.assignedPromoters.filter(p => p !== promoterName)
          : [...prev.assignedPromoters, promoterName]
      };
    });
  };

  // KPI calculations
  const totalEmployees = employees.length;
  const activeCount = employees.filter(e => e.status === 'Active').length;
  const totalBasePayroll = employees.reduce((acc, e) => acc + (e.salary_structure?.basic || 0), 0);
  const totalIncentivesEarned = employees.reduce((acc, e) => acc + (e.salary_structure?.incentive_earned || 0), 0);
  const totalPromotersSupervised = employees.reduce((acc, e) => acc + (e.assigned_promoters?.length || 0), 0);

  // Filtered employees list
  const filteredEmployees = employees.filter(emp => {
    const matchesDept = activeDeptTab === 'All' || emp.department.toLowerCase() === activeDeptTab.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      emp.name.toLowerCase().includes(q) || 
      emp.id.toLowerCase().includes(q) || 
      emp.email.toLowerCase().includes(q) || 
      emp.mobile.includes(q) ||
      emp.designation.toLowerCase().includes(q);
    return matchesDept && matchesSearch;
  });

  const departmentTabs = ['All', 'Sales', 'Finance', 'Inventory', 'HR', 'Executive'];

  // Table columns definition
  const columns = [
    {
      header: "Employee",
      accessor: "name",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <img 
            src={row.avatar} 
            alt={row.name} 
            className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs" 
          />
          <div>
            <div className="font-bold text-slate-900 font-display flex items-center gap-1.5">
              {row.name}
              <span className="text-[10px] font-mono text-slate-400 font-normal">({row.id})</span>
            </div>
            <div className="text-[11px] text-slate-500">{row.email} · {row.mobile}</div>
          </div>
        </div>
      )
    },
    {
      header: "Department & Role",
      accessor: "department",
      render: (val, row) => (
        <div>
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            {val}
          </span>
          <div className="text-xs font-semibold text-slate-800 mt-1">{row.designation}</div>
        </div>
      )
    },
    {
      header: "Fixed Base Salary",
      accessor: "salary_structure.basic",
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 font-display">₹{(row.salary_structure.basic || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block font-normal">
            +₹{((row.salary_structure.hra || 0) + (row.salary_structure.allowances || 0)).toLocaleString('en-IN')} HRA & Allowances
          </span>
        </div>
      )
    },
    {
      header: "Sales Incentive",
      accessor: "salary_structure.incentive_pct",
      render: (val, row) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
              <Percent className="w-3 h-3" /> {row.salary_structure.incentive_pct || 0}% POS
            </span>
            {Number(row.salary_structure.promoter_override_pct || 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                +{row.salary_structure.promoter_override_pct}% Net
              </span>
            )}
          </div>
          <span className="text-[11px] font-black text-emerald-600 block mt-1">
            +₹{(row.salary_structure.incentive_earned || 0).toLocaleString('en-IN')} earned
          </span>
        </div>
      )
    },
    {
      header: "Total Est. Payout",
      accessor: "total_payout",
      render: (_, row) => {
        const fixed = (row.salary_structure.basic || 0) + (row.salary_structure.hra || 0) + (row.salary_structure.allowances || 0);
        const inc = row.salary_structure.incentive_earned || 0;
        return (
          <div>
            <span className="font-black text-slate-900 font-display text-sm">₹{(fixed + inc).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-500 block">
              Salary: ₹{fixed.toLocaleString('en-IN')} | Inc: ₹{inc.toLocaleString('en-IN')}
            </span>
          </div>
        );
      }
    },
    {
      header: "Promoters Supervised",
      accessor: "assigned_promoters",
      render: (val, row) => (
        <div>
          {row.assigned_promoters && row.assigned_promoters.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-w-[180px]">
              {row.assigned_promoters.map((pName, i) => (
                <span key={i} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {pName}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">None assigned</span>
          )}
        </div>
      )
    },
    {
      header: "Status",
      accessor: "status",
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
          val === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }`}>
          {val === 'Active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {val}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setViewingEmployee(row)} 
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer" 
            title="Inspect Profile & Bank Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleOpenEdit(row)} 
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-brand-orange rounded-lg transition-colors cursor-pointer" 
            title="Edit Employee & Salary Structure"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleToggleStatus(row)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
              row.status === 'Active' 
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {row.status === 'Active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-orange" />
            Employee Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage organizational staff roster, base salaries, product-wise sales incentives, bank accounts, and assigned promoter networks.
          </p>
        </div>
        
        {activeModuleTab === 'directory' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* Top Module Level View Switcher (Separate Register / Directory from Dynamic Payroll) */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveModuleTab('directory')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeModuleTab === 'directory'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Directory</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModuleTab('payroll')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeModuleTab === 'payroll'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Team Member Monthly Payroll</span>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Attendance + Incentive
          </span>
        </button>
      </div>

      {activeModuleTab === 'payroll' ? (
        <Payroll showToast={showToast} isSelfView={false} />
      ) : (
        <>

      {/* Top KPI Cards (Like Retailers module) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 font-display">{totalEmployees}</span>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Across all branches</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-600 mt-2 font-display">{activeCount}</span>
          <span className="text-[11px] text-emerald-700 font-medium mt-1">{totalEmployees ? Math.round((activeCount / totalEmployees) * 100) : 0}% Attendance Rate</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fixed Base Payroll</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 font-display">₹{totalBasePayroll.toLocaleString('en-IN')}</span>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Monthly recurring basic</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales Incentives Earned</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold text-amber-600 mt-2 font-display">+₹{totalIncentivesEarned.toLocaleString('en-IN')}</span>
          <span className="text-[11px] text-amber-700 font-medium mt-1">POS & network distribution</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Promoters</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-extrabold text-blue-600 mt-2 font-display">{totalPromotersSupervised}</span>
          <span className="text-[11px] text-blue-700 font-medium mt-1">Under staff supervision</span>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Department Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {departmentTabs.map(dept => (
            <button
              key={dept}
              onClick={() => setActiveDeptTab(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeDeptTab === dept
                  ? 'bg-brand-dark text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {dept} {dept === 'All' ? `(${totalEmployees})` : `(${employees.filter(e => e.department.toLowerCase() === dept.toLowerCase()).length})`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, ID, role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
          />
        </div>
      </div>

      {/* Main DataTable */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <DataTable
          columns={columns}
          data={filteredEmployees}
          pagination={true}
        />
      </div>

      {/* SIDE INSPECT DRAWER (Matching Retailers inspect drawer) */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-in-right">
            {/* Drawer Header */}
            <div>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <img 
                    src={viewingEmployee.avatar} 
                    alt={viewingEmployee.name} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                      {viewingEmployee.name}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingEmployee.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {viewingEmployee.status}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">{viewingEmployee.designation} · {viewingEmployee.department} ({viewingEmployee.id})</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingEmployee(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body Content */}
              <div className="p-6 space-y-6">
                {/* 1. Contact & Identity Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Contact & Organization Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                    <div>
                      <span className="text-slate-400 font-medium">Email Address:</span>
                      <p className="font-bold text-slate-800 break-all">{viewingEmployee.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Mobile Number:</span>
                      <p className="font-bold text-slate-800">{viewingEmployee.mobile}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Reporting Manager:</span>
                      <p className="font-bold text-slate-800">{viewingEmployee.manager}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Joining Date:</span>
                      <p className="font-bold text-slate-800">{viewingEmployee.joiningDate}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Aadhaar Card:</span>
                      <p className="font-mono text-slate-800">{viewingEmployee.personalInfo?.aadhaar || 'Not uploaded'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">PAN Card:</span>
                      <p className="font-mono text-slate-800">{viewingEmployee.personalInfo?.pan || 'Not uploaded'}</p>
                    </div>
                  </div>
                  {viewingEmployee.personalInfo?.address && (
                    <div className="text-xs border-t border-slate-200/60 pt-2 text-slate-600">
                      <span className="text-slate-400 font-medium">Residential Address:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{viewingEmployee.personalInfo.address}</p>
                    </div>
                  )}
                </div>

                {/* 2. Base Monthly Salary Structure Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Base Monthly Rate (Attendance-Linked)
                    </h4>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Prorated on Attendance
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3 rounded-lg">
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Basic Salary</span>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-display">
                        ₹{(viewingEmployee.salary_structure.basic || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">HRA</span>
                      <p className="text-sm font-extrabold text-slate-700 mt-0.5 font-display">
                        ₹{(viewingEmployee.salary_structure.hra || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Allowances</span>
                      <p className="text-sm font-extrabold text-slate-700 mt-0.5 font-display">
                        ₹{(viewingEmployee.salary_structure.allowances || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-500">Configured Monthly Rate:</span>
                    <span className="font-bold text-slate-800">
                      ₹{(
                        (viewingEmployee.salary_structure.basic || 0) + 
                        (viewingEmployee.salary_structure.hra || 0) + 
                        (viewingEmployee.salary_structure.allowances || 0)
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic leading-tight">
                    * Final payable base is computed each month from logged attendance: (Monthly Rate ÷ 30) × (Present Days + Half Days × 0.5 + Paid Leaves).
                  </p>
                </div>

                {/* 3. Variable Sales Incentive Card */}
                <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-3 shadow-xs bg-amber-50/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-600" /> Variable Sales & POS Incentives
                    </h4>
                    <button
                      onClick={() => {
                        setManualIncentiveEmp(viewingEmployee);
                        setManualIncentiveAmount('');
                        setManualIncentiveNote('');
                      }}
                      className="px-2.5 py-1 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Award Incentive</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-white border border-amber-100 p-3 rounded-lg">
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Direct POS Incentive:</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm font-black text-amber-600 font-display">
                          {viewingEmployee.salary_structure.incentive_pct}%
                        </span>
                        <span className="text-[10px] text-slate-400">per sale</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Promoter Override:</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm font-black text-blue-600 font-display">
                          {viewingEmployee.salary_structure.promoter_override_pct}%
                        </span>
                        <span className="text-[10px] text-slate-400">on network</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 block">Total Accrued Performance Incentive:</span>
                      <span className="text-[10px] text-emerald-600">POS Sales, direct collections & bonuses</span>
                    </div>
                    <span className="text-lg font-black text-emerald-600 font-display">
                      +₹{(viewingEmployee.salary_structure.incentive_earned || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs">
                    <span className="font-extrabold text-slate-700">Combined Estimated Payout (Salary + Incentive):</span>
                    <span className="text-base font-black text-slate-900 font-display">
                      ₹{(
                        (viewingEmployee.salary_structure.basic || 0) + 
                        (viewingEmployee.salary_structure.hra || 0) + 
                        (viewingEmployee.salary_structure.allowances || 0) + 
                        (viewingEmployee.salary_structure.incentive_earned || 0)
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 3. Complete Bank Account Details Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Bank & Payout Details
                  </h4>
                  
                  {viewingEmployee.bank_details.account_no ? (
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                      <div>
                        <span className="text-slate-400 font-medium">Bank Name:</span>
                        <p className="font-bold text-slate-900">{viewingEmployee.bank_details.bank_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Account Number:</span>
                        <p className="font-mono font-bold text-slate-900">{viewingEmployee.bank_details.account_no}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">IFSC Code:</span>
                        <p className="font-mono font-bold text-slate-800">{viewingEmployee.bank_details.ifsc_code || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Account Holder:</span>
                        <p className="font-bold text-slate-800">{viewingEmployee.bank_details.account_holder || viewingEmployee.name}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Branch Name:</span>
                        <p className="text-slate-700">{viewingEmployee.bank_details.branch_name || 'Main Branch'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">UPI ID:</span>
                        <p className="font-mono text-slate-700">{viewingEmployee.bank_details.upi_id || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400 font-semibold">
                      No bank details configured. Click Edit to add bank information.
                    </div>
                  )}
                </div>

                {/* 4. Supervised Promoters Network */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-500" /> Supervised Promoter Network
                    </h4>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {viewingEmployee.assigned_promoters?.length || 0} Assigned
                    </span>
                  </div>

                  {viewingEmployee.assigned_promoters && viewingEmployee.assigned_promoters.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                      {viewingEmployee.assigned_promoters.map((pName, idx) => {
                        const promoObj = promotersList.find(p => p.name.toLowerCase() === pName.toLowerCase());
                        return (
                          <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                {pName[0]}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block">{pName}</span>
                                <span className="text-[10px] text-slate-400">{promoObj?.code || 'Promoter'}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 block">₹{(promoObj?.revenue || 0).toLocaleString('en-IN')}</span>
                              <span className="text-[10px] text-slate-400">{promoObj?.retailers || 0} Retailers Mapped</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg text-center">
                      No promoters currently assigned to this employee.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Buttons */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  const emp = viewingEmployee;
                  setViewingEmployee(null);
                  handleOpenEdit(emp);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Full Profile & Salary</span>
              </button>

              <button
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingEmpId ? `Edit Employee - ${formData.name}` : "Add New Employee"}
        onConfirm={handleSaveEmployee}
        confirmText={editingEmpId ? "Update Employee" : "Register Employee"}
      >
        <div className="space-y-4">
          {/* Sub-tabs inside modal */}
          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-2 pb-1">
            {[
              { id: 'personal', label: '1. Personal Info' },
              { id: 'job', label: '2. Job & Dept' },
              { id: 'salary', label: '3. Salary & Incentive' },
              { id: 'bank', label: '4. Bank Details' },
              { id: 'promoters', label: '5. Supervised Promoters' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setFormTab(t.id);
                  if (t.id === 'promoters') {
                    fetchPromotersList();
                  }
                }}
                className={`text-xs font-bold py-1.5 px-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  formTab === t.id 
                    ? 'bg-brand-orange text-white' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PERSONAL INFO */}
          {formTab === 'personal' && (
            <div className="space-y-3">
              {/* Existing User Account Dropdown with Add User Button */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Select Existing User</span>
                  </label>
                  {formData.userId ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ User Account Linked
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Select or add new user below
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={formData.userId || ''}
                      onChange={(e) => handleSelectUser(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 cursor-pointer"
                    >
                      <option value="">-- Choose Existing User ({usersList.length} Registered) --</option>
                      {usersList.map(u => (
                        <option key={u.id || u._id} value={u.id || u._id}>
                          {u.name} — {u.email || u.mobile} ({u.roleName || u.role?.name || 'User'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQuickAddUserOpen(true)}
                    className="flex items-center gap-1 px-3 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                    title="Add a brand new user account"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add User</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Select an existing user to auto-populate profile details, or click <strong>+ Add User</strong> if not registered.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Amit Kumar" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    placeholder="amit@huddoerp.in" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Number *</label>
                  <input 
                    type="text" 
                    placeholder="9988771122" 
                    value={formData.mobile} 
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Residential Address</label>
                <textarea 
                  rows="2" 
                  placeholder="Flat/House number, street, city, pincode..." 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aadhaar Card No</label>
                  <input 
                    type="text" 
                    placeholder="4567-8912-3456" 
                    value={formData.aadhaar} 
                    onChange={(e) => setFormData({...formData, aadhaar: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PAN Card No</label>
                  <input 
                    type="text" 
                    placeholder="ABCDE1234F" 
                    value={formData.pan} 
                    onChange={(e) => setFormData({...formData, pan: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOB & DEPT */}
          {formTab === 'job' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                  <select 
                    value={formData.department} 
                    onChange={(e) => setFormData({...formData, department: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Finance">Finance</option>
                    <option value="Inventory">Inventory</option>
                    <option value="HR">HR</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Designation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sales Executive" 
                    value={formData.designation} 
                    onChange={(e) => setFormData({...formData, designation: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reporting Manager</label>
                  <input 
                    type="text" 
                    placeholder="Sanjay Joshi" 
                    value={formData.manager} 
                    onChange={(e) => setFormData({...formData, manager: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Joining Date</label>
                  <input 
                    type="date" 
                    value={formData.joiningDate} 
                    onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employment Status</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: SALARY & INCENTIVE */}
          {formTab === 'salary' && (
            <div className="space-y-5">
              {/* Part 1: Fixed Monthly Salary */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" /> 1. Base Monthly Rate Components
                  </h4>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Prorated on Attendance
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Basic Salary (₹) *</label>
                    <input 
                      type="number" 
                      placeholder="45000" 
                      value={formData.basicSalary ?? ''} 
                      onChange={(e) => setFormData({...formData, basicSalary: e.target.value === '' ? '' : e.target.value})} 
                      className="w-full text-sm font-bold border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">HRA (₹)</label>
                    <input 
                      type="number" 
                      placeholder="15000" 
                      value={formData.hra ?? ''} 
                      onChange={(e) => setFormData({...formData, hra: e.target.value === '' ? '' : e.target.value})} 
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Allowances (₹)</label>
                    <input 
                      type="number" 
                      placeholder="5000" 
                      value={formData.allowances ?? ''} 
                      onChange={(e) => setFormData({...formData, allowances: e.target.value === '' ? '' : e.target.value})} 
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Variable Sales Incentive */}
              <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-600" /> 2. Variable Sales & POS Incentives
                  </h4>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                    Performance Based
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Direct Product Sales Incentive % *
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1" 
                        placeholder="5.0" 
                        value={formData.incentivePct ?? ''} 
                        onChange={(e) => setFormData({...formData, incentivePct: e.target.value === '' ? '' : e.target.value})} 
                        className="w-full text-sm font-bold border border-slate-200 rounded-lg p-2.5 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Incentive on direct counter/POS sales</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Promoter Network Override %
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1" 
                        placeholder="1.0" 
                        value={formData.promoterOverridePct ?? ''} 
                        onChange={(e) => setFormData({...formData, promoterOverridePct: e.target.value === '' ? '' : e.target.value})} 
                        className="w-full text-sm font-bold border border-slate-200 rounded-lg p-2.5 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Override on assigned promoters' sales</span>
                  </div>
                </div>

                {editingEmpId && (
                  <div className="p-3 bg-white border border-amber-200/80 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Current Accrued Incentive Balance:</span>
                      <span className="font-mono text-xs text-slate-400">Maintained automatically via direct sales & manual awards</span>
                    </div>
                    <span className="text-base font-black text-emerald-600 font-display">
                      +₹{(employees.find(e => e.id === editingEmpId)?.salary_structure?.incentive_earned || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BANK DETAILS */}
          {formTab === 'bank' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900">
                <span className="font-bold block">Payroll Bank Account Details:</span>
                Used for automated monthly salary disbursements and incentive settlement credits.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. HDFC Bank" 
                    value={formData.bankName} 
                    onChange={(e) => setFormData({...formData, bankName: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Number</label>
                  <input 
                    type="text" 
                    placeholder="50100412345678" 
                    value={formData.accountNo} 
                    onChange={(e) => setFormData({...formData, accountNo: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IFSC Code</label>
                  <input 
                    type="text" 
                    placeholder="HDFC0000020" 
                    value={formData.ifsc} 
                    onChange={(e) => setFormData({...formData, ifsc: e.target.value.toUpperCase()})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Holder Name</label>
                  <input 
                    type="text" 
                    placeholder="Full name as on bank passbook" 
                    value={formData.accountHolder} 
                    onChange={(e) => setFormData({...formData, accountHolder: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Branch Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Vashi Sector 15" 
                    value={formData.branchName} 
                    onChange={(e) => setFormData({...formData, branchName: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">UPI ID</label>
                  <input 
                    type="text" 
                    placeholder="name@okhdfcbank" 
                    value={formData.upiId} 
                    onChange={(e) => setFormData({...formData, upiId: e.target.value})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ASSIGNED PROMOTERS */}
          {formTab === 'promoters' && (
            <div className="space-y-3">
              {/* Header card with Live Sync */}
              <div className="flex items-start justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 gap-2">
                <div>
                  <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <Award className="w-4 h-4 text-indigo-600 shrink-0" /> Supervise Promoters Network
                  </span>
                  <span className="text-[11px] text-indigo-700/90 mt-0.5 block leading-relaxed">
                    Assign promoters to this employee. The employee can oversee their activities and receive promoter override incentives on their sales volume.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchPromotersList}
                  disabled={loadingPromoters}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-100/60 rounded-lg text-indigo-700 font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Dynamically refresh promoters list from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPromoters ? 'animate-spin text-brand-orange' : 'text-indigo-600'}`} />
                  <span>{loadingPromoters ? 'Syncing...' : 'Sync Live'}</span>
                </button>
              </div>

              {/* Dynamic Filter & Selected Count Toolbar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search promoter by name, code or city..."
                    value={promoterSearchQuery}
                    onChange={(e) => setPromoterSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-orange/20"
                  />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 whitespace-nowrap">
                  {formData.assignedPromoters.length} of {promotersList.length} Selected
                </span>
              </div>

              {/* Dynamic Promoters List Container */}
              <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                {loadingPromoters && promotersList.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
                    <span className="text-xs font-semibold">Fetching promoters from live database...</span>
                  </div>
                ) : (
                  (() => {
                    const filtered = promotersList.filter(pr => {
                      if (!promoterSearchQuery.trim()) return true;
                      const q = promoterSearchQuery.toLowerCase().trim();
                      return (
                        pr.name?.toLowerCase().includes(q) ||
                        pr.code?.toLowerCase().includes(q) ||
                        pr.city?.toLowerCase().includes(q) ||
                        pr.state?.toLowerCase().includes(q)
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-slate-400">
                          {promoterSearchQuery ? `No promoters found matching "${promoterSearchQuery}".` : 'No promoters registered in network.'}
                        </div>
                      );
                    }

                    return filtered.map(pr => {
                      const isChecked = formData.assignedPromoters.includes(pr.name);
                      return (
                        <label 
                          key={pr.id || pr.code} 
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-indigo-50/80 border-indigo-300 shadow-xs' 
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePromoterAssignment(pr.name)}
                              className="w-4 h-4 text-brand-orange rounded border-slate-300 focus:ring-brand-orange cursor-pointer"
                            />
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {pr.name ? pr.name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{pr.name}</span>
                                {pr.status && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    pr.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {pr.status}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                <span className="font-mono text-slate-500">{pr.code}</span>
                                <span>·</span>
                                <span>{pr.retailers} Retailers Mapped</span>
                                {pr.city && (
                                  <>
                                    <span>·</span>
                                    <span>{pr.city}</span>
                                  </>
                                )}
                              </div>
                              {pr.assignedEmployee && pr.assignedEmployee !== formData.name && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                  Currently under: {pr.assignedEmployee}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right pl-2">
                            <span className="text-xs font-bold text-slate-900 block font-mono">
                              ₹{(pr.revenue || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 block">Sales Volume</span>
                          </div>
                        </label>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Quick Modal: Award Manual Performance Incentive */}
      {manualIncentiveEmp && (
        <Modal
          isOpen={!!manualIncentiveEmp}
          onClose={() => setManualIncentiveEmp(null)}
          title={`Award Manual Incentive: ${manualIncentiveEmp.name}`}
          size="md"
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setManualIncentiveEmp(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAwardManualIncentive}
                disabled={submittingIncentive || !manualIncentiveAmount}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {submittingIncentive ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Credit Incentive Payout</span>
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span className="font-bold block">Founder Performance Reward:</span>
              This will directly increment the employee's accrued incentive payout wallet and create an approved commission record in their ledger.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Incentive Amount (₹) *
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={manualIncentiveAmount}
                onChange={(e) => setManualIncentiveAmount(e.target.value)}
                className="w-full text-base font-bold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reason / Performance Note
              </label>
              <input
                type="text"
                placeholder="e.g. Monthly sales target achievement & excellent retailer onboarding"
                value={manualIncentiveNote}
                onChange={(e) => setManualIncentiveNote(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-400 font-medium block">Current Accrued Incentive:</span>
                <span className="font-bold text-slate-800">₹{(manualIncentiveEmp.salary_structure?.incentive_earned || 0).toLocaleString('en-IN')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <div>
                <span className="text-emerald-600 font-medium block">New Expected Incentive:</span>
                <span className="font-black text-emerald-600 font-display text-sm">
                  ₹{((manualIncentiveEmp.salary_structure?.incentive_earned || 0) + Number(manualIncentiveAmount || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Modal: Create New User Account */}
      {isQuickAddUserOpen && (
        <Modal
          isOpen={isQuickAddUserOpen}
          onClose={() => setIsQuickAddUserOpen(false)}
          title="Add New User Account"
          size="md"
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddUserOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickCreateUser}
                disabled={creatingUser || !newUserData.name || !newUserData.email || !newUserData.mobile}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {creatingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating User...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Create & Select User</span>
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-[11px]">
              Create a new user login account. Once created, it will be automatically linked and selected in the dropdown.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Full Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Ramesh Patel" 
                value={newUserData.name} 
                onChange={(e) => setNewUserData({...newUserData, name: e.target.value})} 
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address *</label>
                <input 
                  type="email" 
                  placeholder="ramesh@huddoerp.in" 
                  value={newUserData.email} 
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} 
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mobile Number *</label>
                <input 
                  type="text" 
                  placeholder="9876543210" 
                  value={newUserData.mobile} 
                  onChange={(e) => setNewUserData({...newUserData, mobile: e.target.value})} 
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">System Role</label>
                <select 
                  value={newUserData.roleName} 
                  onChange={(e) => setNewUserData({...newUserData, roleName: e.target.value})} 
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                >
                  <option value="TeamMember">TeamMember (Sales / POS)</option>
                  <option value="SalesExecutive">SalesExecutive</option>
                  <option value="HR">HR Manager</option>
                  <option value="Finance">Finance Manager</option>
                  <option value="Inventory">Inventory Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Default Password</label>
                <input 
                  type="text" 
                  value={newUserData.password} 
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})} 
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
        </>
      )}
    </div>
  );
}
