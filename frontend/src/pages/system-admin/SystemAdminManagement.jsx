import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { systemAdminAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const accountTypes = [['INDIVIDUAL', 'Individual'], ['SOCIETY', 'Society'], ['KIRANA_STORE', 'Kirana store'], ['SPORTS', 'Sports']]

export const SystemAdminManagement = ({ mode }) => {
  const currentUser = useAuthStore((state) => state.user)
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ query: '', active: '', type: '' })

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, size: 20, query: filters.query || undefined, active: filters.active === '' ? undefined : filters.active, type: mode === 'accounts' ? filters.type || undefined : undefined }
    const request = mode === 'users' ? systemAdminAPI.getUsers(params) : systemAdminAPI.getAccounts(params)
    request.then((response) => { setRows(response.data.content || []); setTotalPages(response.data.totalPages || 0) })
      .catch((error) => toast.error(error.response?.data?.message || `Unable to load ${mode}`))
      .finally(() => setLoading(false))
  }, [filters, mode, page])
  useEffect(load, [load])

  const confirmChange = async (message, request) => {
    if (!window.confirm(message)) return
    try { await request(); toast.success('Access updated'); load() }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update access') }
  }

  return <Shell title={mode === 'users' ? 'User Management' : 'Account Management'} eyebrow="System administration">
    <nav className="system-admin-tabs"><Link to="/system-admin">Overview</Link><Link className={mode === 'users' ? 'active' : ''} to="/system-admin/users">Users</Link><Link className={mode === 'accounts' ? 'active' : ''} to="/system-admin/accounts">Accounts</Link><Link to="/system-admin/feedback">Feedback</Link><Link to="/system-admin/audit-logs">Audit Logs</Link><Link to="/system-admin/health">Health</Link><Link to="/system-admin/storage">Storage</Link><Link to="/system-admin/settings">Settings</Link></nav>
    <section className="panel">
      <div className="system-admin-filters">
        <input placeholder={`Search ${mode}…`} value={filters.query} onChange={(event) => { setPage(0); setFilters({ ...filters, query: event.target.value }) }} />
        {mode === 'accounts' && <select value={filters.type} onChange={(event) => { setPage(0); setFilters({ ...filters, type: event.target.value }) }}><option value="">All account types</option>{accountTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
        <select value={filters.active} onChange={(event) => { setPage(0); setFilters({ ...filters, active: event.target.value }) }}><option value="">All statuses</option><option value="true">Active</option><option value="false">Suspended</option></select>
      </div>
      {loading ? <p className="muted">Loading {mode}...</p> : <div className="system-admin-management-list">
        {rows.map((row) => <article key={row.id}>
          <div className="system-admin-management-main">
            <div><h3>{mode === 'users' ? row.name : row.accountName}</h3><p>{mode === 'users' ? `${row.mobile}${row.email ? ` · ${row.email}` : ''}` : `${row.accountType?.replaceAll('_', ' ') || 'Unknown type'} · Owner: ${row.ownerName || 'Unknown'} (${row.ownerMobile || '-'})`}</p></div>
            <span className={`status-pill ${row.active ? 'approved' : 'rejected'}`}>{row.active ? 'ACTIVE' : 'SUSPENDED'}</span>
          </div>
          <div className="system-admin-management-meta">
            {mode === 'users' ? <><span>User #{row.id}</span>{row.systemAdmin && <strong>Platform admin</strong>}</> : <><span>Account #{row.id}</span><span>{row.activeMembers} active members</span></>}
          </div>
          <div className="table-actions">
            <button className={row.active ? 'danger' : ''} disabled={mode === 'users' && row.id === currentUser?.id} onClick={() => confirmChange(`${row.active ? 'Suspend' : 'Activate'} ${mode === 'users' ? row.name : row.accountName}?`, () => mode === 'users' ? systemAdminAPI.setUserStatus(row.id, !row.active) : systemAdminAPI.setAccountStatus(row.id, !row.active))}>{row.active ? 'Suspend' : 'Activate'}</button>
            {mode === 'users' && <button disabled={row.id === currentUser?.id} onClick={() => confirmChange(`${row.systemAdmin ? 'Remove platform access from' : 'Grant platform access to'} ${row.name}?`, () => systemAdminAPI.setSystemAdmin(row.id, !row.systemAdmin))}>{row.systemAdmin ? 'Remove admin' : 'Make admin'}</button>}
          </div>
        </article>)}
        {!rows.length && <p className="empty-state">No {mode} found.</p>}
      </div>}
      {totalPages > 1 && <div className="document-pagination"><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </Shell>
}

