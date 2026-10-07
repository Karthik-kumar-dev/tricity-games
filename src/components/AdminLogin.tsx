'use client';

import { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: (token: string) => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the admin password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Incorrect admin password');
        return;
      }

      onSuccess(data.token);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="glass-panel animate-pop-in"
      style={{
        padding: '40px 32px',
        maxWidth: '440px',
        width: '100%',
        margin: '0 auto',
        textAlign: 'center',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 22px auto',
          boxShadow: '0 8px 20px rgba(245, 158, 11, 0.15)',
        }}
      >
        <Lock size={30} color="#b45309" />
      </div>

      <h1
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '8px',
          letterSpacing: '-0.3px',
        }}
      >
        Admin Console Gate
      </h1>
      <p style={{ color: '#475569', fontSize: '14.5px', lineHeight: 1.5, marginBottom: '28px' }}>
        This page is restricted to hackathon organizers. Please enter the master password to access matching controls.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          >
            <KeyRound size={18} />
          </span>
          <input
            id="admin-password-input"
            type="password"
            placeholder="Enter admin password..."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            className="input-field font-mono"
            style={{ paddingLeft: '46px' }}
            disabled={loading}
            autoFocus
          />
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left',
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <button
          id="admin-login-btn"
          type="submit"
          className="btn-primary"
          disabled={loading || !password}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
          }}
        >
          {loading ? (
            <span>Verifying...</span>
          ) : (
            <>
              <span>Unlock Admin Controls</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
          Admin passcode is stored securely in environment variables.
        </div>
      </form>
    </div>
  );
}
