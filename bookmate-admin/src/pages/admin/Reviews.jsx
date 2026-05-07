import { useState, useEffect } from 'react';
import { api } from '../../api';

function Stars({ n }) {
  return <span style={{ color: '#F59E0B' }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState('0');

  const load = () => api.getReviews().then(setReviews).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const del = async (id, name) => {
    if (!window.confirm(`Удалить отзыв от "${name}"?`)) return;
    await api.deleteReview(id).catch(e => alert(e.message));
    load();
  };

  const filtered = reviews.filter(r =>
    r.rating >= Number(minRating) &&
    (!search || r.user_name?.toLowerCase().includes(search.toLowerCase()) || r.venue_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="page-header">
        <h1>Отзывы <span className="tag">{reviews.length}</span></h1>
      </div>
      <div className="filter-bar">
        <input className="search-input" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ width: 160 }} value={minRating} onChange={e => setMinRating(e.target.value)}>
          <option value="0">Все оценки</option>
          {[5,4,3,2,1].map(n => <option key={n} value={n}>≥ {n} ★</option>)}
        </select>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Загрузка...</div> : (
            <table>
              <thead><tr><th>Автор</th><th>Заведение</th><th>Оценка</th><th>Комментарий</th><th>Дата</th><th></th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><div className="user-cell"><div className="user-avatar user-avatar-sm">{(r.user_name||'U')[0].toUpperCase()}</div><div className="user-name">{r.user_name}</div></div></td>
                    <td className="truncate">{r.venue_name}</td>
                    <td><Stars n={r.rating} /> <span className="text-sm text-muted">({r.rating}/5)</span></td>
                    <td style={{ maxWidth: 260 }}><span style={{ fontSize: 13 }}>{r.comment || <span className="text-muted">—</span>}</span></td>
                    <td className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
                    <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => del(r.id, r.user_name)}>🗑️</button></td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет отзывов</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
