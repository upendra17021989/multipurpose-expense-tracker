import { describe, expect, it } from 'vitest'
import { calculatePunchHours, formatDuration, parseAttendanceOcrColumns, parseAttendanceOcrText, parseAttendanceSheet } from './officeHours'

describe('office hours calculation', () => {
  it('calculates the attached raw punch example', () => {
    const rows = calculatePunchHours([
      { employeeId: '14693', date: '06 Aug 2026', direction: 'Entry', time: '02:34:41 PM' },
      { employeeId: '14693', date: '06 Aug 2026', direction: 'Entry', time: '02:34:50 PM' },
      { employeeId: '14693', date: '06 Aug 2026', direction: 'Exit', time: '08:31:25 PM' },
      { employeeId: '14693', date: '06 Aug 2026', direction: 'Exit', time: '08:31:35 PM' }
    ])
    expect(rows).toHaveLength(1)
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('05:56:54')
    expect(formatDuration(rows[0].spanSeconds, true)).toBe('05:56:54')
  })

  it('reads the summary workbook format and prefers actual swipe hours', () => {
    const rows = parseAttendanceSheet([
      ['Employee ID', 'Employee Name', 'Date', 'In Time', 'Out Time', 'Total Working Hours - Swipes', 'Actual Working Hours - Swipes (A)', 'Status'],
      ['$14693', 'Upendrapratap Singh', '03-Aug-2026', '2:38PM', '8:42PM', '6:04', '5:23', 'Present']
    ])
    expect(rows[0]).toMatchObject({ employeeId: '14693', officeSeconds: 19380, spanSeconds: 21840, complete: true })
  })

  it('extracts rows from OCR text', () => {
    const rows = parseAttendanceOcrText(`Employee ID Date Machine Direction Time
14693 06 Aug 2026 Gandhinagar Entrance Entry 02:34:41 PM
14693 06 Aug 2026 Gandhinagar Reception Exit 08:31:25 PM`)
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('05:56:44')
  })

  it('extracts the attached image from column OCR output', () => {
    const rows = parseAttendanceOcrColumns({
      employeeIds: '14693\n\n14693\n\n14693\n\n14693',
      dates: '06 Aug\n\n2026\n\n06 Aug\n\n2026\n\n06 Aug\n\n2026\n\n06 Aug\n\n2026',
      directions: 'Entry\n\nEntry\n\nExit\n\nExit',
      times: '02:34:41\n\nPM\n\n023450\n\nPM\n\n083125\n\nPM\n\n083135\n\nPM'
    })
    expect(rows[0].employeeId).toBe('14693')
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('05:56:54')
    expect(formatDuration(rows[0].spanSeconds, true)).toBe('05:56:54')
  })

  it('groups duplicate door punches into complete office sessions', () => {
    const rows = calculatePunchHours([
      ['Entry', '1:08:42 PM'], ['Entry', '1:08:56 PM'], ['Exit', '4:00:36 PM'], ['Exit', '4:01:08 PM'],
      ['Entry', '4:47:51 PM'], ['Entry', '4:48:06 PM'], ['Exit', '8:26:18 PM'], ['Exit', '8:26:27 PM'],
      ['Entry', '10:00:00 PM']
    ].map(([direction, time]) => ({ employeeId: '14693', date: '04-Aug-2026', direction, time })))
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('06:31:02')
    expect(rows[0].complete).toBe(false)
  })

  it('fills a consistently wrapped date when OCR only recognizes it once', () => {
    const rows = parseAttendanceOcrColumns({
      employeeIds: '14693\n14693\n14693',
      dates: '04-Aug-\n2026',
      directions: 'Entry\nExit\nEntry',
      times: '01:08:42 PM\n04:01:08 PM\n10:00:00 PM'
    })
    expect(rows[0].date).toBe('2026-08-04')
    expect(rows[0].punchCount).toBe(3)
  })
})
