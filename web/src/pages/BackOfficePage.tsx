// src/pages/BackOfficePage.tsx
import { useState } from 'react';
import { api } from '../lib/api';

export default function BackOfficePage() {
  const [task, setTask] = useState('summarize tickets');
  const [out, setOut] = useState(''); const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setOut('Running…');
    try { const r: any = await api('POST', '/api/backoffice/run', { task }); setOut(r.result); }
    catch (e: any) { setOut('Error: ' + e.message); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="top"><div><h1>🤖 Back-Office AI</h1><div className="sub">Tickets · email · reports · scheduling (autonomous)</div></div></div>
      <div className="card">
        <div className="row">
          {['summarize tickets', 'draft reply', 'write code: python factorial'].map(t => <button key={t} className="chip" onClick={() => setTask(t)}>{t}</button>)}
        </div>
        <textarea rows={2} value={task} onChange={e => setTask(e.target.value)} style={{ marginTop: 10 }} placeholder="Task for the AI…" />
        <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={run} disabled={busy}>Run</button></div>
        {out && <div className="bubble" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{out}</div>}
      </div>
    </>
  );
}
