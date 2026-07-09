import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { systemAdminAPI } from '../../api/endpoints'
import { Shell } from '../DashboardRouter'

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`
}

const AdminTabs = ({ mode }) => <nav className="system-admin-tabs"><Link to="/system-admin">Overview</Link><Link to="/system-admin/users">Users</Link><Link to="/system-admin/accounts">Accounts</Link><Link to="/system-admin/audit-logs">Audit Logs</Link><Link className={mode === 'health' ? 'active' : ''} to="/system-admin/health">Health</Link><Link className={mode === 'storage' ? 'active' : ''} to="/system-admin/storage">Storage</Link><Link to="/system-admin/settings">Settings</Link></nav>

export const SystemAdminOperations = ({ mode }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const request = mode === 'health' ? systemAdminAPI.getHealth() : systemAdminAPI.getStorage()
    request.then((response) => setData(response.data))
      .catch((error) => toast.error(error.response?.data?.message || `Unable to load ${mode}`))
      .finally(() => setLoading(false))
  }, [mode])

  return <Shell title={mode === 'health' ? 'System Health' : 'Storage'} eyebrow="System administration">
    <AdminTabs mode={mode} />
    {loading ? <p className="muted">Checking {mode}...</p> : data && (mode === 'health' ? <Health data={data} /> : <Storage data={data} />)}
  </Shell>
}

const Health = ({ data }) => <div className="system-admin-operations">
  <section className="system-admin-stat-grid">
    <article><span>Overall</span><strong className="operation-status">{data.overallStatus}</strong><small>Checked {new Date(data.checkedAt).toLocaleString()}</small></article>
    <article><span>Database</span><strong className="operation-status">{data.databaseStatus}</strong><small>Migration {data.databaseMigration}</small></article>
    <article><span>Storage</span><strong className="operation-status">{data.storageStatus}</strong><small>{data.storageProvider}</small></article>
  </section>
  <section className="panel operation-details"><h2>Application</h2><dl><div><dt>Service</dt><dd>{data.application}</dd></div><div><dt>Version</dt><dd>{data.version}</dd></div><div><dt>Active DB connections</dt><dd>{data.databaseActiveConnections ?? 'Unavailable'}</dd></div><div><dt>Idle DB connections</dt><dd>{data.databaseIdleConnections ?? 'Unavailable'}</dd></div></dl></section>
</div>

const Storage = ({ data }) => <div className="system-admin-operations">
  <section className="system-admin-stat-grid">
    <article><span>Storage used</span><strong>{formatBytes(data.totalBytes)}</strong><small>{data.totalDocuments} documents</small></article>
    <article><span>Missing files</span><strong>{data.integrityScanAvailable ? data.missingFiles : '—'}</strong><small>{data.integrityScanAvailable ? 'Metadata without file' : 'Remote scan unavailable'}</small></article>
    <article><span>Orphan files</span><strong>{data.integrityScanAvailable ? data.orphanFiles : '—'}</strong><small>{data.scanTruncated ? 'Scan limit reached' : 'Files without metadata'}</small></article>
  </section>
  <Usage title="Top owners by storage" rows={data.topOwners} />
  <Usage title="Top accounts by storage" rows={data.topAccounts} />
</div>

const Usage = ({ title, rows = [] }) => <section className="panel storage-usage"><h2>{title}</h2>{rows.length ? rows.map((row) => <div key={row.id}><span>{row.name}</span><small>{row.documentCount} documents</small><strong>{formatBytes(row.bytes)}</strong></div>) : <p className="muted">No document storage in use.</p>}</section>
