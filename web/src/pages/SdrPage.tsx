// src/pages/SdrPage.tsx — Outbound SDR / Appointment-Setter agent UI.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function SdrPage() {
  const [data, setData] = useState<any>({ tasks: [], queue: [] });
  const [note, setNote] = useState('');
  const load = () => api('GET', '/api/sdr').then(setData).catch(e => setNote(e.message));
  useEffect(() => { load(); }, []);
  async function draft(topN: number) {
    setNote(`Drafting outreach for top ${topN} leads…`);
    const d = await api('POST', '/api/sdr/draft', { topN });
    setNote(`Drafted ${d.made.length} emails.`);
    load();
  }
  async function send(id: number) {
    setNote('Sending…');
    const d = await api('POST', `/api/sdr/${id}/send`);
    setNote(`#${id}: ${d.result}`);
    load();
  }
  return (
    <><div className="top"><div><h1>📣 SDR Outreach</h1><div className="sub">Outbound agent — drafts personalized 5-min-demo emails for your hottest leads, then sends via Gmail</div></div></div>
      <div className="card">
        {note && <div className="muted" style={{ color: 'var(--brand)', marginBottom: 10 }}>{note}</div>}
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn" onClick={() => draft(3)}>✍️ Draft top 3</button>
          <button className="btn ghost" onClick={() => draft(5)}>Draft top 5</button>
          <span className="muted" style={{ fontSize: 12 }}>uses Claude scoring to pick hottest leads</span>
        </div>
        <h3>🎯 Lead queue (hot first)</h3>
        <table>
          <thead><tr><th>Name</th><th>Segment</th><th>Score</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>{data.queue.map((l: any) => <tr key={l.id}><td><b>{l.name}</b></td><td>{l.interest}</td><td>{l.score}</td><td>{l.priority}</td><td>{l.status}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="card"><h3>📤 Drafted outreach</h3>
        {data.tasks.length === 0 ? <div className="muted">No drafts yet — click "Draft top 3".</div> :
          data.tasks.map((t: any) => (
            <div key={t.id} style={{ borderBottom: '1px solid var(--line)', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{t.name}</b><span className="muted">{t.segment} · {t.status}</span></div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{t.draft?.slice(0, 300)}</div>
              <button className="btn" style={{ marginTop: 8 }} disabled={t.sent} onClick={() => send(t.id)}>{t.sent ? '✓ Sent' : '✉️ Send'}</button>
            </div>
          ))}
      </div>
    </>
  );
}
