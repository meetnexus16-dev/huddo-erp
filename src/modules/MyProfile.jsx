import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Camera, Trash2, Key, ShieldCheck, Clock, UserCheck
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const displayLabel = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.name || value.title || value.label || '';
  return String(value);
};

const normalizeProfile = (data) => ({
  ...data,
  role: displayLabel(data.role),
  department: displayLabel(data.department),
  designation: displayLabel(data.designation),
  city: displayLabel(data.city),
  state: displayLabel(data.state),
  country: displayLabel(data.country),
  reporting_manager: displayLabel(data.reporting_manager),
  joining_date: displayLabel(data.joining_date) || (data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : ''),
});

export default function MyProfile({ showToast, userRole = 'Founder', onSwitchRole }) {
  const toast = showToast || ((msg, type) => console.log(`[Toast] ${type}: ${msg}`));
  const [activeSubTab, setActiveSubTab] = useState('overview'); // overview | edit | password
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit form state
  const [formData, setFormData] = useState({
    mobile: '',
    alternate_mobile: '',
    gender: '',
    blood_group: '',
    marital_status: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    date_of_birth: '',
    emergency_contact: {
      contact_person: '',
      relationship: '',
      mobile: ''
    }
  });

  // Password change state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load profile data on mount
  useEffect(() => {
    fetchProfile();
    if (window.location.hash === '#change-password') {
      setActiveSubTab('password');
      window.location.hash = ''; // Clear it
    }
  }, []);

  const fetchProfile = () => {
    setLoading(true);
    authFetch('/profile')
      .then(res => {
        if (res.success && res.data) {
          const normalized = normalizeProfile(res.data);
          setProfile(normalized);
          setFormData({
            mobile: normalized.mobile || '',
            alternate_mobile: normalized.alternate_mobile || '',
            gender: normalized.gender || '',
            blood_group: normalized.blood_group || '',
            marital_status: normalized.marital_status || '',
            address: normalized.address || '',
            city: normalized.city || '',
            state: normalized.state || '',
            country: normalized.country || '',
            pincode: normalized.pincode || '',
            date_of_birth: normalized.date_of_birth || '',
            emergency_contact: normalized.emergency_contact || {
              contact_person: '',
              relationship: '',
              mobile: ''
            }
          });
        } else {
          toast(res.message || "Failed to load profile.", "error");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading profile:", err);
        toast("Error connecting to server.", "error");
        setLoading(false);
      });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmergencyChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      emergency_contact: {
        ...prev.emergency_contact,
        [name]: value
      }
    }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.mobile) {
      toast("Mobile number is required.", "error");
      return;
    }

    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast("Profile details updated successfully!", "success");
          fetchProfile();
          // Notify app to sync header avatars/names
          window.dispatchEvent(new Event('profileUpdated'));
          setActiveSubTab('overview');
        } else {
          toast(data.message || "Failed to update profile.", "error");
        }
      })
      .catch(err => {
        toast("Error updating profile.", "error");
        console.error(err);
      });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast("All password fields are required.", "error");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast("Confirm password must match the new password.", "error");
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast("Password must be at least 6 characters long.", "error");
      return;
    }

    fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast("Password changed successfully! Logging out...", "success");
          setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
          // Log out the user after password change to enforce re-auth
          setTimeout(() => {
            if (onSwitchRole) onSwitchRole('Logout');
          }, 1500);
        } else {
          toast(data.message || "Failed to change password.", "error");
        }
      })
      .catch(err => {
        toast("Error changing password.", "error");
        console.error(err);
      });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5 MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast("File size exceeds 5 MB limit.", "error");
      return;
    }

    // Validate format
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      toast("Invalid file format. Allowed: JPG, JPEG, PNG, WEBP.", "error");
      return;
    }

    const uploadForm = new FormData();
    uploadForm.append('profile_photo', file);

    fetch('/api/profile/upload-photo', {
      method: 'POST',
      body: uploadForm
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast("Profile photo updated successfully!", "success");
          fetchProfile();
          window.dispatchEvent(new Event('profileUpdated'));
        } else {
          toast(data.message || "Upload failed.", "error");
        }
      })
      .catch(err => {
        toast("Error uploading file.", "error");
        console.error(err);
      });
  };

  const handleRemovePhoto = () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    fetch('/api/profile/remove-photo', {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast("Profile photo removed.", "success");
          fetchProfile();
          window.dispatchEvent(new Event('profileUpdated'));
        } else {
          toast(data.message || "Removal failed.", "error");
        }
      })
      .catch(err => {
        toast("Error removing photo.", "error");
        console.error(err);
      });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2.5">
        <Clock className="w-6 h-6 animate-spin text-brand-orange" />
        <span className="text-sm font-semibold">Loading profile parameters...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-semibold">
        Could not resolve database profile credentials.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">My Profile</h1>
        <p className="text-sm text-slate-500">Manage your credentials, view assignments, and edit contact parameters.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none gap-4">
        <button 
          onClick={() => setActiveSubTab('overview')}
          className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'overview' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'
          }`}
        >
          Profile Overview
        </button>
        <button 
          onClick={() => setActiveSubTab('edit')}
          className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'edit' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'
          }`}
        >
          Edit Profile
        </button>
        <button 
          onClick={() => setActiveSubTab('password')}
          className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'password' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'
          }`}
        >
          Password & Security
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile photo sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between text-center min-h-[300px]">
          <div>
            <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-slate-200 shadow-sm group">
              <img 
                src={profile.profile_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                alt="Profile Photo" 
                className="w-full h-full object-cover" 
              />
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-opacity">
                <Camera className="w-5 h-5 mb-1" />
                <span>Upload New</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            <h2 className="text-base font-bold text-slate-800 mt-4 font-display">{profile.name}</h2>
            <p className="text-xs text-brand-orange font-bold font-display mt-0.5">{profile.designation || profile.role}</p>

            <div className="border-t border-slate-100 my-4"></div>

            <div className="space-y-3.5 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">User ID / ID:</span>
                <span className="font-extrabold text-slate-700 truncate max-w-[120px]">{profile._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Role Name:</span>
                <span className="font-bold text-slate-700">{profile.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Department:</span>
                <span className="font-bold text-slate-700">{profile.department || 'Not Mapped'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Shift Timing:</span>
                <span className="font-bold text-slate-700">{profile.shift_timing}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-150 flex gap-2">
            <label className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 rounded-lg border border-slate-200 cursor-pointer block text-center">
              Replace Photo
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
            </label>
            {profile.profile_photo && (
              <button 
                onClick={handleRemovePhoto}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab 1: Overview */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Personal Information Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-orange" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs font-semibold">
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Full Name</span>
                    <span className="text-slate-800 mt-0.5 font-bold">{profile.name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Email Address</span>
                    <span className="text-slate-800 mt-0.5 font-bold">{profile.email}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Mobile Number</span>
                    <span className="text-slate-800 mt-0.5 font-bold">{profile.mobile}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Alternate Mobile</span>
                    <span className="text-slate-800 mt-0.5">{profile.alternate_mobile || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Gender</span>
                    <span className="text-slate-800 mt-0.5">{profile.gender || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Date of Birth</span>
                    <span className="text-slate-800 mt-0.5">
                      {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Blood Group</span>
                    <span className="text-slate-800 mt-0.5">{profile.blood_group || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-semibold">Marital Status</span>
                    <span className="text-slate-800 mt-0.5">{profile.marital_status || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Address & Emergency Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Address Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-orange" />
                    Address & Regional Info
                  </h3>
                  <div className="space-y-3.5 text-xs">
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-semibold">Residential Address</span>
                      <span className="text-slate-800 mt-0.5">{profile.address || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">City:</span>
                      <span className="font-bold text-slate-700">{profile.city || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">State / UT:</span>
                      <span className="font-bold text-slate-700">{profile.state || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Country:</span>
                      <span className="font-bold text-slate-700">{profile.country || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Pincode:</span>
                      <span className="font-bold text-slate-700">{profile.pincode || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-orange" />
                      Emergency Contact
                    </h3>
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Contact Person:</span>
                        <span className="font-bold text-slate-800">{profile.emergency_contact?.contact_person || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Relationship:</span>
                        <span className="font-bold text-slate-800">{profile.emergency_contact?.relationship || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Mobile Number:</span>
                        <span className="font-bold text-brand-orange">{profile.emergency_contact?.mobile || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Account details */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-orange" />
                  Account Logs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Account Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Joined Date:</span>
                    <span className="font-bold text-slate-700">{profile.joining_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Last Login:</span>
                    <span className="font-bold text-slate-700">
                      {profile.last_login ? new Date(profile.last_login).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'First Session'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Employee / Code ID:</span>
                    <span className="font-extrabold text-slate-800">{profile.employee_id || 'N/A'}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Edit profile details */}
          {activeSubTab === 'edit' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Edit Permitted Profile Fields
              </h3>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mobile Number *</label>
                    <input 
                      type="text" 
                      name="mobile" 
                      value={formData.mobile} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Alternate Mobile</label>
                    <input 
                      type="text" 
                      name="alternate_mobile" 
                      value={formData.alternate_mobile} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-800 font-medium"
                    >
                      <option value="">Select Gender...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Blood Group</label>
                    <input 
                      type="text" 
                      name="blood_group" 
                      placeholder="e.g. A+"
                      value={formData.blood_group} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Marital Status</label>
                    <select
                      name="marital_status"
                      value={formData.marital_status}
                      onChange={handleInputChange}
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-800 font-medium"
                    >
                      <option value="">Select Status...</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Date of Birth</label>
                    <input 
                      type="date" 
                      name="date_of_birth" 
                      value={formData.date_of_birth} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Pincode</label>
                    <input 
                      type="text" 
                      name="pincode" 
                      value={formData.pincode} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Residential Address</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                    className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">City</label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">State</label>
                    <input 
                      type="text" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Country</label>
                    <input 
                      type="text" 
                      name="country" 
                      value={formData.country} 
                      onChange={handleInputChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 my-4 pt-2"></div>
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Emergency Contact</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Contact Person</label>
                    <input 
                      type="text" 
                      name="contact_person" 
                      value={formData.emergency_contact.contact_person} 
                      onChange={handleEmergencyChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Relationship</label>
                    <input 
                      type="text" 
                      name="relationship" 
                      value={formData.emergency_contact.relationship} 
                      onChange={handleEmergencyChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mobile Number</label>
                    <input 
                      type="text" 
                      name="mobile" 
                      value={formData.emergency_contact.mobile} 
                      onChange={handleEmergencyChange} 
                      className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 gap-3">
                  <button 
                    type="button"
                    onClick={() => setActiveSubTab('overview')}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3: Security & Change password */}
          {activeSubTab === 'password' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                Change Account Password
              </h3>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Current Password *</label>
                  <input 
                    type="password" 
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">New Password *</label>
                  <input 
                    type="password" 
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Confirm New Password *</label>
                  <input 
                    type="password" 
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className="px-3 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800"
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
