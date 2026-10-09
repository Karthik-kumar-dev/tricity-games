'use client';

import { UserX, RefreshCw, HelpCircle, Sparkles, ShieldAlert } from 'lucide-react';
import { Participant } from '@/lib/types';
import { formatPhoneForDisplay } from '@/lib/validation';

interface UnmatchedCardProps {
  participant: Participant;
  isPolling?: boolean;
  onManualRefresh?: () => void;
  onOpenReport?: () => void;
}

export function UnmatchedCard({ participant, isPolling, onManualRefresh, onOpenReport }: UnmatchedCardProps) {
  return (
    <div
      className="glass-panel-glow animate-pop-in"
      style={{
        padding: '36px 30px',
        maxWidth: '480px',
        width: '100%',
        margin: '0 auto',
        textAlign: 'center',
        background: '#ffffff',
        border: '1.5px solid #fed7aa',
        boxShadow: '0 20px 45px -10px rgba(245, 158, 11, 0.1), 0 10px 20px -5px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 8px 25px rgba(245, 158, 11, 0.25)',
        }}
      >
        <UserX size={34} color="#ffffff" />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <span className="badge badge-unmatched" style={{ marginBottom: '12px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
          Solo Reserve (Odd Count)
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
          You are on deck for next match!
        </h2>
        <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.5 }}>
          An odd number of participants entered this round, leaving 1 student reserved for the next pairing!
        </p>
      </div>

      {/* Helpful Instructions Box */}
      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          textAlign: 'left',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
          <HelpCircle size={16} /> What happens next?
        </div>
        <p style={{ color: '#78350f', fontSize: '13px', lineHeight: 1.6 }}>
          1. As soon as another hacker joins or next round starts, you will be paired!<br />
          2. Or speak with the hackathon organizers at the front desk to join a group.
        </p>
      </div>

      {/* Your Info */}
      <div
        style={{
          fontSize: '13px',
          color: '#64748b',
          marginBottom: '20px',
        }}
      >
        Registered: <strong style={{ color: '#0f172a' }}>{participant.name}</strong> ({formatPhoneForDisplay(participant.phone)})
      </div>

      {/* Refresh Button */}
      {onManualRefresh && (
        <button
          type="button"
          onClick={onManualRefresh}
          className="btn-secondary"
          style={{ fontSize: '14px', padding: '12px 22px', margin: '0 auto' }}
          disabled={isPolling}
        >
          <RefreshCw size={15} className={isPolling ? 'animate-spin' : ''} />
          <span>{isPolling ? 'Checking for rematches...' : 'Check For Rematch'}</span>
        </button>
      )}

      {onOpenReport && (
        <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #fed7aa' }}>
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
