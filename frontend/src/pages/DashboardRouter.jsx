import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/format'
import { useEffect, useMemo, useState } from 'react'
import { expenseAPI, kiranaProductAPI, personalBudgetAPI, societyFlatAPI } from '../api/endpoints'

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
  if (currentAccount.accountType === 'SPORTS') return <SportsHomeDashboard />
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

  useEffect(() => {
    Promise.all([
      expenseAPI.getExpenses(),
      personalBudgetAPI.getCurrentBudget().catch(() => ({ data: null }))
    ])
      .then(([expenseResponse, budgetResponse]) => {
        setExpenses(expenseResponse.data || [])
        setBudget(budgetResponse.data || null)
      })
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => buildExpenseSummary(expenses), [expenses])
  const budgetAmount = Number(budget?.monthlyBudget || 0)
  const remaining = Math.max(budgetAmount - summary.monthTotal, 0)
  const budgetUsed = budgetAmount ? `${Math.round((summary.monthTotal / budgetAmount) * 100)}%` : 'Not set'

  return (
    <Shell title={accountLabels.INDIVIDUAL}>
      <SummaryGrid
        items={[
          ['Today', formatCurrency(summary.todayTotal)],
          ['This Month', formatCurrency(summary.monthTotal)],
          ['Top Category', summary.topCategory || '-'],
          ['Remaining Budget', budgetAmount ? formatCurrency(remaining) : 'Not set'],
          ['Budget Used', budgetUsed],
          ['Savings Target', budget ? formatCurrency(budget.monthlySavingsTarget) : 'Not set']
        ]}
      />
      <ActionRow
        actions={[
          ['Add Expense', '/expenses/new'],
          ['View Expenses', '/expenses'],
          ['Categories', '/categories'],
          ['Budget', '/budget'],
          ['Reports', '/personal/reports']
        ]}
      />
      {loading && <p className="muted">Loading dashboard...</p>}
    </Shell>
  )
}

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

const SportsHomeDashboard = () => {
  return (
    <Shell title={accountLabels.SPORTS}>
      <SummaryGrid items={[
        ['Members', 'Separate table'],
        ['Events', 'Separate table'],
        ['Collections', 'Separate table'],
        ['Expenses', 'Separate table']
      ]} />
      <ActionRow actions={[[ 'Open Sports Module', '/sports' ]]} />
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

  expenses.forEach((expense) => {
    const amount = Number(expense.amount || 0)
    if (expense.expenseDate === today) todayTotal += amount
    if (expense.expenseDate?.startsWith(monthPrefix)) monthTotal += amount
    if (expense.expenseType === 'FESTIVAL') festivalTotal += amount
    if (expense.categoryName) categoryTotals.set(expense.categoryName, (categoryTotals.get(expense.categoryName) || 0) + amount)
    if (expense.paymentMode) paymentModes.add(expense.paymentMode)
  })

  return {
    todayTotal,
    monthTotal,
    festivalTotal,
    topCategory: [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
    paymentModes: paymentModes.size || '-'
  }
}




