import { useState, useEffect } from 'react';
import { api } from '../api';

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
    api.getStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  const STAT_CARDS = [
    { icon: '🏢', label: 'Заведений',     value: stats.venues,   color: '#2563EB' },
    { icon: '👥', label: 'Пользователей', value: stats.users,    color: '#7c3aed' },
    { icon: '📅', label: 'Бронирований',  value: stats.bookings, color: '#059669' },
    { icon: '⭐', label: 'Отзывов',       value: stats.reviews,  color: '#d97706' },
    { icon: '🔧', label: 'Услуг',         value: stats.services, color: '#db2777' },
    { icon: '👨‍💼', label: 'Мастеров',      value: stats.masters,  color: '#0891b2' },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Дашборд</h1>
        <span className="text-sm text-muted">Общая статистика системы</span>
      </div>

      <div className="stats-grid">
        {STAT_CARDS.map(({ icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-value" style={{ color }}>{value ?? 0}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Последние бронирования</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Заведение</th>
                <th>Дата / Время</th>
                <th>Статус</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {(stats.recentBookings || []).map(b => {
                const meta = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
                return (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                      <div className="text-sm text-muted">{b.user_email}</div>
                    </td>
                    <td className="truncate">{b.venue_name}</td>
                    <td>
                      <div>{String(b.date).split('T')[0]}</div>
                      <div className="text-sm text-muted">{b.time}{b.end_time ? ` – ${b.end_time}` : ''}</div>
                    </td>
                    <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                    <td>{b.total_price > 0 ? `${b.total_price.toLocaleString()} ₸` : '—'}</td>
                  </tr>
                );
              })}
              {!stats.recentBookings?.length && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет бронирований</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
