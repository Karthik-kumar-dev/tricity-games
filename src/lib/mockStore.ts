import { Participant, MatchResult, PassHolder, Report } from './types';
import { normalizePhone } from './validation';

// In-memory global store for local development/fallback
declare global {
  // eslint-disable-next-line no-var
  var __HACKATHON_MOCK_PARTICIPANTS__: Participant[] | undefined;
  // eslint-disable-next-line no-var
  var __HACKATHON_MOCK_PASS_HOLDERS__: PassHolder[] | undefined;
  // eslint-disable-next-line no-var
  var __HACKATHON_MOCK_REPORTS__: Report[] | undefined;
}

if (!globalThis.__HACKATHON_MOCK_PARTICIPANTS__) {
  globalThis.__HACKATHON_MOCK_PARTICIPANTS__ = [];
}

if (!globalThis.__HACKATHON_MOCK_PASS_HOLDERS__) {
  globalThis.__HACKATHON_MOCK_PASS_HOLDERS__ = [];
}

if (!globalThis.__HACKATHON_MOCK_REPORTS__) {
  globalThis.__HACKATHON_MOCK_REPORTS__ = [];
}

const getStore = (): Participant[] => {
  return globalThis.__HACKATHON_MOCK_PARTICIPANTS__!;
};

const getPassHoldersStore = (): PassHolder[] => {
  return globalThis.__HACKATHON_MOCK_PASS_HOLDERS__!;
};

const getReportsStore = (): Report[] => {
  return globalThis.__HACKATHON_MOCK_REPORTS__!;
};

