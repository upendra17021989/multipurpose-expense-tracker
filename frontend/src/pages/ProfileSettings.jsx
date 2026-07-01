import { useState } from 'react'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { Shell } from './DashboardRouter'

export const ProfileSettings = () => {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || ''
  })
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await authAPI.updateProfile({
        name: form.name.trim(),
        email: form.email.trim() || null,
        mobile: form.mobile.trim()
      })
      updateUser(response.data)
      setForm({
        name: response.data.name || '',
        email: response.data.email || '',
        mobile: response.data.mobile || ''
      })
      toast.success('Account details updated')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update account details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell title="Account details" eyebrow="Profile">
      <section className="form-panel narrow">
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Name
              <input value={form.name} maxLength="255" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Mobile number
              <input type="tel" value={form.mobile} maxLength="20" required onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} maxLength="255" onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
          </div>
        </form>
      </section>
    </Shell>
  )
}
