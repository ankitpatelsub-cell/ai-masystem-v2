// src/pages/AnalyticsPage.tsx — Owner-facing KPI digest.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AnalyticsPage() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api('GET', '/api/analytics').then(setD).catch(() => {}); }, []);
  if (!d) return <div className="muted" style={{ padding: 40 }}>Loading…</div>;
  const stat = (label: string, val: any, accent?: string) => (
    <div className="stat" style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div className="v">{val}</div><div className="k">{label}</div>
    </div>
  );
  return (
    <><div className="top"><div><h1>📊 Analytics</h1><div className="sub">Owner-facing KPI digest — how your AI front desk is performing</div></div></div>
      <div className="grid">
        {stat('Total leads', d.leads.total, 'var(--brand)')}
        {stat('Scored', d.leads.scored)}
        {stat('Hot leads', d.leads.hot, 'var(--warn)')}
        {stat('Contacted', d.leads.contacted, 'var(--ok)')}
        {stat('Activity (7d)', d.activity.week, 'var(--brand2)')}
        {stat('Hospital check-ins', d.agents.hospital_queue)}
        {stat('Hotel bookings', d.agents.hotel_bookings)}
        {stat('SDR sent', d.agents.sdr_sent, 'var(--ok)')}
        {stat('Reminders sent', d.agents.reminders_sent)}
        {stat('Reviews drafted', d.agents.reviews_drafted)}
        {stat('Invoices', d.agents.invoices)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 14 }}>
        {d.leads.bySegment.map((s: any) => <div key={s.seg} className="stat"><div className="v">{s.c}</div><div className="k">{s.seg || 'other'}</div></div>)}
      </div>
      <div className="card" style={{ marginTop: 14 }}><h3>🕘 Recent activity</h3>
        {d.recent.length === 0 ? <div className="muted">No activity yet.</div> :
          <table><tbody>{d.recent.map((r: any, i: number) => (
            <tr key={i}><td>{r.icon}</td><td><b>{r.agent}</b></td><td>{r.title}</td><td className="muted">{r.sub}</td><td className="muted" style={{ fontSize: 11 }}>{new Date(r.created_at*1000).toLocaleString()}</td></tr>
          ))}</tbody></table>}
      </div>
    </>
  );
}
