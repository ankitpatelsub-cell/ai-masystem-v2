// src/pages/LeadsPage.tsx — shared lead pipeline + REALLY send outreach emails.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
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
  async function syncMaps() {
    setSyncing(true); setNote('Scraping live businesses from maps…');
    try {
      const d = await api('POST', '/api/leads/ingest-maps');
      setNote(`Maps sync done (exit ${d.exit}): ${d.log?.split('\n').slice(-2).join(' ')}`);
      load();
    } catch (e: any) { setNote('Maps sync failed: ' + e.message); }
    setSyncing(false);
  }

  return (
    <>
      <div className="top"><div><h1>📥 Leads</h1><div className="sub">Shared pipeline — every agent's leads land here · send real outreach via Gmail</div></div></div>
      <div className="card">
        {err && <div className="muted" style={{ color: 'var(--red)' }}>{err}</div>}
        {note && <div className="muted" style={{ color: 'var(--brand)', marginBottom: 10 }}>{note}</div>}
        <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn" disabled={syncing} onClick={syncMaps}>{syncing ? 'Scraping live businesses…' : '🌐 Sync real leads (Maps)'}</button>
          <span className="muted" style={{ fontSize: 12 }}>pulls live hospitals/hotels from maps into the pipeline</span>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Interest</th><th>Status</th><th>Send</th><th>When</th></tr></thead>
          <tbody>{leads.map((l: any) => (
            <tr key={l.id}>
              <td><b>{l.name}</b></td>
              <td>{l.email}</td>
              <td>{l.interest}</td>
              <td><select value={l.status} onChange={e => setStatus(l.id, e.target.value)} style={{ width: 110 }}>
                {['new', 'contacted', 'demo', 'won', 'lost'].map(s => <option key={s} value={s}>{s}</option>)}
              </select></td>
              <td><button className="btn" disabled={sending === l.id} onClick={() => sendEmail(l.id)}>
                {sending === l.id ? 'Sending…' : '✉️ Send'}</button></td>
              <td className="muted">{new Date(l.created_at * 1000).toLocaleDateString()}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
