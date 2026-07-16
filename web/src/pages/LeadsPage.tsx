// src/pages/LeadsPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]); const [err, setErr] = useState('');
  useEffect(() => { api('GET', '/api/leads').then(setLeads).catch(e => setErr(e.message)); }, []);
  async function setStatus(id: number, status: string) { await api('PATCH', `/api/leads/${id}`, { status }); setLeads(leads.map(l => l.id === id ? { ...l, status } : l)); }
  return (
    <>
      <div className="top"><div><h1>📥 Leads</h1><div className="sub">Shared pipeline — every agent's leads land here</div></div></div>
      <div className="card">
        {err && <div className="muted" style={{ color: 'var(--red)' }}>{err}</div>}
        <table><thead><tr><th>Name</th><th>Email</th><th>Interest</th><th>Status</th><th>When</th></tr></thead>
          <tbody>{leads.map(l => <tr key={l.id}>
            <td><b>{l.name}</b></td><td>{l.email}</td><td>{l.interest}</td>
            <td><select value={l.status} onChange={e => setStatus(l.id, e.target.value)} style={{ width: 110 }}>
              {['new', 'contacted', 'demo', 'won', 'lost'].map(s => <option key={s} value={s}>{s}</option>)}</select></td>
            <td className="muted">{new Date(l.created_at * 1000).toLocaleDateString()}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
