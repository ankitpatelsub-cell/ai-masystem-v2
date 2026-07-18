// redraft_sdr.mjs — re-draft existing sdr_tasks to include the website.
import { runAgent } from './server/agent_runner.mjs';
import Database from 'better-sqlite3';
const db = new Database('/root/ai-masystem-v2/masystem.db');
const tasks = db.prepare('SELECT * FROM sdr_tasks').all();
let n = 0;
for (const t of tasks) {
  try {
    const draft = await runAgent(
      'You are the MASystem outbound SDR agent. Write a SHORT, warm, business-SPECIFIC outreach email that books a 5-minute demo call. Reference the lead’s real name, segment, and city. Always include our website https://masystem.co.in and a clear CTA to book a 5-min demo. Under 130 words, MASystem Admin persona.',
      `Lead: name=${t.name}, segment=${t.segment||'our AI agents'}, email=${t.email}, score=${t.score}. Write the outreach email body (no subject/headers).`,
      { maxTurns: 15 }
    );
    db.prepare("UPDATE sdr_tasks SET draft=?, status='drafted' WHERE id=?").run(draft, t.id);
    n++;
    console.log(`re-drafted #${t.id} (${t.name})`);
  } catch (e) { console.log(`#${t.id} failed: ${e.message.split('\n')[0]}`); }
}
console.log(`done: ${n}/${tasks.length}`);
