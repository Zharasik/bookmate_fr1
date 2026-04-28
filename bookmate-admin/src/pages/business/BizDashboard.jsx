import { useState, useEffect } from 'react';
import { api } from '../../api';

const STATUS_META = {
  pending:   { cls:'badge-yellow', label:'⏳ Ожидает' },
  confirmed: { cls:'badge-green',  label:'✓ Подтверждена' },
  completed: { cls:'badge-blue',   label:'✓ Завершена' },
  cancelled: { cls:'badge-red',    label:'✕ Отменена' },
};

function BarChart({ data }) {
  if (!data?.length) return <div className="text-muted text-sm" style={{padding:'20px 0'}}>Нет данных за этот период</div>;
  const maxVal = Math.max(...data.map(d => Number(d.bookings)), 1);
  return (
    <div className="chart-bars">
      {data.map((d, i) => {
        const pct = Math.round((Number(d.bookings) / maxVal) * 100);
        const day = new Date(d.day).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
        return (
          <div key={i} className="chart-bar-col">
            <div className="chart-value">{d.bookings}</div>
            <div className="chart-bar" style={{ height: `${Math.max(pct, 4)}%` }} title={`${d.day}: ${d.bookings} бронирований`} />
            <div className="chart-label">{day}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function BizDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.biz.getStats(),
      api.biz.getBookings({ limit: 5 }).catch(() => []),
    ]).then(([s, b]) => { setStats(s); setRecentBookings(b.slice(0, 8)); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  const CARDS = [
    { icon: '📅', label: 'Брони сегодня', value: stats.bookings_today, color: '#2563EB', bg: '#DBEAFE' },
    { icon: '⏳', label: 'Ожидают ответа', value: stats.pending_bookings, color: '#F59E0B', bg: '#FEF3C7' },
    { icon: '💰', label: 'Выручка (7 дней)', value: `${(stats.weekly_revenue||0).toLocaleString()} ₸`, color: '#10B981', bg: '#D1FAE5' },
    { icon: '⭐', label: 'Средний рейтинг', value: stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—', color: '#F59E0B', bg: '#FEF3C7' },
    { icon: '📊', label: 'Всего броней', value: stats.total_bookings, color: '#8B5CF6', bg: '#EDE9FE' },
    { icon: '👥', label: 'Постоянных клиентов', value: stats.repeat_customers, color: '#0891B2', bg: '#CFFAFE' },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Мой дашборд</h1>
        <span className="text-sm text-muted">Статистика вашего бизнеса</span>
      </div>

      {stats.pending_bookings > 0 && (
        <div className="alert-box alert-warning" style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <span><strong>{stats.pending_bookings} новых бронирований</strong> ожидают вашего подтверждения. <a href="/biz/bookings" style={{ color: '#92400E', textDecoration: 'underline' }}>Перейти к бронированиям →</a></span>
        </div>
      )}

      <div className="stats-grid">
        {CARDS.map(({ icon, label, value, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon-wrap" style={{ background: bg }}><span>{icon}</span></div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><h3>📈 Брони за 7 дней</h3></div>
          <div className="chart-wrap"><BarChart data={stats.weekly_chart} /></div>
        </div>

        <div className="card">
          <div className="card-header"><h3>🕐 Популярные часы</h3></div>
          <div className="card-body">
            {stats.popular_hours?.length > 0 ? stats.popular_hours.map((h, i) => {
              const max = stats.popular_hours[0]?.cnt || 1;
              const pct = Math.round((h.cnt / max) * 100);
              return (
                <div key={h.time} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 48, fontSize: 13, fontWeight: 600, color: '#374151' }}>{h.time}</span>
                  <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563EB,#3B82F6)', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', width: 24 }}>{h.cnt}</span>
                </div>
              );
            }) : <div className="text-muted text-sm">Нет данных</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Последние бронирования</h3><a href="/biz/bookings" style={{ fontSize: 13, color: '#2563EB' }}>Все →</a></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Клиент</th><th>Заведение</th><th>Дата / Время</th><th>Статус</th><th>Сумма</th></tr></thead>
            <tbody>
              {recentBookings.map(b => {
                const meta = STATUS_META[b.status] || STATUS_META.pending;
                return (
                  <tr key={b.id}>
                    <td><div className="user-cell"><div className="user-avatar user-avatar-sm">{(b.client_name||'?')[0].toUpperCase()}</div><div><div className="user-name">{b.client_name}</div><div className="user-email">{b.client_email}</div></div></div></td>
                    <td className="truncate text-sm">{b.venue_name}</td>
                    <td><div className="text-sm">{String(b.date).split('T')[0]}</div><div className="text-sm text-muted">{b.time}{b.end_time?` – ${b.end_time}`:''}</div></td>
                    <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                    <td className="text-bold text-sm">{b.total_price>0?`${b.total_price.toLocaleString()} ₸`:'—'}</td>
                  </tr>
                );
              })}
              {!recentBookings.length&&<tr><td colSpan={5} style={{textAlign:'center',color:'#9ca3af',padding:32}}>Нет бронирований</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
