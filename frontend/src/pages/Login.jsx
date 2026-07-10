import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

const accountHighlights = [
  ['Personal', 'Budgets, expense history, documents, and shared bills.'],
  ['Society', 'Collections, vendors, flats, festivals, and annual finance.'],
  ['Kirana', 'Products, sales, purchases, customers, and supplier dues.'],
  ['Sports', 'Members, events, expenses, collections, and reports.']
]

const workflowCards = [
  { value: '1', label: 'Add expenses fast', text: 'Record payments, receipts, and categories from one place.' },
  { value: '2', label: 'Review your money', text: 'Use dashboards, filters, history, and reports to spot trends.' },
  { value: '3', label: 'Share and settle', text: 'Track group balances, split costs, and export shared history.' }
]

export const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [pendingSession, setPendingSession] = useState(null)
  const [formData, setFormData] = useState({ mobile: '', password: '' })

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const completeLogin = (session) => {
    const { token, user, accounts, currentAccount } = session
    login(token, user, accounts, currentAccount)
    toast.success('Login successful')
    navigate('/home')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await authAPI.login(formData)
      const { accounts } = response.data
      if (accounts?.length > 1) {
        setPendingSession(response.data)
        toast.info('Select an account to continue')
      } else {
        completeLogin(response.data)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAccountSelect = async (accountId) => {
    setLoading(true)
    try {
      const response = await authAPI.loginWithAccount(formData, accountId)
      completeLogin(response.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to select account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page login-experience">
      <section className="login-showcase" aria-label="Expense tracker overview">
        <div className="login-brand">
          <span>Expense Tracker</span>
          <h1>One place for personal, shared, society, store, and sports finances.</h1>
          <p>
            Keep daily expenses organized, split bills with groups, manage collections,
            and understand where money is moving without jumping between tools.
          </p>
        </div>

        <div className="login-workflow-grid">
          {workflowCards.map((item) => (
            <article className="login-workflow-card" key={item.value}>
              <strong>{item.value}</strong>
              <div>
                <h2>{item.label}</h2>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="login-module-panel">
          <div>
            <h2>Built for different accounts</h2>
            <p>Choose the module that matches how you track money.</p>
          </div>
          <div className="login-module-list">
            {accountHighlights.map(([title, text]) => (
              <article key={title}>
                <span>{title.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="auth-card login-panel">
        <div className="login-panel-heading">
          <span>{pendingSession ? 'Account selection' : 'Welcome back'}</span>
          <h2>{pendingSession ? 'Choose your workspace' : 'Sign in to continue'}</h2>
          <p>
            {pendingSession
              ? 'Your mobile number is linked with multiple accounts.'
              : 'Use your registered mobile number and password to open your dashboard.'}
          </p>
        </div>

        {!pendingSession ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="mobile">
              Mobile
              <input
                type="tel"
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                placeholder="Enter your mobile number"
                required
              />
            </label>

            <label htmlFor="password">
              Password
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
              />
            </label>

            <button type="submit" className="primary login-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <div className="login-account-select">
            <div className="login-account-list">
              {pendingSession.accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleAccountSelect(account.id)}
                >
                  <span>{account.accountName?.slice(0, 1)?.toUpperCase() || 'A'}</span>
                  <div>
                    <strong>{account.accountName}</strong>
                    <small>{account.accountType}</small>
                  </div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPendingSession(null)}>
              Back to login
            </button>
          </div>
        )}

        <div className="login-help-grid">
          {!pendingSession && (
            <Link to="/reset-password">
              <strong>Forgot password?</strong>
              <span>Reset using your registered details.</span>
            </Link>
          )}
          <Link to="/register">
            <strong>New here?</strong>
            <span>Create an account for personal, society, kirana, or sports tracking.</span>
          </Link>
        </div>

        <div className="login-current-user-note">
          <strong>Returning user tip</strong>
          <p>After login, use the account switcher in the top menu when your mobile is linked to multiple workspaces.</p>
        </div>
      </section>
    </main>
  )
}
