import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'
import './FestivalList.css'

const statusTabs = [['ALL', 'All events'], ['PLANNED', 'Planned'], ['ACTIVE', 'Active'], ['CLOSED', 'Closed']]

export const FestivalList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const canManage = ['ADMIN', 'TREASURER'].includes(currentAccount?.role)
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('ALL')
  const visibleFestivals = festivals.filter((festival) => status === 'ALL' || festival.status === status)

  const loadFestivals = () => {
    setLoading(true)
    festivalEventAPI.getFestivals(year || undefined)
      .then((response) => setFestivals(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load events'))
      .finally(() => setLoading(false))
  }

  useEffect(loadFestivals, [year])

  const summary = useMemo(() => {
    const active = festivals.filter((festival) => festival.status === 'ACTIVE').length
    const budget = festivals.reduce((sum, festival) => sum + Number(festival.budgetAmount || 0), 0)
    const collected = festivals.reduce((sum, festival) => sum + Number(festival.collectedAmount || 0), 0)
    const expense = festivals.reduce((sum, festival) => sum + Number(festival.totalExpense || 0), 0)
    return { active, budget, collected, expense }
  }, [festivals])

  const remove = async (festivalEventId) => {
    if (!canManage) return
    if (!window.confirm('Delete this event?')) return
    try {
      await festivalEventAPI.deleteFestival(festivalEventId)
      toast.success('Event deleted')
      loadFestivals()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  const updateStatus = async (festivalEventId, status) => {
    if (!canManage) return
    try {
      await festivalEventAPI.updateFestivalStatus(festivalEventId, status)
      toast.success('Status updated')
      loadFestivals()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Status update failed')
    }
  }

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Festival / Sports Events" eyebrow="Society module">
        <p className="muted">Festival and sports events are available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Festival / Sports Events" eyebrow="Society module" actions={currentAccount?.role === 'ADMIN' && <Link className="button-link" to="/society/festivals/new">Add Event</Link>}>
      <SummaryGrid items={[
        ['Total Events', festivals.length],
        ['Active', summary.active],
        ['Budget', formatCurrency(summary.budget)],
        ['Collected', formatCurrency(summary.collected)]
      ]} />

      <section className="toolbar-panel flat-toolbar">
        <input type="number" placeholder="Filter by year" value={year} onChange={(event) => setYear(event.target.value)} min="2020" max="2100" />
        <strong>Expenses {formatCurrency(summary.expense)}</strong>
      </section>

      <div className="festival-status-tabs" role="tablist" aria-label="Event status">
        {statusTabs.map(([value, label], index) => <button
          key={value}
          id={`festival-tab-${value}`}
          type="button"
          role="tab"
          aria-selected={status === value}
          aria-controls="festival-events-panel"
          tabIndex={status === value ? 0 : -1}
          onClick={() => setStatus(value)}
          onKeyDown={(event) => {
            const next = event.key === 'ArrowRight' ? (index + 1) % statusTabs.length
              : event.key === 'ArrowLeft' ? (index + statusTabs.length - 1) % statusTabs.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? statusTabs.length - 1 : null
            if (next === null) return
            event.preventDefault()
            setStatus(statusTabs[next][0])
            event.currentTarget.parentElement.children[next].focus()
          }}
        >{label}<span>{loading ? '…' : value === 'ALL' ? festivals.length : festivals.filter((festival) => festival.status === value).length}</span></button>)}
      </div>
      <div className="table-wrap" id="festival-events-panel" role="tabpanel" aria-labelledby={`festival-tab-${status}`} tabIndex={0} aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Year</th>
              <th>Dates</th>
              <th className="numeric">Budget</th>
              <th className="numeric">Collected</th>
              <th className="numeric">Expense</th>
              <th className="numeric">Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleFestivals.map((festival) => (
              <tr key={festival.id}>
                <td>{festival.festivalName}</td>
                <td>{festival.year}</td>
                <td>{formatDate(festival.startDate)} - {formatDate(festival.endDate)}</td>
                <td className="numeric">{formatCurrency(festival.budgetAmount)}</td>
                <td className="numeric">{formatCurrency(festival.collectedAmount)}</td>
                <td className="numeric">{formatCurrency(festival.totalExpense)}</td>
                <td className="numeric">{formatCurrency(festival.balanceAmount)}</td>
                <td><span className={`status-pill ${String(festival.status).toLowerCase()}`}>{festival.status}</span></td>
                <td className="table-actions">
                  <Link className="button-link secondary" to={`/society/festivals/${festival.id}/expenses`}>Expenses & estimates</Link>
                  <Link className="button-link secondary" to={`/society/festivals/${festival.id}/report`}>Report</Link>
                  {canManage && <button onClick={() => navigate(`/society/festivals/${festival.id}/edit`)}>Edit</button>}
                  <button onClick={() => navigate(`/society/festival-collections/${festival.id}`)}>Collections</button>
                  {canManage && festival.status !== 'ACTIVE' && <button onClick={() => updateStatus(festival.id, 'ACTIVE')}>Activate</button>}
                  {canManage && festival.status !== 'CLOSED' && <button onClick={() => updateStatus(festival.id, 'CLOSED')}>Close</button>}
                  {canManage && <button className="danger" onClick={() => remove(festival.id)}>Delete</button>}
                </td>
              </tr>
            ))}
            {!loading && visibleFestivals.length === 0 && <tr><td colSpan="9" className="empty-state">{status === 'ALL' ? 'No festival or sports events found.' : `No ${status.toLowerCase()} events${year ? ` for ${year}` : ''}.`}</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading events...</p>}
    </Shell>
  )
}
