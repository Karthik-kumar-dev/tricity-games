'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldAlert,
  Phone,
  AlertCircle,
  CheckCircle2,
  Send,
  RefreshCw,
  Flag,
  User,
  EyeOff,
  Check,
} from 'lucide-react';
import { normalizePhone, validatePhone, formatPhoneForDisplay } from '@/lib/validation';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultName?: string;
  reporterName?: string;
  reporterPhone?: string;
  onSuccess?: (message: string) => void;
}

const REPORT_CATEGORIES = [
  { id: 'unresponsive', label: 'Unresponsive / Not picking up calls', icon: '📞' },
  { id: 'absent', label: 'Left the venue / Absent from event', icon: '🚪' },
  { id: 'abusive', label: 'Inappropriate or abusive behavior', icon: '⚠️' },
  { id: 'fake', label: 'Fake number / Identity mismatch', icon: '👤' },
  { id: 'rules', label: 'Cheating or tournament rule violation', icon: '🚫' },
  { id: 'other', label: 'Other concern or issue', icon: '💬' },
];

export function ReportModal({
  isOpen,
  onClose,
  defaultPhone = '',
  defaultName = '',
  reporterName = '',
  reporterPhone = '',
  onSuccess,
}: ReportModalProps) {
  const [reportedPhone, setReportedPhone] = useState(defaultPhone);
  const [category, setCategory] = useState(REPORT_CATEGORIES[0].label);
  const [details, setDetails] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [customReporterName, setCustomReporterName] = useState('');
  const [customReporterPhone, setCustomReporterPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReportedPhone(defaultPhone);
      setCategory(REPORT_CATEGORIES[0].label);
      setDetails('');
      setIsAnonymous(false);
      setError(null);
      setSubmitted(false);

      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, defaultPhone]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const normalizedPhone = normalizePhone(reportedPhone);
  const isPhoneValid = normalizedPhone.length === 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const phoneCheck = validatePhone(reportedPhone);
    if (!phoneCheck.isValid || !isPhoneValid) {
      setError(phoneCheck.error || 'Please enter a valid 10-digit phone number to report.');
      return;
    }

    if (!category.trim()) {
      setError('Please select a reason for reporting this phone number.');
      return;
    }

    setLoading(true);

    try {
      const activeReporterName = isAnonymous
        ? 'Anonymous Student'
        : reporterName.trim() || customReporterName.trim() || 'Student Participant';

      const activeReporterPhone = isAnonymous
        ? ''
        : reporterPhone || customReporterPhone;

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_phone: reportedPhone.trim(),
          category,
          details: details.trim() || undefined,
          reporter_name: activeReporterName,
          reporter_phone: activeReporterPhone ? normalizePhone(activeReporterPhone) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit report. Please try again.');
        return;
      }

      setSubmitted(true);
      if (onSuccess) {
        onSuccess(data.message || 'Report submitted successfully. The organizers have been notified.');
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Network error occurred while submitting report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 100,
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        className="glass-panel animate-pop-in"
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1.5px solid #fecdd3',
          boxShadow: '0 25px 60px -15px rgba(225, 29, 72, 0.2)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '22px 26px 18px 26px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 18px rgba(225, 29, 72, 0.25)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.3px',
                }}
              >
                Report a Phone Number
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Report an issue, absent teammate, or improper behavior
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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
              transition: 'all 0.2s ease',
            }}
            title="Close modal (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body / Form */}
        {submitted ? (
          <div
            style={{
              padding: '48px 28px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="animate-pop-in"
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ecfdf5',
                border: '2px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                marginBottom: '16px',
              }}
            >
              <Check size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Report Submitted Successfully
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', maxWidth: '380px', lineHeight: 1.5 }}>
              Thank you for keeping Tri-City Games safe and competitive. The organizers have been notified and will investigate right away.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '22px 26px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Error Banner */}
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  color: '#be123c',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                className="animate-pop-in"
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Target Phone Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="report-target-phone"
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Phone Number to Report</span>
                  <span style={{ color: '#e11d48' }}>*</span>
                  {defaultName && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#eef2ff',
                        color: '#4f46e5',
                        padding: '1px 7px',
                        borderRadius: '999px',
                        fontWeight: 700,
                      }}
                    >
                      {defaultName}
                    </span>
                  )}
                </label>
                {reportedPhone.trim() && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: isPhoneValid ? '#059669' : '#d97706',
                    }}
                  >
                    {isPhoneValid ? `✓ ${normalizedPhone}` : `${normalizedPhone.length}/10 digits`}
                  </span>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                >
                  <Phone size={16} />
                </span>
                <input
                  id="report-target-phone"
                  ref={phoneInputRef}
                  type="tel"
                  placeholder="e.g. 9876543210 (any 10-digit phone)"
                  value={reportedPhone}
                  onChange={(e) => setReportedPhone(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  required
                  disabled={loading}
                />
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Enter any 10-digit phone number participating in the hackathon.
              </p>
            </div>

            {/* Category / Reason Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                Reason for Reporting <span style={{ color: '#e11d48' }}>*</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                {REPORT_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.label;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.label)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1.5px solid ${isSelected ? '#e11d48' : '#e2e8f0'}`,
                        background: isSelected ? '#fff1f2' : '#f8fafc',
                        color: isSelected ? '#9f1239' : '#334155',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '12.5px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{cat.icon}</span>
                      <span style={{ lineHeight: 1.3 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <label
                htmlFor="report-details"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Additional Details <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
              </label>
              <textarea
                id="report-details"
                rows={3}
                placeholder="Describe what happened (e.g. called multiple times, phone switched off, or left before the match began)..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical', minHeight: '80px', fontSize: '13.5px' }}
                disabled={loading}
              />
            </div>

            {/* Reporter Info & Anonymous Toggle */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => setIsAnonymous(!isAnonymous)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <EyeOff size={16} color={isAnonymous ? '#e11d48' : '#64748b'} />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Submit Anonymously
                    </span>
                    <p style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {isAnonymous ? 'Your name and phone will NOT be attached' : 'Your name and phone will be attached to verify the report'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
              </div>

              {!isAnonymous && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>
                  {reporterName ? (
                    <div>
                      Submitting as: <strong style={{ color: '#0f172a' }}>{reporterName}</strong>{' '}
                      {reporterPhone && <span style={{ fontFamily: 'monospace' }}>({formatPhoneForDisplay(reporterPhone)})</span>}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                      <input
                        type="text"
                        placeholder="Your name (optional)"
                        value={customReporterName}
                        onChange={(e) => setCustomReporterName(e.target.value)}
                        className="input-field"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      />
                      <input
                        type="tel"
                        placeholder="Your phone (optional)"
                        value={customReporterPhone}
                        onChange={(e) => setCustomReporterPhone(e.target.value)}
                        className="input-field"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '6px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary"
                style={{ padding: '11px 18px', fontSize: '13.5px' }}
              >
                Cancel
              </button>
              <button
                id="submit-report-btn"
                type="submit"
                disabled={loading || !reportedPhone.trim()}
                className="btn-primary"
                style={{
                  width: 'auto',
                  minWidth: '150px',
                  padding: '11px 24px',
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Flag size={15} />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
