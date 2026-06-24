import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { kiranaSupplierAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const initialForm = { supplierName: '', mobile: '', email: '', address: '', openingBalance: '0' }

export const SupplierForm = () => {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(supplierId)

  useEffect(() => {
    if (!isEdit) return
    kiranaSupplierAPI.getSupplier(supplierId)
      .then((response) => {
        const supplier = response.data
        setForm({
          supplierName: supplier.supplierName || '',
          mobile: supplier.mobile || '',
          email: supplier.email || '',
          address: supplier.address || '',
          openingBalance: supplier.openingBalance || '0'
        })
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load supplier'))
  }, [isEdit, supplierId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      supplierName: form.supplierName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      openingBalance: Number(form.openingBalance || 0)
    }

    setSaving(true)
    try {
      if (isEdit) await kiranaSupplierAPI.updateSupplier(supplierId, payload)
      else await kiranaSupplierAPI.createSupplier(payload)
      toast.success(isEdit ? 'Supplier updated' : 'Supplier created')
      navigate('/kirana/suppliers')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save supplier')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title={isEdit ? 'Edit Supplier' : 'Add Supplier'} eyebrow="Kirana module">
        <p className="muted">Suppliers are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={isEdit ? 'Edit Supplier' : 'Add Supplier'} eyebrow="Kirana module">
      <form className="form-panel narrow" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Supplier Name
            <input value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} required />
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
            Opening Balance
            <input type="number" min="0" step="0.01" value={form.openingBalance} onChange={(event) => setForm({ ...form, openingBalance: event.target.value })} />
          </label>
        </div>
        <label>
          Address
          <textarea rows="3" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </label>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/kirana/suppliers')}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Supplier'}</button>
        </div>
      </form>
    </Shell>
  )
}
