import { useState, useEffect } from 'react';
import { api } from '../../api';

const STATUS_META = {
  pending:   { cls:'badge-yellow', label:'⏳ Ожидает' },
  confirmed: { cls:'badge-green',  label:'✓ Подтверждена' },
  completed: { cls:'badge-blue',   label:'✓ Завершена' },
  cancelled: { cls:'badge-red',    label:'✕ Отменена' },
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => api.getBookings().then(setBookings).catch(()=>{}).finally(()=>setLoading(false));
  useEffect(()=>{ load(); },[]);

  const update = async (id, status) => { await api.updateBookingStatus(id, status).catch(e=>alert(e.message)); load(); };

  const counts = bookings.reduce((a,b)=>{ a[b.status]=(a[b.status]||0)+1; return a; },{});
  const filtered = bookings.filter(b => {
    const m = statusFilter==='all' || b.status===statusFilter;
    const s = !search || b.venue_name?.toLowerCase().includes(search.toLowerCase()) || b.user_name?.toLowerCase().includes(search.toLowerCase());
    return m && s;
  });

  return (
    <>
      <div className="page-header"><h1>Бронирования <span className="tag">{bookings.length}</span></h1></div>
      <div className="filter-bar">
        <input className="search-input" placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="form-select" style={{width:200}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">Все ({bookings.length})</option>
          <option value="pending">Ожидает ({counts.pending||0})</option>
          <option value="confirmed">Подтверждена ({counts.confirmed||0})</option>
          <option value="completed">Завершена ({counts.completed||0})</option>
          <option value="cancelled">Отменена ({counts.cancelled||0})</option>
        </select>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading?<div className="loading">Загрузка...</div>:(
            <table>
              <thead><tr><th>Клиент</th><th>Заведение</th><th>Место</th><th>Дата / Время</th><th>Сумма</th><th>Статус</th><th>Действия</th></tr></thead>
              <tbody>
                {filtered.map(b=>{ const meta=STATUS_META[b.status]||STATUS_META.pending; return(
                  <tr key={b.id}>
                    <td><div className="user-cell"><div className="user-avatar user-avatar-sm">{(b.user_name||'U')[0].toUpperCase()}</div><div><div className="user-name">{b.user_name}</div><div className="user-email">{b.user_email}</div></div></div></td>
                    <td className="truncate">{b.venue_name}</td>
                    <td className="text-sm">{b.slot_name||'—'}</td>
                    <td><div>{String(b.date).split('T')[0]}</div><div className="text-sm text-muted">{b.time}{b.end_time?` – ${b.end_time}`:''}</div></td>
                    <td className="text-bold">{b.total_price>0?`${b.total_price.toLocaleString()} ₸`:'—'}</td>
                    <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                    <td><div className="flex gap-2">
                      {b.status==='pending'&&<button className="btn btn-sm" style={{background:'#D1FAE5',color:'#065F46'}} onClick={()=>update(b.id,'confirmed')}>✓</button>}
                      {(b.status==='pending'||b.status==='confirmed')&&<button className="btn btn-danger btn-sm" onClick={()=>update(b.id,'cancelled')}>✕</button>}
                      {b.status==='confirmed'&&<button className="btn btn-sm" style={{background:'#DBEAFE',color:'#1E40AF'}} onClick={()=>update(b.id,'completed')}>✓✓</button>}
                    </div></td>
                  </tr>
                );})}
                {!filtered.length&&<tr><td colSpan={7} style={{textAlign:'center',color:'#9ca3af',padding:32}}>Нет бронирований</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
