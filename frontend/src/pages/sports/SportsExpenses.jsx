import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)
const paymentModes = ['CASH', 'BANK', 'UPI', 'CARD', 'NEFT', 'CHEQUE']
const sportsCategories = [
  'Equipment',
  'Ground Booking',
  'Ground Preparation',
  'Referee / Umpire Fee',
  'Jerseys / Uniforms',
  'Refreshments',
  'Medical / First Aid',
  'Travel',
  'Tournament Entry Fee',
  'Electricity / Lights',
  'Maintenance / Repair',
  'Miscellaneous',
  'Other'
]
const initialForm = {
  sportsEventId: '',
  expenseDate: today,
  category: '',
  customCategory: '',
  amount: '',
  paymentMode: 'CASH',
  vendorName: '',
  utr: '',
  chequeNumber: '',
  description: '',
  remarks: '',
  status: 'DRAFT'
}

export const SportsExpenses = () => {
  const { currentAccount } = useAuthStore()
  const isSportsAdmin = ['OWNER', 'ADMIN', 'TREASURER'].includes(currentAccount?.role)
  const [events, setEvents] = useState([])
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState({ search: '', eventId: '', paymentMode: '' })
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    Promise.all([sportsAPI.getEvents(), sportsAPI.getExpenses()])
      .then(([eventResponse, expenseResponse]) => {
        setEvents(eventResponse.data || [])
        setExpenses(expenseResponse.data || [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sports expenses'))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const visibleExpenses = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return expenses
      .filter((expense) => !filters.eventId || String(expense.sportsEventId || '') === filters.eventId)
      .filter((expense) => !filters.paymentMode || expense.paymentMode === filters.paymentMode)
      .filter((expense) => !query || [expense.category, expense.vendorName, expense.description, expense.eventName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)))
  }, [expenses, filters])

  const total = visibleExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'category' && value !== 'Other' ? { customCategory: '' } : {})
    }))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(initialForm)
  }

  const buildPayload = () => {
    const category = form.category === 'Other' ? form.customCategory.trim() : form.category
    if (!category) return null
    return {
      ...form,
      category,
      customCategory: undefined,
      sportsEventId: form.sportsEventId ? Number(form.sportsEventId) : null,
      amount: Number(form.amount),
      utr: form.utr || null,
      chequeNumber: form.chequeNumber || null,
      description: form.description.trim() || null,
      vendorName: form.vendorName.trim() || null,
      remarks: form.remarks.trim() || null
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const payload = buildPayload()
    if (!payload) {
      toast.error('Category is required')
      return
    }

    try {
      if (editingId) await sportsAPI.updateExpense(editingId, payload)
      else await sportsAPI.createExpense(payload)
      toast.success(editingId ? 'Expense updated' : 'Expense added')
      resetForm()
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save expense')
    }
  }

  const edit = (expense) => {
    const isKnownCategory = sportsCategories.includes(expense.category)
    setEditingId(expense.id)
    setForm({
      sportsEventId: expense.sportsEventId || '',
      expenseDate: expense.expenseDate || today,
      category: isKnownCategory ? expense.category : 'Other',
      customCategory: isKnownCategory ? '' : expense.category || '',
      amount: expense.amount || '',
      paymentMode: expense.paymentMode || 'CASH',
      vendorName: expense.vendorName || '',
      utr: expense.utr || '',
      chequeNumber: expense.chequeNumber || '',
      description: expense.description || '',
      remarks: expense.remarks || '',
      status: expense.status || 'DRAFT'
    })
  }

  const remove = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await sportsAPI.deleteExpense(expenseId)
      toast.success('Expense deleted')
      if (editingId === expenseId) resetForm()
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Expenses" eyebrow="Sports"><p className="muted">Sports expenses are available for sports accounts.</p></Shell>
  }

  return (
    <Shell title="Sports Expenses" eyebrow="Sports module">
      <SummaryGrid items={[[ 'Shown Total', formatCurrency(total) ], [ 'Expenses', visibleExpenses.length ]]} />
      {isSportsAdmin && <form className="inline-form" onSubmit={submit}>
        <select value={form.sportsEventId} onChange={(event) => updateForm('sportsEventId', event.target.value)}>
          <option value="">No event</option>
          {events.map((sportsEvent) => <option key={sportsEvent.id} value={sportsEvent.id}>{sportsEvent.eventName} ({sportsEvent.year})</option>)}
        </select>
        <input type="date" value={form.expenseDate} onChange={(event) => updateForm('expenseDate', event.target.value)} required />
        <select value={form.category} onChange={(event) => updateForm('category', event.target.value)} required>
          <option value="">Select category</option>
          {sportsCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        {form.category === 'Other' && (
          <input placeholder="Other category" value={form.customCategory} onChange={(event) => updateForm('customCategory', event.target.value)} required />
        )}
        <input placeholder="Description" value={form.description} onChange={(event) => updateForm('description', event.target.value)} />
        <input type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} required />
        <select value={form.paymentMode} onChange={(event) => updateForm('paymentMode', event.target.value)}>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
        <input placeholder="Vendor / Paid to" value={form.vendorName} onChange={(event) => updateForm('vendorName', event.target.value)} />
        <input placeholder="UTR" value={form.utr} onChange={(event) => updateForm('utr', event.target.value)} />
        <button className="primary" type="submit">{editingId ? 'Update Expense' : 'Add Expense'}</button>
        {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
      </form>}
      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search event, category, description, vendor" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.eventId} onChange={(event) => setFilters({ ...filters, eventId: event.target.value })}><option value="">All events</option>{events.map((sportsEvent) => <option key={sportsEvent.id} value={sportsEvent.id}>{sportsEvent.eventName} ({sportsEvent.year})</option>)}</select>
        <select value={filters.paymentMode} onChange={(event) => setFilters({ ...filters, paymentMode: event.target.value })}><option value="">All modes</option>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
        <strong>{formatCurrency(total)}</strong>
      </section>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Event</th><th>Category</th><th>Description</th><th>Vendor</th><th>Payment</th><th>Status</th><th className="numeric">Amount</th>{isSportsAdmin && <th>Actions</th>}</tr></thead>
          <tbody>
            {visibleExpenses.map((expense) => <tr key={expense.id}><td>{formatDate(expense.expenseDate)}</td><td>{expense.eventName || '-'}</td><td>{expense.category}</td><td>{expense.description || '-'}</td><td>{expense.vendorName || '-'}</td><td>{expense.paymentMode}</td><td>{expense.status}</td><td className="numeric">{formatCurrency(expense.amount)}</td>{isSportsAdmin && <td className="table-actions"><button onClick={() => edit(expense)}>Edit</button><button className="danger" onClick={() => remove(expense.id)}>Delete</button></td>}</tr>)}
            {!loading && visibleExpenses.length === 0 && <tr><td colSpan={isSportsAdmin ? 9 : 8} className="empty-state">No sports expenses found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading expenses...</p>}
    </Shell>
  )
}
