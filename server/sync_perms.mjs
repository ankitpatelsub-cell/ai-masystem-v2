// sync_perms.mjs — apply DEFAULT_PERMS into the DB matrix (fixes stale/partial rows).
import db from './db.js';
const DEFAULT_PERMS = {
  admin: ['car:chat','car:manage','hospital:chat','hospital:manage','hotel:chat','hotel:manage','manager:use','backoffice:run','reels:build','leads:view','leads:manage','users:manage','settings:manage'],
  staff: ['car:chat','car:manage','hospital:chat','hotel:chat','manager:use','backoffice:run','reels:build','leads:view','leads:manage'],
  viewer: ['car:chat','hospital:chat','hotel:chat','manager:use','leads:view'],
};
const ALL = Array.from(new Set(Object.values(DEFAULT_PERMS).flat()));
let n = 0;
for (const [role, perms] of Object.entries(DEFAULT_PERMS)) {
  for (const p of ALL) {
    const allowed = perms.includes(p) ? 1 : 0;
    db.prepare('INSERT OR REPLACE INTO role_permissions (role,perm,allowed) VALUES (?,?,?)').run(role, p, allowed);
    n++;
  }
}
console.log(`Synced ${n} permission rows for ${Object.keys(DEFAULT_PERMS).length} roles to DEFAULT_PERMS.`);
