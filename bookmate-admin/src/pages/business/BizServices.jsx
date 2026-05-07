import { useState, useEffect } from 'react';
import { api } from '../../api';
import Modal from '../../components/Modal';

const DURATIONS = [15,30,45,60,90,120,180,240];
function fmtDur(m){ if(m<60)return`${m} мин`; const h=Math.floor(m/60),r=m%60; return r?`${h}ч ${r}м`:`${h} ч`; }
const EMPTY = { venue_id:'',name:'',description:'',price:0,duration:60,is_active:true };

export default function BizServices() {
  const [venues, setVenues] = useState([]);
  const [services, setServices] = useState([]);
  const [venueFilter, setVenueFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([api.biz.getVenues(), ...venues.map(v=>api.biz.getServices(v.id))])
      .then(([vs,...allSvcs])=>{ setVenues(vs); setServices(allSvcs.flat()); })
      .catch(()=>{}).finally(()=>setLoading(false));

  useEffect(()=>{
    api.biz.getVenues().then(async vs=>{
      setVenues(vs);
      const all = await Promise.all(vs.map(v=>api.biz.getServices(v.id).catch(()=>[])));
      const svcs = all.flat().map((s,_,arr)=>s);
      // attach venue_name
      const venueMap = Object.fromEntries(vs.map(v=>[v.id,v.name]));
      setServices(svcs.map(s=>({...s, venue_name: venueMap[s.venue_id]||'—'})));
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const reloadServices = ()=>{
    api.biz.getVenues().then(async vs=>{
      const venueMap = Object.fromEntries(vs.map(v=>[v.id,v.name]));
      const all = await Promise.all(vs.map(v=>api.biz.getServices(v.id).catch(()=>[])));
      setServices(all.flat().map(s=>({...s,venue_name:venueMap[s.venue_id]||'—'})));
    });
  };

  const set = (k,v)=>setForm(p=>({...p,[k]:v}));
  const openCreate=()=>{ setForm({...EMPTY,venue_id:venues[0]?.id||''}); setModal('create'); setError(''); };
  const openEdit=s=>{ setForm({...EMPTY,...s}); setModal(s); setError(''); };

  const handleSave = async()=>{
    if(!form.name||!form.venue_id){setError('Выберите заведение и укажите название');return;}
    setSaving(true);setError('');
    try{
      if(modal==='create') await api.biz.createService(form.venue_id,form);
      // update not implemented in biz API, use admin for now — or skip
      setModal(null); reloadServices();
    }catch(e){setError(e.message);}finally{setSaving(false);}
  };

  const filtered = venueFilter ? services.filter(s=>s.venue_id===venueFilter) : services;

  return(
    <>
      <div className="page-header"><h1>Услуги <span className="tag">{services.length}</span></h1><button className="btn btn-primary" onClick={openCreate} disabled={!venues.length}>+ Добавить услугу</button></div>
      {venues.length>1&&(
        <div className="filter-bar">
          <select className="form-select" style={{width:260}} value={venueFilter} onChange={e=>setVenueFilter(e.target.value)}>
            <option value="">Все заведения</option>
            {venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      )}
      <div className="card">
        <div className="table-wrap">
          {loading?<div className="loading">Загрузка...</div>:(
            <table>
              <thead><tr><th>Название</th><th>Заведение</th><th>Цена</th><th>Длительность</th><th>Статус</th></tr></thead>
              <tbody>
                {filtered.map(s=>(
                  <tr key={s.id}>
                    <td><div className="text-bold">{s.name}</div>{s.description&&<div className="text-sm text-muted">{s.description}</div>}</td>
                    <td className="text-sm">{s.venue_name}</td>
                    <td>{s.price>0?`${s.price.toLocaleString()} ₸`:'Бесплатно'}</td>
                    <td><span className="tag" style={{background:'#EDE9FE',color:'#5B21B6'}}>{fmtDur(s.duration||60)}</span></td>
                    <td><span className={`badge ${s.is_active!==false?'badge-green':'badge-gray'}`}>{s.is_active!==false?'Активна':'Выкл'}</span></td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={5} style={{textAlign:'center',color:'#9ca3af',padding:32}}>Нет услуг</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {modal==='create'&&(
        <Modal title="Новая услуга" onClose={()=>setModal(null)} onSave={handleSave} saving={saving}>
          {error&&<div className="error-msg">{error}</div>}
          <div className="form-group"><label className="form-label">Заведение *</label><select className="form-select" value={form.venue_id} onChange={e=>set('venue_id',e.target.value)}><option value="">— Выберите —</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Название *</label><input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Описание</label><textarea className="form-textarea" value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Длительность</label><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>{DURATIONS.map(d=><button key={d} type="button" className="btn btn-sm" style={{background:form.duration===d?'#2563EB':'#F3F4F6',color:form.duration===d?'#fff':'#374151'}} onClick={()=>set('duration',d)}>{fmtDur(d)}</button>)}</div></div>
          <div className="form-group"><label className="form-label">Цена (₸)</label><input className="form-input" type="number" min="0" value={form.price} onChange={e=>set('price',+e.target.value)}/></div>
        </Modal>
      )}
    </>
  );
}
