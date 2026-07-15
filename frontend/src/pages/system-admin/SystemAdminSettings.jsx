import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { systemAdminAPI } from '../../api/endpoints'
import { Shell } from '../DashboardRouter'

export const SystemAdminSettings = () => {
  const [form, setForm] = useState({ siteName: '', supportEmail: '', maintenanceNotice: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    systemAdminAPI.getSettings().then((response) => setForm(response.data))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const save = async (event) => {
    event.preventDefault(); setSaving(true)
    try {
      const response = await systemAdminAPI.updateSettings(form)
      setForm(response.data); toast.success('System settings updated')
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to update settings') }
    finally { setSaving(false) }
  }

  return <Shell title="System Settings" eyebrow="System administration">
    <nav className="system-admin-tabs"><Link to="/system-admin">Overview</Link><Link to="/system-admin/users">Users</Link><Link to="/system-admin/accounts">Accounts</Link><Link to="/system-admin/feedback">Feedback</Link><Link to="/system-admin/audit-logs">Audit Logs</Link><Link to="/system-admin/health">Health</Link><Link to="/system-admin/storage">Storage</Link><Link className="active" to="/system-admin/settings">Settings</Link></nav>
    {loading ? <p className="muted">Loading settings...</p> : <form className="panel system-settings-form" onSubmit={save}>
      <div><h2>Public platform details</h2><p className="muted">Only non-secret display and support information belongs here.</p></div>
      <label>Site name<input required maxLength="80" value={form.siteName} onChange={(event) => setForm({ ...form, siteName: event.target.value })} /></label>
      <label>Support email<input type="email" maxLength="254" placeholder="support@example.com" value={form.supportEmail || ''} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} /></label>
      <label>Maintenance notice<textarea rows="4" maxLength="500" placeholder="Leave blank when no notice is needed" value={form.maintenanceNotice || ''} onChange={(event) => setForm({ ...form, maintenanceNotice: event.target.value })} /></label>
      <p className="muted">Do not enter passwords, API keys, database URLs, or other credentials.</p>
      <div className="form-actions"><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div>
    </form>}
  </Shell>
}

