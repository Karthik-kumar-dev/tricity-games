'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, User, Phone, LogOut, ShieldAlert } from 'lucide-react';
import { Participant } from '@/lib/types';
import { formatPhoneForDisplay } from '@/lib/validation';
import { CuteMatchAnimation } from './CuteMatchAnimation';

interface WaitingCardProps {
  participant: Participant;
  isPolling?: boolean;
  onManualRefresh?: () => void;
  onResetSession?: () => void;
  onOpenReport?: () => void;
}

export function WaitingCard({
  participant,
  isPolling = false,
  onManualRefresh,
  onResetSession,
  onOpenReport,
}: WaitingCardProps) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleManualCheck = () => {
    if (cooldown > 0 || isPolling) return;
    setCooldown(4); // 4-second anti-spam cooldown
    onManualRefresh?.();
  };

  return (
    <div
      className="glass-panel-glow animate-pop-in"
      style={{
        padding: '36px 30px',
        maxWidth: '480px',
        width: '100%',
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Cute Playful Robot Mascot Animation */}
      <CuteMatchAnimation status="waiting" userName={participant.name} />

      {/* Main waiting label */}
      <div style={{ marginBottom: '18px' }}>
        <span className="badge badge-waiting" style={{ marginBottom: '12px' }}>
          Status: In Queue
        </span>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.5px',
            marginBottom: '8px',
          }}
        >
          Waiting for match...
        </h2>
        <p style={{ color: '#475569', fontSize: '14.5px', lineHeight: 1.5 }}>
          You&apos;re checked in! The organizers will trigger the pairing algorithm soon. This screen updates in real time.
        </p>
      </div>

      {/* Student Details Pill Box */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          margin: '22px 0',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <User size={14} /> Registered Name:
          </div>
          <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '14px' }}>
            {participant.name}
          </div>
        </div>

        <div
          style={{
            height: '1px',
            background: '#e2e8f0',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <Phone size={14} /> Phone Number:
          </div>
          <div style={{ color: '#4f46e5', fontWeight: 700, fontSize: '14px', fontFamily: 'monospace' }}>
            {formatPhoneForDisplay(participant.phone)}
          </div>
        </div>
      </div>

      {/* Live sync heartbeat */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#059669',
          fontWeight: 600,
          marginBottom: '20px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: '6px 14px',
          borderRadius: '999px',
          width: 'fit-content',
          margin: '0 auto 20px auto',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px #10b981',
          }}
        />
        <span>Listening for pairing trigger (auto-sync active)</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        {onManualRefresh && (
          <button
            type="button"
            onClick={handleManualCheck}
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '10px 16px' }}
            disabled={isPolling || cooldown > 0}
          >
            <RefreshCw size={14} className={isPolling ? 'animate-spin' : ''} />
            <span>
              {isPolling
                ? 'Checking...'
                : cooldown > 0
                ? `Wait (${cooldown}s)`
                : 'Check Status'}
            </span>
          </button>
        )}

        {onResetSession && (
          <button
            type="button"
            onClick={onResetSession}
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '10px 16px', color: '#64748b' }}
            title="Edit your registration details"
          >
            <LogOut size={14} />
            <span>Leave Queue</span>
          </button>
        )}
      </div>

      {onOpenReport && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onOpenReport}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e11d48')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <ShieldAlert size={13} />
            <span>Facing an issue? Report a phone number</span>
          </button>
        </div>
      )}
    </div>
  );
}
