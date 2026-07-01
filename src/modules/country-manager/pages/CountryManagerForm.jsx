// CM-MODULE: Frontend component for adding and editing Country Managers
import React, { useState, useEffect } from 'react';
import { User, Shield, Briefcase, CreditCard, ArrowLeft, Save, RefreshCw, Upload, Globe } from 'lucide-react';
import { initialUsers, GEOGRAPHY } from '../../../mockData';

export default function CountryManagerForm({ cmId, onNavigate, showToast }) {
  const isEdit = !!cmId;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [reportingToOptions, setReportingToOptions] = useState([]);
  const [countries, setCountries] = useState([]);

  // Form Fields State
  const [formData, setFormData] = useState({
    user_id: '',
    full_name: '',
    mobile_number: '',
    email: '',
    profile_photo_url: '',
    assigned_country_id: '',
    department: 'Sales',
    designation: 'Country Manager',
    reporting_to: 'U1', // Rohan Hudda
    joining_date: new Date().toISOString().split('T')[0],
    salary_structure: '',
    residential_address: '',
    aadhaar_number: '',
    pan_number: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: ''
  });

  const [errors, setErrors] = useState({});

  // Load Reporting To users (Founder/CEO/Admin from system)
  useEffect(() => {
    // CM-MODULE: Read users from existing mock database for reporting hierarchy dropdown
    const admins = initialUsers.filter(u => ['Founder', 'CEO', 'Admin'].includes(u.role));
    setReportingToOptions(admins);
  }, []);

  // Load countries from backend
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/countries');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setCountries(data.data);
            if (!isEdit) {
              setFormData(prev => ({ ...prev, assigned_country_id: data.data[0]._id }));
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching countries:", err);
      }

      // Fallback
      const fallbackCountries = GEOGRAPHY.countries.map(c => ({ _id: c.id, name: c.name }));
      setCountries(fallbackCountries);
      if (!isEdit && fallbackCountries.length > 0) {
        setFormData(prev => ({ ...prev, assigned_country_id: fallbackCountries[0]._id }));
      }
    };
    fetchCountries();
  }, [isEdit]);

  // Fetch existing details if editing
  useEffect(() => {
    if (isEdit) {
      const fetchDetails = async () => {
        setFetching(true);
        try {
          const res = await fetch(`/api/country-managers/${cmId}/profile`);
          if (res.ok) {
            const data = await res.json();
            // Map values
            setFormData({
              user_id: data.user_id || '',
              full_name: data.full_name || '',
              mobile_number: data.mobile_number || '',
              email: data.email || '',
              profile_photo_url: data.profile_photo_url || '',
              assigned_country_id: String(data.assigned_country_id || ''),
              department: data.department || 'Sales',
              designation: data.designation || 'Country Manager',
              reporting_to: data.reporting_to || 'U1',
              joining_date: data.joining_date || new Date().toISOString().split('T')[0],
              salary_structure: data.salary_structure || '',
              residential_address: data.residential_address || '',
              aadhaar_number: data.aadhaar_number || '',
              pan_number: data.pan_number || '',
              bank_account_number: data.bank_account_number || '',
              bank_ifsc: data.bank_ifsc || '',
              bank_name: data.bank_name || ''
            });
          } else {
            showToast("Failed to load Country Manager profile details", "error");
            onNavigate("list");
          }
        } catch (err) {
          showToast("Failed to fetch Country Manager details", "error");
        } finally {
          setFetching(false);
        }
      };
      fetchDetails();
    }
  }, [cmId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const tempErrors = {};
    if (!formData.full_name) tempErrors.full_name = "Full Name is required";
    
    // Mobile Validation (10 digits)
    if (!formData.mobile_number) {
      tempErrors.mobile_number = "Mobile Number is required";
    } else if (!/^\d{10}$/.test(formData.mobile_number)) {
      tempErrors.mobile_number = "Mobile must be a 10-digit number";
    }

    // Email Validation
    if (!formData.email) {
      tempErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      tempErrors.email = "Invalid email format";
    }

    if (!formData.assigned_country_id) tempErrors.assigned_country_id = "Assigned Country is required";

    // PAN Validation if provided
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.pan_number)) {
      tempErrors.pan_number = "Invalid PAN card format (e.g. ABCDE1234F)";
    }

    // Aadhaar Validation if provided
    if (formData.aadhaar_number && !/^\d{4}-\d{4}-\d{4}$/.test(formData.aadhaar_number) && !/^\d{12}$/.test(formData.aadhaar_number)) {
      tempErrors.aadhaar_number = "Aadhaar must be a 12-digit number (or formatted as XXXX-XXXX-XXXX)";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please correct the validation errors in the form.", "error");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/country-managers/${cmId}` : '/api/country-managers';
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        salary_structure: formData.salary_structure ? Number(formData.salary_structure) : null,
        assigned_country_id: formData.assigned_country_id,
        // If creating new, link user_id to a new simulated ID
        user_id: formData.user_id || `U_CM_${Date.now()}`
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const responseData = await res.json();
        showToast(
          isEdit 
            ? "Country Manager profile updated successfully." 
            : "Country Manager registered successfully.",
          "success"
        );
        onNavigate(`detail-${isEdit ? cmId : responseData.cm_id}`);
      } else {
        const errResult = await res.json();
        showToast(errResult.error || "Save operation failed", "error");
      }
    } catch (err) {
      showToast("Error communicating with servers.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-orange" />
          <span>Retrieving profile logs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 cm-form-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate("list")}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            {isEdit ? "Edit Country Manager Profile" : "Register Country Manager"}
          </h1>
          <p className="text-sm text-slate-500">
            {isEdit ? "Modify professional credentials and regional configurations." : "Set up a new country director node in the system."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A: Personal Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-brand-orange" />
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Section A — Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`w-full text-sm border rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 ${
                  errors.full_name ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-brand-orange'
                }`}
                placeholder="Enter full name"
              />
              {errors.full_name && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mobile Number *</label>
              <input
                type="text"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                className={`w-full text-sm border rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 ${
                  errors.mobile_number ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-brand-orange'
                }`}
                placeholder="10-digit number"
                maxLength={10}
              />
              {errors.mobile_number && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.mobile_number}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full text-sm border rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 ${
                  errors.email ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-brand-orange'
                }`}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Profile Photo URL</label>
              <input
                type="text"
                name="profile_photo_url"
                value={formData.profile_photo_url}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
                placeholder="https://image-link.com/photo.jpg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Aadhaar Number</label>
              <input
                type="text"
                name="aadhaar_number"
                value={formData.aadhaar_number}
                onChange={handleChange}
                className={`w-full text-sm border rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 ${
                  errors.aadhaar_number ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-brand-orange'
                }`}
                placeholder="12-digit number"
                maxLength={14}
              />
              {errors.aadhaar_number && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.aadhaar_number}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">PAN Number</label>
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleChange}
                className={`w-full text-sm border rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 ${
                  errors.pan_number ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-brand-orange'
                }`}
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
              />
              {errors.pan_number && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.pan_number}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Residential Address</label>
            <textarea
              name="residential_address"
              value={formData.residential_address}
              onChange={handleChange}
              rows="3"
              className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
              placeholder="Enter complete address details..."
            />
          </div>
        </div>

        {/* Section B: Employment Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Briefcase className="w-4 h-4 text-brand-orange" />
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Section B — Employment Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                disabled
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-500 font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                disabled
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-500 font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Joining Date</label>
              <input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Reporting To *</label>
              <select
                name="reporting_to"
                value={formData.reporting_to}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none cursor-pointer font-semibold"
              >
                {reportingToOptions.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Salary Structure (₹ / month)</label>
              <input
                type="number"
                name="salary_structure"
                value={formData.salary_structure}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
                placeholder="e.g. 150000"
              />
            </div>
          </div>
        </div>

        {/* Section C: Country Assignment */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-brand-orange" />
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Section C — Country Assignment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Assigned Country *</label>
              <select
                name="assigned_country_id"
                value={formData.assigned_country_id}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none cursor-pointer font-semibold"
              >
                {countries.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-medium mt-1">This Country Manager will automatically supervise all states and cities allocated under this country.</p>
            </div>
          </div>
        </div>

        {/* Section D: Bank Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-brand-orange" />
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Section D — Bank Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Bank Name</label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
                placeholder="Bank Name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Bank Account Number</label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
                placeholder="Account Number"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">IFSC Code</label>
              <input
                type="text"
                name="bank_ifsc"
                value={formData.bank_ifsc}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
                placeholder="IFSC Code"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate("list")}
            className="px-5 py-2.5 border border-slate-250 hover:border-slate-350 bg-white text-slate-700 font-bold rounded-lg text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 text-white font-bold rounded-lg text-sm shadow-sm transition-colors cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEdit ? "Update Profile" : "Register Node"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
