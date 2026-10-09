'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  UserPlus,
  Phone,
  Mail,
  Building,
  GraduationCap,
  Users,
  Ticket,
  Utensils,
  Hash,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { PassHolder } from '@/lib/types';
import { normalizePhone, validatePhone } from '@/lib/validation';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSuccess: (student: PassHolder, message: string) => void;
}

export function AddStudentModal({
  isOpen,
  onClose,
  token,
  onSuccess,
}: AddStudentModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [role, setRole] = useState('Member');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [teamSize, setTeamSize] = useState<number>(1);
  const [activityPasses, setActivityPasses] = useState<number>(1);
  const [foodTokens, setFoodTokens] = useState<number>(0);
  const [autoRegisterToMatch, setAutoRegisterToMatch] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 80);
    } else {
      // Reset form
      setName('');
      setPhone('');
      setRegistrationId('');
      setTeamName('');
      setRole('Member');
      setEmail('');
      setCollege('');
      setBranch('');
      setTeamSize(1);
      setActivityPasses(1);
      setFoodTokens(0);
      setAutoRegisterToMatch(true);
      setError(null);
    }
  }, [isOpen]);

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

  // Normalized phone computation
  const normalizedPhone = normalizePhone(phone);
  const isPhoneValid = normalizedPhone.length === 10;
  const hasActivePass = activityPasses >= 1;

  const handleGenerateRegId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setRegistrationId(`REG-${randomNum}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Name
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Student full name is required (minimum 2 characters).');
      return;
    }

    // Validate Phone
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.isValid || !isPhoneValid) {
      setError(phoneCheck.error || 'Please enter a valid 10-digit phone number.');
      return;
    }

    // Email validation if provided
    if (email.trim() && !email.includes('@')) {
      setError('Please enter a valid email address with an @ symbol.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/pass-holders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          name: trimmedName,
          phone: phone.trim(),
          registration_id: registrationId.trim() || undefined,
          team_name: teamName.trim() || undefined,
          role: role.trim() || undefined,
          email: email.trim() || undefined,
          college: college.trim() || undefined,
          branch: branch.trim() || undefined,
          team_size: teamSize > 0 ? teamSize : 1,
          activity_passes: activityPasses >= 0 ? activityPasses : 0,
          food_tokens: foodTokens >= 0 ? foodTokens : 0,
          autoRegisterToMatch,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to add student. Please check the values.');
        return;
      }

      onSuccess(data.passHolder, data.message || `Student "${trimmedName}" successfully saved!`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Network error occurred while saving student.');
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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 28px 20px 28px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <UserPlus size={22} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Add Student to Pass Holders
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Insert or update record into <code className="font-mono" style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', color: '#4f46e5' }}>pass_holders</code> table
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
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Close modal (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
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
                fontSize: '13.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              className="animate-pop-in"
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Personal Details */}
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#4f46e5',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }} />
              1. Student Identity &amp; Contact
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Name */}
              <div>
                <label
                  htmlFor="student-name"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Full Name <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <input
                  id="student-name"
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="student-phone"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  <span>
                    Phone Number <span style={{ color: '#e11d48' }}>*</span>
                  </span>
                  {phone.trim() && (
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
                </label>
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
                    id="student-phone"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  htmlFor="student-email"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Email Address <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                </label>
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
                    <Mail size={16} />
                  </span>
                  <input
                    id="student-email"
                    type="email"
                    placeholder="e.g. student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Registration & Passes */}
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#0891b2',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0891b2' }} />
              2. Passes, Registration ID &amp; Tokens
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Registration ID with Generate button */}
              <div style={{ gridColumn: 'span 2' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    htmlFor="student-reg-id"
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    Registration ID <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRegId}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <Sparkles size={12} /> Auto-Generate
                  </button>
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
                    <Hash size={16} />
                  </span>
                  <input
                    id="student-reg-id"
                    type="text"
                    placeholder="e.g. REG-2026-0042"
                    value={registrationId}
                    onChange={(e) => setRegistrationId(e.target.value)}
                    className="input-field font-mono"
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Activity Passes Added */}
              <div>
                <label
                  htmlFor="student-activity-passes"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  <span>Activity Passes</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: hasActivePass ? '#059669' : '#d97706',
                      background: hasActivePass ? '#ecfdf5' : '#fffbeb',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: `1px solid ${hasActivePass ? '#a7f3d0' : '#fde68a'}`,
                    }}
                  >
                    {hasActivePass ? 'Active' : 'No Pass'}
                  </span>
                </label>
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
                    <Ticket size={16} />
                  </span>
                  <input
                    id="student-activity-passes"
                    type="number"
                    min="0"
                    max="99"
                    value={activityPasses}
                    onChange={(e) => setActivityPasses(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  &gt;= 1 grants matchmaking access
                </p>
              </div>

              {/* Food Tokens */}
              <div>
                <label
                  htmlFor="student-food-tokens"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Food Tokens
                </label>
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
                    <Utensils size={16} />
                  </span>
                  <input
                    id="student-food-tokens"
                    type="number"
                    min="0"
                    max="99"
                    value={foodTokens}
                    onChange={(e) => setFoodTokens(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Tokens for hackathon cafeteria
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Team & College Info */}
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#059669',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
              3. Team &amp; Academic Affiliation
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Team Name */}
              <div>
                <label
                  htmlFor="student-team"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Team Name <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                </label>
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
                    <Users size={16} />
                  </span>
                  <input
                    id="student-team"
                    type="text"
                    placeholder="e.g. Code Warriors"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label
                  htmlFor="student-role"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Role in Team
                </label>
                <select
                  id="student-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                  disabled={loading}
                >
                  <option value="Leader">Team Leader</option>
                  <option value="Member">Team Member</option>
                  <option value="Solo Participant">Solo Participant</option>
                  <option value="Developer">Developer</option>
                  <option value="Designer">UI/UX Designer</option>
                </select>
              </div>

              {/* Team Size */}
              <div>
                <label
                  htmlFor="student-team-size"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Team Size
                </label>
                <input
                  id="student-team-size"
                  type="number"
                  min="1"
                  max="10"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="input-field"
                  disabled={loading}
                />
              </div>

              {/* College */}
              <div>
                <label
                  htmlFor="student-college"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  College / University <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                </label>
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
                    <Building size={16} />
                  </span>
                  <input
                    id="student-college"
                    type="text"
                    placeholder="e.g. Stanford / IIT / MIT"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Branch */}
              <div style={{ gridColumn: 'span 2' }}>
                <label
                  htmlFor="student-branch"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Branch / Department <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                </label>
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
                    <GraduationCap size={16} />
                  </span>
                  <input
                    id="student-branch"
                    type="text"
                    placeholder="e.g. Computer Science, AI &amp; ML, ECE"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Direct Matchmaking Queue Checkbox */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
            }}
            onClick={() => setAutoRegisterToMatch(!autoRegisterToMatch)}
          >
            <input
              type="checkbox"
              id="auto-register-match"
              checked={autoRegisterToMatch}
              onChange={(e) => setAutoRegisterToMatch(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                marginTop: '2px',
                accentColor: '#4f46e5',
                cursor: 'pointer',
              }}
            />
            <div>
              <label
                htmlFor="auto-register-match"
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Also register into matchmaking queue immediately</span>
                <span
                  style={{
                    fontSize: '11px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 700,
                  }}
                >
                  Recommended
                </span>
              </label>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                If checked, the student is also placed in the live waiting pool so you can pair them right away in admin matching without waiting for them to sign in.
              </p>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '8px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '12px 20px', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: 'auto',
                minWidth: '170px',
                padding: '12px 28px',
                fontSize: '14.5px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Saving Student...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Add Student</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
