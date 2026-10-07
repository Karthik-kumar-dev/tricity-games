import { Participant, MatchResult } from './types';

// In-memory global store for local development/fallback
declare global {
  // eslint-disable-next-line no-var
  var __HACKATHON_MOCK_PARTICIPANTS__: Participant[] | undefined;
}

if (!globalThis.__HACKATHON_MOCK_PARTICIPANTS__) {
  globalThis.__HACKATHON_MOCK_PARTICIPANTS__ = [];
}

const getStore = (): Participant[] => {
  return globalThis.__HACKATHON_MOCK_PARTICIPANTS__!;
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
};
