// routes/leads.js — shared lead pipeline (was biz-site).
import express from 'express';
import db from '../db.js';
import { requirePerm, logActivity } from '../auth.js';
const router = express.Router();
router.post('/', (req,res)=>{ const b=req.body||{};
  if(!b.name || !b.email) return res.status(400).json({error:'name + email required'});
  db.prepare('INSERT INTO leads (name,company,email,phone,interest,message,source,status) VALUES (?,?,?,?,?,?,?,?)')
    .run(b.name,b.company||'',b.email,b.phone||'',b.interest||'',b.message||'','web','new');
  logActivity('leads','📥','New lead',`${b.name} / ${b.interest||''}`);
  res.json({ok:true});
});
router.get('/', requirePerm('leads:view'), (req,res)=>{
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});
router.patch('/:id', requirePerm('leads:manage'), (req,res)=>{
  const { status, owner } = req.body||{};
  if(status) db.prepare('UPDATE leads SET status=? WHERE id=?').run(status, req.params.id);
  if(owner) db.prepare('UPDATE leads SET owner=? WHERE id=?').run(owner, req.params.id);
  res.json({ok:true});
});
// Draft (via SDK agent) + REALLY send (via MCP send_lead_email) a lead-outreach email.
router.post('/:id/send', requirePerm('leads:manage'), async (req,res)=>{
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if(!lead) return res.status(404).json({error:'lead not found'});
  let result;
  try {
    const draft = await (await import('../agent_runner.mjs')).runAgent(
      'You are the MASystem outreach agent. Write a concise, professional outreach email body (no subject, no headers) for the lead described.',
      `Draft an outreach email for: name=${lead.name}, interest=${lead.interest||'our AI agents'}, email=${lead.email}. Keep it under 120 words, MASystem Admin persona, 5-minute demo CTA.`,
      { maxTurns: 15 }
    );
    const subject = `AI agent demo for ${lead.name} — 5 min?`;
    // call the MCP send tool directly (reuse the server's himalaya path)
    const { execFileSync } = await import('child_process');
    const HIMALAYA = '/root/.local/bin/himalaya';
    const date = new Date().toUTCString().replace('GMT','+0000');
    const raw = `To: ${lead.email}\r\nFrom: admin.ai.masystem@gmail.com\r\nSubject: ${subject}\r\nDate: ${date}\r\n\r\n${draft}\r\n`;
    const out = execFileSync(HIMALAYA, ['message','send'], { input: raw, encoding: 'utf8' });
    db.prepare("UPDATE leads SET status='contacted' WHERE id=?").run(req.params.id);
    result = 'sent: ' + (out.trim()||'ok');
  } catch(e){ result = 'send failed: ' + e.message.split('\n')[0]; }
  res.json({ ok:true, result });
});
// Real data source: scrape live businesses via the maps skill -> insert as leads.
router.post('/ingest-maps', requirePerm('leads:manage'), async (req,res)=>{
  const { spawn } = await import('child_process');
  const py = spawn('python3', ['ingest_maps.py'], { cwd: process.cwd(), env: { ...process.env, DB_PATH: process.env.DB_PATH || '/root/ai-masystem-v2/masystem.db' } });
  let out = ''; py.stdout.on('data', d => out += d); py.stderr.on('data', d => out += d);
  py.on('close', code => res.json({ ok: true, exit: code, log: out.slice(-500) }));
});

// Enrich missing emails for maps leads (site-derived + LLM-guessed) so they become sendable.
router.post('/enrich', requirePerm('leads:manage'), async (req,res)=>{
  const { spawn } = await import('child_process');
  const py = spawn('python3', ['enrich_emails.py'], { cwd: process.cwd(), env: { ...process.env, DB_PATH: process.env.DB_PATH || '/root/ai-masystem-v2/masystem.db' } });
  let out = ''; py.stdout.on('data', d => out += d); py.stderr.on('data', d => out += d);
  py.on('close', code => res.json({ ok: true, exit: code, log: out.slice(-500) }));
});
export default router;
