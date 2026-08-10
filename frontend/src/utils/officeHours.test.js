import { describe, expect, it } from 'vitest'
import { calculatePunchHours, formatDuration, parseAttendanceSheet, parseAttendanceText } from './officeHours'

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

  it('extracts rows from pasted table text', () => {
    const rows = parseAttendanceText(`Employee ID Date Machine Direction Time
14693 06 Aug 2026 Gandhinagar Entrance Entry 02:34:41 PM
14693 06 Aug 2026 Gandhinagar Reception Exit 08:31:25 PM`)
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('05:56:44')
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


  it('reads vertically pasted attendance row blocks', () => {
    const rows = parseAttendanceText(`Employee ID
Date
Machine Name
Direction
Time
14693
10 Aug 2026
Gandhinagar Reception
Entry
02:57:03 PM
14693
10 Aug 2026
Gandhinagar Reception
Exit
04:40:10 PM`)
    expect(rows[0].employeeId).toBe('14693')
    expect(rows[0].punchCount).toBe(2)
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('01:43:07')
  })

  it('calculates an open entry through the current time on the same day', () => {
    const rows = calculatePunchHours([
      { employeeId: '14693', date: '10 Aug 2026', direction: 'Entry', time: '02:57:03 PM' },
      { employeeId: '14693', date: '10 Aug 2026', direction: 'Exit', time: '04:40:10 PM' },
      { employeeId: '14693', date: '10 Aug 2026', direction: 'Entry', time: '05:18:19 PM' }
    ], new Date(2026, 7, 10, 18, 18, 19))
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('02:43:07')
    expect(formatDuration(rows[0].spanSeconds, true)).toBe('03:21:16')
    expect(rows[0]).toMatchObject({ status: 'Working now', complete: false })
  })

  it('treats a cafeteria machine punch as an exit', () => {
    const rows = parseAttendanceText(`14693
10 Aug 2026
Gandhinagar Reception
Entry
01:00:00 PM
14693
10 Aug 2026
Gandhinagar 2nd Floor Fire (Cafeteria) Door
Entry
01:36:44 PM`)
    expect(formatDuration(rows[0].officeSeconds, true)).toBe('00:36:44')
    expect(rows[0].complete).toBe(true)
  })
})






