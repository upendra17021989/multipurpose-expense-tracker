import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-toastify'

export const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [pendingSession, setPendingSession] = useState(null)
  const [formData, setFormData] = useState({ mobile: '', password: '' })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const completeLogin = (session) => {
    const { token, user, accounts, currentAccount } = session
    login(token, user, accounts, currentAccount)
    toast.success('Login successful')
    navigate('/home')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
    <div style={styles.container}>
      <div style={styles.formBox}>
        <h2 style={styles.title}>Login</h2>
        {!pendingSession ? (
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="mobile">Mobile</label>
              <input type="tel" id="mobile" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="Enter your mobile number" required style={styles.input} />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Enter your password" required style={styles.input} />
            </div>

            <button type="submit" disabled={loading} style={styles.button}>{loading ? 'Logging in...' : 'Login'}</button>
          </form>
        ) : (
          <div>
            <p style={styles.helperText}>Choose which account you want to open.</p>
            <div style={styles.accountList}>
              {pendingSession.accounts.map((account) => (
                <button key={account.id} type="button" disabled={loading} onClick={() => handleAccountSelect(account.id)} style={styles.accountButton}>
                  <strong>{account.accountName}</strong>
                  <span>{account.accountType}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPendingSession(null)} style={styles.secondaryButton}>Back</button>
          </div>
        )}

        <p style={styles.bottomText}>Don't have an account? <Link to="/register" style={styles.link}>Register here</Link></p>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  formBox: { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px' },
  title: { textAlign: 'center', marginBottom: '1.5rem', color: '#1a1a1a' },
  formGroup: { marginBottom: '1rem' },
  input: { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', marginTop: '0.5rem' },
  button: { width: '100%', padding: '0.75rem', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' },
  secondaryButton: { width: '100%', padding: '0.75rem', marginTop: '1rem' },
  helperText: { color: '#666', marginBottom: '1rem' },
  accountList: { display: 'grid', gap: '0.75rem' },
  accountButton: { display: 'grid', gap: '0.25rem', width: '100%', textAlign: 'left', padding: '0.85rem', backgroundColor: '#f8fafc', color: '#17202a', border: '1px solid #d9e2ec', borderRadius: '8px' },
  bottomText: { textAlign: 'center', marginTop: '1rem', color: '#666' },
  link: { color: '#646cff', textDecoration: 'none' }
}
