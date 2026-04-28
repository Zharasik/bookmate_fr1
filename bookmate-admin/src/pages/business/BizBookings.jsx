import { useState, useEffect } from 'react';
import { api } from '../../api';

const STATUS_META = {
  pending:   { cls:'badge-yellow', label:'⏳ Ожидает' },
  confirmed: { cls:'badge-green',  label:'✓ Подтверждена' },
  completed: { cls:'badge-blue',   label:'✓ Завершена' },
  cancelled: { cls:'badge-red',    label:'✕ Отменена' },
};

function Stars({ value, onChange }) {
  return (
    <div style={{display:'flex',gap:6}}>
      {[1,2,3,4,5].map(s=>(
        <span key={s} style={{fontSize:28,cursor:'pointer',color:s<=value?'#F59E0B':'#D1D5DB'}} onClick={()=>onChange(s)}>★</span>
      ))}
    </div>
  );
}

export default function BizBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [acting, setActing] = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rateLoading, setRateLoading] = useState(false);

  const load = () => api.biz.getBookings(filter?{status:filter}:{}).then(setBookings).catch(()=>{}).finally(()=>setLoading(false));
  useEffect(()=>{ setLoading(true); load(); },[filter]);

  const action = async (id, act) => {
    if(!window.confirm({confirm:'Подтвердить бронь?',cancel:'Отменить бронь?',complete:'Завершить бронь?'}[act]))return;
    setActing(id+act);
    try {
      if(act==='confirm') await api.biz.confirmBooking(id);
      else if(act==='cancel') await api.biz.cancelBooking(id);
      else {
        await api.biz.completeBooking(id);
        const b = bookings.find(b=>b.id===id);
        if(b){setRateModal(b);setRating(5);setComment('');}
      }
      load();
    } catch(e){alert(e.message);}
    finally{setActing(null);}
  };

  const submitRate = async()=>{
    if(!rateModal)return;
    setRateLoading(true);
    try{
      await api.biz.rateClient(rateModal.id,{rating,comment:comment||undefined});
      alert(`✓ Клиент ${rateModal.client_name} получил оценку ${rating}/5`);
      setRateModal(null);
    }catch(e){alert(e.message);}finally{setRateLoading(false);}
  };

  const counts = bookings.reduce((a,b)=>{ a[b.status]=(a[b.status]||0)+1; return a; },{});

  return(
    <>
      <div className="page-header"><h1>Бронирования <span className="tag">{bookings.length}</span></h1></div>
      <div className="tabs">
        {[['','Все'],['pending','Ожидают'],['confirmed','Подтверждены'],['completed','Завершены'],['cancelled','Отменены']].map(([k,l])=>(
          <button key={k} className={`tab-btn${filter===k?' active':''}`} onClick={()=>setFilter(k)}>
            {l}{k&&counts[k]>0?` (${counts[k]})`:''}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading?<div className="loading">Загрузка...</div>:(
            <table>
              <thead><tr><th>Клиент</th><th>Заведение / Место</th><th>Дата / Время</th><th>Гости</th><th>Сумма</th><th>Статус</th><th>Действия</th></tr></thead>
              <tbody>
                {bookings.map(b=>{
                  const meta=STATUS_META[b.status]||STATUS_META.pending;
                  const isLowRating=b.client_rating!=null&&b.client_rating<3;
                  return(
                    <tr key={b.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar user-avatar-sm" style={{background:isLowRating?'#EF4444':undefined}}>{(b.client_name||'?')[0].toUpperCase()}</div>
                          <div>
                            <div className="user-name">{b.client_name}</div>
                            <div className="user-email">{b.client_email}</div>
                            {b.client_rating!=null&&<div style={{fontSize:11,marginTop:2,color:isLowRating?'#EF4444':'#10B981',fontWeight:700}}>⭐ {Number(b.client_rating).toFixed(1)}{isLowRating&&' ⚠️ низкий'}</div>}
                          </div>
                        </div>
                      </td>
                      <td><div className="text-sm" style={{fontWeight:600}}>{b.venue_name}</div>{b.slot_name&&<div className="text-sm text-muted">📍 {b.slot_name}</div>}</td>
                      <td><div className="text-sm">{String(b.date).split('T')[0]}</div><div className="text-sm text-muted">{b.time}{b.end_time?` – ${b.end_time}`:''}</div></td>
                      <td className="text-sm">{b.guests}</td>
                      <td className="text-bold">{b.total_price>0?`${b.total_price.toLocaleString()} ₸`:'—'}</td>
                      <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                      <td>
                        <div className="flex gap-2">
                          {b.status==='pending'&&<><button className="btn btn-success btn-sm" disabled={!!acting} onClick={()=>action(b.id,'confirm')}>✓</button><button className="btn btn-danger btn-sm" disabled={!!acting} onClick={()=>action(b.id,'cancel')}>✕</button></>}
                          {b.status==='confirmed'&&<><button className="btn btn-sm" style={{background:'#DBEAFE',color:'#1E40AF'}} disabled={!!acting} onClick={()=>action(b.id,'complete')}>✓✓ Завершить</button><button className="btn btn-danger btn-sm" disabled={!!acting} onClick={()=>action(b.id,'cancel')}>✕</button></>}
                          {b.status==='completed'&&<button className="btn btn-ghost btn-sm" onClick={()=>{setRateModal(b);setRating(5);setComment('');}}>⭐ Оценить</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!bookings.length&&<tr><td colSpan={7} style={{textAlign:'center',color:'#9ca3af',padding:32}}>Нет бронирований</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {rateModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setRateModal(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-header"><h2>Оценить клиента</h2><button className="btn btn-ghost btn-sm" onClick={()=>setRateModal(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{textAlign:'center',marginBottom:20}}>
                <div className="user-avatar" style={{margin:'0 auto 12px',width:56,height:56,fontSize:22}}>{(rateModal.client_name||'?')[0].toUpperCase()}</div>
                <div style={{fontWeight:700,fontSize:16}}>{rateModal.client_name}</div>
                <div className="text-sm text-muted">{rateModal.client_email}</div>
              </div>
              <div style={{display:'flex',justifyContent:'center',marginBottom:20}}><Stars value={rating} onChange={setRating}/></div>
              <div className="form-group"><label className="form-label">Комментарий (необязательно)</label><textarea className="form-textarea" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Отличный клиент, приходил вовремя..."/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setRateModal(null)}>Пропустить</button>
              <button className="btn btn-primary" onClick={submitRate} disabled={rateLoading}>{rateLoading?'Сохранение...':'⭐ Сохранить оценку'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
