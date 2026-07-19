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

はじめまして。MA System（日本⇄インドのオフショアAI開発）のMASystem Adminと申します。
私たちは病院受付・ホテル予約・歯科窓口などの「AI受付エージェント」を提供し、お客様対応の自動化をサポートしております。お待たせ時間の短縮や直接予約の増加など、これまでに多くの実績がございます。

もしご関心をお持ちでしたら、ぜひ下記までお気軽にメールでお問い合わせください。詳しい資料やデモのご案内をお送りいたします。お返事を心よりお待ちしております。

プラットフォームはこちら：
${SITE}

MA System（日本⇄インドAI開発）
${SITE}
${FROM}
${phone ? 'TEL: ' + phone : ''}

---
Hello ${name},

I hope this message finds you well. I'm MASystem Admin. We build AI reception agents for hospitals, hotels, and dental clinics — automating patient and customer intake, reminders, and follow-ups, with a track record of reducing wait times and increasing direct bookings.

If this is of interest, we would be delighted to hear from you. Please feel free to email us at your convenience — we'd be happy to share more details or arrange a short demo. No pressure at all; we simply welcome the chance to connect.

You can also explore our live platform here: ${SITE}

Warm regards,
MASystem Admin
${SITE} | ${FROM}`;
  const headers = `From: ${FROM}\nTo: ${toEmail || name}\nSubject: MA System（AI受付エージェント）のご紹介 / Introduction from MA System — ${name}\nDate: ${new Date().toUTCString()}\n\n`;
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
