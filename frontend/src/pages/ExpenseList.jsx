import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { expenseAPI, expenseCategoryAPI } from '../api/endpoints'
import { Shell } from './DashboardRouter'
import { formatCurrency, formatDate } from '../utils/format'

export const ExpenseList = () => {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
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

  return (
    <Shell
      title="Expenses"
      eyebrow="Common module"
      actions={<Link className="button-link" to="/expenses/new">Add Expense</Link>}
    >
      <section className="toolbar-panel">
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

      <div className="table-wrap">
        <table>
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
                <td>{formatDate(expense.expenseDate)}</td>
                <td>{expense.categoryName || '-'}</td>
                <td>{expense.expenseType}</td>
                <td>{expense.vendorName || '-'}</td>
                <td>{expense.paymentMode}</td>
                <td><span className={`status-pill ${String(expense.status).toLowerCase()}`}>{expense.status}</span></td>
                <td className="numeric">{formatCurrency(expense.amount)}</td>
                <td className="table-actions">
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
    </Shell>
  )
}

