// src/pages/ReelsPage.tsx
import { useState } from 'react';
import { api } from '../lib/api';

export default function ReelsPage() {
  const [topic, setTopic] = useState('promo reel for new Creta');
  const [res, setRes] = useState<any>(null); const [busy, setBusy] = useState(false);
  async function build() {
    setBusy(true);
    try { const r: any = await api('POST', '/api/reels/build', { topic }); setRes(r); }
    catch (e: any) { setRes({ error: e.message }); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="top"><div><h1>🎬 Reels Studio</h1><div className="sub">AI marketing video generation</div></div></div>
      <div className="card">
        <textarea rows={2} value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic…" />
        <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={build} disabled={busy}>Generate</button></div>
        {res && <div className="bubble" style={{ marginTop: 12 }}>
          {res.error && <span style={{ color: 'var(--red)' }}>{res.error}</span>}
          {res.script && <>
            <div><b>{res.script.hook}</b></div>
            {res.script.scenes.map((s: any, i: number) => <div key={i}>• {s.text}</div>)}
            <div><b>{res.script.cta}</b></div>
            <div className="muted" style={{ marginTop: 8 }}>Mode: {res.mode}</div>
          </>}
        </div>}
      </div>
    </>
  );
}
