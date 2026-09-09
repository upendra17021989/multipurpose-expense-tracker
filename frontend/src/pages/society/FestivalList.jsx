import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'
import './FestivalList.css'

const eventStatusTabs = [['ALL', 'All events'], ['PLANNED', 'Planned'], ['ACTIVE', 'Active'], ['CLOSED', 'Closed']]

const icons = {
  add: <><path d="M12 5v14M5 12h14" /></>,
  expenses: <><path d="M7 3h10a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2Z" /><path d="M9 8h6M9 12h4" /></>,
  report: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  edit: <><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z" /></>,
  collections: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5c-.7-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1 1.8 3 2.3 3 1.1 3 2.5-1.4 2.2-3.2 2.2c-1.2 0-2.4-.4-3.2-1.2M12 5.5v13" /></>,
  activate: <path d="M5 12.5 9.2 17 19 7" />,
  close: <><path d="m7 7 10 10M17 7 7 17" /></>,
  delete: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  restore: <><path d="M4 7v5h5" /><path d="M5.5 11a7 7 0 1 1 1.8 6.7" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /></>
}

const ActionIcon = ({ name }) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>

const IconLink = ({ icon, label, to, tone = '' }) => (
  <Link className={`festival-icon-button ${tone}`} to={to} aria-label={label} title={label} data-tooltip={label}><ActionIcon name={icon} /></Link>
)

const IconButton = ({ icon, label, onClick, tone = '' }) => (
  <button className={`festival-icon-button ${tone}`} type="button" onClick={onClick} aria-label={label} title={label} data-tooltip={label}><ActionIcon name={icon} /></button>
)

const OverflowMenu = ({ onClose, onDelete }) => (
  <details className="festival-overflow-menu">
    <summary className="festival-icon-button" aria-label="More actions" title="More actions"><ActionIcon name="more" /></summary>
    <div className="festival-overflow-popover">
      {onClose && <button className="close-action" type="button" onClick={onClose}><ActionIcon name="close" /><span>Close event</span></button>}
      <button className="delete-action" type="button" onClick={onDelete}><ActionIcon name="delete" /><span>Move to Trash</span></button>
    </div>
  </details>
)

