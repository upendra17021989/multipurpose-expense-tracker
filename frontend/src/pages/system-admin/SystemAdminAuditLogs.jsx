import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { systemAdminAPI } from '../../api/endpoints'
import { Shell } from '../DashboardRouter'

const actions = [
  ['USER_STATUS_CHANGED', 'User status'],
  ['ACCOUNT_STATUS_CHANGED', 'Account status'],
  ['PLATFORM_ADMIN_CHANGED', 'Platform access']
]

export const SystemAdminAuditLogs = () => {
  const [rows, setRows] = useState([])
  const [filters, setFilters] = useState({ query: '', action: '', outcome: '' })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    systemAdminAPI.getAuditLogs({ ...filters, page, size: 20 })
      .then((response) => { setRows(response.data.content || []); setTotalPages(response.data.totalPages || 0) })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load audit logs'))
      .finally(() => setLoading(false))
  }, [filters, page])
  useEffect(load, [load])

  return <Shell title="Audit Logs" eyebrow="System administration">
    <nav className="system-admin-tabs"><Link to="/system-admin">Overview</Link><Link to="/system-admin/users">Users</Link><Link to="/system-admin/accounts">Accounts</Link><Link className="active" to="/system-admin/audit-logs">Audit Logs</Link><Link to="/system-admin/health">Health</Link><Link to="/system-admin/storage">Storage</Link><Link to="/system-admin/settings">Settings</Link></nav>
    <section className="panel">
      <div className="system-admin-filters">
        <input placeholder="Search actor, target, or details…" value={filters.query} onChange={(event) => { setPage(0); setFilters({ ...filters, query: event.target.value }) }} />
        <select value={filters.action} onChange={(event) => { setPage(0); setFilters({ ...filters, action: event.target.value }) }}><option value="">All actions</option>{actions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={filters.outcome} onChange={(event) => { setPage(0); setFilters({ ...filters, outcome: event.target.value }) }}><option value="">All outcomes</option><option value="SUCCESS">Success</option><option value="FAILED">Failed</option></select>
      </div>
      {loading ? <p className="muted">Loading audit logs...</p> : <div className="system-admin-audit-list">
        {rows.map((row) => <article key={row.id}>
          <div className="system-admin-management-main"><div><h3>{actions.find(([value]) => value === row.action)?.[1] || row.action}</h3><p>{row.actorName} · {new Date(row.createdAt).toLocaleString()}</p></div><span className={`status-pill ${row.outcome === 'SUCCESS' ? 'approved' : 'rejected'}`}>{row.outcome}</span></div>
          <dl><div><dt>Target</dt><dd>{row.targetType} #{row.targetId || '-'}</dd></div><div><dt>Change</dt><dd>{row.metadata || '-'}</dd></div><div><dt>IP address</dt><dd>{row.ipAddress || '-'}</dd></div></dl>
        </article>)}
        {!rows.length && <p className="empty-state">No audit records found.</p>}
      </div>}
      {totalPages > 1 && <div className="document-pagination"><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </Shell>
}

