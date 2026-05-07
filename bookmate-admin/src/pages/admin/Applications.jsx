import { useState, useEffect } from 'react';
import { api } from '../../api';

const STATUS = {
  pending:  { cls: 'badge-yellow', label: '⏳ На рассмотрении' },
  approved: { cls: 'badge-green',  label: '✓ Одобрена' },
  rejected: { cls: 'badge-red',    label: '✕ Отклонена' },
};

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [filter, setFilter] = useState('pending');

  const load = () => api.getApplications().then(setApps).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const approve = async (app) => {
    if (!window.confirm(`Одобрить заявку "${app.business_name}" от ${app.user_name}? Будет создано заведение и изменена роль пользователя.`)) return;
    setProcessing(app.id);
    try {
      await api.processApplication(app.id, 'approved', '');
      load();
    } catch (e) { alert(e.message); }
    finally { setProcessing(null); }
  };

  const reject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      await api.processApplication(rejectModal.id, 'rejected', rejectNote);
      setRejectModal(null); setRejectNote(''); load();
    } catch (e) { alert(e.message); }
    finally { setProcessing(null); }
  };

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);
  const pendingCount = apps.filter(a => a.status === 'pending').length;

  return (
    <>
      <div className="page-header">
        <h1>Заявки на бизнес {pendingCount > 0 && <span className="tag" style={{ background: '#FEF3C7', color: '#92400E' }}>{pendingCount} новых</span>}</h1>
      </div>

      <div className="tabs">
        {[['pending', 'Новые'], ['approved', 'Одобренные'], ['rejected', 'Отклонённые'], ['all', 'Все']].map(([k, l]) => (
          <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Загрузка...</div> : (
            <table>
              <thead><tr><th>Заявитель</th><th>Бизнес</th><th>Категория</th><th>Адрес</th><th>Телефон</th><th>Дата</th><th>Статус</th><th>Действия</th></tr></thead>
              <tbody>
                {filtered.map(a => {
                  const s = STATUS[a.status] || STATUS.pending;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar user-avatar-sm">{(a.user_name || 'U')[0].toUpperCase()}</div>
                          <div><div className="user-name">{a.user_name}</div><div className="user-email">{a.user_email}</div></div>
                        </div>
                      </td>
                      <td><div className="text-bold">{a.business_name}</div>{a.description && <div className="text-sm text-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</div>}</td>
                      <td><span className="tag">{a.category}</span></td>
                      <td className="text-sm">{a.location}</td>
                      <td className="text-sm">{a.phone || '—'}</td>
                      <td className="text-sm text-muted">{new Date(a.created_at).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <span className={`badge ${s.cls}`}>{s.label}</span>
                        {a.admin_note && <div className="text-sm text-muted" style={{ marginTop: 4 }}>{a.admin_note}</div>}
                      </td>
                      <td>
                        {a.status === 'pending' && (
                          <div className="flex gap-2">
                            <button className="btn btn-success btn-sm" disabled={processing === a.id} onClick={() => approve(a)}>✓ Одобрить</button>
                            <button className="btn btn-danger btn-sm" disabled={processing === a.id} onClick={() => { setRejectModal(a); setRejectNote(''); }}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет заявок</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {rejectModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header"><h2>Отклонить заявку</h2><button className="btn btn-ghost btn-sm" onClick={() => setRejectModal(null)}>✕</button></div>
            <div className="modal-body">
              <p className="text-sm" style={{ marginBottom: 16 }}>Заявка от <strong>{rejectModal.user_name}</strong> на «{rejectModal.business_name}»</p>
              <div className="form-group">
                <label className="form-label">Причина отклонения (будет отправлена пользователю)</label>
                <textarea className="form-textarea" value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Укажите причину..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Отмена</button>
              <button className="btn btn-danger" onClick={reject} disabled={!!processing}>Отклонить</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
