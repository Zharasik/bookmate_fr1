import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_META = {
  pending:   { cls: 'badge-yellow', label: '⏳ Ожидает' },
  confirmed: { cls: 'badge-green',  label: '✓ Подтверждена' },
  completed: { cls: 'badge-blue',   label: '✓ Завершена' },
  cancelled: { cls: 'badge-red',    label: '✕ Отменена' },
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () =>
    api.getBookings().then(setBookings).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.updateBookingStatus(id, status).catch(e => alert(e.message));
    load();
  };

  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchSearch = !search ||
      b.venue_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1>Бронирования <span className="tag">{bookings.length}</span></h1>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Поиск по заведению или клиенту..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Все ({bookings.length})</option>
          <option value="pending">Ожидает ({counts.pending || 0})</option>
          <option value="confirmed">Подтверждена ({counts.confirmed || 0})</option>
          <option value="completed">Завершена ({counts.completed || 0})</option>
          <option value="cancelled">Отменена ({counts.cancelled || 0})</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Загрузка...</div> : (
            <table>
              <thead>
                <tr><th>Клиент</th><th>Заведение</th><th>Место</th><th>Дата / Время</th><th>Гости</th><th>Сумма</th><th>Статус</th><th>Действия</th></tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const meta = STATUS_META[b.status] || STATUS_META.pending;
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                        <div className="text-sm text-muted">{b.user_email}</div>
                      </td>
                      <td className="truncate">{b.venue_name}</td>
                      <td className="text-sm">{b.slot_name || '—'}</td>
                      <td>
                        <div>{String(b.date).split('T')[0]}</div>
                        <div className="text-sm text-muted">{b.time}{b.end_time ? ` – ${b.end_time}` : ''}</div>
                      </td>
                      <td className="text-sm">{b.guests}</td>
                      <td>{b.total_price > 0 ? `${b.total_price.toLocaleString()} ₸` : '—'}</td>
                      <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                      <td>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                          {b.status === 'pending' && (
                            <button className="btn btn-sm" style={{ background: '#d1fae5', color: '#065f46' }} onClick={() => updateStatus(b.id, 'confirmed')}>✓</button>
                          )}
                          {(b.status === 'confirmed' || b.status === 'pending') && (
                            <button className="btn btn-sm btn-danger" onClick={() => updateStatus(b.id, 'cancelled')}>✕</button>
                          )}
                          {b.status === 'confirmed' && (
                            <button className="btn btn-sm" style={{ background: '#dbeafe', color: '#1e40af' }} onClick={() => updateStatus(b.id, 'completed')}>✓✓</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет бронирований</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
