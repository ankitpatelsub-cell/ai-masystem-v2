// src/pages/UsersPage.tsx — admin user management.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [role, setRole] = useState('staff'); const [err, setErr] = useState('');
  const load = () => api('GET', '/api/users').then(setUsers).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  async function create() {
    setErr(''); if (!u || !p) return setErr('username + password required');
    try { await api('POST', '/api/users', { username: u, password: p, role }); setU(''); setP(''); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function setR(id: number, r: string) { await api('PATCH', `/api/users/${id}`, { role: r }); load(); }
  async function del(id: number) { await api('DELETE', `/api/users/${id}`); load(); }
  if (user?.role !== 'admin') return <div className="card"><div className="muted">Admin only.</div></div>;
  return (
    <>
      <div className="top"><div><h1>👥 Users</h1><div className="sub">Team accounts · multi-user access</div></div></div>
      <div className="card">
        <h3>Add team member</h3>
        <div className="row">
          <input placeholder="username" value={u} onChange={e => setU(e.target.value)} style={{ maxWidth: 200 }} />
          <input placeholder="password" type="password" value={p} onChange={e => setP(e.target.value)} style={{ maxWidth: 200 }} />
          <select value={role} onChange={e => setRole(e.target.value)} style={{ maxWidth: 140 }}>
            <option value="staff">staff</option><option value="viewer">viewer</option><option value="admin">admin</option>
          </select>
          <button className="btn" onClick={create}>Create</button>
        </div>
        {err && <div className="muted" style={{ color: 'var(--red)', marginTop: 8 }}>{err}</div>}
      </div>
      <div className="card"><h3>Members</h3>
        <table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th></th></tr></thead>
          <tbody>{users.map((x: any) => <tr key={x.id}>
            <td><b>{x.username}</b></td><td>{x.name || '—'}</td>
            <td><select value={x.role} disabled={x.username === 'admin'} onChange={e => setR(x.id, e.target.value)} style={{ width: 120 }}>
              {['admin', 'staff', 'viewer', 'disabled'].map(r => <option key={r} value={r}>{r}</option>)}</select></td>
            <td>{x.username !== 'admin' && <button className="chip" onClick={() => del(x.id)}>Remove</button>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
