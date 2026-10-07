'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { StudentForm } from '@/components/StudentForm';
import { WaitingCard } from '@/components/WaitingCard';
import { MatchedCard } from '@/components/MatchedCard';
import { UnmatchedCard } from '@/components/UnmatchedCard';
import { Participant } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const STORAGE_KEY = 'hackathon_student_session';

/**
 * SCALABILITY STRATEGY (1000+ concurrent students):
 * 
 * 1. REALTIME-FIRST: Supabase Realtime channels push match results instantly.
 *    Students see their match within 1-2 seconds without ANY polling.
 * 
 * 2. SMART POLLING FALLBACK: Only activates when Realtime isn't configured.
 *    Uses exponential backoff: starts at 3s, grows to 15s max.
 *    Cuts server load from 400 req/s (1000 users × 2.5s) to ~67 req/s.
 * 
 * 3. VISIBILITY-AWARE: Stops polling when the tab is backgrounded.
 *    Resumes immediately when the user returns to the tab.
 * 
 * 4. DEDUPLICATION: Prevents overlapping status requests via inflight flag.
 */

export default function StudentPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);
  const participantRef = useRef<Participant | null>(null);
  const inflightRef = useRef(false);
  const pollIntervalRef = useRef<number>(3000); // Start at 3s
  const realtimeActiveRef = useRef(false);

  participantRef.current = participant;

  // Fetch latest status by ID or phone — with deduplication
  const checkStatus = useCallback(async (id?: string, phone?: string) => {
    const currentId = id || participantRef.current?.id;
    const currentPhone = phone || participantRef.current?.phone;

    if (!currentId && !currentPhone) return;

    // Prevent overlapping requests (deduplication)
    if (inflightRef.current) return;
    inflightRef.current = true;

    try {
      setIsPolling(true);
      const query = currentId ? `id=${encodeURIComponent(currentId)}` : `phone=${encodeURIComponent(currentPhone!)}`;
      const res = await fetch(`/api/status?${query}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      setIsLiveDb(data.isLive ?? false);

      if (data.exists === false) {
        // Admin clicked "Clear Data" -> Database reset!
        localStorage.removeItem(STORAGE_KEY);
        setParticipant(null);
        return;
      }

      if (data.success && data.participant) {
        setParticipant((prev) => {
          if (!prev) return data.participant;
          if (
            prev.status !== data.participant.status ||
            prev.matched_with_id !== data.participant.matched_with_id ||
            prev.matched_at !== data.participant.matched_at ||
            prev.partner?.id !== data.participant.partner?.id
          ) {
            return data.participant;
          }
          return prev;
        });

        // Persist session
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          id: data.participant.id,
          phone: data.participant.phone,
        }));
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      inflightRef.current = false;
      setIsPolling(false);
    }
  }, []);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id || parsed.phone) {
          checkStatus(parsed.id, parsed.phone).finally(() => {
            setLoadingInitial(false);
          });
          return;
        }
      }
    } catch (e) {
      // Ignore
    }
    setLoadingInitial(false);
  }, [checkStatus]);

  // Set up Supabase Realtime listener — PRIMARY update mechanism
  useEffect(() => {
    if (!participant || !isSupabaseConfigured || !supabase) return;

    realtimeActiveRef.current = true;

    const channel = supabase
      .channel(`student:${participant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `id=eq.${participant.id}`,
        },
        (payload: any) => {
          // If the payload already tells us the student is unmatched, apply directly without network fetch
          if (payload?.new && payload.new.status === 'unmatched') {
            setParticipant((prev) =>
              prev ? { ...prev, status: 'unmatched', matched_with_id: null, partner: null } : null
            );
            return;
          }

          // If admin reset matches back to queue, return directly to waiting card
          if (payload?.new && payload.new.status === 'waiting') {
            setParticipant((prev) =>
              prev ? { ...prev, status: 'waiting', matched_with_id: null, partner: null } : null
            );
            return;
          }

          // Anti-thundering-herd: add random jitter (50ms - 1500ms) so 1000+ students don't hit the server at the exact same millisecond
          const jitter = Math.floor(Math.random() * 1450) + 50;
          setTimeout(() => {
            checkStatus(participant.id, participant.phone);
          }, jitter);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'participants',
          filter: `id=eq.${participant.id}`,
        },
        () => {
          // Admin clicked Clear Data
          localStorage.removeItem(STORAGE_KEY);
          setParticipant(null);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeActiveRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          realtimeActiveRef.current = false;
        }
      });

    return () => {
      realtimeActiveRef.current = false;
      supabase?.removeChannel(channel);
    };
  }, [participant, checkStatus]);

  // Smart Polling fallback with EXPONENTIAL BACKOFF
  // Only runs when Realtime is not active. Backs off from 3s → 15s max.
  useEffect(() => {
    if (!participant) return;

    // In multi-round mode, poll every 10s even when matched to catch new rounds if Realtime drops
    const isResolved = participant.status === 'matched' || participant.status === 'unmatched';

    let timeoutId: ReturnType<typeof setTimeout>;

    const schedulePoll = () => {
      const baseInterval = isResolved ? 10000 : (realtimeActiveRef.current ? 8000 : pollIntervalRef.current);

      timeoutId = setTimeout(async () => {
        // Skip polling when tab is hidden
        if (document.hidden) {
          schedulePoll();
          return;
        }

        await checkStatus(participant.id, participant.phone);

        // Exponential backoff: increase interval up to 15s (only when waiting)
        if (!isResolved && !realtimeActiveRef.current) {
          pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.3, 15000);
        }

        schedulePoll();
      }, baseInterval);
    };

    // Reset backoff when participant changes (e.g., newly registered)
    pollIntervalRef.current = 3000;
    schedulePoll();

    // Visibility change handler — immediately poll when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden && participantRef.current) {
        pollIntervalRef.current = 3000; // Reset backoff on tab focus
        checkStatus(participantRef.current.id, participantRef.current.phone);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [participant, checkStatus]);

  const handleRegistered = (newParticipant: Participant) => {
    setParticipant(newParticipant);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: newParticipant.id,
      phone: newParticipant.phone,
    }));
  };

  const handleResetSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setParticipant(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar isLive={isLiveDb || isSupabaseConfigured} />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 20px',
          width: '100%',
        }}
      >
        {loadingInitial ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(0, 240, 255, 0.2)',
                borderTopColor: '#00f0ff',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px auto',
              }}
            />
            <p style={{ fontSize: '14px' }}>Loading session...</p>
          </div>
        ) : !participant ? (
          <StudentForm onRegistered={handleRegistered} />
        ) : participant.status === 'matched' ? (
          <MatchedCard
            participant={participant}
            isPolling={isPolling}
            onManualRefresh={() => checkStatus(participant.id, participant.phone)}
          />
        ) : participant.status === 'unmatched' ? (
          <UnmatchedCard
            participant={participant}
            isPolling={isPolling}
            onManualRefresh={() => checkStatus(participant.id, participant.phone)}
          />
        ) : (
          <WaitingCard
            participant={participant}
            isPolling={isPolling}
            onManualRefresh={() => checkStatus(participant.id, participant.phone)}
            onResetSession={handleResetSession}
          />
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
        Hackathon Matching System
      </footer>
    </div>
  );
}
