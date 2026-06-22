import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { expenseAPI, expenseCategoryAPI, festivalEventAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { Shell } from './DashboardRouter'

const initialForm = {
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: '',
  expenseType: '',
  festivalEventId: '',
  description: '',
  amount: '',
  paymentMode: 'CASH',
  transactionId: '',
  utr: '',
  chequeNumber: '',
  vendorName: '',
  remarks: '',
  status: 'DRAFT'
}

const expenseTypesByAccount = {
  INDIVIDUAL: ['PERSONAL'],
  SOCIETY: ['SOCIETY_REGULAR', 'FESTIVAL'],
  KIRANA_STORE: ['STORE_EXPENSE']
}

export const ExpenseForm = () => {
  const { expenseId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [categories, setCategories] = useState([])
  const [festivals, setFestivals] = useState([])
  const isEdit = Boolean(expenseId)
  const isApproved = isEdit && form.status === 'APPROVED'
  const showFestivalEvent = currentAccount?.accountType === 'SOCIETY' && form.expenseType === 'FESTIVAL'

  const availableTypes = useMemo(() => expenseTypesByAccount[currentAccount?.accountType] || ['PERSONAL'], [currentAccount])

  useEffect(() => {
    expenseCategoryAPI.getCategories().then((response) => setCategories(response.data || []))
  }, [])

  useEffect(() => {
    if (currentAccount?.accountType !== 'SOCIETY') return
    festivalEventAPI.getFestivals()
      .then((response) => setFestivals(response.data || []))
      .catch(() => toast.error('Unable to load festival events'))
  }, [currentAccount])

  useEffect(() => {
    setForm((current) => ({ ...current, expenseType: current.expenseType || availableTypes[0] }))
  }, [availableTypes])

  useEffect(() => {
    if (!isEdit) return
    expenseAPI.getExpense(expenseId)
      .then((response) => {
        const expense = response.data
        if (expense.status === 'APPROVED') {
          toast.error('Cannot update approved expense')
        }
        setForm({
          expenseDate: expense.expenseDate || initialForm.expenseDate,
          categoryId: expense.categoryId || '',
          expenseType: expense.expenseType || availableTypes[0],
          festivalEventId: expense.festivalEventId || '',
          description: expense.description || '',
          amount: expense.amount || '',
          paymentMode: expense.paymentMode || 'CASH',
          transactionId: expense.transactionId || '',
          utr: expense.utr || '',
          chequeNumber: expense.chequeNumber || '',
          vendorName: expense.vendorName || '',
          remarks: expense.remarks || '',
          status: expense.status || 'DRAFT'
        })
      })
      .catch(() => toast.error('Unable to load expense'))
  }, [expenseId, isEdit, availableTypes])

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'expenseType' && value !== 'FESTIVAL' ? { festivalEventId: '' } : {})
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isApproved) {
      toast.error('Cannot update approved expense')
      return
    }
    if (showFestivalEvent && !form.festivalEventId) {
      toast.error('Festival event is required')
      return
    }
    if ((form.paymentMode === 'UPI' || form.paymentMode === 'NEFT') && !form.utr.trim()) {
      toast.error('UTR is required for UPI/NEFT')
      return
    }
    if (form.paymentMode === 'CHEQUE' && !form.chequeNumber.trim()) {
      toast.error('Cheque number is required')
      return
    }

    const payload = {
      ...form,
      categoryId: Number(form.categoryId),
      festivalEventId: showFestivalEvent ? Number(form.festivalEventId) : null,
      amount: Number(form.amount),
      transactionId: form.transactionId || null,
      utr: form.utr || null,
      chequeNumber: form.chequeNumber || null,
      vendorName: form.vendorName || null,
      remarks: form.remarks || null,
      description: form.description || null
    }

    try {
      if (isEdit) await expenseAPI.updateExpense(expenseId, payload)
      else await expenseAPI.createExpense(payload)
      toast.success(isEdit ? 'Expense updated' : 'Expense created')
      navigate('/expenses')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save expense')
    }
  }

  return (
    <Shell title={isEdit ? 'Edit Expense' : 'Add Expense'} eyebrow="Common module">
      {isApproved && (
        <section className="alert-panel error">
          Cannot update approved expense.
        </section>
      )}
      <form className="form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Date
            <input type="date" value={form.expenseDate} onChange={(event) => update('expenseDate', event.target.value)} required disabled={isApproved} />
          </label>
          <label>
            Category
            <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} required disabled={isApproved}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}
            </select>
          </label>
          <label>
            Expense Type
            <select value={form.expenseType} onChange={(event) => update('expenseType', event.target.value)} required disabled={isApproved}>
              {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          {showFestivalEvent && (
            <label>
              Festival Event
              <select value={form.festivalEventId} onChange={(event) => update('festivalEventId', event.target.value)} required disabled={isApproved}>
                <option value="">Select festival</option>
                {festivals.map((festival) => (
                  <option key={festival.id} value={festival.id}>{festival.festivalName} ({festival.year})</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Amount
            <input type="number" min="1" step="0.01" value={form.amount} onChange={(event) => update('amount', event.target.value)} required disabled={isApproved} />
          </label>
          <label>
            Payment Mode
            <select value={form.paymentMode} onChange={(event) => update('paymentMode', event.target.value)} required disabled={isApproved}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NEFT">NEFT</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => update('status', event.target.value)} disabled={isApproved}>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </select>
          </label>
          <label>
            Vendor
            <input value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} disabled={isApproved} />
          </label>
          <label>
            Transaction ID
            <input value={form.transactionId} onChange={(event) => update('transactionId', event.target.value)} disabled={isApproved} />
          </label>
          <label>
            UTR
            <input value={form.utr} onChange={(event) => update('utr', event.target.value)} disabled={isApproved} />
          </label>
          <label>
            Cheque Number
            <input value={form.chequeNumber} onChange={(event) => update('chequeNumber', event.target.value)} disabled={isApproved} />
          </label>
        </div>
        <label>
          Description
          <textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="3" disabled={isApproved} />
        </label>
        <label>
          Remarks
          <textarea value={form.remarks} onChange={(event) => update('remarks', event.target.value)} rows="3" disabled={isApproved} />
        </label>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/expenses')}>Cancel</button>
          <button type="submit" className="primary" disabled={isApproved}>Save Expense</button>
        </div>
      </form>
    </Shell>
  )
}
