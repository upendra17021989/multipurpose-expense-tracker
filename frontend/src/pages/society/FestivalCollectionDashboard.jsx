import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const FestivalCollectionDashboard = () => {
  const { currentAccount } = useAuthStore()
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    festivalEventAPI.getFestivals()
      .then((response) => setFestivals(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load events'))
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => ({
    festivals: festivals.length,
    active: festivals.filter((festival) => festival.status === 'ACTIVE').length,
    collected: festivals.reduce((sum, festival) => sum + Number(festival.collectedAmount || 0), 0),
    balance: festivals.reduce((sum, festival) => sum + Number(festival.balanceAmount || 0), 0)
  }), [festivals])

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Festival / Sports Collections" eyebrow="Society module">
        <p className="muted">Festival collections are available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Festival / Sports Collections" eyebrow="Society module" actions={<Link className="button-link" to="/society/festivals/new">Add Event</Link>}>
      <SummaryGrid items={[
        ['Events', summary.festivals],
        ['Active', summary.active],
        ['Collected', formatCurrency(summary.collected)],
        ['Balance', formatCurrency(summary.balance)]
      ]} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Year</th>
              <th>Dates</th>
              <th className="numeric">Collected</th>
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
                <td className="numeric">{formatCurrency(festival.collectedAmount)}</td>
                <td className="numeric">{formatCurrency(festival.balanceAmount)}</td>
                <td><span className={`status-pill ${String(festival.status).toLowerCase()}`}>{festival.status}</span></td>
                <td className="table-actions">
                  <Link className="button-link secondary" to={`/society/festival-collections/${festival.id}`}>Open</Link>
                </td>
              </tr>
            ))}
            {!loading && festivals.length === 0 && <tr><td colSpan="7" className="empty-state">Create a festival or sports event before tracking collections.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading collections...</p>}
    </Shell>
  )
}
