import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { societyDailyOperationsAPI as api } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell, SummaryGrid } from '../DashboardRouter'
import { useI18n } from '../../i18n'
import './DailyOperations.css'

const today = new Date().toISOString().slice(0, 10)
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const blankIncident = () => ({ title: '', description: '', severity: 'MEDIUM', location: '', occurredAt: nowLocal(), immediateAction: '', sensitive: false })
const blankInspection = () => ({ title: '', location: '', scheduledFor: nowLocal(), checklist: '' })
const blankHandover = () => ({ shiftDate: today, shiftName: '', openItems: '', incidents: '', expectedVisitors: '', assetsHandedOver: '', equipmentStatus: '', attendanceShortages: '', notes: '', receiverName: '' })

export const DailyOperations = () => {
  const { tx } = useI18n()
  const { currentAccount } = useAuthStore(), admin = currentAccount?.role === 'ADMIN'
  const [date, setDate] = useState(today), [tab, setTab] = useState('checklist'), [dashboard, setDashboard] = useState(null)
  const [checklist, setChecklist] = useState([]), [incidents, setIncidents] = useState([]), [inspections, setInspections] = useState([]), [handovers, setHandovers] = useState([]), [reports, setReports] = useState([])
  const [incident, setIncident] = useState(blankIncident()), [inspection, setInspection] = useState(blankInspection()), [handover, setHandover] = useState(blankHandover()), [report, setReport] = useState({ summary: '', nextDayPriorities: '' })
  const load = async () => { try { const [d,c,i,n,h,r] = await Promise.all([api.dashboard(date),api.checklist(date),api.incidents(),api.inspections(),api.handovers(),api.reports()]); const reportRows=r.data||[], savedReport=reportRows.find(item=>item.reportDate===date); setDashboard(d.data);setChecklist(c.data||[]);setIncidents(i.data||[]);setInspections(n.data||[]);setHandovers(h.data||[]);setReports(reportRows);setReport(savedReport?{summary:savedReport.summary||'',nextDayPriorities:savedReport.nextDayPriorities||''}:{summary:'',nextDayPriorities:''}) } catch(e){ toast.error(e.response?.data?.message || tx('Unable to load daily operations')) } }
  useEffect(() => { load() }, [date])
  const run = async (action, success) => { try { await action(); toast.success(success); await load() } catch(e){ toast.error(e.response?.data?.message || tx('Unable to save')) } }
  const addChecklist = () => { const title = window.prompt(tx('Checklist item')); if(title?.trim()) run(() => api.createChecklistTemplate({ title: title.trim(), sortOrder: checklist.length }), tx('Checklist item added')) }
  const updateChecklist = (item, completed) => run(() => api.updateChecklist(item.templateId,date,{completed,notes:item.notes||''}), tx(completed?'Checklist item completed':'Checklist item reopened'))
  const submitIncident = e => { e.preventDefault(); run(() => api.createIncident(incident), tx('Incident recorded')).then(() => setIncident(blankIncident())) }
  const closeIncident = item => { const followUp=window.prompt(tx('Closure/follow-up notes')); if(followUp!==null) run(() => api.updateIncident(item.id,{status:'CLOSED',followUp}), tx('Incident closed')) }
  const submitInspection = e => { e.preventDefault(); run(() => api.createInspection(inspection), tx('Inspection scheduled')).then(() => setInspection(blankInspection())) }
  const completeInspection = item => { const result=window.prompt(tx('Result: PASS, FAIL, or NOT_APPLICABLE'),'PASS')?.toUpperCase(); if(!result)return; const notes=window.prompt(tx('Inspection notes'),'')||''; const failureAction=result==='FAIL'?(window.prompt(tx('Required failure action'))||''):''; run(() => api.completeInspection(item.id,{result,notes,failureAction}), tx('Inspection completed')) }
  const submitHandover = e => { e.preventDefault(); run(() => api.createHandover(handover), tx('Handover recorded')).then(() => setHandover(blankHandover())) }
  const saveReport = submit => run(() => submit ? api.submitReport({reportDate:date,...report}) : api.saveReport({reportDate:date,...report}), tx(submit?'Daily report submitted':'Draft saved'))
  const acknowledgeReport = item => { const comment=window.prompt(tx('Admin acknowledgement comment'),''); if(comment!==null) run(() => api.acknowledgeReport(item.id,comment), tx('Report acknowledged')) }
  const field = setter => e => setter(v => ({...v,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const tabs = [['checklist','Checklist'],['incidents','Incidents'],['inspections','Inspections'],['handover','Handover'],['report','Daily Report']]
  return <Shell title="Daily Operations" eyebrow="Society operations" actions={<label>{tx('Operating date')} <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}>
    <SummaryGrid items={[[tx('Checklist'),`${dashboard?.checklistCompleted||0}/${dashboard?.checklistTotal||0}`],[tx('Present'),dashboard?.present||0],[tx('Open work'),dashboard?.openWorkOrders||0],[tx('Overdue'),dashboard?.overdueWorkOrders||0],[tx('Complaints'),dashboard?.openComplaints||0],[tx('Incidents'),dashboard?.openIncidents||0],[tx('Inspections due'),dashboard?.inspectionsDue||0],[tx('Report'),tx(dashboard?.reportStatus||'NOT_STARTED')]]} />
    <div className="table-actions daily-operations-tabs" role="tablist" aria-label={tx('Daily Operations')}>
      {tabs.map(([id,label])=><button type="button" role="tab" aria-selected={tab===id} key={id} className={tab===id?'primary':''} onClick={()=>setTab(id)}>{tx(label)}</button>)}
    </div>
    {tab==='checklist'&&<section className="report-panel daily-checklist-panel">
      <div className="section-heading-row daily-checklist-heading">
        <div><h2>{tx('Daily checklist')}</h2><p className="muted">{tx('Completion is recorded with the operator and time.')}</p></div>
        {admin&&<button type="button" onClick={addChecklist}>{tx('Add checklist item')}</button>}
      </div>
      <div className="daily-checklist-list">
        {checklist.map(x=><article className={`daily-checklist-item${x.completed?' is-complete':''}`} key={x.templateId}>
          <label className="daily-checklist-content">
            <input type="checkbox" checked={x.completed} onChange={e=>updateChecklist(x,e.target.checked)}/>
            <span className="daily-checklist-copy">
              <strong>{x.title}</strong>
              {x.description&&<span className="muted">{x.description}</span>}
              {x.completedBy&&<small className="daily-checklist-completion">{x.completedBy} · {new Date(x.completedAt).toLocaleString()}</small>}
            </span>
          </label>
          {admin&&<button type="button" className="danger daily-checklist-remove" onClick={()=>run(()=>api.disableChecklistTemplate(x.templateId),tx('Checklist item removed'))}>{tx('Remove')}</button>}
        </article>)}
      </div>
      {!checklist.length&&<p className="empty-state">{tx('No checklist items configured. An admin can add the first one.')}</p>}
    </section>}
    {tab==='incidents'&&<><form className="form-panel" onSubmit={submitIncident}><h2>{tx('Record incident')}</h2><div className="form-grid"><label>{tx('Title')}<input name="title" value={incident.title} onChange={field(setIncident)} required/></label><label>{tx('Severity')}<select name="severity" value={incident.severity} onChange={field(setIncident)}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label>{tx('Occurred at')}<input type="datetime-local" name="occurredAt" value={incident.occurredAt} onChange={field(setIncident)} required/></label><label>{tx('Location')}<input name="location" value={incident.location} onChange={field(setIncident)}/></label><label className="full-width">{tx('Description')}<textarea name="description" value={incident.description} onChange={field(setIncident)} required/></label><label className="full-width">{tx('Immediate action')}<textarea name="immediateAction" value={incident.immediateAction} onChange={field(setIncident)}/></label><label><input type="checkbox" name="sensitive" checked={incident.sensitive} onChange={field(setIncident)}/> {tx('Restricted/sensitive')}</label></div><button className="primary">{tx('Record incident')}</button></form><section className="report-panel">{incidents.map(x=><article className="shared-invitation-card" key={x.id}><div><strong>{x.incidentNumber} · {x.title}</strong><p>{x.description}</p><small>{tx(x.severity)} · {tx(x.status)} · {new Date(x.occurredAt).toLocaleString()} · {x.location||tx('No location')}</small></div>{x.status!=='CLOSED'&&<button onClick={()=>closeIncident(x)}>{tx('Close')}</button>}</article>)}</section></>}
    {tab==='inspections'&&<><form className="form-panel" onSubmit={submitInspection}><h2>{tx('Schedule inspection')}</h2><div className="form-grid"><label>{tx('Title')}<input name="title" value={inspection.title} onChange={field(setInspection)} required/></label><label>{tx('Location')}<input name="location" value={inspection.location} onChange={field(setInspection)}/></label><label>{tx('Scheduled for')}<input type="datetime-local" name="scheduledFor" value={inspection.scheduledFor} onChange={field(setInspection)}/></label><label className="full-width">{tx('Checklist')}<textarea name="checklist" value={inspection.checklist} onChange={field(setInspection)} placeholder={tx('One inspection point per line')}/></label></div><button className="primary">{tx('Schedule')}</button></form><section className="report-panel">{inspections.map(x=><article className="shared-invitation-card" key={x.id}><div><strong>{x.title}</strong><p>{x.checklist}</p><small>{tx(x.result)} · {x.scheduledFor?new Date(x.scheduledFor).toLocaleString():tx('Ad-hoc')} · {x.location||tx('No location')}</small>{x.failureAction&&<p>{tx('Failure action')}: {x.failureAction}</p>}</div>{x.result==='PENDING'&&<button onClick={()=>completeInspection(x)}>{tx('Complete')}</button>}</article>)}</section></>}
    {tab==='handover'&&<><form className="form-panel" onSubmit={submitHandover}><h2>{tx('Shift handover')}</h2><div className="form-grid"><label>{tx('Date')}<input type="date" name="shiftDate" value={handover.shiftDate} onChange={field(setHandover)} required/></label><label>{tx('Shift')}<input name="shiftName" value={handover.shiftName} onChange={field(setHandover)} required/></label>{[['openItems','Open work and complaints'],['incidents','Incidents'],['expectedVisitors','Expected visitors/vendors'],['assetsHandedOver','Keys, devices, documents'],['equipmentStatus','Equipment status'],['attendanceShortages','Attendance shortages'],['notes','Notes for next shift']].map(([name,label])=><label key={name}>{tx(label)}<textarea name={name} value={handover[name]} onChange={field(setHandover)}/></label>)}<label>{tx('Receiver name')}<input name="receiverName" value={handover.receiverName} onChange={field(setHandover)}/></label></div><button className="primary">{tx('Record handover')}</button></form><section className="report-panel">{handovers.map(x=><article className="shared-invitation-card" key={x.id}><div><strong>{x.shiftDate} · {x.shiftName}</strong><p>{x.openItems||x.notes||tx('No open notes')}</p><small>{tx('Sent by')} {x.sender}{x.acknowledgedBy?` · ${tx('Acknowledged by')} ${x.acknowledgedBy}`:''}</small></div>{!x.acknowledgedAt&&<button onClick={()=>run(()=>api.acknowledgeHandover(x.id),tx('Handover acknowledged'))}>{tx('Acknowledge')}</button>}</article>)}</section></>}
    {tab==='report'&&<div className="daily-report-workspace">
      <section className="form-panel daily-report-editor">
        <header className="daily-report-section-header">
          <h2>{tx('Supervisor daily report')}</h2>
          <p className="muted">{tx('Attendance, work, complaints, incidents, inspections, handovers, and checklist totals are captured automatically when saved.')}</p>
        </header>
        <div className="daily-report-fields">
          <label>{tx('Summary')}<textarea rows="5" value={report.summary} onChange={e=>setReport({...report,summary:e.target.value})}/></label>
          <label>{tx('Next-day priorities')}<textarea rows="5" value={report.nextDayPriorities} onChange={e=>setReport({...report,nextDayPriorities:e.target.value})}/></label>
        </div>
        <div className="form-actions daily-report-actions"><button type="button" onClick={()=>saveReport(false)}>{tx('Save draft')}</button><button type="button" className="primary" onClick={()=>saveReport(true)}>{tx('Submit report')}</button></div>
      </section>
      <section className="report-panel daily-report-history">
        <div className="daily-report-section-header"><h2>{tx('Report history')}</h2><p className="muted">{tx('Saved and submitted reports for this operating period.')}</p></div>
        <div className="daily-report-history-list">
          {reports.map(x=><article className="daily-report-history-card" key={x.id}>
            <header>
              <div><strong>{x.reportDate}</strong><small>{tx('Revision')} {x.revision}</small></div>
              <span className={`status-pill ${x.status==='ACKNOWLEDGED'?'approved':''}`}>{tx(x.status)}</span>
            </header>
            <div className="daily-report-narrative">
              <section><h3>{tx('Supervisor summary')}</h3><p>{x.summary||tx('No supervisor summary')}</p></section>
              <section><h3>{tx('Next-day work')}</h3><p>{x.nextDayPriorities||tx('No next-day priorities recorded')}</p></section>
            </div>
            {x.submittedBy&&<p className="daily-report-submitter"><span>{tx('Submitted by')} <strong>{x.submittedBy}</strong></span>{x.submittedAt&&<span>{new Date(x.submittedAt).toLocaleString()}</span>}</p>}
            <dl className="daily-report-snapshot">
              {Object.entries(x.snapshot||{}).map(([key,value])=><div key={key}><dt>{tx(key)}</dt><dd>{typeof value==='object'?JSON.stringify(value):String(value)}</dd></div>)}
            </dl>
            {x.adminComment&&<p className="daily-report-admin-comment"><strong>{tx('Admin')}</strong><span>{x.adminComment}</span></p>}
            {admin&&x.status==='SUBMITTED'&&<footer><button type="button" className="primary" onClick={()=>acknowledgeReport(x)}>{tx('Acknowledge')}</button></footer>}
          </article>)}
        </div>
        {!reports.length&&<p className="empty-state">{tx('No daily reports saved yet.')}</p>}
      </section>
    </div>}
  </Shell>
}
