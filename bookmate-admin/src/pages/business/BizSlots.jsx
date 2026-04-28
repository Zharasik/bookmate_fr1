import { useState, useEffect } from 'react';
import { api } from '../../api';
import Modal from '../../components/Modal';

const DURATIONS = [15,30,45,60,90,120,180,240];
function fmtDur(m){ if(m<60)return`${m} мин`; const h=Math.floor(m/60),r=m%60; return r?`${h}ч ${r}м`:`${h} ч`; }
const EMPTY = { name:'',description:'',price:0,capacity:1,duration:60,is_active:true };

export default function BizSlots() {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(()=>{ api.biz.getVenues().then(v=>{ setVenues(v); if(v.length>0)setSelectedVenue(v[0].id); }).catch(()=>{}); },[]);
  useEffect(()=>{ if(!selectedVenue)return; setLoading(true); api.biz.getSlots(selectedVenue).then(setSlots).catch(()=>{}).finally(()=>setLoading(false)); },[selectedVenue]);

  const set = (k,v)=>setForm(p=>({...p,[k]:v}));
  const openCreate=()=>{ setForm(EMPTY); setModal('create'); setError(''); };
  const openEdit=s=>{ setForm({...EMPTY,...s}); setModal(s); setError(''); };

  const handleSave = async()=>{
    if(!form.name){setError('Название обязательно');return;}
    setSaving(true);setError('');
    try{
      if(modal==='create') await api.biz.createSlot(selectedVenue,form);
      else await api.biz.updateSlot(modal.id,form);
      setModal(null);
      api.biz.getSlots(selectedVenue).then(setSlots);
    }catch(e){setError(e.message);}finally{setSaving(false);}
  };

  const del=async s=>{
    if(!window.confirm(`Удалить "${s.name}"?`))return;
    await api.biz.deleteSlot(s.id).catch(e=>alert(e.message));
    api.biz.getSlots(selectedVenue).then(setSlots);
  };

  const venue = venues.find(v=>v.id===selectedVenue);

  return(
    <>
      <div className="page-header"><h1>Места / слоты</h1><button className="btn btn-primary" onClick={openCreate} disabled={!selectedVenue}>+ Добавить место</button></div>

      {venues.length>1&&(
        <div className="filter-bar">
          <select className="form-select" style={{width:280}} value={selectedVenue} onChange={e=>setSelectedVenue(e.target.value)}>
            {venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      )}

      {venue&&<div className="alert-box alert-info" style={{marginBottom:16}}><span>🏢</span><span><strong>{venue.name}</strong> · {venue.category} · {venue.open_time}–{venue.close_time}</span></div>}

      {loading?<div className="loading">Загрузка...</div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {slots.map(s=>(
            <div key={s.id} className="card card-body">
              <div className="flex items-center gap-2" style={{marginBottom:8}}>
                <span className="text-bold" style={{flex:1,fontSize:15}}>{s.name}</span>
                <span className={`badge ${s.is_active?'badge-green':'badge-gray'}`} style={{fontSize:11}}>{s.is_active?'Активен':'Выкл'}</span>
              </div>
              {s.description&&<div className="text-sm text-muted" style={{marginBottom:8}}>{s.description}</div>}
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                <span className="tag" style={{background:'#EDE9FE',color:'#5B21B6'}}>⏱ {fmtDur(s.duration||60)}</span>
                <span className="tag" style={{background:'#D1FAE5',color:'#065F46'}}>{s.price>0?`${s.price.toLocaleString()} ₸/${fmtDur(s.duration||60)}`:'Бесплатно'}</span>
                {s.capacity>1&&<span className="tag">👥 {s.capacity} чел.</span>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>openEdit(s)}>✏️ Изменить</button>
                <button className="btn btn-danger btn-sm" onClick={()=>del(s)}>🗑️</button>
              </div>
            </div>
          ))}
          {!slots.length&&!loading&&(
            <div style={{gridColumn:'1/-1'}} className="empty">
              <div style={{fontSize:40,marginBottom:12}}>🪑</div>
              <div>Нет мест</div>
              <div className="text-sm text-muted" style={{marginTop:8,marginBottom:16}}>Добавьте столы, дорожки, ПК или любые другие места</div>
              <button className="btn btn-primary" onClick={openCreate}>+ Добавить первое место</button>
            </div>
          )}
        </div>
      )}

      {modal!==null&&(
        <Modal title={modal==='create'?'Новое место':'Редактировать место'} onClose={()=>setModal(null)} onSave={handleSave} saving={saving}>
          {error&&<div className="error-msg">{error}</div>}
          <div className="form-group"><label className="form-label">Название *</label><input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Стол #1, Дорожка 3, ПК №5..."/></div>
          <div className="form-group"><label className="form-label">Описание / характеристики</label><input className="form-input" value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="VIP-зона, у окна, мастер: Алибек..."/></div>
          <div className="form-group">
            <label className="form-label">Длительность одного слота *</label>
            <p className="form-hint">Клиент сможет бронировать 1, 2, 3... таких интервала подряд</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
              {DURATIONS.map(d=>(
                <button key={d} type="button" className="btn btn-sm" style={{background:form.duration===d?'#2563EB':'#F3F4F6',color:form.duration===d?'#fff':'#374151'}} onClick={()=>set('duration',d)}>{fmtDur(d)}</button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Цена (₸/{fmtDur(form.duration)})</label><input className="form-input" type="number" min="0" value={form.price} onChange={e=>set('price',+e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Вместимость</label><input className="form-input" type="number" min="1" value={form.capacity} onChange={e=>set('capacity',+e.target.value)}/></div>
          </div>
          <div className="form-group flex items-center gap-2"><label className="switch"><input type="checkbox" checked={form.is_active!==false} onChange={e=>set('is_active',e.target.checked)}/><span className="slider"/></label><span className="form-label" style={{marginBottom:0}}>Активен</span></div>
        </Modal>
      )}
    </>
  );
}
