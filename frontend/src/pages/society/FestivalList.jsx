import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const FestivalList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')

  const loadFestivals = () => {
    setLoading(true)
    festivalEventAPI.getFestivals(year || undefined)
      .then((response) => setFestivals(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load festivals'))
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
    if (!window.confirm('Delete this festival event?')) return
    try {
      await festivalEventAPI.deleteFestival(festivalEventId)
      toast.success('Festival deleted')
      loadFestivals()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  const updateStatus = async (festivalEventId, status) => {
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
      <Shell title="Festival Events" eyebrow="Society module">
        <p className="muted">Festival events are available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Festival Events" eyebrow="Society module" actions={<Link className="button-link" to="/society/festivals/new">Add Festival</Link>}>
      <SummaryGrid items={[
        ['Total Festivals', festivals.length],
        ['Active', summary.active],
        ['Budget', formatCurrency(summary.budget)],
        ['Collected', formatCurrency(summary.collected)]
      ]} />

      <section className="toolbar-panel flat-toolbar">
        <input type="number" placeholder="Filter by year" value={year} onChange={(event) => setYear(event.target.value)} min="2020" max="2100" />
        <strong>Expenses {formatCurrency(summary.expense)}</strong>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Festival</th>
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
            {festivals.map((festival) => (
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
                  <button onClick={() => navigate(`/society/festivals/${festival.id}/edit`)}>Edit</button>
                  <button onClick={() => navigate(`/society/festival-collections/${festival.id}`)}>Collections</button>
                  {festival.status !== 'ACTIVE' && <button onClick={() => updateStatus(festival.id, 'ACTIVE')}>Activate</button>}
                  {festival.status !== 'CLOSED' && <button onClick={() => updateStatus(festival.id, 'CLOSED')}>Close</button>}
                  <button className="danger" onClick={() => remove(festival.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && festivals.length === 0 && <tr><td colSpan="9" className="empty-state">No festival events found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading festivals...</p>}
    </Shell>
  )
}
