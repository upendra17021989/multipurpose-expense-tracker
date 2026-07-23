import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { ActionRow, Shell, SummaryGrid } from '../DashboardRouter'

export const SportsDashboard = () => {
  const { currentAccount } = useAuthStore()
  const isSportsAdmin = ['OWNER', 'ADMIN', 'TREASURER'].includes(currentAccount?.role)
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [expenses, setExpenses] = useState([])
  const [collectionSummaries, setCollectionSummaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    Promise.all([sportsAPI.getMembers(), sportsAPI.getEvents(), sportsAPI.getExpenses()])
      .then(([memberResponse, eventResponse, expenseResponse]) => {
        const eventRows = eventResponse.data || []
        setMembers(memberResponse.data || [])
        setEvents(eventRows)
        setExpenses(expenseResponse.data || [])
        return Promise.all(eventRows.map((event) => sportsAPI.getCollectionSummary(event.id).then((response) => response.data).catch(() => null)))
      })
      .then((summaries) => setCollectionSummaries((summaries || []).filter(Boolean)))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sports dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => {
    const sum = (rows, field) => rows.reduce((total, row) => total + Number(row[field] || 0), 0)
    const collected = sum(collectionSummaries, 'totalCollected')
    const expenseTotal = sum(expenses, 'amount')
    return {
      members: members.length,
      events: events.length,
      activeEvents: events.filter((event) => event.status === 'ACTIVE').length,
      expected: sum(collectionSummaries, 'totalExpected'),
      collected,
      pending: sum(collectionSummaries, 'totalPending'),
      pendingMembers: sum(collectionSummaries, 'pendingMembers') + sum(collectionSummaries, 'partialMembers'),
      expenses: expenseTotal,
      balance: collected - expenseTotal
    }
  }, [members, events, expenses, collectionSummaries])

  const eventRows = useMemo(() => events.map((event) => {
    const collections = collectionSummaries.find((item) => String(item.sportsEventId) === String(event.id)) || {}
    const eventExpenses = expenses.filter((expense) => String(expense.sportsEventId || '') === String(event.id)).reduce((total, expense) => total + Number(expense.amount || 0), 0)
    return { ...event, expected: collections.totalExpected || 0, collected: collections.totalCollected || 0, pending: collections.totalPending || 0, pendingMembers: Number(collections.pendingMembers || 0) + Number(collections.partialMembers || 0), expenseTotal: eventExpenses, balance: Number(collections.totalCollected || 0) - eventExpenses }
  }), [events, collectionSummaries, expenses])

  const recentExpenses = useMemo(() => [...expenses].sort((a, b) => String(b.expenseDate || '').localeCompare(String(a.expenseDate || ''))).slice(0, 5), [expenses])
  const collectionRate = summary.expected ? Math.min(100, Math.round((summary.collected / summary.expected) * 100)) : 0
  const featuredEvent = eventRows.find((event) => event.status === 'ACTIVE') || eventRows[0]

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Module" eyebrow="Sports"><p className="muted">Sports module is available for sports accounts.</p></Shell>
  }

  return (
    <Shell title="Sports Management" eyebrow="Sports module" actions={isSportsAdmin ? <Link className="button-link" to="/sports/events">Add Event</Link> : null}>
      <section className="sports-mobile-overview" aria-label="Sports overview">
        <div className="sports-mobile-balance">
          <div>
            <span>Available balance</span>
            <strong>{formatCurrency(summary.balance)}</strong>
          </div>
          <div className="sports-rate-badge" aria-label={`${collectionRate}% collected`}>{collectionRate}%</div>
        </div>
        <div className="sports-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={collectionRate}>
          <span style={{ width: `${collectionRate}%` }} />
        </div>
        <div className="sports-mobile-metrics">
          <div><strong>{summary.activeEvents}</strong><span>Active events</span></div>
          <div><strong>{summary.members}</strong><span>Members</span></div>
          <div><strong>{formatCurrency(summary.pending)}</strong><span>Pending</span></div>
          <div><strong>{summary.pendingMembers}</strong><span>Members due</span></div>
        </div>
        {featuredEvent && (
          <Link className="sports-featured-event" to={`/sports/collections?eventId=${featuredEvent.id}`}>
            <span><small>{featuredEvent.status === 'ACTIVE' ? 'Active now' : 'Latest event'}</small><strong>{featuredEvent.eventName}</strong></span>
            <span aria-hidden="true">View →</span>
          </Link>
        )}
      </section>
      <div className="sports-desktop-summary"><SummaryGrid items={[
        ['Members', summary.members],
        ['Events', summary.events],
        ['Active Events', summary.activeEvents],
        ['Expected', formatCurrency(summary.expected)],
        ['Collected', formatCurrency(summary.collected)],
        ['Pending', formatCurrency(summary.pending)],
        ['Members Pending', summary.pendingMembers],
        ['Expenses', formatCurrency(summary.expenses)],
        ['Balance', formatCurrency(summary.balance)]
      ]} /></div>
      <div className="sports-dashboard-actions"><ActionRow actions={[
        ['Members', '/sports/members'],
        ['Events', '/sports/events'],
        ['Expenses', '/sports/expenses'],
        ['Collections', '/sports/collections'],
        ['Reports', '/sports/reports']
      ]} /></div>
      <button className="sports-details-toggle" type="button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} aria-controls="sports-dashboard-details">
        {showDetails ? 'Hide dashboard details' : 'View dashboard details'} <span aria-hidden="true">{showDetails ? '↑' : '↓'}</span>
      </button>
      <div id="sports-dashboard-details" className={`sports-dashboard-details${showDetails ? ' is-open' : ''}`}>
      <section className="report-grid">
        <article className="report-panel">
          <h2>Collection Overview</h2>
          <SummaryGrid items={[[ 'Collection Rate', `${collectionRate}%` ], [ 'Still Pending', formatCurrency(summary.pending) ], [ 'Available Balance', formatCurrency(summary.balance) ]]} />
          <p className="muted">Across {summary.events} events and {summary.members} members.</p>
        </article>
        <article className="report-panel">
          <h2>Recent Expenses</h2>
          {recentExpenses.map((expense) => <p key={expense.id}><strong>{formatCurrency(expense.amount)}</strong> · {expense.category} · {expense.eventName || 'No event'} <span className="muted">({formatDate(expense.expenseDate)})</span></p>)}
          {!recentExpenses.length && <p className="empty-state">No expenses recorded.</p>}
        </article>
      </section>
      <div className="table-wrap sports-dashboard-table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Status</th><th className="numeric">Expected</th><th className="numeric">Collected</th><th className="numeric">Pending</th><th className="numeric">Expenses</th><th className="numeric">Balance</th><th>Pending Members</th></tr></thead>
          <tbody>
            {eventRows.map((event) => <tr key={event.id}><td><Link to={`/sports/collections?eventId=${event.id}`}>{event.eventName} ({event.year})</Link></td><td><span className={`status-pill ${String(event.status).toLowerCase()}`}>{event.status}</span></td><td className="numeric">{formatCurrency(event.expected)}</td><td className="numeric">{formatCurrency(event.collected)}</td><td className="numeric">{formatCurrency(event.pending)}</td><td className="numeric">{formatCurrency(event.expenseTotal)}</td><td className="numeric">{formatCurrency(event.balance)}</td><td>{event.pendingMembers}</td></tr>)}
            {!loading && !eventRows.length && <tr><td colSpan="8" className="empty-state">No events available yet.</td></tr>}
          </tbody>
        </table>
      </div>
      </div>
      {loading && <p className="muted">Loading sports dashboard...</p>}
    </Shell>
  )
}
