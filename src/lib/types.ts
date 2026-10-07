export type ParticipantStatus = 'waiting' | 'matched' | 'unmatched';

export interface Participant {
  id: string;
  name: string;
  phone: string;
  matched_with_id: string | null;
  status: ParticipantStatus;
  created_at: string;
  matched_at: string | null;
  // Hydrated partner details when matched
  partner?: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

export interface MatchResult {
  success: boolean;
  total: number;
  pairs: number;
  unmatched: number;
  message?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  isMock?: boolean;
}
