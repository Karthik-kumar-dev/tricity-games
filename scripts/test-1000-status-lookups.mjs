import http from 'http';
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

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 1000,
  maxFreeSockets: 256,
  timeout: 30000,
});

async function run() {
  console.log(`=======================================================`);
  console.log(`  LOAD TEST: 1000 STUDENTS FETCHING STATUS CONCURRENTLY`);
  console.log(`=======================================================`);
  
  console.log(`Fetching 1000 participant IDs from database...`);
  const { data: participants, error } = await supabase
    .from('participants')
    .select('id, name')
    .limit(1000);

  if (error || !participants || participants.length === 0) {
    console.error('Error fetching participant IDs:', error);
    return;
  }

  console.log(`Retrieved ${participants.length} students. Firing 1000 concurrent status requests...`);

  const overallStart = Date.now();

  const promises = participants.map((p, idx) => {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const req = http.request(
        `http://localhost:3000/api/status?id=${p.id}`,
        {
          method: 'GET',
          agent: agent,
          timeout: 25000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            const duration = Date.now() - startTime;
            let parsed = null;
            try {
              parsed = JSON.parse(body);
            } catch (e) {}
            resolve({
              index: idx,
              status: res.statusCode,
              duration,
              body: parsed,
              error: null,
            });
          });
        }
      );

      req.on('error', (err) => {
        resolve({
          index: idx,
          status: 0,
          duration: Date.now() - startTime,
          body: null,
          error: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('Request timeout'));
      });

      req.end();
    });
  });

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - overallStart;

  const statusCodes = {};
  const durations = [];
  let successCount = 0;
  let hasTeammateCount = 0;

  for (const r of results) {
    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
    durations.push(r.duration);
    if (r.status === 200 && r.body?.success) {
      successCount++;
      if (r.body?.participant?.partner?.name) {
        hasTeammateCount++;
      }
    }
  }

  durations.sort((a, b) => a - b);
  const min = durations[0];
  const max = durations[durations.length - 1];
  const avg = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];

  console.log(`\n--- RESULTS ---`);
  console.log(`Total Concurrent Requests: ${participants.length}`);
  console.log(`Total Time Taken:          ${totalDuration} ms`);
  console.log(`Successful Status Reads:   ${successCount} / ${participants.length}`);
  console.log(`Participants With Partner: ${hasTeammateCount} / ${participants.length}`);
  console.log(`\nStatus Code Breakdown:`);
  for (const [code, count] of Object.entries(statusCodes)) {
    console.log(`  HTTP ${code}: ${count}`);
  }
  console.log(`\nLatency Percentiles:`);
  console.log(`  Min: ${min} ms | Avg: ${avg} ms | Max: ${max} ms`);
  console.log(`  p50: ${p50} ms | p95: ${p95} ms | p99: ${p99} ms`);
}

run().catch(console.error);
