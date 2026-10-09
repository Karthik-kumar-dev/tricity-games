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

export interface PassHolder {
  id?: string;
  registration_id: string;
  team_name?: string;
  role?: string;
  name: string;
  email?: string;
  phone: string;
  phone_normalized: string;
  branch?: string;
  college?: string;
  team_size?: number;
  food_tokens?: number;
  activity_passes: number;
  created_at?: string;
  updated_at?: string;
}

export interface CsvSkippedRow {
  row: number;
  phone?: string;
  reason: string;
}

export interface CsvUploadSummary {
  totalRows: number;
  processedRows: number;
  inserted: number;
  updated: number;
  skipped: CsvSkippedRow[];
  activePassesCount: number;
  noPassCount: number;
  totalHolders: number;
}

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reported_phone: string;
  reported_phone_normalized: string;
  reporter_name?: string;
  reporter_phone?: string;
  category: string;
  details?: string;
  status: ReportStatus;
  created_at: string;
  resolved_at?: string | null;
}


