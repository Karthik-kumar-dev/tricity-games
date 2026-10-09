'use client';

import { useState } from 'react';
import {
  X,
  ShieldAlert,
  Phone,
  User,
  Users,
  Ticket,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  XCircle,
  Trash2,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Building,
  GraduationCap,
  Copy,
  Check,
} from 'lucide-react';
import { Report, ReportStatus, Participant, PassHolder } from '@/lib/types';
import { formatPhoneForDisplay, normalizePhone } from '@/lib/validation';

interface StudentMatchDetails {
  participant?: Participant;
  passHolder?: PassHolder;
  partner?: Participant | null;
}

interface ReportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  reportedDetails: StudentMatchDetails | null;
  reporterDetails: StudentMatchDetails | null;
  onUpdateStatus: (id: string, status: ReportStatus) => Promise<void>;
  onDeleteReport: (report: Report) => Promise<void>;
}

export function ReportDetailsModal({
  isOpen,
  onClose,
  report,
  reportedDetails,
  reporterDetails,
  onUpdateStatus,
  onDeleteReport,
}: ReportDetailsModalProps) {
  const [updatingStatus, setUpdatingStatus] = useState<ReportStatus | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen || !report) return null;

  const reportedPhoneDigits = (report.reported_phone_normalized || report.reported_phone).replace(/\D/g, '');
  const reporterPhoneDigits = (report.reporter_phone || '').replace(/\D/g, '');

  const categoryLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
    unresponsive: { label: 'Unresponsive Partner', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    wrong_number: { label: 'Wrong / Fake Number', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    absent: { label: 'Absent / Left Event', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    inappropriate: { label: 'Inappropriate Behavior', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
    other: { label: 'Other Incident', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  };

  const catMeta = categoryLabels[report.category] || {
    label: report.category,
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
  };

  const handleStatusChange = async (newStatus: ReportStatus) => {
    if (newStatus === report.status) return;
    setUpdatingStatus(newStatus);
    try {
      await onUpdateStatus(report.id, newStatus);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCopyDetails = () => {
    const text = `HACKATHON REPORT [${report.id}]
Reported Phone: ${report.reported_phone_normalized || report.reported_phone}
Category: ${catMeta.label}
Details: ${report.details || 'None'}
Reporter: ${report.reporter_name || 'Anonymous'} (${report.reporter_phone || 'No phone'})
Status: ${report.status}
Date: ${new Date(report.created_at).toLocaleString()}`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 110,
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="glass-panel animate-pop-in"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '20px 26px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Incident Report Dossier
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#64748b',
                    background: '#f1f5f9',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  #{report.id.slice(0, 10)}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Filed on {new Date(report.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyDetails}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', gap: '5px' }}
              title="Copy incident summary to clipboard"
            >
              {copiedText ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copiedText ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Status & Category Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Category:</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  background: catMeta.bg,
                  color: catMeta.color,
                  border: `1px solid ${catMeta.border}`,
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}
              >
                {catMeta.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Current Status:</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background:
                    report.status === 'resolved'
                      ? '#ecfdf5'
                      : report.status === 'investigating'
                      ? '#eff6ff'
                      : report.status === 'dismissed'
                      ? '#f1f5f9'
                      : '#fffbeb',
                  color:
                    report.status === 'resolved'
                      ? '#059669'
                      : report.status === 'investigating'
                      ? '#2563eb'
                      : report.status === 'dismissed'
                      ? '#64748b'
                      : '#d97706',
                  border: `1px solid ${
                    report.status === 'resolved'
                      ? '#a7f3d0'
                      : report.status === 'investigating'
                      ? '#bfdbfe'
                      : report.status === 'dismissed'
                      ? '#cbd5e1'
                      : '#fde68a'
                  }`,
                }}
              >
                {report.status === 'resolved' ? (
                  <CheckCircle2 size={13} />
                ) : report.status === 'investigating' ? (
                  <Search size={13} />
                ) : report.status === 'dismissed' ? (
                  <XCircle size={13} />
                ) : (
                  <Clock size={13} />
                )}
                {report.status}
              </span>
            </div>
          </div>

          {/* Statement / Incident Details */}
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Student Statement & Details
            </div>
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '14px',
                color: '#1e293b',
                lineHeight: '1.6',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {report.details ? (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{report.details}</p>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>
                  No written statement provided. The student flagged this number under "{catMeta.label}".
                </p>
              )}
            </div>
          </div>

          {/* Side-by-Side: Reported Person vs Reporter */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* 1. REPORTED PERSON DOSSIER */}
            <div
              style={{
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reported Person
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#e11d48',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #fecdd3',
                  }}
                >
                  Flagged
                </span>
              </div>

              {/* Name */}
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                {reportedDetails?.participant?.name ||
                  reportedDetails?.passHolder?.name ||
                  'Unregistered / Unknown Student'}
              </div>

              {/* Phone + Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#be123c', fontSize: '15px' }}>
                  {formatPhoneForDisplay(report.reported_phone_normalized || report.reported_phone)}
                </span>
                <a
                  href={`tel:${reportedPhoneDigits}`}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fecdd3',
                    color: '#059669',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Call reported student"
                >
                  <Phone size={11} /> Call
                </a>
              </div>

              {/* Additional Registered Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
                {/* Registration ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Reg ID:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                    {reportedDetails?.passHolder?.registration_id || '—'}
                  </span>
                </div>

                {/* Team Name */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Team:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {reportedDetails?.passHolder?.team_name || '—'}
                  </span>
                </div>

                {/* College / Branch */}
                {(reportedDetails?.passHolder?.college || reportedDetails?.passHolder?.branch) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>College/Branch:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right', maxWidth: '160px' }}>
                      {[reportedDetails.passHolder.branch, reportedDetails.passHolder.college].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}

                {/* Activity Passes */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Activity Passes:</span>
                  <span style={{ fontWeight: 700, color: Number(reportedDetails?.passHolder?.activity_passes) > 0 ? '#059669' : '#e11d48' }}>
                    {reportedDetails?.passHolder?.activity_passes ?? 'None (0)'}
                  </span>
                </div>

                {/* Match Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #fecdd3' }}>
                  <span style={{ color: '#64748b' }}>Matching State:</span>
                  {reportedDetails?.participant?.status === 'matched' ? (
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: '12px' }}>
                      Matched with {reportedDetails.partner?.name || 'Partner'}
                    </span>
                  ) : reportedDetails?.participant?.status === 'waiting' ? (
                    <span style={{ fontWeight: 700, color: '#d97706', fontSize: '12px' }}>
                      Waiting in queue
                    </span>
                  ) : (
                    <span style={{ fontWeight: 600, color: '#64748b', fontSize: '12px' }}>
                      Not in active queue
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. REPORTER DOSSIER */}
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reported By (Complainant)
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#eef2ff',
                    color: '#4f46e5',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #c7d2fe',
                  }}
                >
                  Reporter
                </span>
              </div>

              {/* Reporter Name */}
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                {report.reporter_name || reporterDetails?.participant?.name || reporterDetails?.passHolder?.name || 'Anonymous Student'}
              </div>

              {/* Reporter Phone + Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5', fontSize: '14.5px' }}>
                  {report.reporter_phone ? formatPhoneForDisplay(report.reporter_phone) : 'No phone provided (Anonymous)'}
                </span>
                {reporterPhoneDigits && (
                  <a
                    href={`tel:${reporterPhoneDigits}`}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #c7d2fe',
                      color: '#059669',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Call reporter"
                  >
                    <Phone size={11} /> Call
                  </a>
                )}
              </div>

              {/* Additional Reporter Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
                {/* Reg ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Reg ID:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                    {reporterDetails?.passHolder?.registration_id || '—'}
                  </span>
                </div>

                {/* Team */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Team:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {reporterDetails?.passHolder?.team_name || '—'}
                  </span>
                </div>

                {/* College / Branch */}
                {(reporterDetails?.passHolder?.college || reporterDetails?.passHolder?.branch) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>College/Branch:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right', maxWidth: '160px' }}>
                      {[reporterDetails.passHolder.branch, reporterDetails.passHolder.college].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}

                {/* Relationship Note */}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '12px' }}>
                  {reportedDetails?.partner?.phone && report.reporter_phone && (
                    reportedDetails.partner.phone === report.reporter_phone ||
                    normalizePhone(reportedDetails.partner.phone) === normalizePhone(report.reporter_phone)
                  ) ? (
                    <span style={{ color: '#be123c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={13} /> These two were paired as teammates!
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>
                      Report submitted via student portal interface.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Status Changer Controls */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Update Resolution Status
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleStatusChange('pending')}
                disabled={updatingStatus !== null}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid #fde68a',
                  background: report.status === 'pending' ? '#fef3c7' : '#ffffff',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Clock size={13} />
                <span>Pending</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('investigating')}
                disabled={updatingStatus !== null}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid #bfdbfe',
                  background: report.status === 'investigating' ? '#dbeafe' : '#ffffff',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Search size={13} />
                <span>Investigating</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('resolved')}
                disabled={updatingStatus !== null}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid #a7f3d0',
                  background: report.status === 'resolved' ? '#d1fae5' : '#ffffff',
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CheckCircle2 size={13} />
                <span>Resolved</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('dismissed')}
                disabled={updatingStatus !== null}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid #cbd5e1',
                  background: report.status === 'dismissed' ? '#e2e8f0' : '#ffffff',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <XCircle size={13} />
                <span>Dismissed</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div
          style={{
            padding: '16px 26px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => onDeleteReport(report)}
            className="btn-danger"
            style={{ padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} />
            <span>Delete Report</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '9px 20px', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
