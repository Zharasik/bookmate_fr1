import { useState, useEffect } from 'react';
import { api } from '../../api';

const STATUS_BADGE = {
  pending:   { cls: 'badge-yellow', label: '⏳ Ожидает' },
  confirmed: { cls: 'badge-green',  label: '✓ Подтверждена' },
  completed: { cls: 'badge-blue',   label: '✓ Завершена' },
  cancelled: { cls: 'badge-red',    label: '✕ Отменена' },
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats().then(setStats).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  const CARDS = [
    { icon: '🏢', label: 'Заведений',     value: stats.venues,   color: '#2563EB', bg: '#DBEAFE' },
    { icon: '👥', label: 'Пользователей', value: stats.users,    color: '#8B5CF6', bg: '#EDE9FE' },
    { icon: '📅', label: 'Бронирований',  value: stats.bookings, color: '#10B981', bg: '#D1FAE5' },
    { icon: '⭐', label: 'Отзывов',       value: stats.reviews,  color: '#F59E0B', bg: '#FEF3C7' },
    { icon: '🔧', label: 'Услуг',         value: stats.services, color: '#EF4444', bg: '#FEE2E2' },
    { icon: '👨‍💼', label: 'Мастеров',      value: stats.masters,  color: '#0891B2', bg: '#CFFAFE' },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Дашборд</h1>
        <span className="text-sm text-muted">Общая статистика системы</span>
      </div>

      <div className="stats-grid">
        {CARDS.map(({ icon, label, value, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon-wrap" style={{ background: bg }}>
              <span>{icon}</span>
            </div>
            <div className="stat-value" style={{ color }}>{value ?? 0}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><h3>Последние 10 бронирований</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Клиент</th><th>Заведение</th><th>Дата / Время</th><th>Статус</th><th>Сумма</th></tr></thead>
            <tbody>
              {(stats.recentBookings || []).map(b => {
                const meta = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
                return (
                  <tr key={b.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar user-avatar-sm">{(b.user_name || 'U')[0].toUpperCase()}</div>
                        <div><div className="user-name">{b.user_name}</div><div className="user-email">{b.user_email}</div></div>
                      </div>
                    </td>
                    <td className="truncate">{b.venue_name}</td>
                    <td><div>{String(b.date).split('T')[0]}</div><div className="text-sm text-muted">{b.time}{b.end_time ? ` – ${b.end_time}` : ''}</div></td>
                    <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                    <td className="text-bold">{b.total_price > 0 ? `${b.total_price.toLocaleString()} ₸` : '—'}</td>
                  </tr>
                );
              })}
              {!stats.recentBookings?.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет бронирований</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
