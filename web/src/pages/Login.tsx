// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e: any) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await login(u, p); nav('/'); } catch (e: any) { setErr(e.message || 'login failed'); } finally { setBusy(false); }
  }
  return (
    <div id="login">
      <form className="box" onSubmit={go}>
        <div className="login-mark">M</div>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 6 }}><span className="dot"></span><span>MASystem</span></div>
        <h2>Welcome back</h2>
        <div className="muted">Sign in to the unified AI system</div>
        <input style={{ marginTop: 18 }} placeholder="username" value={u} onChange={e => setU(e.target.value)} autoFocus />
        <input style={{ marginTop: 10 }} type="password" placeholder="password" value={p} onChange={e => setP(e.target.value)} />
        <button className="btn" style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy}>
          {busy && <span className="spinner"></span>}{busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div id="mutederr">{err}</div>
        <div className="muted" style={{ marginTop: 10, fontSize: 11.5 }}>First admin: <b>admin</b> / your ADMIN_PASS</div>
      </form>
    </div>
  );
}
