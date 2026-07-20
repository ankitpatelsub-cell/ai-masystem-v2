// src/pages/SettingsPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [prov, setProv] = useState('claude'); const [orm, setOrm] = useState('');
  const [claude, setClaude] = useState(false); const [orKey, setOrKey] = useState('missing');
  useEffect(() => {
    api('GET', '/api/settings').then((s: any) => { setProv(s.provider); setOrm(s.openrouter_model || ''); setClaude(!!s.claude_cli); setOrKey(s.openrouter_key || 'missing'); }).catch(() => {});
  }, []);
  async function save(p: string) { await api('POST', '/api/settings', { provider: p, openrouter_model: orm }); setProv(p); }
  return (
    <>
      <div className="top"><div><h1>⚙️ Settings</h1><div className="sub">Model provider · account · system</div></div></div>
      <div className="card"><h3>🧠 AI Model</h3>
        <div className="row">
          <button className={`chip ${prov === 'claude' ? 'on' : ''}`} style={prov === 'claude' ? { background: 'var(--brand)', color: '#fff' } : {}} onClick={() => save('claude')}>Claude (free)</button>
          <button className={`chip ${prov === 'codex' ? 'on' : ''}`} style={prov === 'codex' ? { background: 'var(--brand)', color: '#fff' } : {}} onClick={() => save('codex')}>Codex (OpenAI)</button>
          <button className={`chip ${prov === 'auto' ? 'on' : ''}`} style={prov === 'auto' ? { background: 'var(--brand)', color: '#fff' } : {}} onClick={() => save('auto')}>Auto (failover)</button>
          <button className={`chip ${prov === 'openrouter' ? 'on' : ''}`} style={prov === 'openrouter' ? { background: 'var(--brand)', color: '#fff' } : {}} onClick={() => save('openrouter')}>OpenRouter</button>
        </div>
        <div className="row" style={{ marginTop: 12 }}><input placeholder="OpenRouter model (e.g. anthropic/claude-sonnet-4)" value={orm} onChange={e => setOrm(e.target.value)} /><button className="btn" onClick={() => save(prov)}>Save</button></div>
        <p className="muted" style={{ marginTop: 10 }}>Claude CLI: {claude ? '✅' : '❌'} · OpenRouter key: {orKey === 'set' ? '✅ set' : '⚠️ missing'} · Auto fails over on token/rate-limit.</p>
      </div>
      <div className="card"><h3>👤 Account</h3>
        <p className="muted">Signed in as <b>{user?.name || user?.username}</b> · role <span className="pill">{user?.role}</span></p>
      </div>
      <div className="card"><h3>🗄️ System</h3>
        <p className="muted">One unified server · one shared SQLite DB · all 6 agents mounted as modules.</p>
      </div>
    </>
  );
}
