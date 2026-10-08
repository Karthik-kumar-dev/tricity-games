'use client';

import { useState, useRef } from 'react';
import { Sparkles, Phone, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { validateName, validatePhone, formatPhoneForDisplay, normalizePhone } from '@/lib/validation';
import { Participant } from '@/lib/types';

interface StudentFormProps {
  onRegistered: (participant: Participant) => void;
}

export function StudentForm({ onRegistered }: StudentFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, phone: false });
  const submittingRef = useRef(false); // Prevent double-submit under load

  // Compute live validation feedback
  const nameVal = touched.name ? validateName(name) : { isValid: true };
  const phoneVal = touched.phone ? validatePhone(phone) : { isValid: true };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-submit (ref is synchronous, unlike state)
    if (submittingRef.current) return;
    submittingRef.current = true;

    setTouched({ name: true, phone: true });

    const finalNameCheck = validateName(name);
    if (!finalNameCheck.isValid) {
      setError(finalNameCheck.error || 'Please enter a valid name');
      submittingRef.current = false;
      return;
    }

    const finalPhoneCheck = validatePhone(phone);
    if (!finalPhoneCheck.isValid) {
      setError(finalPhoneCheck.error || 'Please enter a valid phone number');
      submittingRef.current = false;
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Fallback for non-JSON responses
      }

      if (res.status === 404) {
        setError('Service endpoint not found (404). If the dev server is running on port 3001, please visit http://localhost:3001.');
        return;
      }

      if (res.status === 409 && data.isDuplicate) {
        // Already registered! Retrieve status
        setError('This phone is already registered. Loading your match card...');
        setTimeout(() => {
          if (data.participant) {
            onRegistered(data.participant);
          }
        }, 800);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      // Success
      onRegistered(data.participant);
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '40px 32px', maxWidth: '480px', width: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            color: '#4338ca',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '16px',
            letterSpacing: '0.3px',
          }}
        >
          <Sparkles size={14} color="#4f46e5" />
          HACKATHON TEAM MATCHER
        </div>
        <h1
          style={{
            fontSize: '30px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.25,
            letterSpacing: '-0.5px',
            marginBottom: '10px',
          }}
        >
          Find Your Hackathon Partner
        </h1>
        <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.5 }}>
          Enter your details below to enter the matching pool. Once matching begins, you&apos;ll get randomly paired with a fellow hacker!
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Name Field */}
        <div>
          <label
            htmlFor="student-name-input"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Full Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
                pointerEvents: 'none',
              }}
            >
              <User size={18} />
            </span>
            <input
              id="student-name-input"
              type="text"
              placeholder="e.g. Alex Chen"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              className="input-field"
              style={{
                paddingLeft: '46px',
                borderColor: !nameVal.isValid ? 'var(--accent-rose)' : undefined,
              }}
              disabled={loading}
              autoComplete="name"
            />
          </div>
          {!nameVal.isValid && (
            <p style={{ color: 'var(--accent-rose)', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} /> {nameVal.error}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label
            htmlFor="student-phone-input"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Phone Number <span style={{ color: 'var(--accent-rose)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
                pointerEvents: 'none',
              }}
            >
              <Phone size={18} />
            </span>
            <input
              id="student-phone-input"
              type="tel"
              placeholder="e.g. 9876543210 (10 digits)"
              value={phone}
              maxLength={16}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              className="input-field"
              style={{
                paddingLeft: '46px',
                borderColor: !phoneVal.isValid ? 'var(--accent-rose)' : undefined,
              }}
              disabled={loading}
              autoComplete="tel"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            {!phoneVal.isValid ? (
              <p style={{ color: 'var(--accent-rose)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> {phoneVal.error}
              </p>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                {normalizePhone(phone).length === 10 ? '✓ 10-digit number' : `${normalizePhone(phone).length}/10 digits`}
              </p>
            )}
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          id="submit-registration-btn"
          type="submit"
          disabled={loading || !name.trim() || !phone.trim()}
          className="btn-primary"
          style={{ marginTop: '8px' }}
        >
          {loading ? (
            <span>Securing Your Spot...</span>
          ) : (
            <>
              <span>Join Matching Pool</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {/* Privacy & Anti-Duplicate Guarantee */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--text-dim)',
            fontSize: '12px',
            marginTop: '4px',
          }}
        >
          <CheckCircle2 size={13} color="var(--accent-emerald)" />
          <span>Strict 1-to-1 match • Duplicate phone numbers prevented</span>
        </div>
      </form>
    </div>
  );
}
