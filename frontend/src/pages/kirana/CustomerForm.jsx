import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { kiranaCustomerAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const initialForm = { customerName: '', mobile: '', email: '', address: '', openingCredit: '0' }

export const CustomerForm = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(customerId)

  useEffect(() => {
    if (!isEdit) return
    kiranaCustomerAPI.getCustomer(customerId)
      .then((response) => {
        const customer = response.data
        setForm({
          customerName: customer.customerName || '',
          mobile: customer.mobile || '',
          email: customer.email || '',
          address: customer.address || '',
          openingCredit: customer.openingCredit || '0'
        })
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load customer'))
  }, [isEdit, customerId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      customerName: form.customerName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      openingCredit: Number(form.openingCredit || 0)
    }

    setSaving(true)
    try {
      if (isEdit) await kiranaCustomerAPI.updateCustomer(customerId, payload)
      else await kiranaCustomerAPI.createCustomer(payload)
      toast.success(isEdit ? 'Customer updated' : 'Customer created')
      navigate('/kirana/customers')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save customer')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title={isEdit ? 'Edit Customer' : 'Add Customer'} eyebrow="Kirana module">
        <p className="muted">Customers are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={isEdit ? 'Edit Customer' : 'Add Customer'} eyebrow="Kirana module">
      <form className="form-panel narrow" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Customer Name
            <input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} required />
          </label>
          <label>
            Mobile
            <input value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Opening Credit
            <input type="number" min="0" step="0.01" value={form.openingCredit} onChange={(event) => setForm({ ...form, openingCredit: event.target.value })} />
          </label>
        </div>
        <label>
          Address
          <textarea rows="3" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </label>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/kirana/customers')}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Customer'}</button>
        </div>
      </form>
    </Shell>
  )
}
