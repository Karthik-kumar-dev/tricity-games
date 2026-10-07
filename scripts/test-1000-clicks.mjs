import http from 'http';

const URL = 'http://localhost:3000/api/admin/match';
const ADMIN_TOKEN = 'tricity@57';
const CONCURRENT_REQUESTS = 1000;

console.log(`=======================================================`);
console.log(`   LOAD TEST: 1000+ CLICKS ON MATCH BUTTON AT SAME SECOND`);
console.log(`=======================================================`);
console.log(`Target URL: ${URL}`);
console.log(`Total Requests: ${CONCURRENT_REQUESTS}`);
console.log(`Dispatching all ${CONCURRENT_REQUESTS} requests concurrently...`);

// High-capacity HTTP agent to avoid client-side socket bottlenecks
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 1000,
  maxFreeSockets: 256,
  timeout: 30000,
});

async function sendMatchRequest(index) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const req = http.request(
      'http://localhost:3000/api/admin/match',
      {
        method: 'POST',
        agent: agent,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
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
          } catch (e) {
            // body not json
          }
          resolve({
            index,
            status: res.statusCode,
            duration,
            body: parsed || body,
            error: null,
          });
        });
      }
    );

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        index,
        status: 0,
        duration,
        body: null,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.end();
  });
}

async function run() {
  const overallStart = Date.now();
  
  // Create an array of 1000 promises fired in parallel
  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    promises.push(sendMatchRequest(i + 1));
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - overallStart;

  // Analysis
  const statusCodes = {};
  const durations = [];
  const errors = {};
  let successCount = 0;
  let failCount = 0;

  for (const r of results) {
    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
    durations.push(r.duration);

    if (r.status >= 200 && r.status < 300) {
      successCount++;
    } else {
      failCount++;
      const errMsg = r.error || (r.body && r.body.error) || `Status ${r.status}`;
      errors[errMsg] = (errors[errMsg] || 0) + 1;
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
  console.log(`Total Requests:         ${CONCURRENT_REQUESTS}`);
  console.log(`Total Time Taken:       ${totalDuration} ms`);
  console.log(`Successful (2xx):       ${successCount}`);
  console.log(`Failed / Blocked:       ${failCount}`);
  console.log(`\nStatus Code Breakdown:`);
  for (const [code, count] of Object.entries(statusCodes)) {
    console.log(`  HTTP ${code}: ${count}`);
  }

  console.log(`\nLatency Percentiles:`);
  console.log(`  Min: ${min} ms | Avg: ${avg} ms | Max: ${max} ms`);
  console.log(`  p50: ${p50} ms | p95: ${p95} ms | p99: ${p99} ms`);

  if (Object.keys(errors).length > 0) {
    console.log(`\nError / Block Reasons:`);
    for (const [err, count] of Object.entries(errors)) {
      console.log(`  [${count}x]: ${err}`);
    }
  }
}

run().catch(console.error);
