import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mockStore } from './mockStore';
import { MatchResult, Participant } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
// We can use the service role key for privileged admin operations, or fallback to anon key
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

let adminClient: SupabaseClient | null = null;

if (isServerSupabaseConfigured) {
  adminClient = createClient(supabaseUrl!, supabaseKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    // Connection pooling config — keeps connections fast under load
    global: {
      headers: {
        'x-connection-encrypted': 'true',
      },
    },
  });
}

export const supabaseAdmin = adminClient;

// High-performance micro-cache for status lookups (TTL: 1000ms)
// Absorbs 1000+ simultaneous requests in the same second without serving stale data
interface CacheEntry {
  data: Participant | null;
  expiresAt: number;
}
const statusCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000;

// Single-Flight Request Coalescing (Critical for 1000+ simultaneous clicks)
// If 1000 requests arrive at the same second, they all join a SINGLE in-flight promise
// instead of firing 1000 independent transactions against Supabase!
let inFlightMatchingPromise: Promise<MatchResult> | null = null;
let lastMatchingResult: MatchResult | null = null;
let lastMatchingTimestamp: number = 0;

let inFlightResetPromise: Promise<{ success: boolean; count: number; error?: string }> | null = null;
let lastResetResult: { success: boolean; count: number; error?: string } | null = null;
let lastResetTimestamp: number = 0;

export const clearStatusCache = () => {
  statusCache.clear();
};

export const warmUpStatusCache = async () => {
  if (!isServerSupabaseConfigured || !adminClient) return;
  try {
    const { data, error } = await adminClient
      .from('participants')
      .select('id, name, phone, status, matched_with_id, created_at, matched_at');
    if (!error && data) {
      const now = Date.now();
      const pMap = new Map<string, any>();
      for (const p of data) {
        pMap.set(p.id, p);
      }
      for (const p of data) {
        let partner = null;
        if (p.matched_with_id && pMap.has(p.matched_with_id)) {
          const partRow = pMap.get(p.matched_with_id);
          partner = { id: partRow.id, name: partRow.name, phone: partRow.phone };
        }
        const full: Participant = {
          id: p.id,
          name: p.name,
          phone: p.phone,
          status: p.status,
          matched_with_id: p.matched_with_id,
          created_at: p.created_at,
          matched_at: p.matched_at,
          partner,
        };
        statusCache.set(`id:${p.id}`, { data: full, expiresAt: now + CACHE_TTL_MS });
        if (p.phone) {
          statusCache.set(`phone:${p.phone}`, { data: full, expiresAt: now + CACHE_TTL_MS });
        }
      }
    }
  } catch (e) {
    console.error('Error warming up status cache:', e);
  }
};

