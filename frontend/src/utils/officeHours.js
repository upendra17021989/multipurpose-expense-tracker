const DATE_MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
}

const cleanHeader = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const cleanEmployeeId = (value) => String(value || '').replace(/^\$/, '').trim()

export const parseDuration = (value) => {
  const match = String(value || '').trim().match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0)
}

export const formatDuration = (seconds, includeSeconds = false) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return includeSeconds
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export const parseTime = (value) => {
  const match = String(value || '').trim().replace(/\s+/g, '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(AM|PM)?$/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] || 0)
  if (hour > 23 || minute > 59 || second > 59 || (match[4] && (hour < 1 || hour > 12))) return null
  if (match[4]) {
    if (hour === 12) hour = 0
    if (match[4].toUpperCase() === 'PM') hour += 12
  }
  return hour * 3600 + minute * 60 + second
}

export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '-'
  const normalized = ((seconds % 86400) + 86400) % 86400
  const hour = Math.floor(normalized / 3600)
  const minute = Math.floor((normalized % 3600) / 60)
  const second = Math.floor(normalized % 60)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

export const parseDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return localDate(value)
  const source = String(value || '').trim()
  let match = source.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (match) return validDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  match = source.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{4})$/)
  if (match) return validDate(Number(match[3]), DATE_MONTHS[match[2].slice(0, 3).toLowerCase()], Number(match[1]))
  match = source.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (match) return validDate(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  return ''
}

const validDate = (year, month, day) => {
  if (!Number.isInteger(month)) return ''
  const date = new Date(year, month, day)
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? localDate(date) : ''
}

const localDate = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()]
  .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('-')

const columnIndex = (headers, patterns) => headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)))

export const parseAttendanceSheet = (matrix) => {
  const rows = (matrix || []).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim()))
  if (!rows.length) throw new Error('The workbook does not contain attendance rows.')
  const headerRowIndex = rows.findIndex((row) => row.some((cell) => /employee\s*id/i.test(String(cell || ''))))
  if (headerRowIndex < 0) throw new Error('Employee ID header was not found.')
  const headers = rows[headerRowIndex].map(cleanHeader)
  const indexes = {
    employeeId: columnIndex(headers, [/^employee id$/, /^emp(?:loyee)? id$/, /^employee code$/]),
    employeeName: columnIndex(headers, [/employee name/, /^name$/]),
    machineName: columnIndex(headers, [/machine name/, /^machine$/, /device name/, /terminal name/]),
    date: columnIndex(headers, [/^date$/, /attendance date/]),
    direction: columnIndex(headers, [/direction/, /entry exit/, /in out/]),
    time: columnIndex(headers, [/^time$/, /punch time/, /swipe time/]),
    inTime: columnIndex(headers, [/^in time$/, /first in/]),
    outTime: columnIndex(headers, [/^out time$/, /last out/]),
    actualSwipe: columnIndex(headers, [/actual working hours swipes/, /actual working hours swipe/]),
    totalSwipe: columnIndex(headers, [/total working hours swipes/]),
    status: columnIndex(headers, [/^status$/])
  }
  if (indexes.employeeId < 0 || indexes.date < 0) throw new Error('Employee ID and Date columns are required.')

  const dataRows = rows.slice(headerRowIndex + 1)
  if (indexes.direction >= 0 && indexes.time >= 0) {
    const punches = dataRows.map((row) => ({
      employeeId: cleanEmployeeId(row[indexes.employeeId]),
      employeeName: indexes.employeeName >= 0 ? String(row[indexes.employeeName] || '').trim() : '',
      machineName: indexes.machineName >= 0 ? String(row[indexes.machineName] || '').trim() : '',
      date: parseDate(row[indexes.date]),
      direction: String(row[indexes.direction] || '').trim(),
      time: String(row[indexes.time] || '').trim()
    })).filter((row) => row.employeeId && row.date && /^(entry|exit|in|out)$/i.test(row.direction) && parseTime(row.time) !== null)
    return calculatePunchHours(punches)
  }

  if (indexes.inTime < 0 && indexes.outTime < 0) throw new Error('Expected Direction/Time or In Time/Out Time columns.')
  return dataRows.map((row) => summaryRow(row, indexes)).filter(Boolean)
}

const summaryRow = (row, indexes) => {
  const employeeId = cleanEmployeeId(row[indexes.employeeId])
  const date = parseDate(row[indexes.date])
  if (!employeeId || !date) return null
  const firstEntrySeconds = indexes.inTime >= 0 ? parseTime(row[indexes.inTime]) : null
  const lastExitSeconds = indexes.outTime >= 0 ? parseTime(row[indexes.outTime]) : null
  let spanSeconds = firstEntrySeconds !== null && lastExitSeconds !== null ? lastExitSeconds - firstEntrySeconds : null
  if (spanSeconds !== null && spanSeconds < 0) spanSeconds += 86400
  const reportedActual = indexes.actualSwipe >= 0 ? parseDuration(row[indexes.actualSwipe]) : null
  const reportedTotal = indexes.totalSwipe >= 0 ? parseDuration(row[indexes.totalSwipe]) : null
  return {
    employeeId,
    employeeName: indexes.employeeName >= 0 ? String(row[indexes.employeeName] || '').trim() : '',
    date,
    firstEntrySeconds,
    lastExitSeconds,
    officeSeconds: reportedActual ?? spanSeconds,
    spanSeconds: reportedTotal ?? spanSeconds,
    punchCount: firstEntrySeconds !== null || lastExitSeconds !== null ? Number(firstEntrySeconds !== null) + Number(lastExitSeconds !== null) : 0,
    status: indexes.status >= 0 ? String(row[indexes.status] || '').trim() : '',
    complete: firstEntrySeconds !== null && lastExitSeconds !== null
  }
}

