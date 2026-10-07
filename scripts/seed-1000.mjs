import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...vals] = trimmed.split('=');
    env[key.trim()] = vals.join('=').trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function seedParticipants(count = 1000) {
  console.log(`Clearing existing participants...`);
  const { error: delError } = await supabase.from('participants').delete().neq('phone', '0');
  if (delError) {
    console.error('Delete error:', delError);
  }

  console.log(`Generating ${count} participants...`);
  const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Pari', 'Isha', 'Riya', 'Anushka', 'Tara'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Mehta', 'Nair', 'Singh', 'Gupta', 'Kumar', 'Joshi', 'Chopra', 'Malhotra', 'Bhat', 'Rao', 'Iyer'];

  const rows = [];
  for (let i = 1; i <= count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const phone = `+91980000${String(i).padStart(4, '0')}`;
    rows.push({
      name: `${fn} ${ln} #${i}`,
      phone: phone,
      status: 'waiting',
      matched_with_id: null,
      matched_at: null,
    });
  }

  // Insert in batches of 250
  const BATCH = 250;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error: insError } = await supabase.from('participants').insert(slice);
    if (insError) {
      console.error(`Batch ${i}-${i + slice.length} error:`, insError);
      throw insError;
    }
    console.log(`Inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length} participants`);
  }

  console.log(`Successfully seeded ${count} participants!`);
}

if (process.argv[1]?.endsWith('seed-1000.mjs')) {
  const count = parseInt(process.argv[2] || '1000', 10);
  seedParticipants(count).catch(console.error);
}
