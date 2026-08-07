import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuthStore } from '../../store/authStore'
import { exportWorkbook } from '../../utils/exportExcel'
import { formatDate } from '../../utils/format'
import { formatDuration, formatTime, officeHoursSummary, parseAttendanceOcrColumns, parseAttendanceOcrText, parseAttendanceSheet } from '../../utils/officeHours'
import { Shell, SummaryGrid } from '../DashboardRouter'

const ACCEPTED_EXTENSIONS = /\.(xlsx?|png|jpe?g|webp)$/i

export const OfficeHours = () => {
  const currentAccount = useAuthStore((state) => state.currentAccount)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState('')
  const summary = useMemo(() => officeHoursSummary(rows), [rows])

  const readFile = async (file) => {
    if (!file) return
    if (!ACCEPTED_EXTENSIONS.test(file.name)) return toast.error('Choose an .xls, .xlsx, .png, .jpg or .webp file')
    if (file.size > 10 * 1024 * 1024) return toast.error('File must be 10 MB or smaller')
    setProcessing(true)
    setRows([])
    setFileName(file.name)
    try {
      const parsed = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)
        ? await readImage(file, setOcrProgress)
        : await readWorkbook(file)
      setRows(parsed)
      toast.success(`${parsed.length} attendance day${parsed.length === 1 ? '' : 's'} calculated`)
    } catch (error) {
      toast.error(error.message || 'Unable to read attendance data')
    } finally {
      setProcessing(false)
      setOcrProgress('')
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
      <div className="personal-panel-heading"><div><h2>Import attendance data</h2><p>Upload an Excel attendance report or a clear screenshot containing Employee ID, Date, Direction and Time.</p></div></div>
      <label className="import-dropzone">
        <strong>{processing ? (ocrProgress || 'Reading attendance data...') : 'Choose Excel or image file'}</strong>
        <span>.xls, .xlsx, .png, .jpg or .webp, up to 10 MB</span>
        <input type="file" accept=".xls,.xlsx,.png,.jpg,.jpeg,.webp" disabled={processing} onChange={(event) => readFile(event.target.files?.[0])} />
      </label>
      {fileName && <p className="office-hours-file"><strong>Source:</strong> {fileName}</p>}
      <p className="muted office-hours-note">Office Hours sums matched Entry-to-Exit sessions. The first-to-last span includes time between the first entry and final exit. For summary reports, the report's Actual Working Hours - Swipes value is used when available.</p>
    </section>

    <section className="personal-dashboard-panel office-hours-samples">
      <div className="personal-panel-heading"><div><h2>Supported sample formats</h2><p>Your screenshot can include swipe numbers and extra columns, or only the core attendance columns.</p></div></div>
      <div className="office-hours-sample-grid">
        <figure>
          <div className="office-hours-sample-image six-column"><img src="/office-hours-samples/attendance-six-column.png" alt="Six-column attendance screenshot with employee ID values blurred, plus date, swipe number, machine, direction and time" /></div>
          <figcaption><strong>Swipe-detail format</strong><span>Employee ID, Date, Swipe Number, Machine, Direction and Time</span></figcaption>
        </figure>
        <figure>
          <div className="office-hours-sample-image five-column"><img src="/office-hours-samples/attendance-five-column.png" alt="Five-column attendance screenshot with employee ID values blurred, plus date, machine name, direction and time" /></div>
          <figcaption><strong>Core attendance format</strong><span>Employee ID, Date, Machine Name, Direction and Time</span></figcaption>
        </figure>
      </div>
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

const readImage = async (file, setProgress) => {
  const { createWorker, PSM } = await import('tesseract.js')
  const worker = await createWorker('eng', undefined, { logger: (message) => {
    if (message.status === 'recognizing text') setProgress(`Reading image... ${Math.round((message.progress || 0) * 100)}%`)
  } })
  try {
    const image = await createImageBitmap(file)
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' })
    const grid = detectTableGrid(image)
    const top = grid.dataTop
    const height = Math.max(1, image.height - top - 2)
    const bounds = grid.columns
    const dataColumns = bounds.length >= 6
      ? [bounds[0], bounds[1], bounds[4], bounds[5]]
      : [bounds[0], bounds[1], bounds[3], bounds[4]]
    const columns = [
      ['employeeIds', '0123456789'],
      ['dates', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/.'],
      ['directions', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'],
      ['times', '0123456789: .AMPamp']
    ].map(([key, whitelist], index) => [key, whitelist, ...dataColumns[index]])
    const recognized = {}
    for (let index = 0; index < columns.length; index += 1) {
      const [key, whitelist, left, width] = columns[index]
      setProgress(`Reading table column ${index + 1} of ${columns.length}...`)
      await worker.setParameters({ tessedit_char_whitelist: whitelist })
      const result = await worker.recognize(file, { rectangle: {
        left,
        top,
        width,
        height
      } })
      recognized[key] = result.data?.text || ''
    }
    image.close()
    try {
      return parseAttendanceOcrColumns(recognized)
    } catch {
      await worker.setParameters({ tessedit_char_whitelist: '' })
      const result = await worker.recognize(file)
      return parseAttendanceOcrText(result.data?.text || '')
    }
  } finally {
    await worker.terminate()
  }
}

const detectTableGrid = (image) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, image.width, image.height).data
  const candidates = []
  for (let x = 0; x < image.width; x += 1) {
    let dark = 0
    for (let y = 0; y < image.height; y += 2) {
      const offset = (y * image.width + x) * 4
      if (pixels[offset] < 70 && pixels[offset + 1] < 70 && pixels[offset + 2] < 70) dark += 1
    }
    if (dark / Math.ceil(image.height / 2) > 0.55) candidates.push(x)
  }
  const lines = []
  candidates.forEach((x) => {
    if (!lines.length || x - lines[lines.length - 1] > 2) lines.push(x)
    else lines[lines.length - 1] = Math.round((lines[lines.length - 1] + x) / 2)
  })
  const columns = lines.slice(0, -1).map((line, index) => [line, Math.max(1, lines[index + 1] - line + 1)])
  const horizontalCandidates = []
  for (let y = 0; y < image.height; y += 1) {
    let dark = 0
    for (let x = 0; x < image.width; x += 2) {
      const offset = (y * image.width + x) * 4
      if (pixels[offset] < 70 && pixels[offset + 1] < 70 && pixels[offset + 2] < 70) dark += 1
    }
    if (dark / Math.ceil(image.width / 2) > 0.55) horizontalCandidates.push(y)
  }
  const horizontalLines = []
  horizontalCandidates.forEach((y) => {
    if (!horizontalLines.length || y - horizontalLines[horizontalLines.length - 1] > 2) horizontalLines.push(y)
    else horizontalLines[horizontalLines.length - 1] = Math.round((horizontalLines[horizontalLines.length - 1] + y) / 2)
  })
  const headerBottom = horizontalLines.find((y) => y > image.height * 0.05) || Math.round(image.height * 0.14)
  const fallbackColumns = [[Math.round(image.width * 0.02), Math.round(image.width * 0.23)], [Math.round(image.width * 0.255), Math.round(image.width * 0.135)], [Math.round(image.width * 0.395), Math.round(image.width * 0.21)], [Math.round(image.width * 0.61), Math.round(image.width * 0.215)], [Math.round(image.width * 0.825), Math.round(image.width * 0.16)]]
  return { columns: columns.length >= 5 ? columns : fallbackColumns, dataTop: Math.min(image.height - 1, headerBottom + 2) }
}
