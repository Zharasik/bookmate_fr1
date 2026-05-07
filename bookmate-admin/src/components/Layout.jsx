import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/dashboard', icon: '📊', label: 'Дашборд' },
  { to: '/venues',    icon: '🏢', label: 'Заведения' },
  { to: '/users',     icon: '👥', label: 'Пользователи' },
  { to: '/bookings',  icon: '📅', label: 'Бронирования' },
  { to: '/services',  icon: '🔧', label: 'Услуги' },
];

const PAGE_TITLES = {
  '/dashboard': 'Дашборд',
  '/venues': 'Заведения',
  '/users': 'Пользователи',
  '/bookings': 'Бронирования',
  '/services': 'Услуги',
};

export default function Layout() {
  const navigate = useNavigate();
  const path = '/' + window.location.pathname.split('/')[1];
  const title = PAGE_TITLES[path] || 'BookMate Admin';

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch { return {}; }
  })();

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>📅</span>
          <div>
            <span>BookMate</span>
            <small>Admin Panel</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginBottom: 10 }}>
            {user.name || 'Admin'} · {user.email}
          </div>
          <button className="logout-btn" onClick={logout}>
            🚪 Выйти
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <h2 className="topbar-title">{title}</h2>
          <div className="topbar-user">
            <div className="avatar">{(user.name || 'A')[0].toUpperCase()}</div>
            <span>{user.name || 'Admin'}</span>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
