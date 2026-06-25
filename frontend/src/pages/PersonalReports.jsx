import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'react-toastify'
import { expenseAPI, personalBudgetAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { exportWorkbook, numberValue } from '../utils/exportExcel'
import { formatCurrency } from '../utils/format'
import { Shell, SummaryGrid } from './DashboardRouter'

const chartColors = ['#0f766e', '#2563eb', '#c2410c', '#7c3aed', '#ca8a04', '#be123c', '#475569']

export const PersonalReports = () => {
  const { currentAccount } = useAuthStore()
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
      .catch(() => toast.error('Unable to load personal reports'))
      .finally(() => setLoading(false))
  }, [])

  const report = useMemo(() => buildPersonalReport(expenses, budget), [expenses, budget])

  const exportReport = () => {
    exportWorkbook([
      {
        name: 'Summary',
        rows: [
          { Metric: 'This Month', Amount: report.monthTotal },
          { Metric: 'Daily Average', Amount: report.dailyAverage },
          { Metric: 'Budget Used', Value: report.budgetUsed },
          { Metric: 'Monthly Budget', Amount: numberValue(budget?.monthlyBudget) },
          { Metric: 'Savings Target', Amount: numberValue(budget?.monthlySavingsTarget) }
        ]
      },
      {
        name: 'Category Totals',
        rows: report.categoryData.map((category) => ({
          Category: category.name,
          Amount: category.amount,
          Share: report.monthTotal ? `${Math.round((category.amount / report.monthTotal) * 100)}%` : '0%'
        }))
      },
      {
        name: 'Daily Totals',
        rows: report.dailyData.map((day) => ({
          Day: day.day,
          Amount: day.amount
        }))
      },
      {
        name: 'Expenses',
        rows: report.filteredExpenses.map((expense) => ({
          Date: expense.expenseDate,
          Category: expense.categoryName || 'Uncategorized',
          Description: expense.description || '',
          Vendor: expense.vendorName || '',
          PaymentMode: expense.paymentMode || '',
          Amount: numberValue(expense.amount),
          Status: expense.status || ''
        }))
      }
    ], `personal-report-${report.monthPrefix}`)
  }

  if (currentAccount?.accountType !== 'INDIVIDUAL') {
    return (
      <Shell title="Personal Reports" eyebrow="Individual module">
        <p className="muted">Personal reports are available for individual accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Personal Reports" eyebrow="Individual module" actions={<button className="primary" onClick={exportReport}>Export Excel</button>}>
      <SummaryGrid
        items={[
          ['This Month', formatCurrency(report.monthTotal)],
          ['Daily Average', formatCurrency(report.dailyAverage)],
          ['Budget Used', report.budgetUsed],
          ['Savings Target', budget ? formatCurrency(budget.monthlySavingsTarget) : 'Not set']
        ]}
      />

      <section className="report-grid">
        <article className="report-panel">
          <h2>Category-wise Spending</h2>
          {report.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={report.categoryData} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                  {report.categoryData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No expenses found for category report.</p>}
        </article>

        <article className="report-panel">
          <h2>Daily Spend This Month</h2>
          {report.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={report.dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `Rs ${value}`} width={58} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No daily spending data yet.</p>}
        </article>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th className="numeric">Amount</th>
              <th className="numeric">Share</th>
            </tr>
          </thead>
          <tbody>
            {report.categoryData.map((category) => (
              <tr key={category.name}>
                <td>{category.name}</td>
                <td className="numeric">{formatCurrency(category.amount)}</td>
                <td className="numeric">{report.monthTotal ? `${Math.round((category.amount / report.monthTotal) * 100)}%` : '0%'}</td>
              </tr>
            ))}
            {!loading && report.categoryData.length === 0 && (
              <tr><td colSpan="3" className="empty-state">No report data available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading reports...</p>}
    </Shell>
  )
}

const buildPersonalReport = (expenses, budget) => {
  const now = new Date()
  const monthPrefix = now.toISOString().slice(0, 7)
  const currentDay = now.getDate()
  const categoryTotals = new Map()
  const dailyTotals = new Map()
  const filteredExpenses = expenses.filter((expense) => expense.expenseDate?.startsWith(monthPrefix))
  let monthTotal = 0

  filteredExpenses.forEach((expense) => {
    const amount = Number(expense.amount || 0)
    const category = expense.categoryName || 'Uncategorized'
    const day = expense.expenseDate.slice(8, 10)
    monthTotal += amount
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)
    dailyTotals.set(day, (dailyTotals.get(day) || 0) + amount)
  })

  const budgetAmount = Number(budget?.monthlyBudget || 0)

  return {
    monthTotal,
    dailyAverage: currentDay ? monthTotal / currentDay : 0,
    budgetUsed: budgetAmount ? `${Math.min(Math.round((monthTotal / budgetAmount) * 100), 999)}%` : 'Not set',
    categoryData: [...categoryTotals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    dailyData: [...dailyTotals.entries()]
      .map(([day, amount]) => ({ day, amount }))
      .sort((a, b) => Number(a.day) - Number(b.day)),
    filteredExpenses,
    monthPrefix
  }
}
