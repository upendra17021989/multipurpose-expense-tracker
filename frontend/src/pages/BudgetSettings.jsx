import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { personalBudgetAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { currentMonthYear, formatCurrency } from '../utils/format'
import { Shell } from './DashboardRouter'

export const BudgetSettings = () => {
  const { currentAccount } = useAuthStore()
  const now = currentMonthYear()
  const [budgetId, setBudgetId] = useState(null)
  const [form, setForm] = useState({ month: now.month, year: now.year, monthlyBudget: '', monthlySavingsTarget: '' })

  useEffect(() => {
    personalBudgetAPI.getCurrentBudget()
      .then((response) => {
        const budget = response.data
        if (!budget) return
        setBudgetId(budget.id)
        setForm({
          month: budget.month,
          year: budget.year,
          monthlyBudget: budget.monthlyBudget || '',
          monthlySavingsTarget: budget.monthlySavingsTarget || ''
        })
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      month: Number(form.month),
      year: Number(form.year),
      monthlyBudget: Number(form.monthlyBudget || 0),
      monthlySavingsTarget: Number(form.monthlySavingsTarget || 0)
    }

    try {
      const response = budgetId
        ? await personalBudgetAPI.updateBudget(budgetId, payload)
        : await personalBudgetAPI.createBudget(payload)
      setBudgetId(response.data.id)
      toast.success('Budget saved')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save budget')
    }
  }

  if (currentAccount?.accountType !== 'INDIVIDUAL') {
    return (
      <Shell title="Budget Settings" eyebrow="Individual module">
        <p className="muted">Budgets are available for individual accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Budget Settings" eyebrow="Individual module">
      <section className="summary-grid compact">
        <article className="summary-card"><span>Monthly Budget</span><strong>{formatCurrency(form.monthlyBudget)}</strong></article>
        <article className="summary-card"><span>Savings Target</span><strong>{formatCurrency(form.monthlySavingsTarget)}</strong></article>
      </section>
      <form className="form-panel narrow" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Month
            <input type="number" min="1" max="12" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} required />
          </label>
          <label>
            Year
            <input type="number" min="2020" max="2100" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} required />
          </label>
          <label>
            Monthly Budget
            <input type="number" min="0" step="0.01" value={form.monthlyBudget} onChange={(event) => setForm({ ...form, monthlyBudget: event.target.value })} required />
          </label>
          <label>
            Monthly Savings Target
            <input type="number" min="0" step="0.01" value={form.monthlySavingsTarget} onChange={(event) => setForm({ ...form, monthlySavingsTarget: event.target.value })} />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="primary">Save Budget</button>
        </div>
      </form>
    </Shell>
  )
}


