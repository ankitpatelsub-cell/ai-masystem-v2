// src/pages/Overview.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const AGENTS = [
  { label: 'Car Sales', ic: '🚗' },
  { label: 'Hospital', ic: '🏥' },
  { label: 'Hotel', ic: '🏨' },
  { label: 'Manager', ic: '🎯' },
  { label: 'Back-Office', ic: '🤖' },
  { label: 'Reels', ic: '🎬' },
];

export default function Overview() {
  const nav = useNavigate();
  const [s, setS] = useState<any>(null);
  const [act, setAct] = useState<any[] | null>(null);
  useEffect(() => {
    api('GET', '/api/status').then(setS).catch(() => setS({}));
    api('GET', '/api/activity').then((d: any) => setAct(d)).catch(() => setAct([]));
  }, []);
  const stats = s?.stats || {};
  const loading = s === null;
  return (
    <>
      <div className="hero">
        <div className="eyebrow">AI MASystem</div>
        <h1>All your agents, one command center</h1>
        <div className="tagline">Car sales, hospital intake, hotel bookings, leads &amp; more — one shared database, one brain, orchestrated end to end.</div>
        <div className="row" style={{ marginTop: 16, position: 'relative' }}>
          <span className="badge ok">● {s?.agents || AGENTS.length} agents online</span>
          <span className="badge">🧠 {s?.provider || 'claude'}</span>
        </div>
        <div className="health-row">
          {AGENTS.map(a => (
            <span className="health-badge" key={a.label}><span className="health-dot"></span>{a.ic} {a.label}</span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="cards">
          {Array.from({ length: 3 }).map((_, i) => <div className="skeleton skeleton-stat" key={i}></div>)}
        </div>
      ) : (
        <div className="cards">
          <div className="stat"><span className="ic">🚗</span><b>{stats.car ?? '–'}</b><span>Cars in stock</span></div>
          <div className="stat"><span className="ic">🏥</span><b>{stats.hospital ?? '–'}</b><span>Hospital queue</span></div>
          <div className="stat"><span className="ic">🏨</span><b>{stats.hotel ?? '–'}</b><span>Hotel bookings</span></div>
        </div>
      )}
      {loading ? (
        <div className="cards">
          {Array.from({ length: 3 }).map((_, i) => <div className="skeleton skeleton-stat" key={i}></div>)}
        </div>
      ) : (
        <div className="cards">
          <div className="stat"><span className="ic">📥</span><b>{stats.leads ?? '–'}</b><span>Total leads</span></div>
          <div className="stat"><span className="ic">🎯</span><b>6</b><span>Agent types</span></div>
          <div className="stat"><span className="ic">⚡</span><b>1</b><span>Shared DB</span></div>
        </div>
      )}

      <div className="card"><h3>Quick actions</h3>
        <div className="row">
          <button className="chip" onClick={() => nav('/car')}>🚗 Car price</button>
          <button className="chip" onClick={() => nav('/hospital')}>🏥 Patient intake</button>
          <button className="chip" onClick={() => nav('/hotel')}>🏨 Book room</button>
          <button className="chip" onClick={() => nav('/manager')}>🎯 Route request</button>
          <button className="chip" onClick={() => nav('/leads')}>📥 Leads</button>
        </div>
      </div>
      <div className="card"><h3>🕒 Recent activity</h3>
        {act === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => <div className="skeleton" style={{ height: 44, borderRadius: 12 }} key={i}></div>)}
          </div>
        ) : act.length === 0 ? (
          <div className="empty-state">
            <div className="es-ic">🗂️</div>
            <div className="es-title">No activity yet</div>
            <div className="es-sub">Use an agent above and it'll show up here.</div>
          </div>
        ) : (
          act.map((a: any) => <div className="feed-item" key={a.id}><div className="fic">{a.icon}</div><div><div className="ftitle">{a.title}</div><div className="ftime">{a.sub} · #{a.id}</div></div></div>)
        )}
      </div>
    </>
  );
}
