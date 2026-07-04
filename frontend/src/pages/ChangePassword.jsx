import { useState } from 'react'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import { Shell } from './DashboardRouter'

export const ChangePassword = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }
    setSaving(true)
    try {
      await authAPI.changePassword(form)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password changed successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to change password')
    } finally {
      setSaving(false)
    }
  }

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  return (
    <Shell title="Change password" eyebrow="Account security">
      <section className="form-panel narrow">
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>Current password<input type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => update('currentPassword', e.target.value)} /></label>
            <label>New password<input type="password" autoComplete="new-password" required minLength="6" value={form.newPassword} onChange={(e) => update('newPassword', e.target.value)} /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" required minLength="6" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} /></label>
          </div>
          <div className="form-actions"><button type="submit" className="primary" disabled={saving}>{saving ? 'Changing...' : 'Change password'}</button></div>
        </form>
      </section>
    </Shell>
  )
}
