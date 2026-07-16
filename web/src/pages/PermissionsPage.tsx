// src/pages/PermissionsPage.tsx — admin role/permission matrix editor.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', staff: 'Staff', viewer: 'Viewer' };

export default function PermissionsPage() {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [keys, setKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState('');
  const load = () => {
    api('GET', '/api/permissions/keys').then(setKeys).catch(() => {});
    api('GET', '/api/permissions').then(setMatrix).catch(() => {});
  };
  useEffect(load, []);
  if (user?.role !== 'admin') return <div className="card"><div className="muted">Admin only.</div></div>;

  async function toggle(role: string, perm: string, val: boolean) {
    const next = { ...matrix, [role]: { ...matrix[role], [perm]: val } };
    setMatrix(next);
    setSaving(`${role}:${perm}`);
    try { await api('POST', '/api/permissions', { role, perm, allowed: val }); } catch {}
    setSaving('');
  }

  const roles = Object.keys(matrix);
  return (
    <>
      <div className="top"><div><h1>🔐 Roles & Permissions</h1><div className="sub">Admin-managed access control for every agent action</div></div></div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Permission</th>{roles.map(r => <th key={r}>{ROLE_LABEL[r] || r}</th>)}</tr></thead>
          <tbody>
            {keys.map(k => (
              <tr key={k}>
                <td><code style={{ color: 'var(--brand)' }}>{k}</code></td>
                {roles.map(r => (
                  <td key={r} style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={!!matrix[r]?.[k]} disabled={r === 'admin'} onChange={e => toggle(r, k, e.target.checked)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {saving && <div className="muted" style={{ marginTop: 10 }}>Saving {saving}…</div>}
      </div>
      <div className="card"><h3>How it works</h3>
        <p className="muted">Every agent action is a permission (e.g. <code>car:chat</code>, <code>leads:manage</code>, <code>users:manage</code>). Untick a box to revoke that action for a role. <b>Admin always has everything</b> (locked). Changes apply instantly — no restart needed.</p>
      </div>
    </>
  );
}
