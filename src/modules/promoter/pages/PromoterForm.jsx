// PROMO-MODULE: Promoter Add/Edit form implementation with data validation and file upload progress simulations.

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { DefaultPasswordNotice } from '../../../components/Common';
import { getUserCreatedMessage } from '../../../constants/defaultCredentials';

export default function PromoterForm({ promoterId, onNavigate, showToast }) {
  const isEdit = !!promoterId;
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    email: '',
    address: '',
    profile_photo_url: '',
    aadhaar_number: '',
    pan_number: '',
    gst_number: '',
    bank_name: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_ifsc: '',
    royalty_percentage: 5.00
  });

  // Mock Upload Progress State
  const [uploadProgress, setUploadProgress] = useState({
    aadhaar: null,
    pan: null,
    gst: null,
    bank: null
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    aadhaar: null,
    pan: null,
    gst: null,
    bank: null
  });

  // Fetch promoter details if editing
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      fetch(`/api/promoters/${promoterId}`)
        .then(res => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then(data => {
          setFormData({
            full_name: data.full_name || '',
            mobile_number: data.mobile_number || '',
            email: data.email || '',
            address: data.address || '',
            profile_photo_url: data.profile_photo_url || '',
            aadhaar_number: data.aadhaar_number || '',
            pan_number: data.pan_number || '',
            gst_number: data.gst_number || '',
            bank_name: data.bank_name || '',
            bank_account_holder: data.bank_account_holder || '',
            bank_account_number: data.bank_account_number || '',
            bank_ifsc: data.bank_ifsc || '',
            royalty_percentage: Number(data.royalty_percentage || 5.00)
          });
        })
        .catch(err => {
          showToast("Failed to fetch promoter details.", "error");
          onNavigate('list');
        })
        .finally(() => setLoading(false));
    }
  }, [promoterId, isEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Simulate file upload with progress bar
  const handleFileUpload = (field, file) => {
    if (!file) return;
    setUploadProgress(prev => ({ ...prev, [field]: 0 }));
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 25;
      setUploadProgress(prev => ({ ...prev, [field]: currentProgress }));
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploadedFiles(prev => ({ ...prev, [field]: file.name }));
        showToast(`${file.name} uploaded successfully.`, "success");
      }
    }, 200);
  };

  const validateForm = () => {
    // PROMO-MODULE: Form Validations
    if (!formData.full_name.trim()) {
      showToast("Full Name is required.", "error");
      return false;
    }
    if (!/^\d{10}$/.test(formData.mobile_number)) {
      showToast("Mobile Number must be exactly 10 digits.", "error");
      return false;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      showToast("Please enter a valid email address.", "error");
      return false;
    }
    if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number.replace(/-/g, ''))) {
      showToast("Aadhaar Number must be 12 digits.", "error");
      return false;
    }
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      showToast("Please enter a valid PAN Number format (e.g. ABCDE1234F).", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/promoters/${promoterId}` : '/api/promoters/register';
      const method = isEdit ? 'PUT' : 'POST';
      
      // Seed default/hidden geographic details on register (stored in DB but hidden from UI)
      const payload = {
        ...formData,
        allocated_country_id: 1,
        allocated_state_id: 1,
        allocated_city_id: 1,
        allocated_country_name: "India",
        allocated_state_name: "Maharashtra",
        allocated_city_name: "Mumbai"
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok) {
        showToast(
          isEdit
            ? 'Promoter details updated.'
            : getUserCreatedMessage(result.message || `Promoter registered. Code: ${result.promoter_code}`),
          'success'
        );
        onNavigate(isEdit ? `detail-${promoterId}` : `detail-${result.promoter_id}`);
      } else {
        showToast(result.error || "Operation failed.", "error");
      }
    } catch (err) {
      showToast("An error occurred during submission.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-sm font-semibold text-slate-500">Loading profile form...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Back */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onNavigate('list')}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">{isEdit ? "Edit Promoter Profile" : "Register New Promoter"}</h1>
          <p className="text-xs text-slate-500">Define independent business partners, KYC particulars, and payout bank accounts.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEdit && <DefaultPasswordNotice />}
        {/* Section A: Personal Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display">Section A — Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Full Name*</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="Enter promoter's full name"
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Mobile Number*</label>
              <input
                type="text"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="10-digit mobile number"
                maxLength={10}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="email@example.com"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Profile Photo URL</label>
              <input
                type="text"
                name="profile_photo_url"
                value={formData.profile_photo_url}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="https://example.com/photo.jpg"
              />
            </div>
            <div className="flex flex-col md:col-span-2">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Residential Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="Complete street address details"
              />
            </div>
          </div>
        </div>

        {/* Section B: KYC Documents */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display">Section B — KYC Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Aadhaar Number</label>
              <input
                type="text"
                name="aadhaar_number"
                value={formData.aadhaar_number}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="12-digit Aadhaar number"
                maxLength={14}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">PAN Number</label>
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="10-character PAN card code"
                maxLength={10}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">GST Number</label>
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="15-character GSTIN number"
                maxLength={15}
              />
            </div>
          </div>
        </div>

        {/* Section C: Bank Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display">Section C — Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Bank Name</label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="Bank Name (e.g. HDFC Bank)"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Account Holder Name</label>
              <input
                type="text"
                name="bank_account_holder"
                value={formData.bank_account_holder}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="Name as in bank account"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Account Number</label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="Savings/Current account number"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">IFSC Code</label>
              <input
                type="text"
                name="bank_ifsc"
                value={formData.bank_ifsc}
                onChange={handleInputChange}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
                placeholder="IFSC Code"
                maxLength={11}
              />
            </div>
          </div>
        </div>

        {/* Section D: Royalty Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display">Section D — Royalty Configuration</h3>
          <div className="flex flex-col max-w-sm">
            <label className="text-[11px] uppercase font-bold text-slate-400 mb-1">Default Royalty Percentage (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="royalty_percentage"
                value={formData.royalty_percentage}
                onChange={handleInputChange}
                step={0.01}
                min={0}
                max={100}
                className="text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold w-32"
              />
              <span className="text-xs text-slate-400 font-semibold">Default royalty applied to all retailer billings</span>
            </div>
          </div>
        </div>

        {/* Section E: Document Uploads */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display">Section E — Document Uploads</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Aadhaar File */}
            <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Aadhaar Card (PDF/Image)</span>
              {uploadedFiles.aadhaar ? (
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Uploaded</span>
                </div>
              ) : uploadProgress.aadhaar !== null ? (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-brand-orange h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.aadhaar}%` }}></div>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer p-3 hover:bg-slate-100 rounded-lg transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Select File (Max 5MB)</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload('aadhaar', e.target.files[0])} />
                </label>
              )}
            </div>

            {/* PAN File */}
            <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">PAN Card (PDF/Image)</span>
              {uploadedFiles.pan ? (
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Uploaded</span>
                </div>
              ) : uploadProgress.pan !== null ? (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-brand-orange h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.pan}%` }}></div>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer p-3 hover:bg-slate-100 rounded-lg transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Select File</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload('pan', e.target.files[0])} />
                </label>
              )}
            </div>

            {/* GST File */}
            <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GST Certificate (Optional)</span>
              {uploadedFiles.gst ? (
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Uploaded</span>
                </div>
              ) : uploadProgress.gst !== null ? (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-brand-orange h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.gst}%` }}></div>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer p-3 hover:bg-slate-100 rounded-lg transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Select File</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload('gst', e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Bank Passbook / Cheque File */}
            <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Passbook / Cheque (Optional)</span>
              {uploadedFiles.bank ? (
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Uploaded</span>
                </div>
              ) : uploadProgress.bank !== null ? (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-brand-orange h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.bank}%` }}></div>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer p-3 hover:bg-slate-100 rounded-lg transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Select File</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload('bank', e.target.files[0])} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate('list')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover disabled:bg-brand-orange/60 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "Registering..." : isEdit ? "Update Profile" : "Register Promoter"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
