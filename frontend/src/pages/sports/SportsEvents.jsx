import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)
const currentYear = new Date().getFullYear()
const initialForm = { eventName: '', year: currentYear, startDate: today, endDate: today, budgetAmount: '' }

export const SportsEvents = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(initialForm)
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(true)

  const loadEvents = () => {
    setLoading(true)
    sportsAPI.getEvents(year || undefined)
      .then((response) => setEvents(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load events'))
      .finally(() => setLoading(false))
  }

  useEffect(loadEvents, [year])

  const summary = useMemo(() => ({
    active: events.filter((event) => event.status === 'ACTIVE').length,
    budget: events.reduce((sum, event) => sum + Number(event.budgetAmount || 0), 0),
    collected: events.reduce((sum, event) => sum + Number(event.collectedAmount || 0), 0),
    expenses: events.reduce((sum, event) => sum + Number(event.totalExpense || 0), 0)
  }), [events])

  const submit = async (event) => {
    event.preventDefault()
    try {
      await sportsAPI.createEvent({ ...form, year: Number(form.year), budgetAmount: form.budgetAmount === '' ? null : Number(form.budgetAmount) })
      setForm(initialForm)
      toast.success('Event added')
      loadEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add event')
    }
  }

  const updateStatus = async (eventId, status) => {
    try {
      await sportsAPI.updateEventStatus(eventId, status)
      toast.success('Status updated')
      loadEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Status update failed')
    }
  }

  const remove = async (eventId) => {
    if (!window.confirm('Delete this event?')) return
    try {
      await sportsAPI.deleteEvent(eventId)
      toast.success('Event deleted')
      loadEvents()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Events" eyebrow="Sports"><p className="muted">Sports events are available for sports accounts.</p></Shell>
  }

  return (
    <Shell title="Sports Events" eyebrow="Sports module" actions={<Link className="button-link" to="/sports/collections">Collections</Link>}>
      <SummaryGrid items={[
        ['Events', events.length],
        ['Active', summary.active],
        ['Budget', formatCurrency(summary.budget)],
        ['Collected', formatCurrency(summary.collected)],
        ['Expenses', formatCurrency(summary.expenses)]
      ]} />
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Event name" value={form.eventName} onChange={(event) => setForm({ ...form, eventName: event.target.value })} required />
        <input type="number" min="2020" max="2100" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} required />
        <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
        <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
        <input type="number" min="0" step="0.01" placeholder="Budget" value={form.budgetAmount} onChange={(event) => setForm({ ...form, budgetAmount: event.target.value })} />
        <button className="primary" type="submit">Add Event</button>
      </form>
      <section className="toolbar-panel flat-toolbar">
        <input type="number" placeholder="Filter by year" value={year} onChange={(event) => setYear(event.target.value)} min="2020" max="2100" />
        <strong>{events.length} events</strong>
      </section>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Year</th><th>Dates</th><th className="numeric">Budget</th><th className="numeric">Collected</th><th className="numeric">Expense</th><th className="numeric">Balance</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {events.map((sportsEvent) => (
              <tr key={sportsEvent.id}>
                <td>{sportsEvent.eventName}</td><td>{sportsEvent.year}</td><td>{formatDate(sportsEvent.startDate)} - {formatDate(sportsEvent.endDate)}</td><td className="numeric">{formatCurrency(sportsEvent.budgetAmount)}</td><td className="numeric">{formatCurrency(sportsEvent.collectedAmount)}</td><td className="numeric">{formatCurrency(sportsEvent.totalExpense)}</td><td className="numeric">{formatCurrency(sportsEvent.balanceAmount)}</td><td><span className={`status-pill ${String(sportsEvent.status).toLowerCase()}`}>{sportsEvent.status}</span></td>
                <td className="table-actions"><button onClick={() => navigate(`/sports/collections?eventId=${sportsEvent.id}`)}>Collections</button>{sportsEvent.status !== 'ACTIVE' && <button onClick={() => updateStatus(sportsEvent.id, 'ACTIVE')}>Activate</button>}{sportsEvent.status !== 'CLOSED' && <button onClick={() => updateStatus(sportsEvent.id, 'CLOSED')}>Close</button>}<button className="danger" onClick={() => remove(sportsEvent.id)}>Delete</button></td>
              </tr>
            ))}
            {!loading && events.length === 0 && <tr><td colSpan="9" className="empty-state">No sports events found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading events...</p>}
    </Shell>
  )
}