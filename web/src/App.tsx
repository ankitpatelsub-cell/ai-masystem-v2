// src/App.tsx — router + auth guard + layout.
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Overview from './pages/Overview';
import CarPage from './pages/CarPage';
import HospitalPage from './pages/HospitalPage';
import HotelPage from './pages/HotelPage';
import ManagerPage from './pages/ManagerPage';
import BackOfficePage from './pages/BackOfficePage';
import ReelsPage from './pages/ReelsPage';
import LeadsPage from './pages/LeadsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import PermissionsPage from './pages/PermissionsPage';
import Login from './pages/Login';

const NAV = [
  { to: '/', ic: '🏠', lbl: 'Overview', end: true },
  { to: '/car', ic: '🚗', lbl: 'Car Sales' },
  { to: '/hospital', ic: '🏥', lbl: 'Hospital' },
  { to: '/hotel', ic: '🏨', lbl: 'Hotel' },
  { to: '/manager', ic: '🎯', lbl: 'Manager' },
  { to: '/backoffice', ic: '🤖', lbl: 'Back-Office' },
  { to: '/reels', ic: '🎬', lbl: 'Reels' },
  { to: '/leads', ic: '📥', lbl: 'Leads' },
  { to: '/users', ic: '👥', lbl: 'Users' },
  { to: '/permissions', ic: '🔐', lbl: 'Roles' },
  { to: '/settings', ic: '⚙️', lbl: 'Settings' },
];

function Sidebar() {
  const nav = useNavigate(); const loc = useLocation(); const { user, logout } = useAuth();
  return (
    <aside className="side">
      <div className="brand"><span className="dot"></span><span>MASystem</span></div>
      <div className="sub">Japan⇄India · AI</div>
      <nav className="nav">
        {NAV.map(n => (
          <a key={n.to} className={loc.pathname === n.to ? 'on' : ''} onClick={() => nav(n.to)}><span className="ic">{n.ic}</span><span className="lbl">{n.lbl}</span></a>
        ))}
      </nav>
      <div className="me">
        <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
        <div className="meta" style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name || user?.username}</div>
          <div className="muted" style={{ fontSize: 11 }}>{user?.role}</div>
        </div>
        <button className="chip" onClick={() => { logout(); nav('/login'); }}>Exit</button>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app"><Sidebar /><main className="main">{children}</main></div>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <RequireAuth>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/car" element={<CarPage />} />
                <Route path="/hospital" element={<HospitalPage />} />
                <Route path="/hotel" element={<HotelPage />} />
                <Route path="/manager" element={<ManagerPage />} />
                <Route path="/backoffice" element={<BackOfficePage />} />
                <Route path="/reels" element={<ReelsPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/permissions" element={<PermissionsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