export const FestivalList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const canManage = ['ADMIN', 'SUPERVISOR', 'TREASURER'].includes(currentAccount?.role)
  const [festivals, setFestivals] = useState([])
  const [deletedFestivals, setDeletedFestivals] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const statusTabs = canManage ? [...eventStatusTabs, ['TRASH', 'Trash']] : eventStatusTabs
  const visibleFestivals = status === 'TRASH' ? deletedFestivals : festivals.filter((festival) => status === 'ALL' || festival.status === status)

  const loadFestivals = () => {
    setLoading(true)
    Promise.all([festivalEventAPI.getFestivals(year || undefined), canManage ? festivalEventAPI.getDeletedFestivals() : Promise.resolve({ data: [] })])
      .then(([activeResponse, trashResponse]) => {
        setFestivals(activeResponse.data || [])
        setDeletedFestivals(trashResponse.data || [])
      })
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
    if (!window.confirm('Move this event to Trash? You can restore it for 30 days.')) return
    try {
      await festivalEventAPI.deleteFestival(festivalEventId)
      toast.success('Event moved to Trash')
      loadFestivals()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  const restore = async (festivalEventId) => {
    try {
      await festivalEventAPI.restoreFestival(festivalEventId)
      toast.success('Event restored')
      loadFestivals()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Restore failed')
    }
  }

  const permanentlyDelete = async (festivalEventId) => {
    if (!window.confirm('Permanently delete this event and all its collection records? This cannot be undone.')) return
    try {
      await festivalEventAPI.permanentlyDeleteFestival(festivalEventId)
      toast.success('Event permanently deleted')
      loadFestivals()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Permanent deletion failed')
    }
  }

  const restoreDaysLeft = (deletedAt) => Math.max(0, 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000))

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
    <Shell title="Festival / Sports Events" eyebrow="Society module" actions={['ADMIN', 'SUPERVISOR'].includes(currentAccount?.role) && <IconLink icon="add" label="Add event" to="/society/festivals/new" tone="primary" />}>
      <div className="festival-list-page">
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
        >{label}<span>{loading ? '…' : value === 'ALL' ? festivals.length : value === 'TRASH' ? deletedFestivals.length : festivals.filter((festival) => festival.status === value).length}</span></button>)}
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
                <td>{status === 'TRASH' ? <span className="trash-retention">{restoreDaysLeft(festival.deletedAt)} days left</span> : <span className={`status-pill ${String(festival.status).toLowerCase()}`}>{festival.status}</span>}</td>
                <td className="table-actions">
                  {status === 'TRASH' ? <>
                    {restoreDaysLeft(festival.deletedAt) > 0 && <IconButton icon="restore" label="Restore event" tone="success" onClick={() => restore(festival.id)} />}
                    <IconButton icon="delete" label="Delete permanently" tone="danger" onClick={() => permanentlyDelete(festival.id)} />
                  </> : <>
                  <IconLink icon="expenses" label="Expenses & estimates" to={`/society/festivals/${festival.id}/expenses`} />
                  <IconLink icon="report" label="View report" to={`/society/festivals/${festival.id}/report`} />
                  <IconButton icon="collections" label="Collections" onClick={() => navigate(`/society/festival-collections/${festival.id}`)} />
                  {canManage && <IconButton icon="edit" label="Edit event" onClick={() => navigate(`/society/festivals/${festival.id}/edit`)} />}
                  {canManage && festival.status !== 'ACTIVE' && <IconButton icon="activate" label="Activate event" tone="success" onClick={() => updateStatus(festival.id, 'ACTIVE')} />}
                  {canManage && <OverflowMenu onClose={festival.status !== 'CLOSED' ? () => updateStatus(festival.id, 'CLOSED') : null} onDelete={() => remove(festival.id)} />}
                  </>}
                </td>
              </tr>
            ))}
            {!loading && visibleFestivals.length === 0 && <tr><td colSpan="9" className="empty-state">{status === 'ALL' ? 'No festival or sports events found.' : `No ${status.toLowerCase()} events${year ? ` for ${year}` : ''}.`}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="festival-mobile-list" role="tabpanel" aria-labelledby={`festival-tab-${status}`} aria-busy={loading}>
        {visibleFestivals.map((festival) => (
          <article className="festival-mobile-card" key={festival.id}>
            <header>
              <div>
                <p>{festival.year}</p>
                <h2>{festival.festivalName}</h2>
              </div>
              {status === 'TRASH' ? <span className="trash-retention">{restoreDaysLeft(festival.deletedAt)} days left</span> : <span className={`status-pill ${String(festival.status).toLowerCase()}`}>{festival.status}</span>}
            </header>
            <p className="festival-mobile-dates">{formatDate(festival.startDate)} – {formatDate(festival.endDate)}</p>
            <dl>
              <div><dt>Budget</dt><dd>{formatCurrency(festival.budgetAmount)}</dd></div>
              <div><dt>Collected</dt><dd>{formatCurrency(festival.collectedAmount)}</dd></div>
              <div><dt>Expense</dt><dd>{formatCurrency(festival.totalExpense)}</dd></div>
              <div><dt>Balance</dt><dd>{formatCurrency(festival.balanceAmount)}</dd></div>
            </dl>
            <div className="festival-mobile-actions">
              {status === 'TRASH' ? <>
                {restoreDaysLeft(festival.deletedAt) > 0 && <IconButton icon="restore" label="Restore event" tone="success" onClick={() => restore(festival.id)} />}
                <IconButton icon="delete" label="Delete permanently" tone="danger" onClick={() => permanentlyDelete(festival.id)} />
              </> : <>
              <IconLink icon="expenses" label="Expenses & estimates" to={`/society/festivals/${festival.id}/expenses`} />
              <IconLink icon="report" label="View report" to={`/society/festivals/${festival.id}/report`} />
              <IconButton icon="collections" label="Collections" onClick={() => navigate(`/society/festival-collections/${festival.id}`)} />
              {canManage && <IconButton icon="edit" label="Edit event" onClick={() => navigate(`/society/festivals/${festival.id}/edit`)} />}
              {canManage && festival.status !== 'ACTIVE' && <IconButton icon="activate" label="Activate event" tone="success" onClick={() => updateStatus(festival.id, 'ACTIVE')} />}
              {canManage && <OverflowMenu onClose={festival.status !== 'CLOSED' ? () => updateStatus(festival.id, 'CLOSED') : null} onDelete={() => remove(festival.id)} />}
              </>}
            </div>
          </article>
        ))}
        {!loading && visibleFestivals.length === 0 && <p className="festival-mobile-empty">{status === 'ALL' ? 'No festival or sports events found.' : `No ${status.toLowerCase()} events${year ? ` for ${year}` : ''}.`}</p>}
      </div>
      {loading && <p className="muted">Loading events...</p>}
      </div>
    </Shell>
  )
}
