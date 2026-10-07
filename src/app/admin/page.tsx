'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminDashboard } from '@/components/AdminDashboard';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

const ADMIN_STORAGE_KEY = 'hackathon_admin_token';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSavedSession = async () => {
      try {
        const savedToken = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (savedToken) {
          const res = await fetch(`/api/admin/participants?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'x-admin-token': savedToken,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
          if (res.ok) {
            setToken(savedToken);
          } else {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
            setToken(null);
          }
        }
      } catch (e) {
        // Ignore
      } finally {
        setLoading(false);
      }
    };

    checkSavedSession();
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, newToken);
    } catch (e) {
      // Ignore
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      await fetch('/api/admin/login', { method: 'DELETE' });
    } catch (e) {
      // Ignore
    }
    setToken(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar isLive={isSupabaseConfigured} />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: token ? 'flex-start' : 'center',
          alignItems: 'center',
          padding: '40px 20px',
          width: '100%',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '3px solid rgba(0, 240, 255, 0.2)',
                borderTopColor: '#00f0ff',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px auto',
              }}
            />
            <p style={{ fontSize: '14px' }}>Verifying permissions...</p>
          </div>
        ) : !token ? (
          <AdminLogin onSuccess={handleLoginSuccess} />
        ) : (
          <AdminDashboard token={token} onLogout={handleLogout} />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: '20px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#64748b',
          background: '#ffffff',
        }}
      >
        Hackathon Matching System • Admin Command Center
      </footer>
    </div>
  );
}