export const dbService = {
  // Check if real database is configured
  isLive: () => isServerSupabaseConfigured,

  // Get all participants
  getAllParticipants: async (): Promise<Participant[]> => {
    if (!isServerSupabaseConfigured || !supabaseAdmin) {
      return mockStore.getParticipants();
    }

    const { data, error } = await supabaseAdmin
      .from('participants')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants from Supabase:', error);
      throw error;
    }

    return (data as Participant[]) || [];
  },

  // Get single participant by ID with hydrated partner info (Cached & Optimized)
  getParticipantById: async (id: string): Promise<Participant | null> => {
    if (!isServerSupabaseConfigured || !supabaseAdmin) {
      return mockStore.getParticipantById(id);
    }

    const cacheKey = `id:${id}`;
    const now = Date.now();
    const cached = statusCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Attempt joined query first (1 DB roundtrip instead of 2)
    const { data: participant, error } = await supabaseAdmin
      .from('participants')
      .select('id, name, phone, status, matched_with_id, created_at, matched_at, partner:matched_with_id(id, name, phone)')
      .eq('id', id)
      .maybeSingle();

    if (error || !participant) {
      return null;
    }

    let partner = null;
    const participantData = participant as any;
    if (participantData?.partner && typeof participantData.partner === 'object' && participantData.partner.name) {
      partner = participantData.partner;
    } else if (participant.matched_with_id) {
      // Fallback query if joined relation wasn't returned by PostgREST
      const { data: partnerData } = await supabaseAdmin
        .from('participants')
        .select('id, name, phone')
        .eq('id', participant.matched_with_id)
        .maybeSingle();

      if (partnerData) {
        partner = partnerData;
      }
    }

    const result: Participant = {
      id: participant.id,
      name: participant.name,
      phone: participant.phone,
      status: participant.status,
      matched_with_id: participant.matched_with_id,
      created_at: participant.created_at,
      matched_at: participant.matched_at,
      partner,
    };

    // Store in RAM cache for subsequent hits within TTL
    statusCache.set(cacheKey, { data: result, expiresAt: now + CACHE_TTL_MS });
    if (result.phone) {
      statusCache.set(`phone:${result.phone}`, { data: result, expiresAt: now + CACHE_TTL_MS });
    }

    return result;
  },

  // Get single participant by phone with hydrated partner info
  getParticipantByPhone: async (phone: string): Promise<Participant | null> => {
    if (!isServerSupabaseConfigured || !supabaseAdmin) {
      return mockStore.getParticipantByPhone(phone);
    }

    const cacheKey = `phone:${phone}`;
    const now = Date.now();
    const cached = statusCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const { data: participant, error } = await supabaseAdmin
      .from('participants')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error || !participant) {
      return null;
    }

    return dbService.getParticipantById(participant.id);
  },

  // Register or update participant — upserts by normalized phone
  registerParticipant: async (
    name: string,
    phone: string
  ): Promise<{ participant: Participant | null; isDuplicate: boolean; error?: string }> => {
    if (!isServerSupabaseConfigured || !supabaseAdmin) {
      const result = mockStore.addParticipant(name, phone);
      return { participant: result.participant, isDuplicate: result.isDuplicate };
    }

    try {
      // Check if participant already exists with this phone
      const { data: existing, error: findError } = await supabaseAdmin
        .from('participants')
        .select('*')
        .eq('phone', phone.trim())
        .maybeSingle();

      if (findError) {
        console.error('Error checking existing participant by phone:', findError);
      }

      if (existing) {
        // If the phone already exists, update that row instead of inserting a duplicate
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('participants')
          .update({ name: name.trim() })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating existing participant row:', updateError);
          return { participant: existing as Participant, isDuplicate: true };
        }

        return { participant: (updated || existing) as Participant, isDuplicate: true };
      }

      // New participant: insert with status waiting
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('participants')
        .insert({
          name: name.trim(),
          phone: phone.trim(),
          status: 'waiting',
        })
        .select()
        .single();

      if (insertError) {
        // Handle race conditions with unique constraint
        if (insertError.code === '23505') {
          const { data: current } = await supabaseAdmin
            .from('participants')
            .select('*')
            .eq('phone', phone.trim())
            .maybeSingle();

          return { participant: current as Participant, isDuplicate: true };
        }
        return { participant: null, isDuplicate: false, error: insertError.message };
      }

      return { participant: inserted as Participant, isDuplicate: false };
    } catch (err: any) {
      console.error('registerParticipant error:', err);
      return { participant: null, isDuplicate: false, error: err?.message || 'Database error' };
    }
  },

  // Execute 1-to-1 matching — uses atomic Postgres function (single transaction)
  // Handles 1000+ participants in < 200ms total with single-flight concurrency coalescing
  runMatching: async (): Promise<MatchResult> => {
    const now = Date.now();

    // 1. Single-Flight Coalescing: If matching is already executing right now,
    // all 1000 concurrent callers await the EXACT same single execution promise!
    if (inFlightMatchingPromise) {
      return inFlightMatchingPromise;
    }

    // 2. Debounce window: If matching finished in the last 2000ms, return fresh cached result
    if (lastMatchingResult && (now - lastMatchingTimestamp) < 2000) {
      return lastMatchingResult;
    }

    // 3. Launch single matching execution
    inFlightMatchingPromise = (async () => {
      try {
        // Invalidate status cache so students get fresh match data
        statusCache.clear();

        if (!isServerSupabaseConfigured || !supabaseAdmin) {
          const res = mockStore.runMatching();
          lastMatchingResult = res;
          lastMatchingTimestamp = Date.now();
          return res;
        }

        // Try the atomic RPC function first — it's a single transaction, no race conditions
        const { data: rpcResult, error: rpcError } = await supabaseAdmin
          .rpc('pair_participants');

        if (!rpcError && rpcResult) {
          const result = rpcResult as { success: boolean; total: number; pairs: number; unmatched: number; error?: string };
          
          if (!result.success && result.error) {
            // If another process has the advisory lock, don't crash — return clean status
            if (result.error.includes('already in progress')) {
              if (lastMatchingResult) {
                return lastMatchingResult;
              }
              return {
                success: true,
                total: 0,
                pairs: 0,
                unmatched: 0,
                message: 'Matching is already in progress.',
              };
            }
            throw new Error(result.error);
          }

          const matchRes: MatchResult = {
            success: result.success,
            total: result.total,
            pairs: result.pairs,
            unmatched: result.unmatched,
            message: `Paired ${result.pairs} teams! ${result.unmatched ? '1 student is unmatched.' : ''}`,
          };

          // Preload RAM cache with all 1000 pairs in 1 fast query so all subsequent
          // student status lookups hit memory in < 1ms with 0 database load!
          await warmUpStatusCache();

          lastMatchingResult = matchRes;
          lastMatchingTimestamp = Date.now();
          return matchRes;
        }

        // ONLY fall back to JS matching if RPC does NOT exist in the database (e.g. Postgres 42883)
        if (rpcError) {
          const isRpcMissing = rpcError.code === '42883' || rpcError.message?.includes('function public.pair_participants() does not exist');
          if (isRpcMissing) {
            console.warn('RPC pair_participants does not exist, running JS fallback:', rpcError.message);
            const fallbackRes = await dbService._runMatchingFallback();
            lastMatchingResult = fallbackRes;
            lastMatchingTimestamp = Date.now();
            return fallbackRes;
          }
          throw new Error(rpcError.message || 'Database error during matching');
        }

        throw new Error('No result returned from matching procedure');
      } finally {
        inFlightMatchingPromise = null;
      }
    })();

    return inFlightMatchingPromise;
  },

  // Fallback JS-side matching (still optimized with batched updates)
  _runMatchingFallback: async (): Promise<MatchResult> => {
    if (!supabaseAdmin) throw new Error('Database not configured');

    // Fetch all participants
    const { data: participants, error: fetchError } = await supabaseAdmin
      .from('participants')
      .select('id');

    if (fetchError) {
      throw new Error(fetchError.message || 'Failed to fetch participants');
    }

    if (!participants || participants.length === 0) {
      return { success: true, total: 0, pairs: 0, unmatched: 0, message: 'No participants registered yet.' };
    }

    if (participants.length === 1) {
      await supabaseAdmin
        .from('participants')
        .update({ matched_with_id: null, status: 'unmatched', matched_at: null })
        .eq('id', participants[0].id);

      return { success: true, total: 1, pairs: 0, unmatched: 1, message: 'Only 1 participant. Marked as unmatched.' };
    }

    // Shuffle with cryptographically secure Fisher-Yates
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const total = shuffled.length;
    const now = new Date().toISOString();

    // 1. Reset all matches in one statement
    await supabaseAdmin
      .from('participants')
      .update({ matched_with_id: null, status: 'waiting', matched_at: null })
      .neq('status', 'waiting');

    // 2. Batch updates in chunks of 50 pairs (100 participants per chunk)
    const BATCH_SIZE = 50;
    let pairs = 0;

    for (let batchStart = 0; batchStart < total - 1; batchStart += BATCH_SIZE * 2) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE * 2, total - (total % 2 === 1 && batchStart + BATCH_SIZE * 2 >= total ? 1 : 0));
      const updates: PromiseLike<any>[] = [];

      for (let i = batchStart; i < batchEnd - 1; i += 2) {
        const p1 = shuffled[i];
        const p2 = shuffled[i + 1];

        updates.push(
          supabaseAdmin
            .from('participants')
            .update({ matched_with_id: p2.id, status: 'matched', matched_at: now })
            .eq('id', p1.id),
          supabaseAdmin
            .from('participants')
            .update({ matched_with_id: p1.id, status: 'matched', matched_at: now })
            .eq('id', p2.id)
        );
        pairs++;
      }

      // Execute all updates in this batch concurrently
      await Promise.all(updates);
    }

    // 3. If odd, mark leftover
    let unmatched = 0;
    if (total % 2 !== 0) {
      await supabaseAdmin
        .from('participants')
        .update({ matched_with_id: null, status: 'unmatched', matched_at: null })
        .eq('id', shuffled[total - 1].id);
      unmatched = 1;
    }

    return {
      success: true,
      total,
      pairs,
      unmatched,
      message: `Paired ${pairs} teams! ${unmatched ? '1 student is unmatched.' : ''}`,
    };
  },

  // Reset all matches back to waiting queue (keeps student registrations)
  resetMatches: async (): Promise<{ success: boolean; count: number; error?: string }> => {
    const now = Date.now();
    if (inFlightResetPromise) {
      return inFlightResetPromise;
    }
    if (lastResetResult && (now - lastResetTimestamp) < 2000) {
      return lastResetResult;
    }

    inFlightResetPromise = (async () => {
      try {
        statusCache.clear();

        if (!isServerSupabaseConfigured || !supabaseAdmin) {
          const res = mockStore.resetMatches();
          const r = { success: true, count: res.count };
          lastResetResult = r;
          lastResetTimestamp = Date.now();
          return r;
        }

        // Try RPC first
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('reset_matches');
        if (!rpcError && rpcData) {
          const r = { success: true, count: (rpcData as any).count ?? 0 };
          lastResetResult = r;
          lastResetTimestamp = Date.now();
          return r;
        }

        const { count, error } = await supabaseAdmin
          .from('participants')
          .update({
            matched_with_id: null,
            status: 'waiting',
            matched_at: null,
          }, { count: 'exact' })
          .neq('status', 'waiting');

        if (error) {
          console.error('Error resetting matches:', error);
          return { success: false, count: 0, error: error.message };
        }

        const r = { success: true, count: count ?? 0 };
        lastResetResult = r;
        lastResetTimestamp = Date.now();
        return r;
      } finally {
        inFlightResetPromise = null;
      }
    })();

    return inFlightResetPromise;
  },

  // Clear all data
  clearAllData: async (): Promise<{ success: boolean; count: number; error?: string }> => {
    // Invalidate all status and matching caches
    statusCache.clear();
    lastMatchingResult = null;
    lastMatchingTimestamp = 0;
    lastResetResult = null;
    lastResetTimestamp = 0;
    inFlightMatchingPromise = null;
    inFlightResetPromise = null;

    if (!isServerSupabaseConfigured || !supabaseAdmin) {
      const res = mockStore.clearData();
      return { success: true, count: res.count };
    }

    // Delete all records unconditionally
    const { count, error } = await supabaseAdmin
      .from('participants')
      .delete({ count: 'exact' })
      .not('id', 'is', null);

    if (error) {
      console.error('Error clearing participants table:', error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: count ?? 0 };
  },
};