export const calculatePunchHours = (punches, now = new Date()) => {
  const currentDate = localDate(now)
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const grouped = new Map()
  punches.forEach((punch) => {
    const employeeId = cleanEmployeeId(punch.employeeId)
    const date = parseDate(punch.date)
    const seconds = parseTime(punch.time)
    if (!employeeId || !date || seconds === null) return
    const key = `${employeeId}|${date}`
    if (!grouped.has(key)) grouped.set(key, { employeeId, employeeName: punch.employeeName || '', date, punches: [] })
    const isEntry = /^(entry|in)$/i.test(punch.direction)
const isCafeteria = /cafeteria/i.test(String(punch.machineName || ''))

grouped.get(key).punches.push({
  direction: isCafeteria
    ? (isEntry ? 'EXIT' : 'ENTRY')
    : (isEntry ? 'ENTRY' : 'EXIT'),
  seconds
})
  })

  return [...grouped.values()].map((group) => {
    const ordered = group.punches.sort((a, b) => a.seconds - b.seconds)
    const consolidated = ordered.reduce((result, punch) => {
  const previous = result[result.length - 1]

  if (
    previous?.direction === punch.direction &&
    punch.seconds - previous.seconds <= 60
  ) {
    // Keep the first nearby entry and the last nearby exit.
    if (punch.direction === 'EXIT') {
      previous.seconds = punch.seconds
    }
  } else {
    result.push({ ...punch })
  }

  return result
}, [])
    let openEntry = null
    let pendingExit = null
    let officeSeconds = 0
    let pairs = 0
    consolidated.forEach((punch) => {
      if (punch.direction === 'ENTRY') {
        if (openEntry !== null && pendingExit !== null) {
          officeSeconds += pendingExit - openEntry
          pairs += 1
        }
        openEntry = openEntry === null || pendingExit !== null ? punch.seconds : Math.min(openEntry, punch.seconds)
        pendingExit = null
      } else if (openEntry !== null && punch.seconds >= openEntry) {
        if (pendingExit === null) pendingExit = punch.seconds
      }
    })
    if (openEntry !== null && pendingExit !== null) {
      officeSeconds += pendingExit - openEntry
      pairs += 1
      openEntry = null
    }
    const entries = consolidated.filter((punch) => punch.direction === 'ENTRY').map((punch) => punch.seconds)
    const exits = consolidated.filter((punch) => punch.direction === 'EXIT').map((punch) => punch.seconds)
    const firstEntrySeconds = entries.length ? Math.min(...entries) : null
    const isWorkingNow = openEntry !== null && group.date === currentDate && currentSeconds >= openEntry
    if (isWorkingNow) officeSeconds += currentSeconds - openEntry
    const lastExitSeconds = isWorkingNow ? currentSeconds : (exits.length ? Math.max(...exits) : null)
    let spanSeconds = firstEntrySeconds !== null && lastExitSeconds !== null ? lastExitSeconds - firstEntrySeconds : null
    if (spanSeconds !== null && spanSeconds < 0) spanSeconds += 86400
    return { ...group, firstEntrySeconds, lastExitSeconds, officeSeconds: pairs || isWorkingNow ? officeSeconds : spanSeconds, spanSeconds, punchCount: ordered.length, status: isWorkingNow ? 'Working now' : '', complete: pairs > 0 && openEntry === null }
  }).sort((a, b) => a.date.localeCompare(b.date) || a.employeeId.localeCompare(b.employeeId))
}

export const parseAttendanceText = (text) => {
  const normalized = String(text || '')
    .replace(/[|]/g, ' ')
    .replace(/\bEn(?:t|l)ry\b/gi, 'Entry')
    .replace(/\bEx(?:i|l)t\b/gi, 'Exit')
  const pattern = /\$?(\d{3,})\s+(\d{1,2}[\s/-]+[A-Za-z]{3,9}[\s/-]+\d{4})\s+([\s\S]*?)\b(Entry|Exit|In|Out)\b[\s\S]*?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/gi
  const punches = []
  let match
  while ((match = pattern.exec(normalized)) !== null) {
    punches.push({ employeeId: match[1], date: match[2], machineName: match[3].trim(), direction: match[4], time: match[5] })
    const nextEmployee = normalized.slice(pattern.lastIndex).search(/\$?\d{3,}\s+\d{1,2}[\s/-]+[A-Za-z]{3}/)
    if (nextEmployee >= 0) pattern.lastIndex += nextEmployee
  }
  if (!punches.length) throw new Error('No attendance rows were found. Paste rows containing Employee ID, Date, Direction and Time.')
  return calculatePunchHours(punches)
}

export const officeHoursSummary = (rows) => ({
  totalSeconds: rows.reduce((sum, row) => sum + (row.officeSeconds || 0), 0),
  completeDays: rows.filter((row) => row.complete).length,
  incompleteDays: rows.filter((row) => !row.complete && row.punchCount > 0).length,
  employees: new Set(rows.map((row) => row.employeeId)).size
})





