// gen_drafts_codex.mjs — use Codex (OpenAI) to PREPARE personalized outreach drafts.
// Sets MODEL_PROVIDER=codex so agent_runner.runAgent calls Codex CLI.
process.env.MODEL_PROVIDER = 'codex';
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import Database from 'better-sqlite3';

const HIM = '/root/.local/bin/himalaya';
const FROM = 'admin.ai.masystem@gmail.com';
const SITE = 'https://masystem.co.in';
const FOLDER = '[Gmail]/Drafts';
const { runAgent } = await import('./server/agent_runner.mjs');

const db = new Database('/root/ai-masystem-v2/masystem.db');

function domainOf(site) { try { return new URL(site).hostname.replace(/^www\./, ''); } catch { return ''; } }

async function prepareIndia(lead) {
  const seg = (lead.segment || 'business').replace(/_/g, ' ');
  const prompt =
`Write a SHORT, warm, professional outreach email (body only, no subject/headers) from MASystem Admin (MA System, AI agent company).
To: ${lead.name} (${seg} business).
Requirements: reference their real name and segment; offer our AI agents for intake/reminders/follow-ups; invite THEM to email us (no call push); include our site ${SITE}; sign "Warm regards, MASystem Admin". Under 130 words, polite, hand-written feel.`;
  const body = await runAgent('You are the MA System SDR agent.', prompt, { maxTurns: 8 });
  return `From: ${FROM}\nTo: ${lead.email}\nSubject: Introduction from MA System - AI agents for ${lead.name}\nDate: ${new Date().toUTCString()}\n\n${body}`;
}

async function prepareJapan(lead) {
  const seg = (lead.interest || 'business').replace(/_/g, ' ');
  const prompt =
`Write a bilingual (Japanese then English) outreach email (body only) from MASystem Admin (MA System, Japan⇄India AI dev).
To: ${lead.name} (${seg} in Japan).
Japanese part: 丁寧な敬語で、AI受付エージェントの紹介、サイト ${SITE} の記載、メールでのご連絡を招待（電話は押さない）。
English part: polite, invite THEM to email us, include ${SITE}, sign "Warm regards, MASystem Admin".
Keep each part under 120 words. No subject/headers.`;
  const body = await runAgent('You are the MA System Japan SDR agent (bilingual).', prompt, { maxTurns: 8 });
  const dom = domainOf(lead.company);
  const to = dom ? `info@${dom}` : lead.name;
  return `From: ${FROM}\nTo: ${to}\nSubject: MA System（AI受付エージェント）のご紹介 / Introduction from MA System — ${lead.name}\nDate: ${new Date().toUTCString()}\n\n${body}`;
}

// limit controls how many to test (Codex is slow ~30-60s each)
const LIMIT = parseInt(process.argv[2] || '2', 10);
let done = 0;

// India SDR tasks (have email)
const india = db.prepare("SELECT id,name,segment,email FROM sdr_tasks WHERE email<>'' AND status<>'codex' LIMIT ?").all(LIMIT);
for (const l of india) {
  try {
    const raw = await prepareIndia(l);
    // save to Gmail via temp file + bash redirect (reliable stdin EOF)
    const tmp = `/tmp/draft_${l.id}_${Date.now()}.eml`;
    writeFileSync(tmp, raw);
    try {
      execFileSync('/bin/bash', ['-c', `"${HIM}" message save -f "${FOLDER}" < "${tmp}"`], { encoding: 'utf8' });
    } finally { try { unlinkSync(tmp); } catch {} }
    db.prepare("UPDATE sdr_tasks SET draft=?, status='codex' WHERE id=?").run(raw, l.id);
    console.log(`IN ✉ ${l.name}`);
    done++;
  } catch (e) { console.log(`IN ✗ ${l.name}: ${e.message.split('\n')[0]}`); }
}

// Japan leads (no email -> save to DB)
const jp = db.prepare("SELECT id,name,interest,company,tags FROM leads WHERE tags LIKE '%japan%' AND tags NOT LIKE '%codex%' LIMIT ?").all(LIMIT);
for (const l of jp) {
  try {
    const raw = await prepareJapan(l);
    db.prepare("UPDATE leads SET summary=?, tags=? WHERE id=?").run(raw.slice(0,3000), JSON.stringify(['japan','draft-ready','codex']), l.id);
    console.log(`JP ✉ ${l.name}`);
    done++;
  } catch (e) { console.log(`JP ✗ ${l.name}: ${e.message.split('\n')[0]}`); }
}
console.log(`Codex-prepared ${done} drafts.`);
