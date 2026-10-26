// Simple load test of the server-rendered pages: many requests at once for some seconds, then the numbers.
//   node scripts/load.mjs [baseUrl] [concurrency] [seconds] [path ...]
//   node scripts/load.mjs http://localhost:4000 50 15 / /katalog /biz-haqida
// Point it at the Node server itself (port 4000), not at Nginx: Nginx limits requests per IP (30/s) and would answer 429.
const [base = 'http://localhost:4000', concurrency = '50', seconds = '15', ...paths] = process.argv.slice(2);
const targets = paths.length ? paths : ['/', '/katalog', '/biz-haqida'];
const until = Date.now() + Number(seconds) * 1000;
const times = [];
const statuses = new Map();
let failures = 0;

async function worker(index) {
  for (let i = index; Date.now() < until; i++) {
    const url = base + targets[i % targets.length];
    const started = performance.now();
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      times.push(performance.now() - started);
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    } catch {
      failures++;
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Number(concurrency) }, (_, i) => worker(i)));
const elapsed = (performance.now() - startedAt) / 1000;

times.sort((a, b) => a - b);
const at = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))]?.toFixed(0) ?? '-';
console.log(`pages: ${targets.join(' ')}  concurrency: ${concurrency}  seconds: ${seconds}`);
console.log(`requests: ${times.length}  per second: ${(times.length / elapsed).toFixed(0)}  failed: ${failures}`);
console.log(`status codes: ${[...statuses].map(([code, n]) => `${code}=${n}`).join(' ')}`);
console.log(`ms  p50: ${at(0.5)}  p95: ${at(0.95)}  p99: ${at(0.99)}  max: ${at(1)}`);
process.exit(failures > 0 || [...statuses.keys()].some((code) => code >= 500) ? 1 : 0);
