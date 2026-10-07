import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export const supabase = clientInstance;
