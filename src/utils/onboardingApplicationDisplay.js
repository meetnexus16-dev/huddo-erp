const ROLE_LABELS = {
  CountryManager: 'Country Manager',
  StateManager: 'State Manager',
  CityManager: 'City Manager',
  Retailer: 'Retailer',
  Promoter: 'Promoter'
};

export function formatRoleLabel(roleName) {
  if (!roleName) return '—';
  return ROLE_LABELS[roleName] || roleName;
}

export function formatApprovalStatus(status) {
  if (!status) return '—';
  return status;
}

export function formatSubmittedDate(createdAt) {
  if (!createdAt) return '—';
  return new Date(createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getTerritoryDisplay(meta = {}) {
  const parts = [
    meta.requested_country?.name || meta.requested_country_name,
    meta.requested_state?.name || meta.requested_state_name,
    meta.requested_city?.name || meta.requested_city_name
  ].filter(Boolean);
  return parts.length ? parts.join(' → ') : '—';
}

function formatSourceLabel(source) {
  if (source === 'referral') return 'Referral link / code';
  if (source === 'self') return 'Self registration';
  if (source === 'admin') return 'Admin submission';
  return source || '—';
}

export function getTerritoryFromUser(user = {}) {
  const meta = user.onboarding_meta || {};
  const country = user.country?.name || meta.requested_country?.name || meta.requested_country_name;
  const state = user.state?.name || meta.requested_state?.name || meta.requested_state_name;
  const city = user.city?.name || meta.requested_city?.name || meta.requested_city_name;
  const path = [country, state, city].filter(Boolean).join(' → ');
  return { country: country || '—', state: state || '—', city: city || '—', path: path || '—' };
}

export function getUserDetailSections(user) {
  if (!user) return [];

  const meta = user.onboarding_meta || {};
  const roleName = user.roleName || user.role?.name;
  const territory = getTerritoryFromUser(user);
  const isApprovedUser = user.approval_status === 'Approved' || !user.approval_status;

  const accountFields = [
    { label: 'Account Status', value: user.status || (user.is_active ? 'Active' : 'Inactive') },
    { label: 'Role', value: formatRoleLabel(roleName) }
  ];

  if (user.user_code || user.employee_id) {
    accountFields.unshift({ label: 'User Code', value: user.user_code || user.employee_id });
  }
  if (user.departmentName || user.department?.name || user.department) {
    accountFields.push({
      label: 'Department',
      value: user.departmentName || user.department?.name || user.department
    });
  }
  if (user.designationName || user.designation?.title) {
    accountFields.push({
      label: 'Designation',
      value: user.designationName || user.designation?.title
    });
  }
  if (user.approval_status) {
    accountFields.push({ label: 'Approval Status', value: formatApprovalStatus(user.approval_status) });
  }
  if (user.onboarding_source) {
    accountFields.push({ label: 'Source', value: formatSourceLabel(user.onboarding_source) });
  }
  if (user.createdAt) {
    accountFields.push({ label: isApprovedUser ? 'Created On' : 'Submitted On', value: formatSubmittedDate(user.createdAt) });
  }
  if (user.last_login) {
    accountFields.push({ label: 'Last Login', value: formatSubmittedDate(user.last_login) });
  }
  if (user.promoter_code_used) {
    accountFields.push({ label: 'Referrer Code', value: user.promoter_code_used });
  }
  if (user.promoted_by?.name) {
    accountFields.push({ label: 'Referred By', value: user.promoted_by.name });
  }
  if (user.approval_status === 'Approved' && user.approved_at) {
    accountFields.push({ label: 'Approved On', value: formatSubmittedDate(user.approved_at) });
  }

  const sections = [
    { title: 'Account', fields: accountFields },
    {
      title: 'Personal Details',
      fields: [
        { label: 'Full Name', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Mobile', value: user.mobile }
      ]
    },
    {
      title: 'Territory',
      fields: [
        { label: 'Country', value: territory.country },
        { label: 'State', value: territory.state },
        { label: 'City', value: territory.city },
        { label: 'Territory Path', value: territory.path }
      ]
    }
  ];

  if (roleName === 'Retailer') {
    sections.push({
      title: 'Business Details',
      fields: [
        { label: 'Business Name', value: meta.business_name || '—' },
        { label: 'Owner Name', value: meta.owner_name || '—' },
        { label: 'Shop Address', value: meta.shop_address || '—' },
        { label: 'GST Number', value: meta.gst_number || user.gst_number || '—' },
        { label: 'PAN Number', value: meta.pan_number || user.pan_number || '—' },
        { label: 'Aadhaar Number', value: meta.aadhaar_number || user.aadhaar_number || '—' }
      ]
    });
  }

  if (user.approval_status === 'Rejected' && user.rejection_reason) {
    sections.push({
      title: 'Rejection',
      fields: [{ label: 'Reason', value: user.rejection_reason }]
    });
  }

  return sections;
}

export function getOnboardingApplicationSections(user) {
  return getUserDetailSections(user);
}
