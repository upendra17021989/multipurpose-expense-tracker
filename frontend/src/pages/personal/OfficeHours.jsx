import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuthStore } from '../../store/authStore'
import { exportWorkbook } from '../../utils/exportExcel'
import { formatDate } from '../../utils/format'
import { formatDuration, formatTime, officeHoursSummary, parseAttendanceSheet, parseAttendanceText } from '../../utils/officeHours'
import { Shell, SummaryGrid } from '../DashboardRouter'

const ACCEPTED_EXTENSIONS = /\.xlsx?$/i

export const OfficeHours = () => {
  const currentAccount = useAuthStore((state) => state.currentAccount)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [attendanceText, setAttendanceText] = useState('')
  const summary = useMemo(() => officeHoursSummary(rows), [rows])

  const readFile = async (file) => {
    if (!file) return
    if (!ACCEPTED_EXTENSIONS.test(file.name)) return toast.error('Choose an .xls or .xlsx file')
    if (file.size > 10 * 1024 * 1024) return toast.error('File must be 10 MB or smaller')
    setProcessing(true)
    setRows([])
    setFileName(file.name)
    try {
      const parsed = await readWorkbook(file)
      setRows(parsed)
      toast.success(`${parsed.length} attendance day${parsed.length === 1 ? '' : 's'} calculated`)
    } catch (error) {
      toast.error(error.message || 'Unable to read attendance data')
    } finally {
      setProcessing(false)
      setOcrProgress('')
    }
  }

  const readText = () => {
    try {
      const parsed = parseAttendanceText(attendanceText)
      setRows(parsed)
      setFileName('Pasted attendance text')
      toast.success(`${parsed.length} attendance day${parsed.length === 1 ? '' : 's'} calculated`)
    } catch (error) {
      toast.error(error.message || 'Unable to read attendance text')
    }
  }
  const exportResults = async () => {
    await exportWorkbook([{ name: 'Office Hours', rows: rows.map((row) => ({
      'Employee ID': row.employeeId,
      'Employee Name': row.employeeName,
      Date: row.date,
      'First Entry': formatTime(row.firstEntrySeconds),
      'Last Exit': formatTime(row.lastExitSeconds),
      'Office Hours': formatDuration(row.officeSeconds, true),
      'First-to-last Span': formatDuration(row.spanSeconds, true),
      Punches: row.punchCount,
      Status: row.complete ? (row.status || 'Complete') : (row.status || 'Incomplete')
    })) }], 'office-working-hours')
  }

  if (currentAccount?.accountType !== 'INDIVIDUAL') return <Shell title="Office Working Hours" eyebrow="Personal"><p className="muted">Office working hours are available only for Individual accounts.</p></Shell>

  return <Shell title="Office Working Hours" eyebrow="Individual module" actions={rows.length ? <button className="primary" onClick={exportResults}>Export Excel</button> : null}>
    <section className="personal-dashboard-panel office-hours-upload">
      <div className="personal-panel-heading"><div><h2>Import attendance data</h2><p>Paste attendance rows or upload an Excel report containing Employee ID, Date, Direction and Time.</p></div></div>
      <div className="office-hours-text-import">
        <label htmlFor="attendance-text"><strong>Paste attendance text</strong></label>
        <textarea id="attendance-text" rows="12" value={attendanceText} onChange={(event) => setAttendanceText(event.target.value)} placeholder={'Employee ID\nDate\nMachine Name\nDirection\nTime\n14693\n10 Aug 2026\nGandhinagar Reception\nEntry\n02:57:03 PM'} />
        <button type="button" className="primary" disabled={processing || !attendanceText.trim()} onClick={readText}>Calculate pasted data</button>
      </div>
      <div className="office-hours-import-divider"><span>or upload Excel</span></div>
      <label className="import-dropzone">
        <strong>{processing ? 'Reading attendance data...' : 'Choose Excel file'}</strong>
        <span>.xls or .xlsx, up to 10 MB</span>
        <input type="file" accept=".xls,.xlsx" disabled={processing} onChange={(event) => readFile(event.target.files?.[0])} />
      </label>
      {fileName && <p className="office-hours-file"><strong>Source:</strong> {fileName}</p>}
      <p className="muted office-hours-note">Office Hours sums matched Entry-to-Exit sessions. The first-to-last span includes time between the first entry and final exit. For summary reports, the report's Actual Working Hours - Swipes value is used when available.</p>
    </section>

    {rows.length > 0 && <>
      <SummaryGrid items={[[ 'Office hours', formatDuration(summary.totalSeconds, true) ], [ 'Complete days', summary.completeDays ], [ 'Incomplete days', summary.incompleteDays ], [ 'Employees', summary.employees ]]} />
      <section className="personal-dashboard-panel">
        <div className="personal-panel-heading"><div><h2>Daily calculation</h2><p>{rows.length} employee-day record{rows.length === 1 ? '' : 's'} found.</p></div></div>
        <div className="table-wrap office-hours-table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>First entry</th><th>Last exit</th><th>Office hours</th><th>Day span</th><th>Punches</th><th>Status</th></tr></thead><tbody>
          {rows.map((row) => <tr key={`${row.employeeId}-${row.date}`}><td><strong>{row.employeeId}</strong>{row.employeeName && <small>{row.employeeName}</small>}</td><td>{formatDate(row.date)}</td><td>{formatTime(row.firstEntrySeconds)}</td><td>{formatTime(row.lastExitSeconds)}</td><td><strong>{formatDuration(row.officeSeconds, true)}</strong></td><td>{formatDuration(row.spanSeconds, true)}</td><td>{row.punchCount}</td><td><span className={`status-pill ${row.complete ? 'paid' : 'pending'}`}>{row.status || (row.complete ? 'Complete' : 'Incomplete')}</span></td></tr>)}
        </tbody></table></div>
      </section>
    </>}
  </Shell>
}

const readWorkbook = async (file) => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' })
    try {
      const rows = parseAttendanceSheet(matrix)
      if (rows.length) return rows
    } catch { /* Try the next sheet before reporting a generic format error. */ }
  }
  throw new Error('No supported attendance table was found in the workbook.')
}



