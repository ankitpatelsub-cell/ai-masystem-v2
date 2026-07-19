// gen_japan_drafts.mjs — bilingual JA/EN outreach drafts for Japan leads.
import { execFileSync } from 'child_process';
import Database from 'better-sqlite3';

const HIM = '/root/.local/bin/himalaya';
const FROM = 'admin.ai.masystem@gmail.com';
const SITE = 'https://masystem.co.in';
const FOLDER = '[Gmail]/Drafts';

const db = new Database('/root/ai-masystem-v2/masystem.db');
const leads = db.prepare("SELECT id,name,interest,phone,company,tags FROM leads WHERE tags LIKE '%japan%' AND (email='' OR email IS NULL)").all();

function domainOf(site) {
  try { const u = new URL(site); return u.hostname.replace(/^www\./, ''); } catch { return ''; }
}

function rawMsg(name, segLabel, phone, site) {
  const dom = domainOf(site);
  const toEmail = dom ? `info@${dom}` : '';
  const body =
`${name} 御中

はじめまして。MA System（日本⇄インドのオフショアAI開発）のMASystem Adminです。
当社は病院受付・ホテル予約・歯科窓口などの「AI受付エージェント」を提供し、お客様対応の自動化を支援しています。待ち時間の短縮や直接予約の増加に実績があります。

5分のオンラインデモをご用意できます。プラットフォームはこちら：
${SITE}

ご都合のよいお時間をお知らせいただければ、そちらに合わせます。

MA System（日本⇄インドAI開発）
${SITE}
${FROM}
${phone ? 'TEL: ' + phone : ''}

---
Hello ${name},

I'm MASystem Admin from MA System (Japan⇄India offshore AI development). We build AI reception agents for hospitals, hotels, and dental clinics — automating patient/customer intake, reminders, and follow-ups. We help cut wait times and capture more direct bookings.

We'd love to show you in a 5-minute demo. See our live platform: ${SITE}

Would a quick 5-min call this week work?

Warm regards,
MASystem Admin
MA System (Japan⇄India AI dev)
${SITE} | ${FROM}`;
  const headers = `From: ${FROM}\nTo: ${toEmail || name}\nSubject: AI受付エージェントのご提案（MA System） / AI reception agent intro — ${name}\nDate: ${new Date().toUTCString()}\n\n`;
  return { raw: headers + body, toEmail };
}

let ok = 0, gmail = 0;
for (const l of leads) {
  const segLabel = (l.interest || 'business').replace(/_/g, ' ');
  const { raw, toEmail } = rawMsg(l.name, segLabel, l.phone, l.company);
  try {
    db.prepare("UPDATE leads SET summary=?, message=?, tags=? WHERE id=?").run(
      raw.slice(0, 2000), (l.message || '') + ' [jp-draft-ready]', JSON.stringify(['japan','draft-ready']), l.id);
    ok++;
    // create Gmail draft only if we can derive a plausible email
    if (toEmail) {
      try {
        execFileSync(HIM, ['message', 'save', '-f', FOLDER], { input: raw, encoding: 'utf8' });
        gmail++;
      } catch (e) { /* skip gmail if rejected */ }
    }
  } catch (e) { console.log(`#${l.id} ERR: ${e.message.split('\n')[0]}`); }
}
console.log(`Japan drafts prepared: ${ok}/${leads.length} | Gmail drafts created: ${gmail}`);
