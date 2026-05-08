import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';

function Stars({ n }) {
  return <span style={{ color: n <= 2 ? '#EF4444' : n === 3 ? '#F59E0B' : '#10B981' }}>
    {'★'.repeat(n)}{'☆'.repeat(5 - n)}
  </span>;
}

const APPEAL_REASONS_OPTIONS = [
  'Содержит оскорбления',
  'Фейковый отзыв',
  'Не имеет отношения к заведению',
  'Нарушает правила',
  'Другое',
];

export default function Reviews() {
  const [data, setData] = useState({ reviews: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [rating, setRating] = useState('');
  const [appealsFilter, setAppealsFilter] = useState('');   // '' | 'only'
  const [activeTab, setActiveTab] = useState('reviews');     // 'reviews' | 'appeals'

  // Appeals state
  const [appeals, setAppeals] = useState([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [appealStatus, setAppealStatus] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [noteModal, setNoteModal] = useState(null);   // { id, action }
  const [adminNote, setAdminNote] = useState('');

  const LIMIT = 50;

  const loadReviews = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    if (rating) params.rating = rating;
    if (appealsFilter) params.appeals = appealsFilter;
    api.getReviews(params)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, rating, appealsFilter]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const loadAppeals = useCallback(() => {
    setAppealsLoading(true);
    api.getAppeals(appealStatus)
      .then(setAppeals)
      .catch(() => {})
      .finally(() => setAppealsLoading(false));
  }, [appealStatus]);

  useEffect(() => { if (activeTab === 'appeals') loadAppeals(); }, [activeTab, loadAppeals]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const del = async (id, name) => {
    if (!window.confirm(`Удалить отзыв от "${name}"?`)) return;
    await api.deleteReview(id).catch(e => alert(e.message));
    loadReviews();
  };

  const processAppeal = async (id, status) => {
    setProcessingId(id);
    try {
      await api.processAppeal(id, status, adminNote || undefined);
      setNoteModal(null); setAdminNote('');
      loadAppeals();
      if (status === 'approved') loadReviews();
    } catch (e) { alert(e.message); }
    finally { setProcessingId(null); }
  };

  const pendingAppeals = appeals.filter(a => a.status === 'pending').length;

  return (
    <>
      <div className="page-header">
        <h1>Отзывы <span className="tag">{data.total}</span></h1>
        {pendingAppeals > 0 && activeTab === 'reviews' && (
          <button className="btn btn-warning btn-sm" onClick={() => setActiveTab('appeals')}>
            ⚠️ {pendingAppeals} обжалований ожидают
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${activeTab === 'reviews' ? ' active' : ''}`} onClick={() => setActiveTab('reviews')}>
          Отзывы
        </button>
        <button className={`tab-btn${activeTab === 'appeals' ? ' active' : ''}`} onClick={() => setActiveTab('appeals')}>
          Обжалования {pendingAppeals > 0 && <span className="tag" style={{ background: '#FEF3C7', color: '#92400E', marginLeft: 6 }}>{pendingAppeals}</span>}
        </button>
      </div>

      {/* ── REVIEWS TAB ── */}
      {activeTab === 'reviews' && (
        <>
          {/* Filters */}
          <div className="filter-bar" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="search-input"
                placeholder="Поиск по автору, заведению..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ width: 240 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSearch}>🔍</button>
            </div>
            <select className="form-select" style={{ width: 140 }} value={rating} onChange={e => { setRating(e.target.value); setPage(1); }}>
              <option value="">Все оценки</option>
              <option value="1-2">1–2 ★ (плохие)</option>
              <option value="3">3 ★</option>
              <option value="4-5">4–5 ★ (хорошие)</option>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
            </select>
            <select className="form-select" style={{ width: 180 }} value={appealsFilter} onChange={e => { setAppealsFilter(e.target.value); setPage(1); }}>
              <option value="">Все отзывы</option>
              <option value="only">⚠️ С жалобами</option>
              <option value="none">Без жалоб</option>
            </select>
          </div>

          <div className="card">
            <div className="table-wrap">
              {loading ? <div className="loading">Загрузка...</div> : (
                <>
                  <table>
                    <thead>
                      <tr>
                        <th>Автор</th>
                        <th>Заведение</th>
                        <th>Оценка</th>
                        <th>Теги / Комментарий</th>
                        <th>Фото</th>
                        <th>Жалобы</th>
                        <th>Дата</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reviews.map(r => (
                        <tr key={r.id} style={Number(r.appeal_count) > 0 ? { background: '#FFFBEB' } : {}}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar user-avatar-sm">{(r.user_name||'U')[0].toUpperCase()}</div>
                              <div className="user-name">{r.user_name}</div>
                            </div>
                          </td>
                          <td className="truncate" style={{ maxWidth: 140 }}>{r.venue_name}</td>
                          <td><Stars n={r.rating} /> <span className="text-sm text-muted">({r.rating}/5)</span></td>
                          <td style={{ maxWidth: 240 }}>
                            {(r.reasons?.length > 0) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                                {r.reasons.map((tag, i) => (
                                  <span key={i} style={{
                                    background: r.rating <= 3 ? '#FEE2E2' : '#D1FAE5',
                                    color: r.rating <= 3 ? '#991B1B' : '#065F46',
                                    borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                                  }}>{tag}</span>
                                ))}
                              </div>
                            )}
                            <span style={{ fontSize: 13 }}>{r.comment || <span className="text-muted">—</span>}</span>
                          </td>
                          <td>
                            {r.photo_url
                              ? <a href={r.photo_url} target="_blank" rel="noreferrer">
                                  <img src={r.photo_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                                </a>
                              : <span className="text-muted text-sm">—</span>}
                          </td>
                          <td>
                            {Number(r.appeal_count) > 0
                              ? <span className="badge badge-yellow" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('appeals')}>
                                  ⚠️ {r.appeal_count}
                                </span>
                              : <span className="text-muted text-sm">—</span>}
                          </td>
                          <td className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
                          <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => del(r.id, r.user_name)}>🗑️</button></td>
                        </tr>
                      ))}
                      {!data.reviews.length && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет отзывов</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {data.pages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 20 }}>
                      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</button>
                      <span className="text-sm text-muted">Стр. {page} из {data.pages} · Всего {data.total}</span>
                      <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Вперёд →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── APPEALS TAB ── */}
      {activeTab === 'appeals' && (
        <>
          <div className="filter-bar">
            <select className="form-select" style={{ width: 200 }} value={appealStatus} onChange={e => setAppealStatus(e.target.value)}>
              <option value="pending">Ожидают рассмотрения</option>
              <option value="approved">Одобренные (отзыв удалён)</option>
              <option value="dismissed">Отклонённые</option>
            </select>
          </div>
          <div className="card">
            <div className="table-wrap">
              {appealsLoading ? <div className="loading">Загрузка...</div> : (
                <table>
                  <thead>
                    <tr>
                      <th>Жалобщик</th>
                      <th>Тип</th>
                      <th>Содержание</th>
                      <th>Причина жалобы</th>
                      <th>Статус</th>
                      <th>Дата</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appeals.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar user-avatar-sm">{(a.reporter_name||'?')[0].toUpperCase()}</div>
                            <div>
                              <div className="user-name">{a.reporter_name}</div>
                              <div className="user-email">{a.reporter_email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${a.type === 'venue_review' ? 'badge-blue' : 'badge-purple'}`}>
                            {a.type === 'venue_review' ? '📝 Отзыв' : '⭐ Оценка клиента'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          {a.type === 'venue_review' ? (
                            <div>
                              <div className="text-sm text-muted">{a.venue_name}</div>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <Stars n={Number(a.review_rating)} />
                                <span className="text-sm text-muted">({a.review_rating}/5)</span>
                              </div>
                              <div className="text-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.review_comment || '—'}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm text-muted">{a.booking_venue} · {a.booking_date}</div>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <Stars n={Number(a.given_rating)} />
                                <span className="text-sm text-muted">({a.given_rating}/5)</span>
                              </div>
                              {a.given_comment && <div className="text-sm">{a.given_comment}</div>}
                            </div>
                          )}
                        </td>
                        <td className="text-sm">{a.reason || '—'}</td>
                        <td>
                          <span className={`badge ${a.status === 'pending' ? 'badge-yellow' : a.status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                            {a.status === 'pending' ? '⏳ На рассмотрении' : a.status === 'approved' ? '✓ Одобрена' : '✕ Отклонена'}
                          </span>
                          {a.admin_note && <div className="text-sm text-muted" style={{ marginTop: 4 }}>{a.admin_note}</div>}
                        </td>
                        <td className="text-sm text-muted">{new Date(a.created_at).toLocaleDateString('ru-RU')}</td>
                        <td>
                          {a.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                className="btn btn-success btn-sm"
                                disabled={processingId === a.id}
                                onClick={() => setNoteModal({ id: a.id, action: 'approved' })}
                                title={a.type === 'venue_review' ? 'Удалить отзыв' : 'Отменить оценку'}
                              >
                                ✓ {a.type === 'venue_review' ? 'Удалить отзыв' : 'Отменить оценку'}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={processingId === a.id}
                                onClick={() => processAppeal(a.id, 'dismissed')}
                              >
                                Отклонить
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!appeals.length && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Жалоб нет</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Admin note modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNoteModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Подтвердить действие</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setNoteModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm" style={{ marginBottom: 14 }}>
                {noteModal.action === 'approved'
                  ? 'Жалоба будет одобрена — отзыв/оценка будут удалены.'
                  : 'Жалоба будет отклонена.'}
              </p>
              <div className="form-group">
                <label className="form-label">Комментарий администратора (необязательно)</label>
                <textarea className="form-textarea" value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Причина решения..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setNoteModal(null)}>Отмена</button>
              <button
                className={`btn ${noteModal.action === 'approved' ? 'btn-success' : 'btn-ghost'}`}
                disabled={!!processingId}
                onClick={() => processAppeal(noteModal.id, noteModal.action)}
              >
                {processingId ? 'Обработка...' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
