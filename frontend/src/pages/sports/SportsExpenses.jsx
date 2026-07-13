import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)
const paymentModes = ['CASH', 'BANK', 'UPI', 'CARD', 'NEFT', 'CHEQUE']
const expenseStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID']
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState({ search: '', eventId: '', paymentMode: '' })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'expenseDate', direction: 'desc' })

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
    const filtered = expenses
      .filter((expense) => !filters.eventId || String(expense.sportsEventId || '') === filters.eventId)
      .filter((expense) => !filters.paymentMode || expense.paymentMode === filters.paymentMode)
      .filter((expense) => !query || [expense.category, expense.vendorName, expense.description, expense.eventName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)))
    return sortRows(filtered, sort)
  }, [expenses, filters, sort])

  useEffect(() => setPage(1), [filters, sort])

  const pageSize = 20
  const pageCount = Math.max(1, Math.ceil(visibleExpenses.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageExpenses = visibleExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const total = visibleExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const toggleSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
  }))

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
    setIsModalOpen(false)
  }

  const addExpense = () => {
    setEditingId(null)
    setForm(initialForm)
    setIsModalOpen(true)
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
    setIsModalOpen(true)
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
    <Shell title="Sports Expenses" eyebrow="Sports module" actions={isSportsAdmin && <button className="primary" onClick={addExpense}>Add Expense</button>}>
      <SummaryGrid items={[[ 'Shown Total', formatCurrency(total) ], [ 'Expenses', visibleExpenses.length ]]} />
      {isSportsAdmin && isModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={resetForm}>
        <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="expense-modal-header">
            <h2 id="expense-modal-title">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
            <button type="button" className="modal-close" aria-label="Close" onClick={resetForm}>×</button>
          </div>
          <form className="expense-modal-form" onSubmit={submit}>
            <select aria-label="Sports event" value={form.sportsEventId} onChange={(event) => updateForm('sportsEventId', event.target.value)}><option value="">No event</option>{events.map((sportsEvent) => <option key={sportsEvent.id} value={sportsEvent.id}>{sportsEvent.eventName} ({sportsEvent.year})</option>)}</select>
            <input aria-label="Expense date" type="date" value={form.expenseDate} onChange={(event) => updateForm('expenseDate', event.target.value)} required />
            <select aria-label="Category" value={form.category} onChange={(event) => updateForm('category', event.target.value)} required><option value="">Select category</option>{sportsCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            {form.category === 'Other' && <input placeholder="Other category" value={form.customCategory} onChange={(event) => updateForm('customCategory', event.target.value)} required />}
            <input placeholder="Description" value={form.description} onChange={(event) => updateForm('description', event.target.value)} />
            <input type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} required />
            <select aria-label="Payment mode" value={form.paymentMode} onChange={(event) => updateForm('paymentMode', event.target.value)}>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
            <select aria-label="Expense status" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>{expenseStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <input placeholder="Vendor / Paid to" value={form.vendorName} onChange={(event) => updateForm('vendorName', event.target.value)} />
            <input placeholder="UTR" value={form.utr} onChange={(event) => updateForm('utr', event.target.value)} />
            <div className="expense-modal-actions"><button type="button" onClick={resetForm}>Cancel</button><button className="primary" type="submit">{editingId ? 'Update Expense' : 'Add Expense'}</button></div>
          </form>
        </section>
      </div>}
      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search event, category, description, vendor" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.eventId} onChange={(event) => setFilters({ ...filters, eventId: event.target.value })}><option value="">All events</option>{events.map((sportsEvent) => <option key={sportsEvent.id} value={sportsEvent.id}>{sportsEvent.eventName} ({sportsEvent.year})</option>)}</select>
        <select value={filters.paymentMode} onChange={(event) => setFilters({ ...filters, paymentMode: event.target.value })}><option value="">All modes</option>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
        <strong>{formatCurrency(total)}</strong>
      </section>

      <section className="sports-expense-mobile-sort">
        <label>Sort by
          <select value={sort.key} onChange={(event) => setSort({ key: event.target.value, direction: 'asc' })}>
            <option value="expenseDate">Date</option><option value="eventName">Event</option><option value="category">Category</option><option value="vendorName">Vendor</option><option value="paymentMode">Payment</option><option value="status">Status</option><option value="amount">Amount</option>
          </select>
        </label>
        <button type="button" onClick={() => setSort((current) => ({ ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }))}>
          {sort.direction === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </section>

      <div className="personal-expense-mobile-list sports-expense-mobile-list">
        {pageExpenses.map((expense) => (
          <details className="personal-expense-row" key={expense.id}>
            <summary>
              <span className="personal-expense-row-main">
                <span className="personal-expense-row-heading"><strong>{expense.category}</strong><strong className="personal-expense-row-amount">{formatCurrency(expense.amount)}</strong></span>
                <span className="personal-expense-row-description">{expense.description || expense.eventName || 'No description'}</span>
                <span className="personal-expense-row-meta">{formatDate(expense.expenseDate)} · {expense.paymentMode || '-'}</span>
              </span>
              <span className="personal-expense-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div className="personal-expense-details">
              <dl>
                <div><dt>Date</dt><dd>{formatDate(expense.expenseDate)}</dd></div><div><dt>Event</dt><dd>{expense.eventName || '-'}</dd></div><div><dt>Category</dt><dd>{expense.category}</dd></div><div><dt>Description</dt><dd>{expense.description || '-'}</dd></div><div><dt>Vendor</dt><dd>{expense.vendorName || '-'}</dd></div><div><dt>Payment</dt><dd>{expense.paymentMode}</dd></div><div><dt>Status</dt><dd>{expense.status}</dd></div><div><dt>Amount</dt><dd>{formatCurrency(expense.amount)}</dd></div>
              </dl>
              {isSportsAdmin && <div className="table-actions"><button onClick={() => edit(expense)}>Edit</button><button className="danger" onClick={() => remove(expense.id)}>Delete</button></div>}
            </div>
          </details>
        ))}
        {!loading && !pageExpenses.length && <p className="empty-state">No sports expenses found.</p>}
      </div>

      <div className="table-wrap sports-expense-table-wrap sports-expense-desktop-table">
        <table className="sports-expense-table">
          <thead><tr><SortableTh label="Date" sortKey="expenseDate" sort={sort} onSort={toggleSort}/><SortableTh label="Event" sortKey="eventName" sort={sort} onSort={toggleSort}/><SortableTh label="Category" sortKey="category" sort={sort} onSort={toggleSort}/><th>Description</th><SortableTh label="Vendor" sortKey="vendorName" sort={sort} onSort={toggleSort}/><SortableTh label="Payment" sortKey="paymentMode" sort={sort} onSort={toggleSort}/><SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort}/><SortableTh label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} className="numeric"/>{isSportsAdmin && <th>Actions</th>}</tr></thead>
          <tbody>
            {pageExpenses.map((expense) => <tr key={expense.id}><td>{formatDate(expense.expenseDate)}</td><td>{expense.eventName || '-'}</td><td>{expense.category}</td><td className="description-cell">{expense.description || '-'}</td><td>{expense.vendorName || '-'}</td><td>{expense.paymentMode}</td><td>{expense.status}</td><td className="numeric">{formatCurrency(expense.amount)}</td>{isSportsAdmin && <td className="table-actions"><button onClick={() => edit(expense)}>Edit</button><button className="danger" onClick={() => remove(expense.id)}>Delete</button></td>}</tr>)}
            {!loading && visibleExpenses.length === 0 && <tr><td colSpan={isSportsAdmin ? 9 : 8} className="empty-state">No sports expenses found.</td></tr>}
          </tbody>
        </table>
      </div>
      {visibleExpenses.length > pageSize && <nav className="table-pagination" aria-label="Sports expense pages"><button type="button" disabled={currentPage===1} onClick={()=>setPage(1)}>«</button><button type="button" disabled={currentPage===1} onClick={()=>setPage((value)=>Math.max(1,value-1))}>‹</button><span>Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage===pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))}>›</button><button type="button" disabled={currentPage===pageCount} onClick={()=>setPage(pageCount)}>»</button></nav>}
      {loading && <p className="muted">Loading expenses...</p>}
    </Shell>
  )
}

const sportsExpenseSortAccessors = { expenseDate: (item) => item.expenseDate || '', eventName: (item) => item.eventName || '', category: (item) => item.category || '', vendorName: (item) => item.vendorName || '', paymentMode: (item) => item.paymentMode || '', status: (item) => item.status || '', amount: (item) => Number(item.amount || 0) }
const sortRows = (rows, sort) => [...rows].sort((a, b) => { const first=sportsExpenseSortAccessors[sort.key](a),second=sportsExpenseSortAccessors[sort.key](b),comparison=typeof first==='number'?first-Number(second||0):String(first).localeCompare(String(second),undefined,{numeric:true,sensitivity:'base'});return comparison*(sort.direction==='asc'?1:-1)||Number(b.id||0)-Number(a.id||0) })
const SortableTh = ({label,sortKey,sort,onSort,className}) => { const active=sort.key===sortKey;return <th className={className} aria-sort={active?(sort.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className="sortable-header" onClick={()=>onSort(sortKey)}><span>{label}</span><span className="sort-symbol" aria-hidden="true">{active?(sort.direction==='asc'?'↑':'↓'):'↕'}</span></button></th> }
