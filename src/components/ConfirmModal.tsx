'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm Clear Data',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 100,
      }}
    >
      <div
        className="glass-panel animate-pop-in"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '32px 28px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid #fecdd3',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
          disabled={loading}
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
          }}
        >
          <AlertTriangle size={28} color="#e11d48" />
        </div>

        <h3
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0f172a',
            textAlign: 'center',
            marginBottom: '10px',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            color: '#475569',
            fontSize: '14.5px',
            lineHeight: 1.6,
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-danger"
            disabled={loading}
            style={{ flex: 1.2 }}
          >
            <span>{loading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
