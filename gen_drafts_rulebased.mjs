// gen_drafts_rulebased.mjs — create Gmail drafts (with site) without Claude.
import { execFileSync } from 'child_process';
import Database from 'better-sqlite3';

const HIM = '/root/.local/bin/himalaya';
const FROM = 'admin.ai.masystem@gmail.com';
const SITE = 'https://masystem.co.in';
const FOLDER = '[Gmail]/Drafts';

const db = new Database('/root/ai-masystem-v2/masystem.db');
const tasks = db.prepare("SELECT id,name,segment,email FROM sdr_tasks WHERE email<>'' ").all();

function rawMsg(name, segment, email, city) {
  const segLabel = (segment || 'business').replace(/_/g, ' ');
  const body =
`Hi ${name},

I'm MASystem Admin from Nihon Offshore. We build AI agents that handle patient/hotel/customer intake, reminders, and follow-ups automatically - so your team talks to people, not phones.

We already help ${segLabel} businesses cut wait times and capture more direct bookings. Happy to show you in a 5-minute demo.

You can also see our live platform here: ${SITE}

Would a quick 5-min call this week work? I'll fit your schedule.

Warm regards,
MASystem Admin
Nihon Offshore - ${SITE}
${FROM}`;
  return `From: ${FROM}\nTo: ${email}\nSubject: AI agent demo for ${name} - 5 min?\nDate: ${new Date().toUTCString()}\n\n${body}`;
}

let ok = 0;
for (const t of tasks) {
  const city = '';
  const raw = rawMsg(t.name, t.segment, t.email, city);
  try {
    execFileSync(HIM, ['message', 'save', '-f', FOLDER], { input: raw, encoding: 'utf8' });
    db.prepare("UPDATE sdr_tasks SET draft=?, status='drafted', sent=0 WHERE id=?").run(raw, t.id);
    ok++;
    console.log(`drafted #${t.id} -> ${t.email}`);
  } catch (e) {
    console.log(`#${t.id} FAILED: ${e.message.split('\n')[0]}`);
  }
}
console.log(`done: ${ok}/${tasks.length} drafts created in Gmail`);
