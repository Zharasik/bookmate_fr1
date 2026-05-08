import { useState, useEffect } from 'react';
import { api } from '../../api';

const APPEAL_REASONS = [
  'Содержит оскорбления',
  'Фейковый отзыв',
  'Не имеет отношения к заведению',
  'Нарушает правила',
  'Недобросовестная конкуренция',
  'Другое',
];

function Stars({ value }) {
  return (
    <span>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ color: s <= value ? (value <= 2 ? '#EF4444' : value === 3 ? '#F59E0B' : '#10B981') : '#D1D5DB', fontSize: 16 }}>★</span>
      ))}
    </span>
  );
}

export default function BizReviews() {
  const [reviews, setReviews] = useState([]);
  const [venues, setVenues] = useState([]);
  const [venueFilter, setVenueFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Appeal modal
  const [appealTarget, setAppealTarget] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealOther, setAppealOther] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealed, setAppealed] = useState(new Set()); // review IDs already appealed this session

  const load = () => {
    Promise.all([
      api.biz.getReviews(),
      api.biz.getVenues(),
    ]).then(([r, v]) => {
      setReviews(r);
      setVenues(v);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = venueFilter ? reviews.filter(r => r.venue_id === venueFilter) : reviews;
  const avgRating = filtered.length
    ? (filtered.reduce((s, r) => s + r.rating, 0) / filtered.length).toFixed(1)
    : '—';

  const openAppeal = (review) => {
    setAppealTarget(review);
    setAppealReason('');
    setAppealOther('');
  };

  const submitAppeal = async () => {
    if (!appealTarget) return;
    const finalReason = appealReason === 'Другое' ? (appealOther || 'Другое') : appealReason;
    if (!finalReason) return;
    setAppealSubmitting(true);
    try {
      await api.biz.appealReview(appealTarget.id, finalReason);
      setAppealed(prev => new Set([...prev, appealTarget.id]));
      alert(`✓ Жалоба на отзыв от "${appealTarget.user_name}" отправлена администратору.`);
      setAppealTarget(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setAppealSubmitting(false);
    }
  };

  const ratingStats = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: filtered.filter(r => r.rating === n).length,
  }));
  const maxCount = Math.max(...ratingStats.map(s => s.count), 1);

  return (
    <>
      <div className="page-header">
        <h1>Отзывы <span className="tag">{filtered.length}</span></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, color: '#F59E0B' }}>★</span>
          <span style={{ fontWeight: 800, fontSize: 20 }}>{avgRating}</span>
          <span style={{ color: '#6B7280', fontSize: 13 }}>средняя оценка</span>
        </div>
      </div>

      {/* Rating distribution */}
      {filtered.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 200 }}>
              {ratingStats.map(({ n, count }) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, textAlign: 'right', fontSize: 13, color: '#374151', fontWeight: 600 }}>{n}★</span>
                  <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${(count / maxCount) * 100}%`,
                      background: n >= 4 ? '#10B981' : n === 3 ? '#F59E0B' : '#EF4444',
                    }} />
                  </div>
                  <span style={{ width: 24, fontSize: 12, color: '#6B7280' }}>{count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#2563EB' }}>{filtered.length}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>всего отзывов</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981' }}>
                  {filtered.filter(r => r.rating >= 4).length}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>положительных</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#EF4444' }}>
                  {filtered.filter(r => r.rating <= 2).length}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>негативных</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Venue filter tabs */}
      {venues.length > 1 && (
        <div className="tabs">
          <button className={`tab-btn${venueFilter === '' ? ' active' : ''}`} onClick={() => setVenueFilter('')}>
            Все заведения
          </button>
          {venues.map(v => (
            <button key={v.id} className={`tab-btn${venueFilter === v.id ? ' active' : ''}`} onClick={() => setVenueFilter(v.id)}>
              {v.name}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Загрузка...</div> : (
            <table>
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>Заведение</th>
                  <th>Оценка</th>
                  <th>Теги</th>
                  <th>Комментарий</th>
                  <th>Фото</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const alreadyAppealed = appealed.has(r.id);
                  return (
                    <tr key={r.id} style={r.rating <= 2 ? { background: '#FFF5F5' } : {}}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar user-avatar-sm">{(r.user_name || '?')[0].toUpperCase()}</div>
                          <div className="user-name">{r.user_name}</div>
                        </div>
                      </td>
                      <td><span className="tag">{r.venue_name}</span></td>
                      <td>
                        <Stars value={r.rating} />
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{r.rating}/5</div>
                      </td>
                      <td style={{ maxWidth: 160 }}>
                        {(r.reasons?.length > 0) ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {r.reasons.map((tag, i) => (
                              <span key={i} style={{
                                background: r.rating <= 3 ? '#FEE2E2' : '#D1FAE5',
                                color: r.rating <= 3 ? '#991B1B' : '#065F46',
                                borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 600,
                              }}>{tag}</span>
                            ))}
                          </div>
                        ) : r.bad_reason ? (
                          <span style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                            {r.bad_reason}
                          </span>
                        ) : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td className="text-sm" style={{ maxWidth: 220 }}>
                        {r.comment || <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {r.photo_url
                          ? <a href={r.photo_url} target="_blank" rel="noreferrer">
                              <img src={r.photo_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E7EB' }} />
                            </a>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td className="text-sm text-muted">
                        {new Date(r.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td>
                        {alreadyAppealed
                          ? <span className="badge badge-yellow">⏳ Жалоба отправлена</span>
                          : (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => openAppeal(r)}
                              title="Пожаловаться администратору на этот отзыв"
                            >
                              🚩 Пожаловаться
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет отзывов</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Appeal modal */}
      {appealTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAppealTarget(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>🚩 Пожаловаться на отзыв</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setAppealTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Review preview */}
              <div style={{
                background: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 20,
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div className="user-avatar user-avatar-sm">
                    {(appealTarget.user_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{appealTarget.user_name}</div>
                    <Stars value={appealTarget.rating} />
                  </div>
                </div>
                <div className="text-sm">{appealTarget.comment || '—'}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Причина жалобы</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {APPEAL_REASONS.map(r => (
                    <label key={r} style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${appealReason === r ? '#F59E0B' : '#E5E7EB'}`,
                      background: appealReason === r ? '#FEF3C7' : '#fff',
                    }}>
                      <input
                        type="radio"
                        name="appeal_reason"
                        value={r}
                        checked={appealReason === r}
                        onChange={() => setAppealReason(r)}
                        style={{ accentColor: '#F59E0B' }}
                      />
                      <span style={{ fontSize: 14, color: appealReason === r ? '#92400E' : '#374151', fontWeight: appealReason === r ? 700 : 400 }}>
                        {r}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {appealReason === 'Другое' && (
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Опишите нарушение</label>
                  <textarea
                    className="form-textarea"
                    value={appealOther}
                    onChange={e => setAppealOther(e.target.value)}
                    placeholder="Подробно опишите причину жалобы..."
                    rows={3}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAppealTarget(null)}>Отмена</button>
              <button
                className="btn btn-warning"
                disabled={appealSubmitting || !appealReason || (appealReason === 'Другое' && !appealOther)}
                onClick={submitAppeal}
              >
                {appealSubmitting ? 'Отправка...' : '🚩 Отправить жалобу'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
