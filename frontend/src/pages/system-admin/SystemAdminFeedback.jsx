import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { systemAdminAPI } from '../../api/endpoints'
import { formatDate } from '../../utils/format'
import { Shell } from '../DashboardRouter'

const statuses = [['', 'All statuses'], ['NEW', 'New'], ['REVIEWED', 'Reviewed'], ['PLANNED', 'Planned'], ['CLOSED', 'Closed']]
const editableStatuses = statuses.filter(([value]) => value)

export const SystemAdminFeedback = () => {
  const [rows, setRows] = useState([])
  const [forms, setForms] = useState({})
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    systemAdminAPI.getFeedback({ page, size: 20, status: status || undefined })
      .then((response) => {
        const content = response.data.content || []
        setRows(content)
        setForms(Object.fromEntries(content.map((row) => [row.id, { status: row.status || 'NEW', adminRemarks: row.adminRemarks || '' }])))
        setTotalPages(response.data.totalPages || 0)
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load feedback'))
      .finally(() => setLoading(false))
  }, [page, status])

  useEffect(load, [load])

  const updateForm = (id, field, value) => setForms((current) => ({ ...current, [id]: { ...(current[id] || {}), [field]: value } }))

  const saveStatus = async (row) => {
    const form = forms[row.id] || { status: row.status || 'NEW', adminRemarks: '' }
    setSavingId(row.id)
    try {
      await systemAdminAPI.updateFeedbackStatus(row.id, form)
      toast.success('Feedback updated')
      load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update feedback')
    } finally {
      setSavingId(null)
    }
  }

  return <Shell title="User Feedback" eyebrow="System administration">
    <nav className="system-admin-tabs"><Link to="/system-admin">Overview</Link><Link to="/system-admin/users">Users</Link><Link to="/system-admin/accounts">Accounts</Link><Link className="active" to="/system-admin/feedback">Feedback</Link><Link to="/system-admin/audit-logs">Audit Logs</Link><Link to="/system-admin/health">Health</Link><Link to="/system-admin/storage">Storage</Link><Link to="/system-admin/settings">Settings</Link></nav>
    <section className="panel">
      <div className="system-admin-filters">
        <select value={status} onChange={(event) => { setPage(0); setStatus(event.target.value) }}>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {loading ? <p className="muted">Loading feedback...</p> : <div className="system-admin-feedback-list">
        {rows.map((row) => {
          const form = forms[row.id] || { status: row.status || 'NEW', adminRemarks: row.adminRemarks || '' }
          const changed = form.status !== row.status || form.adminRemarks !== (row.adminRemarks || '')
          return <article key={row.id} className="system-admin-feedback-card">
            <header>
              <div>
                <h3>{row.title || row.feedbackType}</h3>
                <p>{row.userName || 'User'}{row.userMobile ? ` - ${row.userMobile}` : ''}{row.userEmail ? ` - ${row.userEmail}` : ''}</p>
                <small>{row.accountName} - {row.accountType} - {formatDate(row.createdAt)}</small>
              </div>
              <span className="status-pill approved">{row.status}</span>
            </header>
            <p>{row.message}</p>
            <footer>
              <span>{row.feedbackType}</span>
              {row.rating && <b>{row.rating}/5</b>}
              {row.pageUrl && <a href={row.pageUrl} target="_blank" rel="noreferrer">Open page</a>}
            </footer>
            <div className="system-admin-feedback-resolution">
              <label>Status<select value={form.status} onChange={(event) => updateForm(row.id, 'status', event.target.value)}>{editableStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Admin remarks<textarea rows="3" maxLength="1000" value={form.adminRemarks} onChange={(event) => updateForm(row.id, 'adminRemarks', event.target.value)} placeholder="Add internal notes before resolving or planning this feedback" /></label>
              <button className="primary" type="button" disabled={!changed || savingId === row.id} onClick={() => saveStatus(row)}>{savingId === row.id ? 'Saving...' : 'Save update'}</button>
            </div>
          </article>
        })}
        {!rows.length && <p className="empty-state">No feedback found.</p>}
      </div>}
      {totalPages > 1 && <div className="document-pagination"><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </Shell>
}
