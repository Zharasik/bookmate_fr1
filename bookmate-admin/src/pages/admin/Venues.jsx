import { useState, useEffect } from 'react';
import { api } from '../../api';
import Modal from '../../components/Modal';

const EMPTY = { name:'',category:'',location:'',description:'',image_url:'',price_range:'',open_time:'10:00',close_time:'22:00',phone:'',is_active:true };

export default function Venues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getVenues().then(setVenues).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setModal('create'); setError(''); };
  const openEdit = v => { setForm({...EMPTY,...v, is_active: v.is_active !== false}); setModal(v); setError(''); };
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  const handleSave = async () => {
    if (!form.name||!form.category||!form.location) { setError('Название, категория и адрес обязательны'); return; }
    setSaving(true); setError('');
    try {
      if (modal==='create') await api.createVenue(form);
      else await api.updateVenue(modal.id, form);
      setModal(null); load();
    } catch(e) { setError(e.message); } finally { setSaving(false); }
  };

  const del = async v => {
    if (!window.confirm(`Удалить "${v.name}"?`)) return;
    await api.deleteVenue(v.id).catch(e=>alert(e.message)); load();
  };

  const filtered = venues.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header"><h1>Заведения <span className="tag">{venues.length}</span></h1><button className="btn btn-primary" onClick={openCreate}>+ Добавить</button></div>
      <div className="filter-bar"><input className="search-input" placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Загрузка...</div> : (
            <table>
              <thead><tr><th>Заведение</th><th>Категория</th><th>Адрес</th><th>Часы</th><th>Рейтинг</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:10}}>{v.image_url&&<img src={v.image_url} alt="" style={{width:40,height:40,borderRadius:10,objectFit:'cover'}}/>}<div><div className="text-bold">{v.name}</div>{v.phone&&<div className="text-sm text-muted">{v.phone}</div>}</div></div></td>
                    <td><span className="tag">{v.category}</span></td>
                    <td className="text-sm truncate">{v.location}</td>
                    <td className="text-sm">{v.open_time}–{v.close_time}</td>
                    <td><span className="text-bold">⭐ {v.rating||0}</span> <span className="text-sm text-muted">({v.review_count||0})</span></td>
                    <td><span className={`badge ${v.is_active!==false?'badge-green':'badge-red'}`}>{v.is_active!==false?'Активно':'Выкл'}</span></td>
                    <td><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={()=>openEdit(v)}>✏️</button><button className="btn btn-danger btn-sm" onClick={()=>del(v)}>🗑️</button></div></td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={7} style={{textAlign:'center',color:'#9ca3af',padding:32}}>Нет заведений</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {modal!==null&&(
        <Modal title={modal==='create'?'Новое заведение':'Редактировать'} onClose={()=>setModal(null)} onSave={handleSave} saving={saving}>
          {error&&<div className="error-msg">{error}</div>}
          <div className="form-row"><div className="form-group"><label className="form-label">Название *</label><input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)}/></div><div className="form-group"><label className="form-label">Категория *</label><input className="form-input" value={form.category} onChange={e=>set('category',e.target.value)}/></div></div>
          <div className="form-group"><label className="form-label">Адрес *</label><input className="form-input" value={form.location} onChange={e=>set('location',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Описание</label><textarea className="form-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Ссылка на фото</label><input className="form-input" value={form.image_url||''} onChange={e=>set('image_url',e.target.value)} placeholder="https://..."/></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Открытие</label><input className="form-input" type="time" value={form.open_time||'10:00'} onChange={e=>set('open_time',e.target.value)}/></div><div className="form-group"><label className="form-label">Закрытие</label><input className="form-input" type="time" value={form.close_time||'22:00'} onChange={e=>set('close_time',e.target.value)}/></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Цены</label><select className="form-select" value={form.price_range||''} onChange={e=>set('price_range',e.target.value)}><option value="">—</option><option>₸</option><option>₸₸</option><option>₸₸₸</option><option>₸₸₸₸</option></select></div><div className="form-group"><label className="form-label">Телефон</label><input className="form-input" value={form.phone||''} onChange={e=>set('phone',e.target.value)}/></div></div>
          {modal!=='create'&&<div className="form-group flex items-center gap-2"><label className="switch"><input type="checkbox" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)}/><span className="slider"/></label><span className="form-label" style={{marginBottom:0}}>Активно</span></div>}
        </Modal>
      )}
    </>
  );
}
