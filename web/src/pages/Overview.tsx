// src/pages/Overview.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Overview() {
  const nav = useNavigate(); const [s, setS] = useState<any>(null); const [act, setAct] = useState<any[]>([]);
  useEffect(() => {
    api('GET', '/api/status').then(setS).catch(() => {});
    api('GET', '/api/activity').then((d: any) => setAct(d)).catch(() => {});
  }, []);
  const stats = s?.stats || {};
  return (
    <>
      <div className="top">
        <div><h1>Overview</h1><div className="sub">All AI agents · one system · one database</div></div>
        <div className="badges">
          <span className="badge ok">● {s?.agents || 6} agents</span>
          <span className="badge">🧠 {s?.provider || 'claude'}</span>
        </div>
      </div>
      <div className="cards">
        <div className="stat"><span className="ic">🚗</span><b>{stats.car ?? '–'}</b><span>Cars in stock</span></div>
        <div className="stat"><span className="ic">🏥</span><b>{stats.hospital ?? '–'}</b><span>Hospital queue</span></div>
        <div className="stat"><span className="ic">🏨</span><b>{stats.hotel ?? '–'}</b><span>Hotel bookings</span></div>
      </div>
      <div className="cards">
        <div className="stat"><span className="ic">📥</span><b>{stats.leads ?? '–'}</b><span>Total leads</span></div>
        <div className="stat"><span className="ic">🎯</span><b>6</b><span>Agent types</span></div>
        <div className="stat"><span className="ic">⚡</span><b>1</b><span>Shared DB</span></div>
      </div>
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
        {act.length === 0 ? <div className="muted">No activity yet — use an agent to see it here.</div> :
          act.map((a: any) => <div className="feed-item" key={a.id}><div className="fic">{a.icon}</div><div><div className="ftitle">{a.title}</div><div className="ftime">{a.sub} · #{a.id}</div></div></div>)}
      </div>
    </>
  );
}
