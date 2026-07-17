// src/pages/LeadsPage.tsx — shared lead pipeline + REALLY send outreach emails.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [note, setNote] = useState('');

  const load = () => { api('GET', '/api/leads').then(setLeads).catch(e => setErr(e.message)); };
  useEffect(() => { load(); }, []);

  async function setStatus(id: number, status: string) {
    await api('PATCH', `/api/leads/${id}`, { status });
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  }
  async function sendEmail(id: number) {
    setSending(id); setNote('');
    try {
      const d = await api('POST', `/api/leads/${id}/send`);
      setNote(`#${id}: ${d.result || 'sent'}`);
      setLeads(leads.map(l => l.id === id ? { ...l, status: 'contacted' } : l));
    } catch (e: any) { setNote(`#${id}: ${e.message}`); }
    setSending(null);
  }
  async function personalDraft(id: number) {
    setSending(id); setNote(`#${id}: drafting personalized email…`);
    try {
      const d = await api('POST', `/api/leads/${id}/draft-personal`);
      setNote(`#${id} personalized draft:\n${d.draft}`);
    } catch (e: any) { setNote(`#${id}: ${e.message}`); }
    setSending(null);
  }
  async function summarize(id: number) {
    setNote(`#${id}: summarizing thread…`);
    try {
      const d = await api('POST', `/api/leads/${id}/summarize`);
      setNote(`#${id} summary: ${d.summary}`);
      load();
    } catch (e: any) { setNote(`#${id}: ${e.message}`); }
  }
  async function syncMaps() {
    setSyncing(true); setNote('Scraping live businesses from maps…');
    try {
      const d = await api('POST', '/api/leads/ingest-maps');
      setNote(`Maps sync done (exit ${d.exit}): ${d.log?.split('\n').slice(-2).join(' ')}`);
      load();
    } catch (e: any) { setNote('Maps sync failed: ' + e.message); }
    setSyncing(false);
  }
  async function enrich() {
    setEnriching(true); setNote('Enriching missing emails (site-derived + LLM-guessed)…');
    try {
      const d = await api('POST', '/api/leads/enrich');
      setNote(`Enrich done (exit ${d.exit}): ${d.log?.split('\n').slice(-3).join(' ')}`);
      load();
    } catch (e: any) { setNote('Enrich failed: ' + e.message); }
    setEnriching(false);
  }
  async function score() {
    setScoring(true); setNote('Claude scoring + prioritizing leads…');
    try {
      const d = await api('POST', '/api/ai/score');
      setNote(`Scoring done (exit ${d.exit}): ${d.log?.split('\n').slice(-3).join(' ')}`);
      load();
    } catch (e: any) { setNote('Scoring failed: ' + e.message); }
    setScoring(false);
  }

  return (
    <>
      <div className="top"><div><h1>📥 Leads</h1><div className="sub">Shared pipeline — every agent's leads land here · send real outreach via Gmail</div></div></div>
      <div className="card">
        {err && <div className="muted" style={{ color: 'var(--red)' }}>{err}</div>}
        {note && <div className="muted" style={{ color: 'var(--brand)', marginBottom: 10 }}>{note}</div>}
        <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" disabled={syncing} onClick={syncMaps}>{syncing ? 'Scraping live businesses…' : '🌐 Sync real leads (Maps)'}</button>
          <button className="btn" disabled={enriching} onClick={enrich}>{enriching ? 'Finding emails…' : '✉️ Enrich emails'}</button>
          <button className="btn" disabled={scoring} onClick={score}>{scoring ? 'Scoring…' : '🎯 Score & prioritize'}</button>
          <span className="muted" style={{ fontSize: 12 }}>real maps leads → enriched emails → Claude scores/prioritizes → sendable</span>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Interest</th><th>Score</th><th>Priority</th><th>Tags</th><th>Status</th><th>Actions</th><th>When</th></tr></thead>
          <tbody>{leads.map((l: any) => (
            <tr key={l.id}>
              <td><b>{l.name}</b></td>
              <td>{l.email}</td>
              <td>{l.interest}</td>
              <td>{l.score || '—'}</td>
              <td>{l.priority || '—'}</td>
              <td className="muted" style={{ fontSize: 11 }}>{(l.tags ? JSON.parse(l.tags || '[]').join(', ') : '')}</td>
              <td><select value={l.status} onChange={e => setStatus(l.id, e.target.value)} style={{ width: 110 }}>
                {['new', 'contacted', 'demo', 'won', 'lost'].map(s => <option key={s} value={s}>{s}</option>)}
              </select></td>
              <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button className="btn" disabled={sending === l.id} onClick={() => sendEmail(l.id)}>{sending === l.id ? '…' : '✉️ Send'}</button>
                <button className="btn" disabled={sending === l.id} onClick={() => personalDraft(l.id)}>✍️ Personal</button>
                <button className="btn" onClick={() => summarize(l.id)}>🧠 Summarize</button>
              </td>
              <td className="muted">{new Date(l.created_at * 1000).toLocaleDateString()}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
