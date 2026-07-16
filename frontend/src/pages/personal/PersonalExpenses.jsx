import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'react-toastify'
import { expenseAPI, personalBudgetAPI } from '../../api/endpoints'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell } from '../DashboardRouter'

const monthLabel = (month) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

export const PersonalExpenses = () => {
  const [expenses, setExpenses] = useState([])
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    Promise.all([
      expenseAPI.getExpenses(),
      personalBudgetAPI.getCurrentBudget().catch(() => ({ data: null }))
    ])
      .then(([expenseResponse, budgetResponse]) => {
        setExpenses(expenseResponse.data || [])
        setBudget(budgetResponse.data || null)
      })
      .catch(() => toast.error('Unable to load personal expenses'))
      .finally(() => setLoading(false))
  }, [])

  const overview = useMemo(() => buildOverview(expenses, month), [expenses, month])
  const isCurrentMonth = month === new Date().toISOString().slice(0, 7)
  const budgetAmount = isCurrentMonth ? Number(budget?.monthlyBudget || 0) : 0
  const remaining = Math.max(budgetAmount - overview.total, 0)
  const budgetPercent = budgetAmount ? Math.min((overview.total / budgetAmount) * 100, 100) : 0

  return (
    <Shell
      title="Personal Expenses"
      eyebrow="Personal module"
      actions={<Link className="button-link" to="/expenses/new">Add expense</Link>}
    >
      <section className="personal-expenses-toolbar" aria-label="Expense period">
        <div>
          <span>Spending overview</span>
          <strong>{monthLabel(month)}</strong>
        </div>
        <label>
          <span>Month</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </section>

      <section className="personal-dashboard-stats">
        <article className="personal-insight-card teal"><span>Total spent</span><strong>{formatCurrency(overview.total)}</strong><small>{overview.expenses.length} transactions</small></article>
        <article className="personal-insight-card blue"><span>Daily average</span><strong>{formatCurrency(overview.dailyAverage)}</strong><small>Across active spending days</small></article>
        <article className="personal-insight-card amber"><span>Top category</span><strong>{overview.categories[0]?.name || '-'}</strong><small>{overview.categories[0] ? formatCurrency(overview.categories[0].amount) : 'No spending yet'}</small></article>
        <article className="personal-insight-card green"><span>{budgetAmount ? 'Budget remaining' : 'Largest expense'}</span><strong>{budgetAmount ? formatCurrency(remaining) : formatCurrency(overview.largest?.amount || 0)}</strong><small>{budgetAmount ? `${Math.round(budgetPercent)}% used` : overview.largest?.description || 'No spending yet'}</small></article>
      </section>

      {isCurrentMonth && (
        <section className="personal-expense-budget">
          <div>
            <span>Monthly budget</span>
            <strong>{budgetAmount ? `${formatCurrency(overview.total)} of ${formatCurrency(budgetAmount)}` : 'No budget set for this month'}</strong>
          </div>
          <div className="personal-expense-budget-track" aria-label={`${Math.round(budgetPercent)}% of budget used`}><i style={{ width: `${budgetPercent}%` }} /></div>
          <Link to="/budget">{budgetAmount ? 'Manage budget' : 'Set a budget'}</Link>
        </section>
      )}

      <section className="personal-expenses-layout">
        <article className="personal-dashboard-panel personal-spend-chart">
          <div className="personal-panel-heading"><div><h2>Daily spending</h2><p>See when spending accumulated during the month.</p></div><Link to="/personal/reports">Full reports</Link></div>
          {overview.daily.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={overview.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis width={58} tickFormatter={(value) => `Rs ${value}`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(day) => `${monthLabel(month)} ${Number(day)}`} />
                <Bar dataKey="amount" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No spending recorded for this month.</p>}
        </article>

        <article className="personal-dashboard-panel">
          <div className="personal-panel-heading"><div><h2>By category</h2><p>Where your money went.</p></div><Link to="/categories">Categories</Link></div>
          <div className="personal-expense-categories">
            {overview.categories.slice(0, 6).map((category) => (
              <div key={category.name}>
                <span><strong>{category.name}</strong><small>{overview.total ? Math.round((category.amount / overview.total) * 100) : 0}%</small></span>
                <i><b style={{ width: `${overview.total ? (category.amount / overview.total) * 100 : 0}%` }} /></i>
                <em>{formatCurrency(category.amount)}</em>
              </div>
            ))}
            {!overview.categories.length && <p className="empty-state">Categories will appear after you add expenses.</p>}
          </div>
        </article>
      </section>

      <section className="personal-dashboard-panel">
        <div className="personal-panel-heading"><div><h2>Recent expenses</h2><p>Your latest entries from {monthLabel(month)}.</p></div><Link to="/expenses">View full ledger</Link></div>
        <div className="personal-recent-list">
          {overview.expenses.slice(0, 6).map((expense) => (
            <Link className="personal-recent-item" key={expense.id} to={`/expenses/${expense.id}/edit`}>
              <span>{expense.categoryName?.slice(0, 1) || 'Rs'}</span>
              <div><strong>{expense.description || expense.categoryName || 'Expense'}</strong><small>{formatDate(expense.expenseDate)} - {expense.vendorName || expense.paymentMode || 'Payment'}</small></div>
              <b>{formatCurrency(expense.amount)}</b>
            </Link>
          ))}
          {!loading && !overview.expenses.length && <p className="empty-state">No personal expenses in this month.</p>}
          {loading && <p className="muted">Loading expenses...</p>}
        </div>
      </section>
    </Shell>
  )
}

const buildOverview = (expenses, month) => {
  const filtered = expenses
    .filter((expense) => expense.expenseDate?.startsWith(month))
    .sort((a, b) => `${b.expenseDate}-${b.id}`.localeCompare(`${a.expenseDate}-${a.id}`))
  const categories = new Map()
  const days = new Map()
  let total = 0
  let largest = null

  filtered.forEach((expense) => {
    const amount = Number(expense.amount || 0)
    const category = expense.categoryName || 'Uncategorized'
    const day = expense.expenseDate.slice(8, 10)
    total += amount
    categories.set(category, (categories.get(category) || 0) + amount)
    days.set(day, (days.get(day) || 0) + amount)
    if (!largest || amount > Number(largest.amount || 0)) largest = expense
  })

  return {
    expenses: filtered,
    total,
    largest,
    dailyAverage: days.size ? total / days.size : 0,
    categories: [...categories.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    daily: [...days.entries()].map(([day, amount]) => ({ day: Number(day), amount })).sort((a, b) => a.day - b.day)
  }
}
