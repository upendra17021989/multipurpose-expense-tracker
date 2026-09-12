import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyNotificationAPI as api } from '../../api/endpoints'
import { Shell, SummaryGrid } from '../DashboardRouter'
import './Notifications.css'

export const Notifications = () => {
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('unread')
  const load=()=>api.list().then(r=>setRows(r.data||[])).catch(e=>toast.error(e.response?.data?.message||'Unable to load notifications')).finally(()=>setLoading(false))
  useEffect(()=>{load()},[])
  const read=async item=>{if(!item.readAt)await api.read(item.id);load()}, readAll=async()=>{await api.readAll();load()}
  const unread=rows.filter(x=>!x.readAt).length, visible=filter==='unread'?rows.filter(x=>!x.readAt):rows
  return <Shell title="Notifications" eyebrow="Society operations" actions={unread>0&&<button onClick={readAll}>Mark all read</button>}><div className="notifications-page">
    <SummaryGrid items={[["Unread",unread],["Overdue",rows.filter(x=>x.notificationType==='WORK_ORDER_OVERDUE').length],["Priority",rows.filter(x=>['HIGH','CRITICAL'].includes(x.priority)).length],["Total",rows.length]]}/>
    <div className="notification-tabs" role="tablist"><button aria-selected={filter==='unread'} onClick={()=>setFilter('unread')}>Unread <span>{unread}</span></button><button aria-selected={filter==='all'} onClick={()=>setFilter('all')}>All <span>{rows.length}</span></button></div>
    <section className="notification-list">{visible.map(x=><article className={`notification-card ${x.readAt?'is-read':'is-unread'}`} key={x.id}><div className="notification-copy"><header><strong>{x.title}</strong><span>{x.priority}</span></header><p>{x.message}</p><small>{new Date(x.createdAt).toLocaleString()} · {x.readAt?'Read':'Unread'}</small></div><div className="notification-actions"><Link className="button-link" to="/society/work-orders" onClick={()=>read(x)}>Open work orders</Link>{!x.readAt&&<button onClick={()=>read(x)}>Mark read</button>}</div></article>)}{!loading&&!visible.length&&<p className="empty-state">{filter==='unread'?'You are all caught up.':'No notifications.'}</p>}{loading&&<p>Loading...</p>}</section>
  </div></Shell>
}
