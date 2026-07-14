import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { expenseAPI, expenseCategoryAPI } from '../../../api/endpoints'

const blank = (financialYear) => ({
  expenseDate: `${financialYear.slice(0, 4)}-04-01`,
  categoryId: '',
  expenseType: 'SOCIETY_REGULAR',
  vendorName: '',
  description: '',
  amount: '',
  paymentMode: 'CASH',
  transactionId: '',
  utr: '',
  chequeNumber: '',
  status: 'DRAFT',
  remarks: ''
})

export const ExpenseModal = ({ open, financialYear, expense, onClose, onSaved }) => {
  const [form, setForm] = useState(blank(financialYear))
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setForm(expense
      ? { ...blank(financialYear), ...expense, categoryId: expense.categoryId || '' }
      : blank(financialYear))
    expenseCategoryAPI.getCategories()
      .then((response) => setCategories((response.data || []).filter((category) => category.categoryType === 'SOCIETY_REGULAR')))
      .catch(() => toast.error('Unable to load categories'))
  }, [open, financialYear, expense])

  if (!open) return null

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'paymentMode' && value !== 'CHEQUE' ? { chequeNumber: '' } : {}),
      ...(field === 'paymentMode' && value !== 'UPI' && value !== 'NEFT' ? { utr: '' } : {})
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if ((form.paymentMode === 'UPI' || form.paymentMode === 'NEFT') && !form.utr.trim()) {
      toast.error('UTR is required for UPI/NEFT')
      return
    }
    if (form.paymentMode === 'CHEQUE' && !form.chequeNumber.trim()) {
      toast.error('Cheque number is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        expenseType: 'SOCIETY_REGULAR',
        categoryId: Number(form.categoryId),
        amount: Number(form.amount),
        vendorName: form.vendorName || null,
        description: form.description || null,
        transactionId: form.transactionId || null,
        utr: form.utr || null,
        chequeNumber: form.chequeNumber || null,
        remarks: form.remarks || null,
        festivalEventId: null
      }
      if (expense) await expenseAPI.updateExpense(expense.id, payload)
      else await expenseAPI.createExpense(payload)
      toast.success(expense ? 'Expense updated' : 'Expense created')
      onSaved()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save expense')
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={() => !saving && onClose()}>
    <section className="expense-modal annual-finance-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="expense-modal-header">
        <div><h2 id="expense-modal-title">{expense ? 'Edit Expense' : 'Add Expense'}</h2><p className="muted">Financial year {financialYear}</p></div>
        <button type="button" className="modal-close" aria-label="Close" disabled={saving} onClick={onClose}>&times;</button>
      </div>
      <form onSubmit={submit}>
        <div className="expense-modal-form">
          <label>Date<input required type="date" min={`${financialYear.slice(0, 4)}-04-01`} max={`${financialYear.slice(5)}-03-31`} value={form.expenseDate} onChange={(event) => update('expenseDate', event.target.value)} /></label>
          <label>Category<select required value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}</select></label>
          <label>Vendor<input value={form.vendorName || ''} onChange={(event) => update('vendorName', event.target.value)} /></label>
          <label>Description<input value={form.description || ''} onChange={(event) => update('description', event.target.value)} /></label>
          <label>Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update('amount', event.target.value)} /></label>
          <label>Payment mode<select value={form.paymentMode} onChange={(event) => update('paymentMode', event.target.value)}>{['CASH', 'BANK', 'UPI', 'CARD', 'NEFT', 'CHEQUE'].map((mode) => <option key={mode}>{mode}</option>)}</select></label>
          {(form.paymentMode === 'UPI' || form.paymentMode === 'NEFT') && <label>UTR<input required value={form.utr || ''} onChange={(event) => update('utr', event.target.value)} /></label>}
          {form.paymentMode === 'CHEQUE' && <label>Cheque number<input required value={form.chequeNumber || ''} onChange={(event) => update('chequeNumber', event.target.value)} /></label>}
          {(form.paymentMode === 'BANK' || form.paymentMode === 'CARD') && <label>Transaction ID<input value={form.transactionId || ''} onChange={(event) => update('transactionId', event.target.value)} /></label>}
          <label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}>{['DRAFT', 'SUBMITTED', 'PAID'].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Remarks<input value={form.remarks || ''} onChange={(event) => update('remarks', event.target.value)} /></label>
        </div>
        <div className="expense-modal-actions"><button type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving...' : expense ? 'Save Changes' : 'Add Expense'}</button></div>
      </form>
    </section>
  </div>
}
