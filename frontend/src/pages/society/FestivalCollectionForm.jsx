import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { festivalCollectionAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const FestivalCollectionForm = ({ collectionId: selectedCollectionId, onClose, onSaved, onSavingChange }) => {
  const { festivalEventId, collectionId: routeCollectionId } = useParams()
  const collectionId = selectedCollectionId || routeCollectionId
  const navigate = useNavigate()
  const { currentAccount, user } = useAuthStore()
  const [collection, setCollection] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amountPaid: '',
    paymentMode: 'CASH',
    transactionId: '',
    utr: '',
    chequeNumber: '',
    collectedBy: user?.name || '',
    remarks: ''
  })

  useEffect(() => {
    let active = true
    festivalCollectionAPI.getCollection(collectionId)
      .then((response) => {
        if (!active) return
        setCollection(response.data)
        setForm((current) => ({ ...current, amountPaid: response.data.pendingAmount || '' }))
      })
      .catch((error) => { if (active) setLoadError(error.response?.data?.message || 'Unable to load collection. Close and try again.') })
    return () => { active = false }
  }, [collectionId])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving || !collection || currentAccount?.role === 'MEMBER') return
    if ((form.paymentMode === 'UPI' || form.paymentMode === 'NEFT') && !form.utr.trim()) {
      toast.error('UTR is required for UPI/NEFT')
      return
    }
    if (form.paymentMode === 'CHEQUE' && !form.chequeNumber.trim()) {
      toast.error('Cheque number is required for cheque payments')
      return
    }
    setSaving(true)
    onSavingChange?.(true)
    try {
      const response = await festivalCollectionAPI.addPayment(collectionId, {
        paymentDate: form.paymentDate,
        amountPaid: Number(form.amountPaid),
        paymentMode: form.paymentMode,
        transactionId: form.transactionId.trim() || null,
        utr: form.utr.trim() || null,
        chequeNumber: form.chequeNumber.trim() || null,
        collectedBy: form.collectedBy.trim(),
        remarks: form.remarks.trim() || null
      })
      toast.success('Payment added')
      if (onSaved) onSaved(response.data)
      else navigate(`/society/festival-collections/${festivalEventId}/${collectionId}/receipts`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add payment')
    } finally {
      setSaving(false)
      onSavingChange?.(false)
    }
  }

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Add Collection Payment" eyebrow="Society module">
        <p className="muted">Festival collections are available for society accounts.</p>
      </Shell>
    )
  }

  const content = (
    <>
      {loadError && <p role="alert">{loadError}</p>}
      {!collection && !loadError && <p role="status">Loading collection...</p>}
      {collection && (
        <SummaryGrid items={[
          ['Flat', `${collection.blockName}-${collection.flatNumber}`],
          ['Expected', formatCurrency(collection.expectedAmount)],
          ['Collected', formatCurrency(collection.collectedAmount)],
          ['Pending', formatCurrency(collection.pendingAmount)]
        ]} />
      )}

      <form className="form-panel narrow" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Payment Date
            <input type="date" value={form.paymentDate} onChange={(event) => update('paymentDate', event.target.value)} required />
          </label>
          <label>
            Amount Paid
            <input type="number" min="0.01" step="0.01" value={form.amountPaid} onChange={(event) => update('amountPaid', event.target.value)} required />
          </label>
          <label>
            Payment Mode
            <select value={form.paymentMode} onChange={(event) => update('paymentMode', event.target.value)}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank</option>
              <option value="NEFT">NEFT</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </label>
          <label>
            Collected By
            <input value={form.collectedBy} onChange={(event) => update('collectedBy', event.target.value)} required />
          </label>
          {(form.paymentMode === 'UPI' || form.paymentMode === 'NEFT') && (
            <label>
              UTR
              <input value={form.utr} onChange={(event) => update('utr', event.target.value)} required />
            </label>
          )}
          {form.paymentMode === 'CHEQUE' && (
            <label>
              Cheque Number
              <input value={form.chequeNumber} onChange={(event) => update('chequeNumber', event.target.value)} required />
            </label>
          )}
          <label>
            Transaction ID
            <input value={form.transactionId} onChange={(event) => update('transactionId', event.target.value)} />
          </label>
          <label>
            Remarks
            <input value={form.remarks} onChange={(event) => update('remarks', event.target.value)} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" disabled={saving} onClick={() => onClose ? onClose() : navigate(`/society/festival-collections/${festivalEventId}`)}>Cancel</button>
          <button type="submit" className="primary" disabled={saving || !collection || currentAccount?.role === 'MEMBER'}>{saving ? 'Saving...' : 'Save Payment'}</button>
        </div>
      </form>
    </>
  )
  return onClose ? content : <Shell title="Add Collection Payment" eyebrow="Society module">{content}</Shell>
}
