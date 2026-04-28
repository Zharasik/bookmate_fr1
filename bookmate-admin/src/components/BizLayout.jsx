import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/biz/dashboard', icon: '📊', label: 'Мой дашборд' },
  { to: '/biz/venues',    icon: '🏢', label: 'Мои заведения' },
  { to: '/biz/slots',     icon: '🪑', label: 'Места / слоты' },
  { to: '/biz/bookings',  icon: '📅', label: 'Бронирования' },
  { to: '/biz/services',  icon: '🔧', label: 'Услуги' },
];

export default function BizLayout() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch { return {}; } })();
  const path = window.location.pathname.split('/').slice(0, 3).join('/');
  const title = { '/biz/dashboard': 'Мой дашборд', '/biz/venues': 'Мои заведения', '/biz/slots': 'Места / слоты', '/biz/bookings': 'Бронирования', '/biz/services': 'Услуги' }[path] || 'Бизнес';

  const logout = () => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/login'); };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">📅</div>
          <div><div className="logo-text">BookMate</div><div className="logo-sub">Бизнес-панель</div></div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Мой бизнес</div>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user"><strong>{user.name || 'Business'}</strong>{user.email}</div>
          <button className="logout-btn" onClick={logout}>🚪 Выйти</button>
        </div>
      </aside>
      <div className="main-content">
        <header className="topbar">
          <h2 className="topbar-title">{title}</h2>
          <div className="topbar-user">
            <div className="avatar" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>{(user.name || 'B')[0].toUpperCase()}</div>
            <div><div className="topbar-name">{user.name}</div><div className="topbar-role">Бизнес-владелец</div></div>
          </div>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}
