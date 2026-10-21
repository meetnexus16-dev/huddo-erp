import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Eye, Edit2, CheckCircle, XCircle, AlertCircle, FileText, 
  ChevronRight, X, PhoneCall, CreditCard, Percent, Award, Briefcase, 
  DollarSign, Building2, Shield, Calendar, Search, ArrowUpRight, RefreshCw
} from 'lucide-react';
import { initialEmployees, initialPromoters } from '../mockData';
import { DataTable, Modal } from '../components/Common';
import { useConfirm } from '../context/ConfirmContext';

export default function Employees({ showToast }) {
  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState([]);
  const [promotersList, setPromotersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPromoters, setLoadingPromoters] = useState(false);
  const [promoterSearchQuery, setPromoterSearchQuery] = useState('');

  // Filters & Search
  const [activeDeptTab, setActiveDeptTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null); // null = Add, non-null = Edit
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [formTab, setFormTab] = useState('personal'); // personal | job | salary | bank | promoters

  // Form State
  const emptyForm = {
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
    basicSalary: 45000,
    hra: 15000,
    allowances: 5000,
    incentivePct: 5.0, // % incentive per product sale
    promoterOverridePct: 1.0, // % override on supervised promoters' sales
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

  // Dynamic fetch promoters list for supervisory assignment
  const fetchPromotersList = async () => {
    setLoadingPromoters(true);
    try {
      const res = await fetch('/api/promoters?limit=100');
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
    fetch('/api/employees')
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const mapEmployeeRecord = (emp) => {
    const salary = emp.salary_structure || {};
    const bank = emp.bank_details || emp.bankInfo || {};
    const personal = emp.personalInfo || {};

    return {
      id: emp.id || emp.employee_code || emp._id,
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
        basic: Number(salary.basic ?? (emp.jobInfo?.salary ? parseInt(String(emp.jobInfo.salary).replace(/\D/g, '')) : 45000)) || 45000,
        hra: Number(salary.hra ?? 15000) || 15000,
        allowances: Number(salary.allowances ?? 5000) || 5000,
        incentive_pct: Number(salary.incentive_pct ?? 5.0) || 5.0,
        incentive_earned: Number(salary.incentive_earned ?? 12500) || 12500,
        promoter_override_pct: Number(salary.promoter_override_pct ?? 1.0) || 1.0
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

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingEmpId(null);
    setFormData(emptyForm);
    setFormTab('personal');
    setPromoterSearchQuery('');
    fetchPromotersList();
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp) => {
    setEditingEmpId(emp.id);
    setFormData({
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
        incentive_earned: editingEmpId ? (employees.find(e => e.id === editingEmpId)?.salary_structure.incentive_earned || 0) : 0,
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
      if (editingEmpId) {
        // Edit PUT
        const res = await fetch(`/api/employees/${editingEmpId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast?.(`Employee "${formData.name}" updated successfully.`, "success");
        }
      } else {
        // Create POST
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast?.(`New employee "${formData.name}" added to roster.`, "success");
        }
      }
      setIsAddEditOpen(false);
      loadData();
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
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, is_active: nextStatus === 'Active' })
      });
      if (res.ok) {
        showToast?.(`Status set to ${nextStatus} for ${emp.name}`, "success");
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: nextStatus } : e));
        if (viewingEmployee?.id === emp.id) {
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
      header: "Base Salary",
      accessor: "salary_structure.basic",
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 font-display">₹{(row.salary_structure.basic || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block font-normal">/ month</span>
        </div>
      )
    },
    {
      header: "Product Incentive",
      accessor: "salary_structure.incentive_pct",
      render: (val, row) => (
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            <Percent className="w-3 h-3" /> {row.salary_structure.incentive_pct}%
          </span>
          <span className="text-[11px] font-bold text-emerald-600 block mt-1">
            +₹{(row.salary_structure.incentive_earned || 0).toLocaleString('en-IN')} earned
          </span>
        </div>
      )
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
        
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Payroll</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 font-display">₹{totalBasePayroll.toLocaleString('en-IN')}</span>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Monthly recurring</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Incentives</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold text-amber-600 mt-2 font-display">₹{totalIncentivesEarned.toLocaleString('en-IN')}</span>
          <span className="text-[11px] text-amber-700 font-medium mt-1">Product-wise distribution</span>
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

                {/* 2. Salary & Incentive Structure Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-500" /> Salary & Incentive Structure
                    </h4>
                    <span className="text-[11px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Product Incentive: {viewingEmployee.salary_structure.incentive_pct}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-lg">
                    <div>
                      <span className="text-slate-400 font-medium">Basic Salary</span>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5 font-display">
                        ₹{(viewingEmployee.salary_structure.basic || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">HRA + Allowances</span>
                      <p className="text-base font-extrabold text-slate-700 mt-0.5 font-display">
                        ₹{((viewingEmployee.salary_structure.hra || 0) + (viewingEmployee.salary_structure.allowances || 0)).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Earned Incentive</span>
                      <p className="text-base font-extrabold text-emerald-600 mt-0.5 font-display">
                        +₹{(viewingEmployee.salary_structure.incentive_earned || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold p-3 bg-brand-orange/5 border border-brand-orange/20 rounded-lg">
                    <div>
                      <span className="text-slate-700 font-bold block">Promoter Network Override:</span>
                      <span className="text-[11px] text-slate-500">Override on supervised promoters' total sales</span>
                    </div>
                    <span className="text-sm font-extrabold text-brand-orange">{viewingEmployee.salary_structure.promoter_override_pct}%</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-600">Total Estimated Monthly Payout:</span>
                    <span className="text-lg font-black text-slate-900 font-display">
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
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900">
                <span className="font-bold block">Product Incentive Configuration:</span>
                Employee will receive a fixed percentage incentive whenever a product sale occurs under their network.
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Basic Salary (₹) *</label>
                  <input 
                    type="number" 
                    placeholder="45000" 
                    value={formData.basicSalary} 
                    onChange={(e) => setFormData({...formData, basicSalary: Number(e.target.value)})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HRA (₹)</label>
                  <input 
                    type="number" 
                    placeholder="15000" 
                    value={formData.hra} 
                    onChange={(e) => setFormData({...formData, hra: Number(e.target.value)})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Allowances (₹)</label>
                  <input 
                    type="number" 
                    placeholder="5000" 
                    value={formData.allowances} 
                    onChange={(e) => setFormData({...formData, allowances: Number(e.target.value)})} 
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Product Sales Incentive % *
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      placeholder="5.0" 
                      value={formData.incentivePct} 
                      onChange={(e) => setFormData({...formData, incentivePct: Number(e.target.value)})} 
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Incentive on product sales price</span>
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
                      value={formData.promoterOverridePct} 
                      onChange={(e) => setFormData({...formData, promoterOverridePct: Number(e.target.value)})} 
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Override on assigned promoter sales</span>
                </div>
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
    </div>
  );
}
