import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyFlatAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const initialForm = {
  blockName: '',
  flatNumber: '',
  ownerName: '',
  mobile: '',
  email: '',
  residentType: 'OWNER'
}

export const FlatForm = () => {
  const { flatId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(flatId)

  useEffect(() => {
    if (!isEdit) return
    societyFlatAPI.getFlat(flatId)
      .then((response) => {
        const flat = response.data
        setForm({
          blockName: flat.blockName || '',
          flatNumber: flat.flatNumber || '',
          ownerName: flat.ownerName || '',
          mobile: flat.mobile || '',
          email: flat.email || '',
          residentType: flat.residentType || 'OWNER'
        })
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load flat'))
  }, [flatId, isEdit])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    const payload = {
      blockName: form.blockName.trim(),
      flatNumber: form.flatNumber.trim(),
      ownerName: form.ownerName.trim(),
      mobile: form.mobile.trim() || null,
      email: form.email.trim() || null,
      residentType: form.residentType
    }

    try {
      if (isEdit) await societyFlatAPI.updateFlat(flatId, payload)
      else await societyFlatAPI.createFlat(payload)
      toast.success(isEdit ? 'Flat updated' : 'Flat created')
      navigate('/society/flats')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save flat')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title={isEdit ? 'Edit Flat' : 'Add Flat'} eyebrow="Society module">
        <p className="muted">Flat master is available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={isEdit ? 'Edit Flat' : 'Add Flat'} eyebrow="Society module">
      <form className="form-panel narrow" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Block Name
            <input value={form.blockName} onChange={(event) => update('blockName', event.target.value)} required placeholder="A" />
          </label>
          <label>
            Flat Number
            <input value={form.flatNumber} onChange={(event) => update('flatNumber', event.target.value)} required placeholder="101" />
          </label>
          <label>
            Owner Name
            <input value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} required />
          </label>
          <label>
            Resident Type
            <select value={form.residentType} onChange={(event) => update('residentType', event.target.value)} required>
              <option value="OWNER">Owner</option>
              <option value="TENANT">Tenant</option>
            </select>
          </label>
          <label>
            Mobile
            <input type="tel" value={form.mobile} onChange={(event) => update('mobile', event.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/society/flats')}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Flat'}</button>
        </div>
      </form>
    </Shell>
  )
}
