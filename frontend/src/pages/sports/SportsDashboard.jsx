import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { ActionRow, Shell, SummaryGrid } from '../DashboardRouter'

export const SportsDashboard = () => {
  const { currentAccount } = useAuthStore()
  const isSportsAdmin = ['OWNER', 'ADMIN', 'TREASURER'].includes(currentAccount?.role)
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([sportsAPI.getMembers(), sportsAPI.getEvents(), sportsAPI.getExpenses()])
      .then(([memberResponse, eventResponse, expenseResponse]) => {
        setMembers(memberResponse.data || [])
        setEvents(eventResponse.data || [])
        setExpenses(expenseResponse.data || [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sports dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => ({
    members: members.length,
    events: events.length,
    activeEvents: events.filter((event) => event.status === 'ACTIVE').length,
    collected: events.reduce((sum, event) => sum + Number(event.collectedAmount || 0), 0),
    expenses: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    balance: events.reduce((sum, event) => sum + Number(event.balanceAmount || 0), 0)
  }), [members, events, expenses])

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Module" eyebrow="Sports"><p className="muted">Sports module is available for sports accounts.</p></Shell>
  }

  return (
    <Shell title="Sports Management" eyebrow="Sports module" actions={isSportsAdmin ? <Link className="button-link" to="/sports/events">Add Event</Link> : null}>
      <SummaryGrid items={[
        ['Members', summary.members],
        ['Events', summary.events],
        ['Active Events', summary.activeEvents],
        ['Collected', formatCurrency(summary.collected)],
        ['Expenses', formatCurrency(summary.expenses)],
        ['Balance', formatCurrency(summary.balance)]
      ]} />
      <ActionRow actions={(isSportsAdmin ? [
        ['Members', '/sports/members'],
        ['Events', '/sports/events'],
        ['Expenses', '/sports/expenses'],
        ['Collections', '/sports/collections'],
        ['Reports', '/sports/reports']
      ] : [
        ['Events', '/sports/events'],
        ['Collections', '/sports/collections'],
        ['Reports', '/sports/reports']
      ])} />
      {loading && <p className="muted">Loading sports dashboard...</p>}
    </Shell>
  )
}
