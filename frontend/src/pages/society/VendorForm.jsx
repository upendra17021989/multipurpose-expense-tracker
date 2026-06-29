import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyVendorAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const initialForm = { supplierName: '', mobile: '', email: '', address: '', openingBalance: '0' }

export const VendorForm = () => {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(vendorId)

  useEffect(() => {
    if (!isEdit) return
    societyVendorAPI.getVendor(vendorId).then(({ data }) => setForm({
      supplierName: data.supplierName || '', mobile: data.mobile || '', email: data.email || '',
      address: data.address || '', openingBalance: data.openingBalance || '0'
    })).catch((error) => toast.error(error.response?.data?.message || 'Unable to load vendor'))
  }, [isEdit, vendorId])

  const submit = async (event) => {
    event.preventDefault()
    const payload = { supplierName: form.supplierName.trim(), mobile: form.mobile.trim(), email: form.email.trim() || null, address: form.address.trim() || null, openingBalance: Number(form.openingBalance || 0) }
    setSaving(true)
    try {
      if (isEdit) await societyVendorAPI.updateVendor(vendorId, payload)
      else await societyVendorAPI.createVendor(payload)
      toast.success(isEdit ? 'Vendor updated' : 'Vendor created')
      navigate('/society/vendors')
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to save vendor') }
    finally { setSaving(false) }
  }

  if (currentAccount?.accountType !== 'SOCIETY') return <Shell title="Vendors" eyebrow="Society module"><p className="muted">Vendors are available for society accounts.</p></Shell>
  return <Shell title={isEdit ? 'Edit Vendor' : 'Add Vendor'} eyebrow="Society module"><form className="form-panel narrow" onSubmit={submit}>
    <div className="form-grid two">
      <label>Vendor Name<input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} required /></label>
      <label>Mobile<input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></label>
      <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Opening Balance<input type="number" min="0" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} /></label>
    </div>
    <label>Address<textarea rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
    <div className="form-actions"><button type="button" onClick={() => navigate('/society/vendors')}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Vendor'}</button></div>
  </form></Shell>
}
