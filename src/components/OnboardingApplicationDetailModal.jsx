import React from 'react';
import { User, MapPin, Building2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Modal } from './Common';
import {
  formatRoleLabel,
  getUserDetailSections
} from '../utils/onboardingApplicationDisplay';

const SECTION_ICONS = {
  Account: FileText,
  Application: FileText,
  'Personal Details': User,
  Territory: MapPin,
  'Business Details': Building2,
  Rejection: FileText
};

function statusBadgeClass(status) {
  if (status === 'Approved' || status === 'Active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Rejected' || status === 'Inactive' || status === 'Suspended') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

function getHeaderBadge(user) {
  if (user.approval_status && user.approval_status !== 'Approved') {
    return user.approval_status;
  }
  return user.status || (user.is_active ? 'Active' : 'Inactive');
}

function DetailRow({ label, value, highlight }) {
  const display = value === undefined || value === null || value === '' ? '—' : String(value);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      {highlight ? (
        <span className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-bold ${statusBadgeClass(display)}`}>
          {display}
        </span>
      ) : (
        <span className="text-sm text-slate-800 font-medium break-words">{display}</span>
      )}
    </div>
  );
}

export default function OnboardingApplicationDetailModal({
  isOpen,
  onClose,
  application,
  title = 'Application Details',
  showAdminActions = false,
  onApprove,
  onReject,
  actionLoading = false,
  loading = false
}) {
  if (!application && !isOpen) return null;

  const sections = application ? getUserDetailSections(application) : [];
  const roleName = application?.roleName || application?.role?.name;
  const isPending = application?.approval_status === 'Pending';
  const headerBadge = application ? getHeaderBadge(application) : '';

  const adminFooter = showAdminActions && isPending ? (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={actionLoading}
        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-60"
      >
        Close
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={actionLoading}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60"
      >
        <XCircle size={16} /> Reject
      </button>
      <button
        type="button"
        onClick={onApprove}
        disabled={actionLoading}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60"
      >
        <CheckCircle size={16} /> Approve
      </button>
    </>
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-2xl"
      cancelText="Close"
      footerContent={adminFooter}
      hideFooter={!adminFooter}
    >
      <div className="space-y-5">
        {loading && (
          <p className="text-sm text-slate-500 py-8 text-center">Loading user details...</p>
        )}
        {!loading && application && (
          <>
            <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-4">
              <p className="text-lg font-bold text-slate-900">{application.name || '—'}</p>
              <p className="text-sm text-slate-600 mt-0.5">
                {formatRoleLabel(roleName)}
                {(application.user_code || application.employee_id)
                  ? ` · ${application.user_code || application.employee_id}`
                  : application.promoter_code_used
                    ? ` · Code ${application.promoter_code_used}`
                    : ''}
              </p>
              <span className={`inline-flex mt-2 px-2.5 py-1 rounded-md text-xs font-bold ${statusBadgeClass(headerBadge)}`}>
                {headerBadge}
              </span>
            </div>

            {sections.map((section) => {
              const Icon = SECTION_ICONS[section.title] || FileText;
              return (
                <div key={section.title} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <Icon size={16} className="text-orange-500" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{section.title}</h4>
                  </div>
                  <div className="px-4 py-1">
                    {section.fields.map((field) => (
                      <DetailRow
                        key={`${section.title}-${field.label}`}
                        label={field.label}
                        value={field.value}
                        highlight={field.label === 'Status' || field.label === 'Account Status' || field.label === 'Approval Status'}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </Modal>
  );
}
