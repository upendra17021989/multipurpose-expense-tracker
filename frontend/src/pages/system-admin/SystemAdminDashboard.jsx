import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { systemAdminAPI } from '../../api/endpoints'
import { Shell } from '../DashboardRouter'
import { Link } from 'react-router-dom'

const accountLabels = {
  INDIVIDUAL: 'Individual',
  SOCIETY: 'Society',
  KIRANA_STORE: 'Kirana store',
  SPORTS: 'Sports'
}

export const SystemAdminDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    systemAdminAPI.getDashboard()
      .then((response) => setData(response.data))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load system statistics'))
      .finally(() => setLoading(false))
  }, [])

  const accountRows = Object.entries(data?.accountsByType || {})
  const maxAccounts = Math.max(1, ...accountRows.map(([, count]) => Number(count)))

  return (
    <Shell title="System Administration" eyebrow="Platform administration">
      <nav className="system-admin-tabs"><Link className="active" to="/system-admin">Overview</Link><Link to="/system-admin/users">Users</Link><Link to="/system-admin/accounts">Accounts</Link><Link to="/system-admin/audit-logs">Audit Logs</Link><Link to="/system-admin/health">Health</Link><Link to="/system-admin/storage">Storage</Link><Link to="/system-admin/settings">Settings</Link></nav>
      {loading && <p className="muted">Loading system statistics...</p>}
      {!loading && data && <>
        <section className="system-admin-stat-grid">
          <article><span>Total users</span><strong>{data.totalUsers}</strong><small>{data.activeUsers} active</small></article>
          <article><span>Total accounts</span><strong>{data.totalAccounts}</strong><small>{data.activeAccounts} active</small></article>
          <article><span>Registrations</span><strong>{data.registrationsLast7Days}</strong><small>{data.registrationsLast30Days} in 30 days</small></article>
          <article><span>Expenses</span><strong>{data.totalExpenses}</strong><small>Non-deleted records</small></article>
          <article><span>Documents</span><strong>{data.totalDocuments}</strong><small>{data.sharedDocuments} shared</small></article>
        </section>
        <section className="panel system-admin-account-panel">
          <div className="section-heading-row"><div><h2>Accounts by type</h2><p className="muted">Current platform-wide account distribution.</p></div></div>
          <div className="system-admin-account-bars">
            {accountRows.map(([type, count]) => <div className="system-admin-account-row" key={type}>
              <span>{accountLabels[type] || type}</span>
              <div><i style={{ width: `${(Number(count) / maxAccounts) * 100}%` }} /></div>
              <strong>{count}</strong>
            </div>)}
          </div>
        </section>
        <p className="muted system-admin-privacy-note">This dashboard contains aggregate counts only. User profiles and document contents are not exposed.</p>
      </>}
    </Shell>
  )
}