export const mockStore = {
  getParticipants: (): Participant[] => {
    return [...getStore()];
  },

  getParticipantById: (id: string): Participant | null => {
    const p = getStore().find((item) => item.id === id);
    if (!p) return null;
    if (p.matched_with_id) {
      const partner = getStore().find((item) => item.id === p.matched_with_id);
      return {
        ...p,
        partner: partner ? { id: partner.id, name: partner.name, phone: partner.phone } : null,
      };
    }
    return { ...p, partner: null };
  },

  getParticipantByPhone: (phone: string): Participant | null => {
    const p = getStore().find((item) => item.phone === phone);
    if (!p) return null;
    return mockStore.getParticipantById(p.id);
  },

  addParticipant: (name: string, phone: string): { participant: Participant; isDuplicate: boolean } => {
    const store = getStore();
    const existing = store.find((item) => item.phone === phone);
    if (existing) {
      // Upsert: update existing row instead of inserting a duplicate
      existing.name = name.trim();
      return { participant: existing, isDuplicate: true };
    }

    const newParticipant: Participant = {
      id: 'mock-' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      phone,
      matched_with_id: null,
      status: 'waiting',
      created_at: new Date().toISOString(),
      matched_at: null,
      partner: null,
    };

    store.push(newParticipant);
    return { participant: newParticipant, isDuplicate: false };
  },

  runMatching: (): MatchResult => {
    const store = getStore();
    if (store.length === 0) {
      return { success: true, total: 0, pairs: 0, unmatched: 0, message: 'No participants registered yet.' };
    }

    // Reset previous matches
    store.forEach((p) => {
      p.matched_with_id = null;
      p.status = 'waiting';
      p.matched_at = null;
      p.partner = null;
    });

    // Fisher-Yates shuffle
    const shuffled = [...store];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const total = shuffled.length;
    let pairs = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < total - 1; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];

      p1.matched_with_id = p2.id;
      p1.status = 'matched';
      p1.matched_at = now;

      p2.matched_with_id = p1.id;
      p2.status = 'matched';
      p2.matched_at = now;

      pairs++;
    }

    // If odd number of participants, last one remains unmatched
    let unmatched = 0;
    if (total % 2 !== 0) {
      const leftover = shuffled[total - 1];
      leftover.matched_with_id = null;
      leftover.status = 'unmatched';
      leftover.matched_at = null;
      unmatched = 1;
    }

    return {
      success: true,
      total,
      pairs,
      unmatched,
      message: `Successfully matched ${pairs} pairs! ${unmatched ? '1 participant is unmatched.' : ''}`,
    };
  },

  resetMatches: (): { count: number } => {
    const store = getStore();
    let count = 0;
    for (const p of store) {
      if (p.status !== 'waiting') {
        p.matched_with_id = null;
        p.status = 'waiting';
        p.matched_at = null;
        count++;
      }
    }
    return { count };
  },

  clearData: (): { count: number } => {
    const store = getStore();
    const count = store.length;
    globalThis.__HACKATHON_MOCK_PARTICIPANTS__ = [];
    return { count };
  },

  // ==========================================
  // PASS HOLDERS MOCK OPERATIONS
  // ==========================================

  hasActivePass: (phone: string): boolean => {
    const norm = normalizePhone(phone);
    if (!norm) return false;
    const store = getPassHoldersStore();
    // Return true if ANY row for this normalized phone has activity_passes >= 1
    return store.some(
      (h) => h.phone_normalized === norm && Number(h.activity_passes) >= 1
    );
  },

  getPassHolders: (searchQuery?: string): PassHolder[] => {
    const store = getPassHoldersStore();
    if (!searchQuery || !searchQuery.trim()) {
      return [...store];
    }
    const q = searchQuery.toLowerCase().trim();
    const qNorm = normalizePhone(q);
    return store.filter((h) => {
      const nameMatch = h.name.toLowerCase().includes(q);
      const phoneMatch = h.phone.toLowerCase().includes(q) || (qNorm && h.phone_normalized.includes(qNorm));
      return nameMatch || phoneMatch;
    });
  },

  getPassHolderCounts: (): { total: number; active: number; noPass: number } => {
    const store = getPassHoldersStore();
    const total = store.length;
    const active = store.filter((h) => Number(h.activity_passes) >= 1).length;
    const noPass = total - active;
    return { total, active, noPass };
  },

  upsertPassHolders: (records: PassHolder[]): { inserted: number; updated: number } => {
    const store = getPassHoldersStore();
    let inserted = 0;
    let updated = 0;

    for (const rec of records) {
      const existingIdx = store.findIndex((h) => h.phone_normalized === rec.phone_normalized);
      if (existingIdx >= 0) {
        store[existingIdx] = {
          ...store[existingIdx],
          ...rec,
          updated_at: new Date().toISOString(),
        };
        updated++;
      } else {
        store.push({
          ...rec,
          id: 'mock-pass-' + Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        inserted++;
      }
    }

    return { inserted, updated };
  },

  replaceAllPassHolders: (records: PassHolder[]): { inserted: number } => {
    const now = new Date().toISOString();
    globalThis.__HACKATHON_MOCK_PASS_HOLDERS__ = records.map((rec) => ({
      ...rec,
      id: 'mock-pass-' + Math.random().toString(36).substring(2, 9),
      created_at: now,
      updated_at: now,
    }));
    return { inserted: records.length };
  },

  addPassHolder: (data: Partial<PassHolder> & { name: string; phone: string }): { passHolder: PassHolder; isUpdated: boolean } => {
    const norm = normalizePhone(data.phone);
    const store = getPassHoldersStore();
    const existingIdx = store.findIndex((h) => h.phone_normalized === norm);
    const now = new Date().toISOString();

    const record: PassHolder = {
      id: existingIdx >= 0 ? store[existingIdx].id : 'mock-pass-' + Math.random().toString(36).substring(2, 9),
      registration_id: data.registration_id?.trim() || `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      team_name: data.team_name?.trim() || '',
      role: data.role?.trim() || 'Participant',
      name: data.name.trim(),
      email: data.email?.trim() || '',
      phone: data.phone.trim(),
      phone_normalized: norm,
      branch: data.branch?.trim() || '',
      college: data.college?.trim() || '',
      team_size: typeof data.team_size === 'number' && data.team_size > 0 ? data.team_size : 1,
      food_tokens: typeof data.food_tokens === 'number' && data.food_tokens >= 0 ? data.food_tokens : 0,
      activity_passes: typeof data.activity_passes === 'number' && data.activity_passes >= 0 ? data.activity_passes : 1,
      created_at: existingIdx >= 0 ? store[existingIdx].created_at : now,
      updated_at: now,
    };

    if (existingIdx >= 0) {
      store[existingIdx] = record;
      return { passHolder: record, isUpdated: true };
    } else {
      store.push(record);
      return { passHolder: record, isUpdated: false };
    }
  },

  deletePassHolder: (identifier: { id?: string; phone?: string }): { success: boolean; deletedCount: number } => {
    const store = getPassHoldersStore();
    const initialLen = store.length;
    const norm = identifier.phone ? normalizePhone(identifier.phone) : '';
    const filtered = store.filter((h) => {
      if (identifier.id && h.id === identifier.id) return false;
      if (norm && h.phone_normalized === norm) return false;
      return true;
    });
    globalThis.__HACKATHON_MOCK_PASS_HOLDERS__ = filtered;
    return { success: true, deletedCount: initialLen - filtered.length };
  },

  // ==========================================
  // REPORTS MOCK OPERATIONS
  // ==========================================

  addReport: (data: {
    reported_phone: string;
    category: string;
    details?: string;
    reporter_name?: string;
    reporter_phone?: string;
  }): Report => {
    const store = getReportsStore();
    const norm = normalizePhone(data.reported_phone);
    const newReport: Report = {
      id: 'mock-rep-' + Math.random().toString(36).substring(2, 9),
      reported_phone: data.reported_phone.trim(),
      reported_phone_normalized: norm,
      reporter_name: data.reporter_name?.trim() || 'Anonymous Student',
      reporter_phone: data.reporter_phone ? normalizePhone(data.reporter_phone) : '',
      category: data.category.trim(),
      details: data.details?.trim() || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    store.unshift(newReport);
    return newReport;
  },

  getReports: (searchQuery?: string): Report[] => {
    const store = getReportsStore();
    if (!searchQuery || !searchQuery.trim()) {
      return [...store];
    }
    const q = searchQuery.toLowerCase().trim();
    return store.filter(
      (r) =>
        r.reported_phone.includes(q) ||
        r.reported_phone_normalized.includes(q) ||
        (r.reporter_name || '').toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.details || '').toLowerCase().includes(q)
    );
  },

  updateReportStatus: (id: string, status: Report['status']): boolean => {
    const store = getReportsStore();
    const item = store.find((r) => r.id === id);
    if (!item) return false;
    item.status = status;
    if (status === 'resolved' || status === 'dismissed') {
      item.resolved_at = new Date().toISOString();
    }
    return true;
  },

  deleteReport: (id: string): boolean => {
    const store = getReportsStore();
    const initialLen = store.length;
    const filtered = store.filter((r) => r.id !== id);
    globalThis.__HACKATHON_MOCK_REPORTS__ = filtered;
    return filtered.length < initialLen;
  },
};
