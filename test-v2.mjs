// test-v2.mjs — automated test suite for AI MASystem v2.
// Run: DB_PATH=/root/ai-masystem-v2/masystem.db HOME=/root node test-v2.mjs
import assert from 'assert';
import { runAgent } from './server/agent_runner.mjs';
import db from './server/db.js';
import app from './server/server.js';

const testServer = app.listen(0, '127.0.0.1');
await new Promise(resolve => testServer.once('listening', resolve));
const { port } = testServer.address();
const BASE = `http://127.0.0.1:${port}`;
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
let hospitalBooking = null;
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
await T('hospital booking, waitlist, check-in, and live queue', async () => {
  const doctors = await j('GET', '/api/hospital/public/doctors');
  assert.strictEqual(doctors.status, 200); assert.ok(doctors.data.length);
  const date = new Date().toISOString().slice(0, 10);
  const slots = await j('GET', `/api/hospital/public/slots?doctorId=${doctors.data[0].id}&date=${date}`);
  assert.strictEqual(slots.status, 200); assert.ok(slots.data.length);
  const first = slots.data[0];
  const booked = await j('POST', '/api/hospital/public/bookings', { body: { patientName: 'Queue Test', phone: '9999999999', doctorId: doctors.data[0].id, slotId: first.id, abhaNumber: '91-1234-5678-9012', abhaConsent: true } });
  assert.strictEqual(booked.status, 201); assert.strictEqual(booked.data.appointment.status, 'confirmed'); hospitalBooking = booked.data.appointment;
  const waitlist = await j('POST', '/api/hospital/public/bookings', { body: { patientName: 'Waitlist Test', doctorId: doctors.data[0].id, slotId: first.id, joinWaitlist: true } });
  assert.strictEqual(waitlist.status, 201); assert.strictEqual(waitlist.data.appointment.status, 'waitlisted');
  const checkedIn = await j('POST', `/api/hospital/public/bookings/${hospitalBooking.checkin_code}/check-in`);
  assert.strictEqual(checkedIn.status, 200); assert.strictEqual(checkedIn.data.appointment.queue_number, 1);
  const queue = await j('GET', `/api/hospital/queue?doctorId=${doctors.data[0].id}&date=${date}`, { token: adminTok });
  assert.strictEqual(queue.status, 200); assert.strictEqual(queue.data.length, 1);
  const called = await j('POST', `/api/hospital/queue/${hospitalBooking.id}/call`, { token: adminTok });
  assert.strictEqual(called.status, 200); assert.strictEqual(called.data.appointment.status, 'called');
  const completed = await j('POST', `/api/hospital/queue/${hospitalBooking.id}/complete`, { token: adminTok });
  assert.strictEqual(completed.status, 200); assert.strictEqual(completed.data.appointment.status, 'completed');
});
await T('hospital self-service, kiosk, schedule, transfer, display, and notification operations', async () => {
  const doctors = await j('GET', '/api/hospital/public/doctors');
  const date = new Date().toISOString().slice(0, 10), firstDoctor = doctors.data[0], secondDoctor = doctors.data[1];
  const slots = await j('GET', `/api/hospital/public/slots?doctorId=${secondDoctor.id}&date=${date}`);
  const booked = await j('POST', '/api/hospital/public/bookings', { body: { patientName: 'Self Service Test', phone: '8888888888', doctorId: secondDoctor.id, slotId: slots.data[0].id } });
  assert.strictEqual(booked.status, 201);
  const lookup = await j('GET', `/api/hospital/public/bookings/${booked.data.appointment.booking_code}`);
  assert.strictEqual(lookup.status, 200); assert.strictEqual(lookup.data.appointment.patient_name, 'Self Service Test'); assert.strictEqual(lookup.data.appointment.abha_number, undefined);
  const verification = await j('POST', `/api/hospital/public/bookings/${booked.data.appointment.booking_code}/send-verification`);
  assert.strictEqual(verification.status, 200);
  const otp = db.prepare("SELECT code FROM hospital_public_tokens WHERE appointment_id=? ORDER BY id DESC LIMIT 1").get(booked.data.appointment.id).code;
  const verified = await j('POST', `/api/hospital/public/bookings/${booked.data.appointment.booking_code}/verify`, { body: { code: otp } });
  assert.strictEqual(verified.status, 200);
  const walkIn = await j('POST', '/api/hospital/public/walk-ins', { body: { patientName: 'Kiosk Test', phone: '7777777777', doctorId: secondDoctor.id, reason: 'Walk-in' } });
  assert.strictEqual(walkIn.status, 201); assert.strictEqual(walkIn.data.appointment.visit_type, 'walk_in');
  const display = await j('GET', `/api/hospital/public/display?doctorId=${secondDoctor.id}&date=${date}`);
  assert.strictEqual(display.status, 200); assert.ok(display.data.queue.length); assert.strictEqual(display.data.queue[0].patient_name, undefined);
  const transfer = await j('POST', `/api/hospital/queue/${walkIn.data.appointment.id}/transfer`, { body: { doctorId: firstDoctor.id }, token: adminTok });
  assert.strictEqual(transfer.status, 200); assert.strictEqual(transfer.data.appointment.doctor_id, firstDoctor.id);
  const history = await j('GET', `/api/hospital/appointments/${walkIn.data.appointment.id}/history`, { token: adminTok });
  assert.strictEqual(history.status, 200); assert.ok(history.data.events.some(e => e.event_type === 'transferred'));
  const start = Date.now() + 3 * 60 * 60 * 1000, end = start + 30 * 60 * 1000;
  const block = await j('POST', '/api/hospital/schedule-blocks', { body: { doctorId: secondDoctor.id, startsAt: start, endsAt: end, reason: 'Test leave' }, token: adminTok });
  assert.strictEqual(block.status, 201);
  const blocks = await j('GET', `/api/hospital/schedule-blocks?doctorId=${secondDoctor.id}&date=${date}`, { token: adminTok });
  assert.strictEqual(blocks.status, 200); assert.ok(blocks.data.some(b => b.id === block.data.block.id));
  const deleted = await j('DELETE', `/api/hospital/schedule-blocks/${block.data.block.id}`, { token: adminTok });
  assert.strictEqual(deleted.status, 200);
  const notifications = await j('GET', `/api/hospital/notifications?appointmentId=${booked.data.appointment.id}`, { token: adminTok });
  assert.strictEqual(notifications.status, 200); assert.ok(notifications.data.length);
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
  const mk = await j('POST', '/api/leads', { body: { name: 'DraftTest', email: 'draft@test.com', interest: 'hotel' }, token: adminTok });
  assert.strictEqual(mk.status, 200);
  const id = db.prepare("SELECT id FROM leads WHERE email='draft@test.com' ORDER BY id DESC LIMIT 1").get().id;
  const { status, data } = await j('POST', `/api/leads/${id}/draft-personal`, { token: adminTok });
  assert.strictEqual(status, 200); assert.ok(data.draft);
  db.prepare('DELETE FROM leads WHERE id=?').run(id);
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
testServer.close();
process.exit(fail ? 1 : 0);
