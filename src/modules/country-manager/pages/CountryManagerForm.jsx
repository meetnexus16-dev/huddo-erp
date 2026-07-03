// CM-MODULE: Frontend component for adding and editing Country Managers
import React, { useState, useEffect } from 'react';
import { User, Shield, Briefcase, CreditCard, ArrowLeft, Save, RefreshCw, Upload, Globe } from 'lucide-react';
import { initialUsers, GEOGRAPHY } from '../../../mockData';
import { DefaultPasswordNotice } from '../../../components/Common';
import { getUserCreatedMessage } from '../../../constants/defaultCredentials';

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
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Load Reporting To users (Founder/CEO/Admin from system)
  useEffect(() => {
    // CM-MODULE: Read users from existing mock database for reporting hierarchy dropdown
    const admins = initialUsers.filter(u => ['Founder', 'CEO', 'Admin'].includes(u.role));
    setReportingToOptions(admins);
  }, []);

  // Load countries from backend (show all; assigned ones are disabled)
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const endpoint = isEdit
          ? `/api/hierarchy/available-countries?exclude_user_id=${cmId}`
          : '/api/hierarchy/available-countries';
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setCountries(data.data);
            if (!isEdit) {
              setFormData((prev) => ({
                ...prev,
                assigned_country_id: ''
              }));
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching countries:", err);
      }

      if (isEdit) {
        const res = await fetch('/api/countries');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setCountries(data.data.map((country) => ({
              _id: country._id,
              name: country.name,
              available: true,
              manager_name: country.manager?.name || null
            })));
            return;
          }
        }
      }

      const fallbackCountries = GEOGRAPHY.countries.map(c => ({
        _id: c.id,
        name: c.name,
        available: true
      }));
      setCountries(fallbackCountries);
      if (!isEdit && fallbackCountries.length > 0) {
        setFormData(prev => ({ ...prev, assigned_country_id: fallbackCountries[0]._id }));
      }
    };
    fetchCountries();
  }, [isEdit, cmId]);

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

    const selectedCountry = countries.find((c) => String(c._id) === String(formData.assigned_country_id));
    if (formData.assigned_country_id && !isEdit && selectedCountry && selectedCountry.available === false) {
      tempErrors.assigned_country_id = selectedCountry.manager_name
        ? `${selectedCountry.name} is already assigned to ${selectedCountry.manager_name}`
        : `${selectedCountry.name} already has a Country Manager assigned`;
    }

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

  const getProfileImage = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150";
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File size exceeds 10MB limit.", "error");
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setPreviewUrl('');
    setFormData(prev => ({ ...prev, profile_photo_url: '' }));
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
      
      const fd = new FormData();
      fd.append('user_id', formData.user_id || `U_CM_${Date.now()}`);
      fd.append('full_name', formData.full_name);
      fd.append('mobile_number', formData.mobile_number);
      fd.append('email', formData.email);
      fd.append('assigned_country_id', formData.assigned_country_id || '');
      fd.append('department', formData.department);
      fd.append('designation', formData.designation);
      fd.append('reporting_to', formData.reporting_to);
      fd.append('joining_date', formData.joining_date);
      fd.append('salary_structure', formData.salary_structure ? String(formData.salary_structure) : '');
      fd.append('residential_address', formData.residential_address);
      fd.append('aadhaar_number', formData.aadhaar_number);
      fd.append('pan_number', formData.pan_number);
      fd.append('bank_name', formData.bank_name);
      fd.append('bank_account_number', formData.bank_account_number);
      fd.append('bank_ifsc', formData.bank_ifsc);
      fd.append('profile_photo_url', formData.profile_photo_url);

      if (imageFile) {
        fd.append('profile_photo', imageFile);
      }

      const res = await fetch(url, {
        method,
        body: fd
      });

      if (res.ok) {
        const responseData = await res.json();
        if (!responseData.cm_id && !isEdit) {
          showToast(responseData.message || "Save operation failed", "error");
          return;
        }
        showToast(
          isEdit
            ? 'Country Manager profile updated successfully.'
            : getUserCreatedMessage(responseData.message || 'Country Manager registered successfully.'),
          'success'
        );
        onNavigate(`detail-${isEdit ? cmId : responseData.cm_id}`);
      } else {
        const errResult = await res.json().catch(() => ({}));
        showToast(errResult.message || errResult.error || "Save operation failed", "error");
        if (errResult.existing_manager_id) {
          const openExisting = window.confirm(
            `${errResult.message || 'Validation error'}\n\nWould you like to open the existing Country Manager profile?`
          );
          if (openExisting) {
            onNavigate(`detail-${errResult.existing_manager_id}`);
          }
        }
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
        {!isEdit && <DefaultPasswordNotice />}
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Profile Photo</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                  {(previewUrl || formData.profile_photo_url) ? (
                    <img 
                      src={previewUrl || getProfileImage(formData.profile_photo_url)} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Upload Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                    {(previewUrl || formData.profile_photo_url) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-1.5 border border-rose-200 hover:border-rose-350 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Max size 10MB. (Optional)</span>
                </div>
              </div>
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Assigned Country (Optional)</label>
              <select
                name="assigned_country_id"
                value={formData.assigned_country_id}
                onChange={handleChange}
                className="w-full text-sm border border-slate-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none cursor-pointer font-semibold"
              >
                <option value="">Not Assigned — assign later from Hierarchy</option>
                {countries.length === 0 ? (
                  <option value="">No countries found</option>
                ) : (
                  countries.map(c => (
                    <option key={c._id} value={c._id} disabled={c.available === false}>
                      {c.available === false
                        ? `${c.name} — Assigned to ${c.manager_name || 'another manager'}`
                        : c.name}
                    </option>
                  ))
                )}
              </select>
              {!isEdit && countries.length > 0 && !countries.some((c) => c.available) && (
                <p className="text-[10px] text-amber-700 font-medium mt-1">All countries already have a Country Manager assigned. You can still register without a country and assign later.</p>
              )}
              <p className="text-[10px] text-slate-400 font-medium mt-1">Optional at registration. Assign or change country later from Hierarchy or by editing this profile.</p>
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
