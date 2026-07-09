import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { expenseAPI, expenseCategoryAPI } from '../api/endpoints'
import { Shell } from './DashboardRouter'
import { formatCurrency, formatDate } from '../utils/format'
import { useAuthStore } from '../store/authStore'

export const ExpenseList = () => {
  const navigate = useNavigate()
  const currentAccount = useAuthStore((state) => state.currentAccount)
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMode: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  })

  const loadExpenses = () => {
    setLoading(true)
    expenseAPI.getExpenses()
      .then((response) => setExpenses(response.data || []))
      .catch(() => toast.error('Unable to load expenses'))
      .finally(() => setLoading(false))
  }

  useEffect(loadExpenses, [])

  useEffect(() => {
    expenseCategoryAPI.getCategories()
      .then((response) => setCategories(response.data || []))
      .catch(() => {})
  }, [])

  const visibleExpenses = useMemo(() => {
    const search = filters.search.toLowerCase()
    return expenses.filter((expense) => {
      const matchesSearch = !search || [expense.description, expense.vendorName, expense.categoryName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
      const matchesStatus = !filters.status || expense.status === filters.status
      const matchesPayment = !filters.paymentMode || expense.paymentMode === filters.paymentMode
      const matchesCategory = !filters.categoryId || String(expense.categoryId) === filters.categoryId
      const matchesStartDate = !filters.startDate || expense.expenseDate >= filters.startDate
      const matchesEndDate = !filters.endDate || expense.expenseDate <= filters.endDate
      const amount = Number(expense.amount || 0)
      const matchesMinAmount = !filters.minAmount || amount >= Number(filters.minAmount)
      const matchesMaxAmount = !filters.maxAmount || amount <= Number(filters.maxAmount)
      return matchesSearch && matchesStatus && matchesPayment && matchesCategory && matchesStartDate && matchesEndDate && matchesMinAmount && matchesMaxAmount
    }).sort((a, b) => {
      const byDate = String(b.expenseDate || '').localeCompare(String(a.expenseDate || ''))
      return byDate || Number(b.id || 0) - Number(a.id || 0)
    })
  }, [expenses, filters])

  const total = visibleExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await expenseAPI.deleteExpense(expenseId)
      toast.success('Expense deleted')
      loadExpenses()
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  const handleApprove = async (expenseId) => {
    try {
      await expenseAPI.approveExpense(expenseId)
      toast.success('Expense approved')
      loadExpenses()
    } catch (error) {
      toast.error('Approval failed')
    }
  }

  const handleReject = async (expenseId) => {
    try {
      await expenseAPI.rejectExpense(expenseId)
      toast.success('Expense rejected')
      loadExpenses()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reject failed')
    }
  }

  const handleEdit = (expense) => {
    if (expense.status === 'APPROVED') {
      toast.error('Cannot update approved expense')
      return
    }
    navigate(`/expenses/${expense.id}/edit`)
  }

  const handlePreview = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const response = await expenseAPI.previewImport(file)
      setPreview(response.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to read the Excel file')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const setImportCategory = (rowNumber, categoryId) => {
    const category = categories.find((item) => String(item.id) === String(categoryId))
    setPreview((current) => ({
      ...current,
      rows: current.rows.map((row) => row.rowNumber === rowNumber
        ? { ...row, categoryId: category?.id || null, categoryName: category?.categoryName || null }
        : row)
    }))
  }

  const confirmImport = async () => {
    const rows = (preview?.rows || []).filter((row) => !row.duplicate && !row.errors?.length)
    const missing = rows.filter((row) => !row.categoryId)
    if (missing.length) {
      toast.error(`Select a category for ${missing.length} row(s)`)
      return
    }
    setImporting(true)
    try {
      const response = await expenseAPI.confirmImport(rows)
      toast.success(`Imported ${response.data.created} expense(s); skipped ${response.data.skipped}`)
      setPreview(null)
      setImportOpen(false)
      loadExpenses()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Expense import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Shell
      title="Expenses"
      eyebrow="Common module"
      actions={<div className="table-actions">
        {currentAccount?.accountType === 'SOCIETY' && <button onClick={() => setImportOpen(true)}>Import Excel</button>}
        <Link className="button-link" to="/expenses/new">Add Expense</Link>
      </div>}
    >
      {currentAccount?.accountType === 'INDIVIDUAL' && (
        <section className="personal-expense-mobile-toolbar">
          <div><span>Filtered total</span><strong>{formatCurrency(total)}</strong></div>
          <button onClick={() => setFiltersOpen(true)}>Filters</button>
        </section>
      )}

      <section className={`toolbar-panel ${currentAccount?.accountType === 'INDIVIDUAL' ? 'personal-expense-desktop-filters' : ''}`}>
        <input placeholder="Search category, vendor, description" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PAID">Paid</option>
        </select>
        <select value={filters.paymentMode} onChange={(event) => setFilters({ ...filters, paymentMode: event.target.value })}>
          <option value="">All payment modes</option>
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="NEFT">NEFT</option>
          <option value="CHEQUE">Cheque</option>
        </select>
        <select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}
        </select>
        <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
        <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
        <input type="number" min="0" placeholder="Min amount" value={filters.minAmount} onChange={(event) => setFilters({ ...filters, minAmount: event.target.value })} />
        <input type="number" min="0" placeholder="Max amount" value={filters.maxAmount} onChange={(event) => setFilters({ ...filters, maxAmount: event.target.value })} />
        <strong>{formatCurrency(total)}</strong>
      </section>

      {filtersOpen && (
        <div className="modal-backdrop personal-filter-backdrop" role="presentation" onMouseDown={() => setFiltersOpen(false)}>
          <section className="expense-modal personal-filter-modal" role="dialog" aria-modal="true" aria-labelledby="personal-filter-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="expense-modal-header">
              <div><h2 id="personal-filter-title">Filter expenses</h2><p className="muted">Narrow down the records shown below.</p></div>
              <button className="modal-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>×</button>
            </div>
            <div className="personal-filter-fields">
              <label>Search<input placeholder="Category, vendor or description" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
              <label>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="">All statuses</option><option value="DRAFT">Draft</option><option value="SUBMITTED">Submitted</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="PAID">Paid</option>
              </select></label>
              <label>Payment mode<select value={filters.paymentMode} onChange={(event) => setFilters({ ...filters, paymentMode: event.target.value })}>
                <option value="">All payment modes</option><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="NEFT">NEFT</option><option value="CHEQUE">Cheque</option>
              </select></label>
              <label>Category<select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
                <option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}
              </select></label>
              <label>From date<input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
              <label>To date<input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
              <label>Minimum amount<input type="number" min="0" placeholder="0" value={filters.minAmount} onChange={(event) => setFilters({ ...filters, minAmount: event.target.value })} /></label>
              <label>Maximum amount<input type="number" min="0" placeholder="No maximum" value={filters.maxAmount} onChange={(event) => setFilters({ ...filters, maxAmount: event.target.value })} /></label>
            </div>
            <div className="expense-modal-actions">
              <button onClick={() => setFilters({ search: '', status: '', paymentMode: '', categoryId: '', startDate: '', endDate: '', minAmount: '', maxAmount: '' })}>Clear all</button>
              <button className="primary" onClick={() => setFiltersOpen(false)}>Show {visibleExpenses.length} expenses</button>
            </div>
          </section>
        </div>
      )}

      {currentAccount?.accountType === 'INDIVIDUAL' && (
        <div className="personal-expense-mobile-list">
          {visibleExpenses.map((expense) => (
            <details className="personal-expense-row" key={expense.id}>
              <summary>
                <span className="personal-expense-row-main">
                  <span className="personal-expense-row-heading">
                    <strong>{expense.categoryName || 'Uncategorized'}</strong>
                    <strong className="personal-expense-row-amount">{formatCurrency(expense.amount)}</strong>
                  </span>
                  <span className="personal-expense-row-description">{expense.description || 'No description'}</span>
                  <span className="personal-expense-row-meta">{formatDate(expense.expenseDate)} · {expense.paymentMode || '-'}</span>
                </span>
                <span className="personal-expense-chevron" aria-hidden="true">⌄</span>
              </summary>
              <div className="personal-expense-details">
                <dl>
                  <div><dt>Date</dt><dd>{formatDate(expense.expenseDate)}</dd></div>
                  <div><dt>Category</dt><dd>{expense.categoryName || '-'}</dd></div>
                  <div><dt>Description</dt><dd>{expense.description || '-'}</dd></div>
                  <div><dt>Type</dt><dd>{expense.expenseType || '-'}</dd></div>
                  <div><dt>Vendor</dt><dd>{expense.vendorName || '-'}</dd></div>
                  <div><dt>Payment</dt><dd>{expense.paymentMode || '-'}</dd></div>
                  <div><dt>Status</dt><dd><span className={`status-pill ${String(expense.status).toLowerCase()}`}>{expense.status}</span></dd></div>
                  <div><dt>Amount</dt><dd>{formatCurrency(expense.amount)}</dd></div>
                </dl>
                <div className="table-actions">
                  <button onClick={() => handleEdit(expense)}>Edit</button>
                  {expense.status === 'SUBMITTED' && <button onClick={() => handleApprove(expense.id)}>Approve</button>}
                  {expense.status === 'SUBMITTED' && <button onClick={() => handleReject(expense.id)}>Reject</button>}
                  <button className="danger" onClick={() => handleDelete(expense.id)}>Delete</button>
                </div>
              </div>
            </details>
          ))}
          {!loading && visibleExpenses.length === 0 && <p className="empty-state">No expenses found.</p>}
        </div>
      )}

      <div className={`table-wrap ${currentAccount?.accountType === 'INDIVIDUAL' ? 'personal-expense-desktop-table' : ''}`}>
        <table className={currentAccount?.accountType === 'INDIVIDUAL' ? 'personal-expense-table' : undefined}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Type</th>
              <th>Vendor</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="numeric">Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleExpenses.map((expense) => (
              <tr key={expense.id}>
                <td data-label="Date">{formatDate(expense.expenseDate)}</td>
                <td data-label="Category">{expense.categoryName || '-'}</td>
                <td data-label="Type">{expense.expenseType}</td>
                <td data-label="Vendor">{expense.vendorName || '-'}</td>
                <td data-label="Payment">{expense.paymentMode}</td>
                <td data-label="Status"><span className={`status-pill ${String(expense.status).toLowerCase()}`}>{expense.status}</span></td>
                <td data-label="Amount" className="numeric">{formatCurrency(expense.amount)}</td>
                <td data-label="Actions" className="table-actions">
                  <button onClick={() => handleEdit(expense)}>Edit</button>
                  {expense.status === 'SUBMITTED' && <button onClick={() => handleApprove(expense.id)}>Approve</button>}
                  {expense.status === 'SUBMITTED' && <button onClick={() => handleReject(expense.id)}>Reject</button>}
                  <button className="danger" onClick={() => handleDelete(expense.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && visibleExpenses.length === 0 && (
              <tr><td colSpan="8" className="empty-state">No expenses found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading expenses...</p>}

      {importOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !importing && setImportOpen(false)}>
          <section className="expense-modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="expense-modal-header">
              <div><h2 id="import-title">Import society expenses</h2><p className="muted">Upload a bank statement and review every debit before saving.</p></div>
              <button className="modal-close" aria-label="Close" onClick={() => setImportOpen(false)} disabled={importing}>×</button>
            </div>
            {!preview && <label className="import-dropzone">
              <strong>{importing ? 'Reading workbook…' : 'Choose Excel file'}</strong>
              <span>.xlsx or .xls, up to 10 MB</span>
              <input type="file" accept=".xlsx,.xls" onChange={handlePreview} disabled={importing} />
            </label>}
            {preview && <>
              <div className="import-summary">
                <span><strong>{preview.totalRows}</strong> debit rows</span>
                <span><strong>{preview.readyRows}</strong> ready</span>
                <span><strong>{preview.warningRows}</strong> need review</span>
                <span><strong>{formatCurrency(preview.totalDebit)}</strong> total</span>
              </div>
              <div className="table-wrap import-table-wrap"><table>
                <thead><tr><th>Row</th><th>Date</th><th>Vendor / narration</th><th>Category</th><th>Payment</th><th className="numeric">Amount</th><th>Review</th></tr></thead>
                <tbody>{preview.rows.map((row) => <tr key={row.rowNumber} className={row.duplicate || row.errors?.length ? 'import-row-disabled' : ''}>
                  <td>{row.rowNumber}</td><td>{formatDate(row.expenseDate)}</td>
                  <td><strong>{row.vendorName || 'Unknown vendor'}</strong><small>{row.description}</small></td>
                  <td><select value={row.categoryId || ''} onChange={(event) => setImportCategory(row.rowNumber, event.target.value)} disabled={row.duplicate}>
                    <option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}
                  </select></td>
                  <td>{row.paymentMode}</td><td className="numeric">{formatCurrency(row.amount)}</td>
                  <td>{row.duplicate ? <span className="status-pill rejected">Duplicate</span> : [...(row.errors || []), ...(row.warnings || [])].map((message) => <small key={message}>{message}</small>)}</td>
                </tr>)}</tbody>
              </table></div>
              <div className="expense-modal-actions">
                <button onClick={() => setPreview(null)} disabled={importing}>Choose another file</button>
                <button className="primary" onClick={confirmImport} disabled={importing}>{importing ? 'Importing…' : 'Confirm import'}</button>
              </div>
            </>}
          </section>
        </div>
      )}
    </Shell>
  )
}

