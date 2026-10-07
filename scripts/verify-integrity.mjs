import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

async function verifyIntegrity() {
  console.log('Fetching all participants from Supabase...');
  // Supabase limit is 1000 per page by default, fetch with range 0-1500
  const { data: participants, error } = await supabase
    .from('participants')
    .select('*')
    .range(0, 1500);

  if (error) {
    console.error('Error fetching participants:', error);
    return;
  }

  const total = participants.length;
  const waiting = participants.filter(p => p.status === 'waiting');
  const matched = participants.filter(p => p.status === 'matched');
  const unmatched = participants.filter(p => p.status === 'unmatched');

  console.log(`\n=== DATABASE INTEGRITY REPORT ===`);
  console.log(`Total records:     ${total}`);
  console.log(`Waiting records:   ${waiting.length}`);
  console.log(`Matched records:   ${matched.length}`);
  console.log(`Unmatched records: ${unmatched.length}`);

  // Check 1-to-1 reciprocity and duplicate matches
  const idMap = new Map();
  for (const p of participants) {
    idMap.set(p.id, p);
  }

  let asymmetricPairs = 0;
  let selfMatches = 0;
  let invalidReferences = 0;
  const matchedPartners = new Set();
  let duplicatePartnerRefs = 0;

  for (const p of matched) {
    if (!p.matched_with_id) {
      invalidReferences++;
      continue;
    }
    if (p.matched_with_id === p.id) {
      selfMatches++;
    }
    const partner = idMap.get(p.matched_with_id);
    if (!partner) {
      invalidReferences++;
      continue;
    }
    if (partner.matched_with_id !== p.id) {
      asymmetricPairs++;
    }

    if (matchedPartners.has(p.id)) {
      duplicatePartnerRefs++;
    }
    matchedPartners.add(p.id);
  }

  console.log(`\nIntegrity Validations:`);
  console.log(`- Self-matches:              ${selfMatches} (Must be 0)`);
  console.log(`- Asymmetric pairings:       ${asymmetricPairs} (Must be 0)`);
  console.log(`- Invalid partner IDs:       ${invalidReferences} (Must be 0)`);
  console.log(`- Duplicate partner links:   ${duplicatePartnerRefs} (Must be 0)`);

  if (selfMatches === 0 && asymmetricPairs === 0 && invalidReferences === 0 && duplicatePartnerRefs === 0 && matched.length === 1000) {
    console.log(`\n>>> RESULT: DATABASE IS 100% CONSISTENT AND ACCURATELY PAIRED! <<<`);
  } else {
    console.log(`\n>>> RESULT: INTEGRITY ISSUES DETECTED! <<<`);
  }
}

verifyIntegrity().catch(console.error);
