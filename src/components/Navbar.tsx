'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Users } from 'lucide-react';

interface NavbarProps {
  isLive?: boolean;
}

export function Navbar({ isLive }: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            }}
          >
            <Sparkles size={20} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '-0.3px',
              }}
            >
              HACK // MATCH
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              1-to-1 Pairing Arena
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Navigation Switch */}
          {isAdmin && (
            <Link
              href="/"
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '13px',
              }}
            >
              <Users size={15} />
              <span>Student View</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
