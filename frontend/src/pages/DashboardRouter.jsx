import { Link, Navigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatDate } from '../utils/format'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { expenseAPI, expenseCategoryAPI, kiranaProductAPI, personalBudgetAPI, societyFlatAPI } from '../api/endpoints'

const accountLabels = {
  INDIVIDUAL: 'Personal Expense Tracker',
  SOCIETY: 'Society Expense Management',
  KIRANA_STORE: 'Kirana Store Management',
  SPORTS: 'Sports Management'
}

export const DashboardRouter = () => {
  const { currentAccount } = useAuthStore()

  if (!currentAccount) {
    return (
      <Shell title="Select an account">
        <p className="muted">No active account was found. Please log in again.</p>
      </Shell>
    )
  }

  if (currentAccount.accountType === 'SOCIETY') return <SocietyDashboard />
  if (currentAccount.accountType === 'KIRANA_STORE') return <KiranaDashboard />
  if (currentAccount.accountType === 'SPORTS') return <Navigate to="/sports" replace />
  return <PersonalDashboard />
}

export const Shell = ({ title, eyebrow = 'Dashboard', actions, children }) => (
  <div>
    <Navbar />
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {actions && <div className="header-actions">{actions}</div>}
      </div>
      {children}
    </main>
  </div>
)

