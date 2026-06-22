import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const currentYear = new Date().getFullYear()
const initialForm = {
  festivalName: '',
  year: currentYear,
  startDate: '',
  endDate: '',
  budgetAmount: ''
}

export const FestivalForm = () => {
  const { festivalEventId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(festivalEventId)

  useEffect(() => {
    if (!isEdit) return
    festivalEventAPI.getFestival(festivalEventId)
      .then((response) => {
        const festival = response.data
        setForm({
          festivalName: festival.festivalName || '',
          year: festival.year || currentYear,
          startDate: festival.startDate || '',
          endDate: festival.endDate || '',
          budgetAmount: festival.budgetAmount || ''
        })
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load festival'))
  }, [festivalEventId, isEdit])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    const payload = {
      festivalName: form.festivalName.trim(),
      year: Number(form.year),
      startDate: form.startDate,
      endDate: form.endDate,
      budgetAmount: form.budgetAmount === '' ? null : Number(form.budgetAmount)
    }

    try {
      if (isEdit) await festivalEventAPI.updateFestival(festivalEventId, payload)
      else await festivalEventAPI.createFestival(payload)
      toast.success(isEdit ? 'Festival updated' : 'Festival created')
      navigate('/society/festivals')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save festival')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title={isEdit ? 'Edit Festival' : 'Add Festival'} eyebrow="Society module">
        <p className="muted">Festival events are available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={isEdit ? 'Edit Festival' : 'Add Festival'} eyebrow="Society module">
      <form className="form-panel narrow" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Festival Name
            <input value={form.festivalName} onChange={(event) => update('festivalName', event.target.value)} required placeholder="Navratri 2026" />
          </label>
          <label>
            Year
            <input type="number" min="2020" max="2100" value={form.year} onChange={(event) => update('year', event.target.value)} required />
          </label>
          <label>
            Start Date
            <input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} required />
          </label>
          <label>
            End Date
            <input type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} required />
          </label>
          <label>
            Budget Amount
            <input type="number" min="0" step="0.01" value={form.budgetAmount} onChange={(event) => update('budgetAmount', event.target.value)} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/society/festivals')}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Festival'}</button>
        </div>
      </form>
    </Shell>
  )
}
