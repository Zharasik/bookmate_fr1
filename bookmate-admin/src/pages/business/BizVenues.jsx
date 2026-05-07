import { useState, useEffect } from 'react';
import { api } from '../../api';
import Modal from '../../components/Modal';

const EMPTY = { name:'',category:'',location:'',description:'',image_url:'',price_range:'',open_time:'10:00',close_time:'22:00',phone:'',is_active:true };

export default function BizVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.biz.getVenues().then(setVenues).catch(()=>{}).finally(()=>setLoading(false));
  useEffect(()=>{ load(); },[]);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const openCreate = () => { setForm(EMPTY); setModal('create'); setError(''); };
  const openEdit = v => { setForm({...EMPTY,...v, is_active:v.is_active!==false}); setModal(v); setError(''); };

  const handleSave = async () => {
    if (!form.name||!form.category||!form.location) { setError('Название, категория и адрес обязательны'); return; }
    setSaving(true); setError('');
    try {
      if (modal==='create') await api.biz.createVenue(form);
      else await api.biz.updateVenue(modal.id, form);
      setModal(null); load();
    } catch(e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <div className="page-header"><h1>Мои заведения <span className="tag">{venues.length}</span></h1><button className="btn btn-primary" onClick={openCreate}>+ Добавить заведение</button></div>

      {loading?<div className="loading">Загрузка...</div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {venues.map(v=>(
            <div key={v.id} className="card">
              {v.image_url&&<img src={v.image_url} alt="" style={{width:'100%',height:160,objectFit:'cover',borderRadius:'16px 16px 0 0'}}/>}
              <div className="card-body">
                <div className="flex items-center gap-2" style={{marginBottom:8}}>
                  <span className="text-bold" style={{fontSize:16,flex:1}}>{v.name}</span>
                  <span className={`badge ${v.is_active!==false?'badge-green':'badge-red'}`}>{v.is_active!==false?'Активно':'Выкл'}</span>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  <span className="tag">{v.category}</span>
                  <span className="text-sm text-muted">📍 {v.location}</span>
                </div>
                <div className="text-sm text-muted" style={{marginBottom:12}}>🕐 {v.open_time} – {v.close_time} · ⭐ {v.rating||0} ({v.review_count||0} отз.) · 📅 {v.booking_count||0} броней</div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>openEdit(v)}>✏️ Редактировать</button>
                </div>
              </div>
            </div>
          ))}
          {!venues.length&&!loading&&<div className="empty"><div style={{fontSize:40,marginBottom:12}}>🏢</div><div>Нет заведений</div><div className="text-sm text-muted" style={{marginTop:8}}>Создайте своё первое заведение</div></div>}
        </div>
      )}

      {modal!==null&&(
        <Modal title={modal==='create'?'Новое заведение':'Редактировать заведение'} onClose={()=>setModal(null)} onSave={handleSave} saving={saving}>
          {error&&<div className="error-msg">{error}</div>}
          <div className="form-row"><div className="form-group"><label className="form-label">Название *</label><input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)}/></div><div className="form-group"><label className="form-label">Категория *</label><input className="form-input" value={form.category} onChange={e=>set('category',e.target.value)} placeholder="Billiards, Bowling..."/></div></div>
          <div className="form-group"><label className="form-label">Адрес *</label><input className="form-input" value={form.location} onChange={e=>set('location',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Описание</label><textarea className="form-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Фото (ссылка)</label><input className="form-input" value={form.image_url||''} onChange={e=>set('image_url',e.target.value)} placeholder="https://..."/></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Открытие</label><input className="form-input" type="time" value={form.open_time} onChange={e=>set('open_time',e.target.value)}/></div><div className="form-group"><label className="form-label">Закрытие</label><input className="form-input" type="time" value={form.close_time} onChange={e=>set('close_time',e.target.value)}/></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Ценовой диапазон</label><select className="form-select" value={form.price_range||''} onChange={e=>set('price_range',e.target.value)}><option value="">—</option><option>₸</option><option>₸₸</option><option>₸₸₸</option><option>₸₸₸₸</option></select></div><div className="form-group"><label className="form-label">Телефон</label><input className="form-input" value={form.phone||''} onChange={e=>set('phone',e.target.value)}/></div></div>
          {modal!=='create'&&<div className="form-group flex items-center gap-2" style={{marginTop:8}}><label className="switch"><input type="checkbox" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)}/><span className="slider"/></label><span className="form-label" style={{marginBottom:0}}>Активно</span></div>}
        </Modal>
      )}
    </>
  );
}
