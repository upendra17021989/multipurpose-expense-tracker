import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { exportWorkbook, numberValue } from '../../utils/exportExcel'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const SportsReports = () => {
  const { currentAccount } = useAuthStore()
  const [events, setEvents] = useState([])
  const [collections, setCollections] = useState([])
  const [expenses, setExpenses] = useState([])
  const [selectedEventIds, setSelectedEventIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentAccount?.accountType !== 'SPORTS') return setLoading(false)
    Promise.all([sportsAPI.getEvents(), sportsAPI.getExpenses()])
      .then(([eventResponse, expenseResponse]) => {
        const eventRows = eventResponse.data || []
        setEvents(eventRows)
        setExpenses(expenseResponse.data || [])
        setSelectedEventIds(eventRows.map((event) => String(event.id)))
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sports reports'))
      .finally(() => setLoading(false))
  }, [currentAccount?.accountType])

  useEffect(() => {
    if (!selectedEventIds.length) return setCollections([])
    setLoading(true)
    Promise.all(selectedEventIds.map((eventId) => sportsAPI.getCollections(eventId)))
      .then((responses) => setCollections(responses.flatMap((response) => response.data || [])))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load event collections'))
      .finally(() => setLoading(false))
  }, [selectedEventIds])

  const report = useMemo(() => {
    const selected = new Set(selectedEventIds)
    const eventExpenses = expenses.filter((expense) => selected.has(String(expense.sportsEventId || '')))
    const memberMap = new Map()
    collections.forEach((row) => {
      const key = String(row.sportsMemberId || row.memberName)
      const current = memberMap.get(key) || { sportsMemberId: row.sportsMemberId, memberName: row.memberName, mobile: row.mobile, eventIds: new Set(), expectedAmount: 0, collectedAmount: 0, pendingAmount: 0, excessAmount: 0, refundedAmount: 0 }
      current.eventIds.add(String(row.sportsEventId))
      ;['expectedAmount', 'collectedAmount', 'pendingAmount', 'excessAmount', 'refundedAmount'].forEach((field) => { current[field] += numberValue(row[field]) })
      memberMap.set(key, current)
    })
    const memberTotals = [...memberMap.values()].map((row) => ({ ...row, eventCount: row.eventIds.size })).sort((a, b) => a.memberName.localeCompare(b.memberName))
    const pendingMembers = memberTotals.filter((row) => row.pendingAmount > 0)
    const sum = (rows, field) => rows.reduce((total, row) => total + numberValue(row[field]), 0)
    return {
      eventExpenses,
      memberTotals,
      pendingMembers,
      expected: sum(collections, 'expectedAmount'),
      collected: sum(collections, 'collectedAmount'),
      pending: sum(collections, 'pendingAmount'),
      excess: sum(collections, 'excessAmount'),
      expenseTotal: sum(eventExpenses, 'amount')
    }
  }, [collections, expenses, selectedEventIds])

  const allSelected = events.length > 0 && selectedEventIds.length === events.length
  const reportTitle = allSelected ? 'All Events' : `${selectedEventIds.length} Selected Events`
  const fileName = `sports-report-${allSelected ? 'all-events' : `${selectedEventIds.length}-events`}`

  const toggleEvent = (eventId) => setSelectedEventIds((current) => current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId])

  const exportExcel = () => exportWorkbook([
    { name: 'Summary', rows: [
      { Metric: 'Expected', Amount: report.expected }, { Metric: 'Collected', Amount: report.collected },
      { Metric: 'Pending', Amount: report.pending }, { Metric: 'Excess', Amount: report.excess },
      { Metric: 'Event Expenses', Amount: report.expenseTotal }, { Metric: 'Balance', Amount: report.collected - report.expenseTotal }
    ] },
    { name: 'Member Totals', rows: report.memberTotals.map(memberTotalRow) },
    { name: 'Collections', rows: collections.map((row) => ({ Event: row.eventName, ...collectionRow(row) })) },
    { name: 'Pending Members', rows: report.pendingMembers.map(collectionRow) },
    { name: 'Event Expenses', rows: report.eventExpenses.map((expense) => ({
      Date: expense.expenseDate, Category: expense.category, Description: expense.description || '',
      Vendor: expense.vendorName || '', PaymentMode: expense.paymentMode, Status: expense.status, Amount: numberValue(expense.amount)
    })) }
  ], fileName)

  if (currentAccount?.accountType !== 'SPORTS') return <Shell title="Sports Reports" eyebrow="Sports"><p className="muted">Sports reports are available for sports accounts.</p></Shell>

  return (
    <Shell title="Sports Reports" eyebrow="Sports module" actions={<><button onClick={exportExcel} disabled={!selectedEventIds.length}>Export Excel</button><button className="primary" onClick={() => window.print()} disabled={!selectedEventIds.length}>Export PDF</button></>}>
      <section className="toolbar-panel flat-toolbar no-print">
        <button type="button" onClick={() => setSelectedEventIds(events.map((event) => String(event.id)))}>Select All</button>
        <button type="button" onClick={() => setSelectedEventIds([])}>Clear</button>
        {events.map((event) => <label key={event.id}><input type="checkbox" checked={selectedEventIds.includes(String(event.id))} onChange={() => toggleEvent(String(event.id))} /> {event.eventName} ({event.year})</label>)}
      </section>
      {!!selectedEventIds.length && <h2 className="report-print-title">{reportTitle}</h2>}
      <SummaryGrid items={[[ 'Expected', formatCurrency(report.expected) ], [ 'Collected', formatCurrency(report.collected) ], [ 'Pending', formatCurrency(report.pending) ], [ 'Event Expenses', formatCurrency(report.expenseTotal) ], [ 'Balance', formatCurrency(report.collected - report.expenseTotal) ], [ 'Pending Members', report.pendingMembers.length ]]} />
      <ReportTable title="Total Collections by Member" columns={['Member', 'Mobile', 'Events', 'Expected', 'Collected', 'Pending', 'Excess']} rows={report.memberTotals.map((row) => [row.memberName, row.mobile || '-', row.eventCount, formatCurrency(row.expectedAmount), formatCurrency(row.collectedAmount), formatCurrency(row.pendingAmount), formatCurrency(row.excessAmount)])} />
      <ReportTable title="Event-wise Collection Detail" columns={['Event', 'Member', 'Expected', 'Collected', 'Pending', 'Status']} rows={collections.map((row) => [row.eventName, row.memberName, formatCurrency(row.expectedAmount), formatCurrency(row.collectedAmount), formatCurrency(row.pendingAmount), row.paymentStatus])} />
      <ReportTable title="Pending-member Report" columns={['Member', 'Mobile', 'Expected', 'Collected', 'Pending']} rows={report.pendingMembers.map((row) => [row.memberName, row.mobile || '-', formatCurrency(row.expectedAmount), formatCurrency(row.collectedAmount), formatCurrency(row.pendingAmount)])} />
      <ReportTable title="Event Expense Report" columns={['Date', 'Category', 'Description', 'Vendor', 'Payment', 'Amount']} rows={report.eventExpenses.map((row) => [formatDate(row.expenseDate), row.category, row.description || '-', row.vendorName || '-', row.paymentMode, formatCurrency(row.amount)])} />
      {!selectedEventIds.length && !loading && <p className="empty-state">Select one or more events to generate reports.</p>}
      {loading && <p className="muted">Loading reports...</p>}
    </Shell>
  )
}

const collectionRow = (row) => ({ Member: row.memberName, Mobile: row.mobile || '', Expected: numberValue(row.expectedAmount), Collected: numberValue(row.collectedAmount), Pending: numberValue(row.pendingAmount), Excess: numberValue(row.excessAmount), Refunded: numberValue(row.refundedAmount), Status: row.paymentStatus })

const memberTotalRow = (row) => ({ Member: row.memberName, Mobile: row.mobile || '', Events: row.eventCount, Expected: row.expectedAmount, Collected: row.collectedAmount, Pending: row.pendingAmount, Excess: row.excessAmount, Refunded: row.refundedAmount })

const ReportTable = ({ title, columns, rows }) => <section className="report-panel sports-report-section"><h2>{title}</h2><div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={columns.length} className="empty-state">No data available.</td></tr>}</tbody></table></div></section>
