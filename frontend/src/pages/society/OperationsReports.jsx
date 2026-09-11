import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { societyOperationsReportAPI as api } from '../../api/endpoints'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0,10), monthNow = today.slice(0,7)
const monthStart = `${monthNow}-01`
const saveBlob = (response, filename) => { const url=URL.createObjectURL(response.data);const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url) }

export const OperationsReports = () => {
  const [mode,setMode]=useState('agency'),[month,setMonth]=useState(monthNow),[from,setFrom]=useState(monthStart),[to,setTo]=useState(today),[report,setReport]=useState(null),[loading,setLoading]=useState(false)
  const load=async()=>{setLoading(true);try{const response=mode==='agency'?await api.agencyCompliance(Number(month.slice(0,4)),Number(month.slice(5,7))):await api.supervisorPerformance(from,to);setReport(response.data)}catch(e){toast.error(e.response?.data?.message||'Unable to load operations report')}finally{setLoading(false)}}
  useEffect(()=>{load()},[mode,month,from,to])
  const exportReport=async format=>{try{const response=mode==='agency'?await api.exportAgency(Number(month.slice(0,4)),Number(month.slice(5,7)),format):await api.exportSupervisor(from,to,format);saveBlob(response,mode==='agency'?`agency-compliance-${month}.${format}`:`supervisor-performance-${from}-${to}.${format}`)}catch(e){toast.error(e.response?.data?.message||'Unable to export report')}}
  const agency=mode==='agency', rows=agency?(report?.agencies||[]):(report?.supervisors||[])
  return <Shell title="Operations Reports" eyebrow="Society workforce" actions={<div className="table-actions"><button onClick={()=>exportReport('csv')}>Export CSV</button><button className="primary" onClick={()=>exportReport('pdf')}>Export PDF</button></div>}>
    <section className="toolbar-panel"><div className="table-actions"><button className={agency?'primary':''} onClick={()=>setMode('agency')}>Agency compliance</button><button className={!agency?'primary':''} onClick={()=>setMode('supervisor')}>Supervisor performance</button></div>{agency?<input aria-label="Report month" type="month" value={month} onChange={e=>setMonth(e.target.value)}/>:<div className="table-actions"><label>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}</section>
    <SummaryGrid items={agency?[["Agencies",rows.length],["Expected",rows.reduce((n,x)=>n+x.expectedAssignments,0)],["Present",rows.reduce((n,x)=>n+x.present+x.replacements,0)],["Shortage",rows.reduce((n,x)=>n+x.shortage,0)]]:[["Supervisors",rows.length],["Reports",rows.reduce((n,x)=>n+x.reportsSubmitted,0)],["Checklist",rows.reduce((n,x)=>n+x.checklistCompletions,0)],["Inspections",rows.reduce((n,x)=>n+x.inspectionsCompleted,0)]]}/>
    <div className="table-wrap">{agency?<table><thead><tr><th>Agency</th><th>Required/day</th><th>Expected</th><th>Recorded</th><th>Present</th><th>Replacement</th><th>Absent</th><th>Shortage</th><th>Compliance</th></tr></thead><tbody>{rows.map(x=><tr key={x.agencyId}><td><strong>{x.agencyName}</strong></td><td>{x.requiredPerDay}</td><td>{x.expectedAssignments}</td><td>{x.recordedAssignments}</td><td>{x.present}</td><td>{x.replacements}</td><td>{x.absent}</td><td>{x.shortage}</td><td>{x.compliancePercent}%</td></tr>)}</tbody></table>:<table><thead><tr><th>Supervisor</th><th>Reports</th><th>Acknowledged</th><th>On time</th><th>Checklist</th><th>Incidents</th><th>Inspections</th><th>Handovers</th><th>Ack rate</th></tr></thead><tbody>{rows.map(x=><tr key={x.userId}><td><strong>{x.supervisorName}</strong></td><td>{x.reportsSubmitted}</td><td>{x.reportsAcknowledged}</td><td>{x.onTimeReports}</td><td>{x.checklistCompletions}</td><td>{x.incidentsRecorded}</td><td>{x.inspectionsCompleted}</td><td>{x.handoversSent}</td><td>{x.acknowledgementPercent}%</td></tr>)}</tbody></table>}</div>
    {!loading&&!rows.length&&<p className="empty-state">No report data is available for this period.</p>}{loading&&<p>Loading report...</p>}
  </Shell>
}
