import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const ROLE_BADGE = {
  user:           { cls: 'badge-gray',   label: 'Клиент' },
  business_owner: { cls: 'badge-blue',   label: 'Бизнес' },
  admin:          { cls: 'badge-red',    label: 'Админ' },
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ role: 'user' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openEdit = (u) => { setForm({ role: u.role }); setModal(u); setError(''); };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.updateUser(modal.id, { role: form.role });
      closeModal(); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Удалить пользователя "${u.name}"?`)) return;
    await api.deleteUser(u.id).catch(e => alert(e.message));
    load();
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <>
      <div className="page-header">
        <h1>Пользователи <span className="tag">{users.length}</span></h1>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Поиск по имени или email..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ width: 160 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">Все роли</option>
          <option value="user">Клиенты</option>
          <option value="business_owner">Бизнес</option>
          <option value="admin">Админы</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Загрузка...</div> : (
            <table>
              <thead><tr><th>Пользователь</th><th>Телефон</th><th>Роль</th><th>Рейтинг</th><th>Верифицирован</th><th>Регистрация</th><th>Действия</th></tr></thead>
              <tbody>
                {filtered.map(u => {
                  const rb = ROLE_BADGE[u.role] || ROLE_BADGE.user;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div className="text-sm text-muted">{u.email}</div>
                      </td>
                      <td className="text-sm">{u.phone || '—'}</td>
                      <td><span className={`badge ${rb.cls}`}>{rb.label}</span></td>
                      <td>⭐ {u.client_rating || 5.0} <span className="text-muted text-sm">({u.rating_count || 0})</span></td>
                      <td><span className={`badge ${u.email_verified ? 'badge-green' : 'badge-red'}`}>{u.email_verified ? '✓' : '✗'}</span></td>
                      <td className="text-sm text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏️ Роль</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Нет пользователей</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={`Изменить роль — ${modal.name}`} onClose={closeModal} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label className="form-label">Роль пользователя</label>
            <select className="form-select" value={form.role} onChange={e => setForm({ role: e.target.value })}>
              <option value="user">Клиент</option>
              <option value="business_owner">Бизнес-владелец</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <p className="text-sm text-muted">Email: {modal.email}</p>
        </Modal>
      )}
    </>
  );
}
