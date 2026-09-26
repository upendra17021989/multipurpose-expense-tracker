import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { societyAttendanceAPI } from '../../api/endpoints'
import { Shell, SummaryGrid } from '../DashboardRouter'
import './AttendanceReports.css'

const isoToday = new Date().toISOString().slice(0, 10)
const currentMonth = isoToday.slice(0, 7)
const time = (value) => value ? value.slice(0, 5) : '-'
const label = (value) => (value || '').replaceAll('_', ' ')

export const AttendanceReports = () => {
  const [mode, setMode] = useState('daily')
  const [date, setDate] = useState(isoToday)
  const [month, setMonth] = useState(currentMonth)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [expandedRows, setExpandedRows] = useState(() => new Set())
  const [selectedWorkerKey, setSelectedWorkerKey] = useState(null)
  const toggleRow = (key) => setExpandedRows((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })

  useEffect(() => {
    setSelectedWorkerKey(null)
    setLoading(true)
    const request = mode === 'daily'
      ? societyAttendanceAPI.getDailyReport(date)
      : societyAttendanceAPI.getMonthlyReport(Number(month.slice(0, 4)), Number(month.slice(5, 7)))
    request.then(({ data }) => setReport(data))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load attendance report'))
      .finally(() => setLoading(false))
  }, [mode, date, month])

  const daily = mode === 'daily'
  const selectedWorker = !daily && report?.workers?.find((worker) => worker.workerKey === selectedWorkerKey)
  useEffect(() => {
    if (!selectedWorkerKey) return
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSelectedWorkerKey(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedWorkerKey])
  const counts = report?.statusCounts || {}
  const summary = daily
    ? [['Recorded', report?.totalRecorded || 0], ['Present', report?.presentCount || 0], ['Absent', report?.absentCount || 0], ['Late minutes', report?.totalLateMinutes || 0], ['Overtime minutes', report?.totalOvertimeMinutes || 0]]
    : [['Records', report?.totalRecords || 0], ['Workers', report?.workers?.length || 0], ['Present', counts.PRESENT || 0], ['Absent', counts.ABSENT || 0], ['Late minutes', report?.totalLateMinutes || 0], ['Overtime minutes', report?.totalOvertimeMinutes || 0]]

  const downloadMonthlyPdf = async () => {
    setExportingPdf(true)
    try {
      const { data } = await societyAttendanceAPI.downloadMonthlyPdf(Number(month.slice(0, 4)), Number(month.slice(5, 7)))
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance-register-${month}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to download monthly register PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  return <Shell title="Attendance Reports" eyebrow="Society workforce">
    <section className="toolbar-panel">
      <div className="table-actions">
        <button className={daily ? 'primary' : ''} onClick={() => setMode('daily')}>Daily register</button>
        <button className={!daily ? 'primary' : ''} onClick={() => setMode('monthly')}>Monthly register</button>
      </div>
      {daily
        ? <input aria-label="Report date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        : <div className="attendance-report-month-actions"><input aria-label="Report month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><button type="button" className="secondary" disabled={loading || exportingPdf} onClick={downloadMonthlyPdf}>{exportingPdf ? 'Preparing PDF...' : 'Download PDF'}</button></div>}
    </section>

    <div className="attendance-report-summary"><SummaryGrid items={summary} /></div>

    <div className="table-wrap attendance-report-table-wrap">
      {daily ? <table className="attendance-report-table attendance-daily-report-table">
        <thead><tr><th>Worker</th><th>Agency</th><th>Shift / Post</th><th>Status</th><th>In</th><th>Out</th><th>Replacement</th><th>Late</th><th>Overtime</th><th>Notes</th></tr></thead>
        <tbody>{(report?.rows || []).map((row) => <tr key={row.attendanceId} className={expandedRows.has(`d-${row.attendanceId}`) ? 'attendance-report-expanded' : ''}>
          <td><div className="attendance-report-person"><span><strong>{row.workerName}</strong><small>{row.workerType}</small></span><button type="button" aria-expanded={expandedRows.has(`d-${row.attendanceId}`)} onClick={() => toggleRow(`d-${row.attendanceId}`)}>{expandedRows.has(`d-${row.attendanceId}`) ? '−' : '+'}</button></div></td>
          <td>{row.agencyName || 'Direct'}</td><td>{row.shiftName}<br /><small>{row.postName}</small></td>
          <td>{label(row.status)}</td><td>{time(row.checkIn)}</td><td>{time(row.checkOut)}</td>
          <td>{row.replacementWorkerName || '-'}</td><td>{row.lateMinutes} min</td><td>{row.overtimeMinutes} min</td><td>{row.notes || '-'}</td>
        </tr>)}{!loading && !report?.rows?.length && <tr><td colSpan="10" className="empty-state">No attendance was recorded for this date.</td></tr>}</tbody>
      </table> : <table className="attendance-report-table attendance-monthly-report-table">
        <thead><tr><th>Worker</th><th>Agency</th><th>Shift / Post</th><th>Recorded</th><th>Present</th><th>Absent</th><th>Late</th><th>Half day</th><th>Leave</th><th>Off / Holiday</th><th>Replacement</th><th>Late min</th><th>OT min</th></tr></thead>
        <tbody>{(report?.workers || []).map((row) => <tr key={row.workerKey} className={expandedRows.has(`m-${row.workerKey}`) ? 'attendance-report-expanded' : ''}>
          <td><div className="attendance-report-person"><span><button type="button" className="attendance-worker-details-trigger" onClick={() => setSelectedWorkerKey(row.workerKey)} aria-label={`View ${row.workerName}'s attendance details`}>{row.workerName}</button><small>{row.workerType}</small></span><button type="button" aria-label={`${expandedRows.has(`m-${row.workerKey}`) ? 'Collapse' : 'Expand'} ${row.workerName}`} aria-expanded={expandedRows.has(`m-${row.workerKey}`)} onClick={() => toggleRow(`m-${row.workerKey}`)}>{expandedRows.has(`m-${row.workerKey}`) ? '−' : '+'}</button></div></td>
          <td>{row.agencyName || 'Direct'}</td><td>{row.shiftName}<br /><small>{row.postName}</small></td>
          <td>{row.recordedDays}</td><td>{row.presentDays}</td><td>{row.absentDays}</td><td>{row.lateDays}</td>
          <td>{row.halfDays}</td><td>{row.leaveDays}</td><td>{row.weeklyOffDays + row.holidayDays}</td>
          <td>{row.replacementDays}</td><td>{row.lateMinutes}</td><td>{row.overtimeMinutes}</td>
        </tr>)}{!loading && !report?.workers?.length && <tr><td colSpan="13" className="empty-state">No attendance was recorded for this month.</td></tr>}</tbody>
      </table>}
    </div>
    {loading && <p>Loading report...</p>}
    {selectedWorker && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedWorkerKey(null)}>
      <section className="expense-modal attendance-worker-modal" role="dialog" aria-modal="true" aria-labelledby="attendance-worker-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="expense-modal-header">
          <div><h2 id="attendance-worker-modal-title">{selectedWorker.workerName}</h2><p className="muted">Attendance details for {month} · {selectedWorker.agencyName || 'Direct'}</p></div>
          <button type="button" className="modal-close" aria-label="Close attendance details" onClick={() => setSelectedWorkerKey(null)}>×</button>
        </div>
        <div className="attendance-worker-modal-summary"><span>{selectedWorker.recordedDays} recorded</span><span>{selectedWorker.presentDays} present</span><span>{selectedWorker.absentDays} absent</span><span>{selectedWorker.lateDays} late</span></div>
        <div className="attendance-worker-days">
          {(selectedWorker.attendanceDays || []).map((day) => <article key={day.attendanceId}>
            <div className="attendance-worker-day-heading"><strong>{day.attendanceDate}</strong><span>{label(day.status)}</span></div>
            <p>{day.shiftName} · {day.postName}</p>
            <div className="attendance-worker-day-meta"><span>In: {time(day.checkIn)}</span><span>Out: {time(day.checkOut)}</span><span>Late: {day.lateMinutes} min</span><span>Overtime: {day.overtimeMinutes} min</span></div>
            {day.replacementWorkerName && <p>Replacement: {day.replacementWorkerName}</p>}
            {day.notes && <p>Notes: {day.notes}</p>}
          </article>)}
        </div>
      </section>
    </div>}
  </Shell>
}
