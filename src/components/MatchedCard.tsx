'use client';

import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Phone,
  Copy,
  Check,
  PhoneCall,
  RefreshCw,
  Flag,
} from 'lucide-react';
import { Participant } from '@/lib/types';
import { formatPhoneForDisplay } from '@/lib/validation';
import { CuteMatchAnimation } from './CuteMatchAnimation';

interface MatchedCardProps {
  participant: Participant;
  isPolling?: boolean;
  onManualRefresh?: () => void;
  onOpenReport?: (phone: string, name?: string) => void;
}

export function MatchedCard({ participant, isPolling = false, onManualRefresh, onOpenReport }: MatchedCardProps) {
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const partner = participant.partner;
  const isFirstRender = useRef(true);

  // Trigger celebration confetti upon reveal and on every new rematch!
  useEffect(() => {
    try {
      confetti({
        particleCount: isFirstRender.current ? 80 : 100,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6'],
      });
      isFirstRender.current = false;
    } catch (e) {
      // Confetti fallback
    }
  }, [participant.matched_with_id, participant.matched_at]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleManualCheck = () => {
    if (cooldown > 0 || isPolling) return;
    setCooldown(4);
    onManualRefresh?.();
  };

  const partnerPhoneRaw = partner?.phone || '';
  const partnerPhoneDigits = partnerPhoneRaw.replace(/\D/g, '');

  const handleCopyPhone = () => {
    if (!partnerPhoneRaw) return;
    navigator.clipboard.writeText(partnerPhoneRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="glass-panel-glow animate-pop-in"
      style={{
        padding: '36px 30px',
        maxWidth: '520px',
        width: '100%',
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative',
        background: '#ffffff',
        border: '1.5px solid #a7f3d0',
        boxShadow: '0 20px 45px -10px rgba(16, 185, 129, 0.12), 0 10px 20px -5px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Cute High-Five Robot Celebration Animation with Animated Names */}
      <CuteMatchAnimation
        status="matched"
        userName={participant.name}
        partnerName={partner?.name}
      />

      {/* Main Announcement */}
      <div style={{ marginBottom: '18px' }}>
        <span className="badge badge-matched" style={{ marginBottom: '10px' }}>
          <Sparkles size={12} /> Team Connected!
        </span>
        <h2
          style={{
            fontSize: '30px',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.5px',
            lineHeight: 1.25,
            marginBottom: '8px',
          }}
        >
          Meet Your Hackathon Teammate!
        </h2>
        <p style={{ color: '#475569', fontSize: '15px' }}>
          You&apos;ve been paired for the hackathon round! Connect now and build something amazing together!
        </p>
      </div>

      {/* Animated Duo Match Spotlight Banner */}
      <div className="duo-match-spotlight animate-pop-in">
        <div className="spotlight-card user-spotlight">
          <div className="spotlight-badge">YOU 🤖</div>
          <div className="spotlight-name" title={participant.name}>
            {participant.name}
          </div>
        </div>
        <div className="spotlight-connector">
          <div className="connector-icon">🤝</div>
          <div className="connector-sub">MATCHED</div>
        </div>
        <div className="spotlight-card partner-spotlight">
          <div className="spotlight-badge">TEAMMATE 🤖</div>
          <div className="spotlight-name" title={partner?.name || 'Teammate'}>
            {partner?.name || 'Teammate'}
          </div>
        </div>
      </div>

      {/* Partner Spotlight Box */}
      <div
        style={{
          background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%)',
          border: '1.5px solid #bbf7d0',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
          Assigned Teammate
        </div>
        
        {/* Partner Name */}
        <div
          style={{
            fontSize: '30px',
            fontWeight: 900,
            color: '#0f172a',
            letterSpacing: '-0.5px',
            marginBottom: '10px',
          }}
        >
          {partner?.name || 'Assigned Teammate'}
        </div>

        {/* Partner Phone Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            padding: '8px 18px',
            borderRadius: '999px',
            border: '1px solid #cbd5e1',
            marginBottom: '18px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Phone size={15} color="#4f46e5" />
          <span
            style={{
              fontSize: '17px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#4f46e5',
              letterSpacing: '0.5px',
            }}
          >
            {formatPhoneForDisplay(partnerPhoneRaw)}
          </span>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Call Direct */}
          <a
            href={`tel:${partnerPhoneDigits}`}
            className="btn-success"
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            <PhoneCall size={16} />
            <span>Call Partner</span>
          </a>

          {/* Copy Phone */}
          <button
            type="button"
            onClick={handleCopyPhone}
            className="btn-secondary"
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Phone'}</span>
          </button>
        </div>

        {/* Report Partner Action */}
        {onOpenReport && (
          <button
            id="matched-report-partner-btn"
            type="button"
            onClick={() => onOpenReport(partnerPhoneRaw, partner?.name)}
            style={{
              width: '100%',
              marginTop: '12px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 'var(--radius-md)',
              color: '#e11d48',
              fontSize: '12.5px',
              fontWeight: 700,
              padding: '9px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe4e6';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff1f2';
              e.currentTarget.style.borderColor = '#fecdd3';
            }}
            title="Report partner if unreachable, absent, or issue occurs"
          >
            <Flag size={13} />
            <span>Report Partner / Issue With Number</span>
          </button>
        )}
      </div>

      {/* Your Info Confirmation */}
      <div
        style={{
          fontSize: '13px',
          color: '#64748b',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '14px',
        }}
      >
        You are registered as: <strong style={{ color: '#0f172a' }}>{participant.name}</strong> ({formatPhoneForDisplay(participant.phone)})
      </div>

      {/* Multi-Round Live Status & Manual Check */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '12px',
          color: '#64748b',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
            }}
          />
          <span style={{ fontWeight: 500 }}>Live sync active (ready for next round)</span>
        </div>

        {onManualRefresh && (
          <button
            type="button"
            onClick={handleManualCheck}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            disabled={isPolling || cooldown > 0}
            title="Check if admin has triggered a new match round"
          >
            <RefreshCw size={12} className={isPolling ? 'animate-spin' : ''} />
            <span>
              {isPolling
                ? 'Checking...'
                : cooldown > 0
                ? `Wait (${cooldown}s)`
                : 'Check For Updates'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