const PersonalDashboard = () => {
  const [expenses, setExpenses] = useState([])
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [expenseForm, setExpenseForm] = useState(createDashboardExpenseForm())

  const loadDashboard = () => {
    setLoading(true)
    Promise.all([
      expenseAPI.getExpenses(),
      personalBudgetAPI.getCurrentBudget().catch(() => ({ data: null }))
    ])
      .then(([expenseResponse, budgetResponse]) => {
        setExpenses(expenseResponse.data || [])
        setBudget(budgetResponse.data || null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard()
    expenseCategoryAPI.getCategories()
      .then((response) => setCategories(response.data || []))
      .catch(() => toast.error('Unable to load expense categories'))
  }, [])

  const summary = useMemo(() => buildExpenseSummary(expenses), [expenses])
  const budgetAmount = Number(budget?.monthlyBudget || 0)
  const remaining = Math.max(budgetAmount - summary.monthTotal, 0)
  const budgetPercent = budgetAmount ? Math.min(Math.round((summary.monthTotal / budgetAmount) * 100), 100) : 0
  const budgetUsed = budgetAmount ? `${budgetPercent}%` : 'Not set'
  const recentExpenses = useMemo(() => [...expenses]
    .sort((a, b) => String(b.expenseDate || '').localeCompare(String(a.expenseDate || '')))
    .slice(0, 5), [expenses])
  const updateExpenseForm = (field, value) => setExpenseForm((current) => ({ ...current, [field]: value }))
  const resetAndCloseExpenseModal = () => {
    setExpenseForm(createDashboardExpenseForm())
    setExpenseModalOpen(false)
  }
  const saveDashboardExpense = async (event) => {
    event.preventDefault()
    if ((expenseForm.paymentMode === 'UPI' || expenseForm.paymentMode === 'NEFT') && !expenseForm.utr.trim()) {
      toast.error('UTR is required for UPI/NEFT')
      return
    }
    if (expenseForm.paymentMode === 'CHEQUE' && !expenseForm.chequeNumber.trim()) {
      toast.error('Cheque number is required')
      return
    }
    const payload = {
      ...expenseForm,
      categoryId: Number(expenseForm.categoryId),
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
      vendorName: expenseForm.vendorName || null,
      transactionId: expenseForm.transactionId || null,
      utr: expenseForm.utr || null,
      chequeNumber: expenseForm.chequeNumber || null,
      remarks: null
    }
    setExpenseSaving(true)
    try {
      await expenseAPI.createExpense(payload)
      toast.success('Expense created')
      resetAndCloseExpenseModal()
      loadDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save expense')
    } finally {
      setExpenseSaving(false)
    }
  }

  return (
    <Shell
      title={accountLabels.INDIVIDUAL}
      actions={<button className="button-link" type="button" onClick={() => setExpenseModalOpen(true)}>Add Expense</button>}
    >
      {expenseModalOpen && (
        <div className="modal-backdrop personal-dashboard-expense-backdrop" role="presentation" onMouseDown={resetAndCloseExpenseModal}>
          <section className="expense-modal personal-dashboard-expense-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-expense-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="expense-modal-header">
              <div>
                <h2 id="dashboard-expense-title">Add expense</h2>
                <p className="muted">Capture a personal expense without leaving the dashboard.</p>
              </div>
              <button type="button" className="modal-close" onClick={resetAndCloseExpenseModal}>×</button>
            </div>
            <form onSubmit={saveDashboardExpense}>
              <div className="expense-modal-form">
                <label>Date<input type="date" required value={expenseForm.expenseDate} onChange={(event) => updateExpenseForm('expenseDate', event.target.value)} /></label>
                <label>Category<select required value={expenseForm.categoryId} onChange={(event) => updateExpenseForm('categoryId', event.target.value)}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}</select></label>
                <label>Amount<input type="number" min="1" step="0.01" required value={expenseForm.amount} onChange={(event) => updateExpenseForm('amount', event.target.value)} /></label>
                <label>Payment mode<select required value={expenseForm.paymentMode} onChange={(event) => updateExpenseForm('paymentMode', event.target.value)}><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="NEFT">NEFT</option><option value="CHEQUE">Cheque</option></select></label>
                <label>Vendor<input value={expenseForm.vendorName} onChange={(event) => updateExpenseForm('vendorName', event.target.value)} /></label>
                <label>Transaction ID<input value={expenseForm.transactionId} onChange={(event) => updateExpenseForm('transactionId', event.target.value)} /></label>
                {(expenseForm.paymentMode === 'UPI' || expenseForm.paymentMode === 'NEFT') && <label>UTR<input required value={expenseForm.utr} onChange={(event) => updateExpenseForm('utr', event.target.value)} /></label>}
                {expenseForm.paymentMode === 'CHEQUE' && <label>Cheque number<input required value={expenseForm.chequeNumber} onChange={(event) => updateExpenseForm('chequeNumber', event.target.value)} /></label>}
                <label className="document-wide">Description<textarea rows="3" value={expenseForm.description} onChange={(event) => updateExpenseForm('description', event.target.value)} /></label>
              </div>
              <div className="expense-modal-actions">
                <button type="button" onClick={resetAndCloseExpenseModal}>Cancel</button>
                <button className="primary" disabled={expenseSaving}>{expenseSaving ? 'Saving...' : 'Save Expense'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      <section className="personal-dashboard-hero">
        <div className="personal-dashboard-hero-copy">
          <span>Monthly pulse</span>
          <h2>{budgetAmount ? `${budgetUsed} of budget used` : 'Set a monthly budget to track progress'}</h2>
          <p>{budgetAmount ? `${formatCurrency(remaining)} remaining this month` : 'Create a budget and turn this screen into your spending command center.'}</p>
        </div>
        <div className="personal-budget-meter" aria-label="Monthly budget usage">
          <div><i style={{ width: `${budgetPercent}%` }} /></div>
          <strong>{formatCurrency(summary.monthTotal)}</strong>
          <small>{budgetAmount ? `of ${formatCurrency(budgetAmount)}` : 'spent this month'}</small>
        </div>
      </section>

      <section className="personal-dashboard-stats">
        <InsightCard tone="teal" label="Today" value={formatCurrency(summary.todayTotal)} detail={`${summary.todayCount} entries`} />
        <InsightCard tone="blue" label="This Month" value={formatCurrency(summary.monthTotal)} detail={`${summary.monthCount} expenses`} />
        <InsightCard tone="amber" label="Top Category" value={summary.topCategory || '-'} detail={summary.topCategoryAmount ? formatCurrency(summary.topCategoryAmount) : 'No spending yet'} />
        <InsightCard tone="green" label="Savings Target" value={budget ? formatCurrency(budget.monthlySavingsTarget) : 'Not set'} detail="Monthly goal" />
      </section>

      <section className="personal-dashboard-layout">
        <article className="personal-dashboard-panel">
          <div className="personal-panel-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Jump into the work you do most often.</p>
            </div>
          </div>
          <div className="personal-action-grid">
            <DashboardAction onClick={() => setExpenseModalOpen(true)} icon="+" title="Add expense" text="Record a new payment" />
            <DashboardAction to="/expenses" icon="Rs" title="Expense history" text="Review and edit entries" />
            <DashboardAction to="/budget" icon="%" title="Budget" text="Set month and savings goals" />
            <DashboardAction to="/personal/reports" icon="Up" title="Reports" text="Analyze trends" />
            <DashboardAction to="/personal/shared-expenses" icon="=" title="Shared expenses" text="Groups and settlements" />
            <DashboardAction to="/personal/documents" icon="Doc" title="My documents" text="Store receipts and files" />
          </div>
        </article>

        <article className="personal-dashboard-panel">
          <div className="personal-panel-heading">
            <div>
              <h2>Recent expenses</h2>
              <p>Your latest personal spending.</p>
            </div>
            <Link to="/expenses">View all</Link>
          </div>
          <div className="personal-recent-list">
            {recentExpenses.map((expense) => (
              <Link className="personal-recent-item" key={expense.id} to={`/expenses/${expense.id}/edit`}>
                <span>{expense.categoryName?.slice(0, 1) || 'Rs'}</span>
                <div>
                  <strong>{expense.description || expense.categoryName || 'Expense'}</strong>
                  <small>{formatDate(expense.expenseDate)} · {expense.paymentMode || 'Payment'}</small>
                </div>
                <b>{formatCurrency(expense.amount)}</b>
              </Link>
            ))}
            {!loading && recentExpenses.length === 0 && <p className="empty-state">No personal expenses yet. Add one to start seeing activity here.</p>}
            {loading && <p className="muted">Loading dashboard...</p>}
          </div>
        </article>
      </section>

      <section className="personal-dashboard-panel">
        <div className="personal-panel-heading">
          <div>
            <h2>Category focus</h2>
            <p>Where this month's money is going.</p>
          </div>
        </div>
        <div className="personal-category-bars">
          {summary.categoryBreakdown.map(([category, amount]) => (
            <div className="personal-category-row" key={category}>
              <span>{category}</span>
              <div><i style={{ width: `${summary.monthTotal ? Math.round((amount / summary.monthTotal) * 100) : 0}%` }} /></div>
              <strong>{formatCurrency(amount)}</strong>
            </div>
          ))}
          {!loading && summary.categoryBreakdown.length === 0 && <p className="empty-state">Categories will appear once expenses are recorded this month.</p>}
        </div>
      </section>
    </Shell>
  )
}

const InsightCard = ({ tone, label, value, detail }) => (
  <article className={`personal-insight-card ${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>
)

const DashboardAction = ({ to, onClick, icon, title, text }) => {
  const content = (
    <>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </>
  )
  if (onClick) {
    return <button className="personal-action-card" type="button" onClick={onClick}>{content}</button>
  }
  return (
    <Link className="personal-action-card" to={to}>
      {content}
    </Link>
  )
}

const createDashboardExpenseForm = () => ({
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: '',
  expenseType: 'PERSONAL',
  festivalEventId: '',
  description: '',
  amount: '',
  paymentMode: 'CASH',
  transactionId: '',
  utr: '',
  chequeNumber: '',
  vendorName: '',
  status: 'DRAFT'
})

const SocietyDashboard = () => {
  const [expenses, setExpenses] = useState([])
  const [flats, setFlats] = useState([])

  useEffect(() => {
    Promise.all([
      expenseAPI.getExpenses(),
      societyFlatAPI.getFlats().catch(() => ({ data: [] }))
    ]).then(([expenseResponse, flatResponse]) => {
      setExpenses(expenseResponse.data || [])
      setFlats(flatResponse.data || [])
    })
  }, [])

  const summary = useMemo(() => buildExpenseSummary(expenses), [expenses])
  const pending = expenses.filter((expense) => expense.status === 'SUBMITTED').length

  return (
    <Shell title={accountLabels.SOCIETY}>
      <SummaryGrid
        items={[
          ['This Month', formatCurrency(summary.monthTotal)],
          ['Festival Spend', formatCurrency(summary.festivalTotal)],
          ['Pending Approvals', pending],
          ['Active Flats', flats.length]
        ]}
      />
      <ActionRow actions={[[ 'Add Expense', '/expenses/new' ], [ 'View Expenses', '/expenses' ], [ 'Categories', '/categories' ], [ 'Flat Master', '/society/flats' ], [ 'Festivals', '/society/festivals' ], [ 'Collections', '/society/festival-collections' ]]} />
    </Shell>
  )
}

const KiranaDashboard = () => {
  const [expenses, setExpenses] = useState([])
  const [lowStock, setLowStock] = useState([])

  useEffect(() => {
    Promise.all([
      expenseAPI.getExpenses(),
      kiranaProductAPI.getLowStockProducts().catch(() => ({ data: [] }))
    ]).then(([expenseResponse, stockResponse]) => {
      setExpenses(expenseResponse.data || [])
      setLowStock(stockResponse.data || [])
    })
  }, [])

  const summary = useMemo(() => buildExpenseSummary(expenses), [expenses])

  return (
    <Shell title={accountLabels.KIRANA_STORE}>
      <SummaryGrid
        items={[
          ['Store Expenses', formatCurrency(summary.monthTotal)],
          ['Today Expenses', formatCurrency(summary.todayTotal)],
          ['Low Stock Items', lowStock.length],
          ['Payment Modes', summary.paymentModes]
        ]}
      />
      <ActionRow actions={[[ 'New Sale', '/kirana/sales/new' ], [ 'New Purchase', '/kirana/purchases/new' ], [ 'Reports', '/kirana/reports' ], [ 'Sales', '/kirana/sales' ], [ 'Purchases', '/kirana/purchases' ], [ 'Customer Credit', '/kirana/customer-credit' ], [ 'Supplier Dues', '/kirana/supplier-payments' ], [ 'Products', '/kirana/products' ]]} />
    </Shell>
  )
}

export const SummaryGrid = ({ items }) => (
  <section className="summary-grid">
    {items.map(([label, value]) => (
      <article className="summary-card" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    ))}
  </section>
)

export const ActionRow = ({ actions }) => (
  <div className="action-row">
    {actions.map(([label, to]) => (
      <Link className="button-link" key={to} to={to}>{label}</Link>
    ))}
  </div>
)

const buildExpenseSummary = (expenses) => {
  const today = new Date().toISOString().slice(0, 10)
  const monthPrefix = today.slice(0, 7)
  const categoryTotals = new Map()
  const paymentModes = new Set()
  let todayTotal = 0
  let monthTotal = 0
  let festivalTotal = 0
  let todayCount = 0
  let monthCount = 0

  expenses.forEach((expense) => {
    const amount = Number(expense.amount || 0)
    if (expense.expenseDate === today) {
      todayTotal += amount
      todayCount += 1
    }
    if (expense.expenseDate?.startsWith(monthPrefix)) {
      monthTotal += amount
      monthCount += 1
    }
    if (expense.expenseType === 'FESTIVAL') festivalTotal += amount
    if (expense.expenseDate?.startsWith(monthPrefix) && expense.categoryName) categoryTotals.set(expense.categoryName, (categoryTotals.get(expense.categoryName) || 0) + amount)
    if (expense.paymentMode) paymentModes.add(expense.paymentMode)
  })
  const categoryBreakdown = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const [topCategory, topCategoryAmount] = categoryBreakdown[0] || []

  return {
    todayTotal,
    todayCount,
    monthTotal,
    monthCount,
    festivalTotal,
    topCategory,
    topCategoryAmount,
    categoryBreakdown,
    paymentModes: paymentModes.size || '-'
  }
}




