// test-v2.mjs — automated test suite for AI MASystem v2.
// Run: DB_PATH=/root/ai-masystem-v2/masystem.db HOME=/root node test-v2.mjs
import assert from 'assert';
import { runAgent } from './server/agent_runner.mjs';
import db from './server/db.js';

const BASE = 'http://localhost:8099';
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log('  ✓', n); };
const bad = (n, e) => { fail++; console.log('  ✗', n, '->', e.message || e); };
async function T(n, fn) { try { await fn(); ok(n); } catch (e) { bad(n, e); } }

const j = async (method, path, { body, token } = {}) => {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { status: r.status, data };
};

console.log('\n=== AUTH & RBAC ===');
let adminTok = '', staffTok = '';
await T('admin login (strong pw)', async () => {
  const { status, data } = await j('POST', '/api/auth/login', { body: { username: 'admin', password: process.env.ADMIN_PW || 'MASys@9205a6c968d7' } });
  assert.strictEqual(status, 200); assert.ok(data.token); adminTok = data.token;
});
await T('wrong password rejected', async () => {
  const { status } = await j('POST', '/api/auth/login', { body: { username: 'admin', password: 'nope' } });
  assert.strictEqual(status, 401);
});
await T('create staff user', async () => {
  const uname = 'tester_' + Date.now();
  const { status, data } = await j('POST', '/api/users', { body: { username: uname, password: 'Test@123', role: 'staff' }, token: adminTok });
  assert.strictEqual(status, 200); assert.strictEqual(data.role, 'staff');
  // reuse this staff account for the permission checks below
  const lg = await j('POST', '/api/auth/login', { body: { username: uname, password: 'Test@123' } });
  assert.strictEqual(lg.status, 200); staffTok = lg.data.token;
});
await T('staff DENIED /api/users (403)', async () => {
  const { status } = await j('GET', '/api/users', { token: staffTok });
  assert.strictEqual(status, 403);
});
await T('staff DENIED /api/permissions (403)', async () => {
  const { status } = await j('GET', '/api/permissions', { token: staffTok });
  assert.strictEqual(status, 403);
});
await T('staff ALLOWED /api/car/chat (200)', async () => {
  const { status } = await j('POST', '/api/car/chat', { body: { text: 'price 10 lakh' }, token: staffTok });
  assert.strictEqual(status, 200);
});
await T('no token -> 401 on /api/leads', async () => {
  const { status } = await j('GET', '/api/leads');
  assert.strictEqual(status, 401);
});

console.log('\n=== AGENT ENDPOINTS ===');
await T('car chat (intent)', async () => {
  const { status, data } = await j('POST', '/api/car/chat', { body: { text: 'exchange my 2020 Honda for a 2024 SUV', locale: 'en' }, token: adminTok });
  assert.strictEqual(status, 200); assert.ok(data.intent);
});
await T('car cars list', async () => {
  const { status, data } = await j('GET', '/api/car/cars', { token: adminTok });
  assert.strictEqual(status, 200); assert.ok(Array.isArray(data));
});
await T('hospital intake (hi)', async () => {
  const { status, data } = await j('POST', '/api/hospital/intake', { body: { text: 'bukhar Rajesh', locale: 'hi' }, token: adminTok });
  assert.strictEqual(status, 200); assert.ok(data.id); assert.ok(Array.isArray(data.steps));
});
await T('hotel intake', async () => {
  const { status } = await j('POST', '/api/hotel/intake', { body: { text: 'room tonight', locale: 'en' }, token: adminTok });
  assert.strictEqual(status, 200);
});
await T('manager route -> car', async () => {
  const { status, data } = await j('POST', '/api/manager/route', { body: { request: 'patient appointment' }, token: adminTok });
  assert.strictEqual(status, 200); assert.ok(data.target);
});
await T('reels build', async () => {
  const { status, data } = await j('POST', '/api/reels/build', { body: { topic: 'new Creta promo' }, token: adminTok });
  assert.strictEqual(status, 200); assert.ok(data.script);
});
await T('leads list (auth)', async () => {
  const { status, data } = await j('GET', '/api/leads', { token: adminTok });
  assert.strictEqual(status, 200); assert.ok(Array.isArray(data));
});
await T('leads SEND (draft via SDK + real Gmail send)', async () => {
  // create a throwaway lead to our own inbox (verifiable, no external spam)
  const mk = await j('POST', '/api/leads', { body: { name: 'SendTest', email: 'admin.ai.masystem@gmail.com', interest: 'car' }, token: adminTok });
  assert.strictEqual(mk.status, 200);
  const id = db.prepare("SELECT id FROM leads WHERE email='admin.ai.masystem@gmail.com' ORDER BY id DESC LIMIT 1").get().id;
  const { status, data } = await j('POST', `/api/leads/${id}/send`, { token: adminTok });
  assert.strictEqual(status, 200); assert.ok(/sent/i.test(data.result), 'expected sent: ' + data.result);
  db.prepare('DELETE FROM leads WHERE id=?').run(id); // cleanup
});
await T('ai-features: score endpoint accepts (bg)', async () => {
  const { status } = await j('POST', '/api/ai/score', { token: adminTok });
  assert.strictEqual(status, 200);
  await new Promise(r => setTimeout(r, 1000));
});
await T('ai-features: content endpoint accepts (bg)', async () => {
  const { status } = await j('POST', '/api/ai/content', { token: adminTok });
  assert.strictEqual(status, 200);
  await new Promise(r => setTimeout(r, 500));
});
await T('leads draft-personal endpoint accepts (bg AI call)', async () => {
  const { status } = await j('POST', '/api/leads/1/draft-personal', { token: adminTok });
  assert.strictEqual(status, 200);
  await new Promise(r => setTimeout(r, 500));
});
await T('leads ingest-maps endpoint accepts (real source)', async () => {
  const { status } = await j('POST', '/api/leads/ingest-maps', { token: adminTok });
  assert.strictEqual(status, 200); // returns immediately; child scrapes in bg
  // verify at least the real-source rows exist from prior runs
  const c = db.prepare("SELECT COUNT(*) c FROM leads WHERE source='maps'").get().c;
  assert.ok(c > 0, 'expected real maps leads in DB');
});
await T('status (public)', async () => {
  const { status, data } = await j('GET', '/api/status');
  assert.strictEqual(status, 200); assert.strictEqual(data.agents, 6);
});

console.log('\n=== MCP AGENT (SDK + free CLI + DB tools) ===');
await T('agent queries DB via MCP tool', async () => {
  const out = await runAgent('You are back-office. Use query_leads to count leads, reply with just the number.',
    'How many leads are in the system? Reply with only the count number.', { maxTurns: 15 });
  assert.ok(/\d/.test(out), 'expected a number in: ' + out.slice(0, 80));
});
await T('agent WRITES via MCP tool (add_lead)', async () => {
  const before = db.prepare('SELECT COUNT(*) c FROM leads').get().c;
  await runAgent('You are back-office. Use the add_lead tool.',
    "Create a lead: name 'Suite Test', email 'suite@test.com', interest 'hotel'", { maxTurns: 15 });
  const after = db.prepare("SELECT COUNT(*) c FROM leads WHERE email='suite@test.com'").get().c;
  assert.strictEqual(after, 1);
  db.prepare("DELETE FROM leads WHERE email='suite@test.com'").run(); // cleanup
});

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);
