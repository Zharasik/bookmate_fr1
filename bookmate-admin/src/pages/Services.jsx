import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const EMPTY_SVC = { venue_id: '', name: '', description: '', price: 0, duration: 60, is_active: true };

function fmtDuration(min) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

export default function Services() {
  const [services, setServices] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venueFilter, setVenueFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_SVC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([api.getServices(), api.getVenues()])
      .then(([s, v]) => { setServices(s); setVenues(v); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const openCreate = () => { setForm(EMPTY_SVC); setModal('create'); setError(''); };
  const openEdit = (s) => { setForm({ ...EMPTY_SVC, ...s }); setModal(s); setError(''); };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!form.name || !form.venue_id) { setError('Название и заведение обязательны'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'create') await api.createService(form);
      else await api.updateService(modal.id, form);
      closeModal(); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Удалить услугу "${s.name}"?`)) return;
    await api.deleteService(s.id).catch(e => alert(e.message));
    load();
  };

  const filtered = venueFilter ? services.filter(s => s.venue_id === venueFilter) : services;

  return (
    <>
      <div className="page-header">
        <h1>Услуги <span className="tag">{services.length}</span></h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Добавить</button>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: 240 }} value={venueFilter} onChange={e => setVenueFilter(e.target.value)}>
          <option value="">Все заведения</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Загрузка...</div> : (
            <table>
              <thead><tr><th>Название</th><th>Заведение</th><th>Цена</th><th>Длительность</th><th>Статус</th><th>Действия</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      {s.description && <div className="text-sm text-muted">{s.description}</div>}
                    </td>
                    <td className="text-sm">{s.venue_name || '—'}</td>
                    <td>{s.price > 0 ? `${s.price.toLocaleString()} ₸` : 'Бесплатно'}</td>
                    <td className="text-sm">{fmtDuration(s.duration || 60)}</td>
                    <td><span className={`badge ${s.is_active !== false ? 'badge-green' : 'badge-gray'}`}>{s.is_active !== false ? 'Активна' : 'Выкл'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет услуг</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal !== null && (
        <Modal title={modal === 'create' ? 'Новая услуга' : 'Редактировать услугу'} onClose={closeModal} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label className="form-label">Заведение *</label>
            <select className="form-select" value={form.venue_id} onChange={e => set('venue_id', e.target.value)}>
              <option value="">— Выберите —</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Название *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Описание</label>
            <textarea className="form-textarea" value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Цена (₸)</label>
              <input className="form-input" type="number" min="0" value={form.price} onChange={e => set('price', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Длительность (мин)</label>
              <select className="form-select" value={form.duration} onChange={e => set('duration', +e.target.value)}>
                {[15,30,45,60,90,120,180,240].map(d => <option key={d} value={d}>{fmtDuration(d)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group flex items-center gap-2">
            <label className="switch">
              <input type="checkbox" checked={form.is_active !== false} onChange={e => set('is_active', e.target.checked)} />
              <span className="slider" />
            </label>
            <span className="form-label" style={{ marginBottom: 0 }}>Активна</span>
          </div>
        </Modal>
      )}
    </>
  );
}
