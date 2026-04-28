import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/admin/dashboard',    icon: '📊', label: 'Дашборд' },
  { to: '/admin/applications', icon: '📋', label: 'Заявки', badgeKey: 'pending_applications' },
  { to: '/admin/venues',       icon: '🏢', label: 'Заведения' },
  { to: '/admin/users',        icon: '👥', label: 'Пользователи' },
  { to: '/admin/bookings',     icon: '📅', label: 'Бронирования' },
  { to: '/admin/reviews',      icon: '⭐', label: 'Отзывы' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch { return {}; } })();
  const path = window.location.pathname.split('/').slice(0, 3).join('/');
  const title = { '/admin/dashboard': 'Дашборд', '/admin/applications': 'Заявки', '/admin/venues': 'Заведения', '/admin/users': 'Пользователи', '/admin/bookings': 'Бронирования', '/admin/reviews': 'Отзывы' }[path] || 'Система';

  const logout = () => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/login'); };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">📅</div>
          <div><div className="logo-text">BookMate</div><div className="logo-sub">Система · Админ</div></div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Управление</div>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user"><strong>{user.name || 'Admin'}</strong>{user.email}</div>
          <button className="logout-btn" onClick={logout}>🚪 Выйти</button>
        </div>
      </aside>
      <div className="main-content">
        <header className="topbar">
          <h2 className="topbar-title">{title}</h2>
          <div className="topbar-user">
            <div className="avatar">{(user.name || 'A')[0].toUpperCase()}</div>
            <div><div className="topbar-name">{user.name || 'Admin'}</div><div className="topbar-role">Администратор</div></div>
          </div>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}
