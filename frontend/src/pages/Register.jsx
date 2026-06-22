import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import 'react-toastify/dist/ReactToastify.css'

const accountTypeLabels = {
  INDIVIDUAL: 'Individual',
  SOCIETY: 'Society',
  KIRANA_STORE: 'Kirana store'
}

export const Register = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    accountType: 'INDIVIDUAL',
    accountName: '',
    address: '',
    societyName: '',
    storeName: ''
  })

  const accountNamePlaceholder = useMemo(() => {
    if (formData.accountType === 'SOCIETY') return 'e.g. Shree Residency Society'
    if (formData.accountType === 'KIRANA_STORE') return 'e.g. Patel Kirana Store'
    return 'e.g. Personal Expenses'
  }, [formData.accountType])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    const payload = {
      ...formData,
      role: resolveRole(formData.accountType),
      societyName: formData.accountType === 'SOCIETY' ? formData.societyName || formData.accountName : '',
      storeName: formData.accountType === 'KIRANA_STORE' ? formData.storeName || formData.accountName : ''
    }

    try {
      await authAPI.register(payload)
      toast.success('Registration successful. Please login.')
      setTimeout(() => navigate('/login'), 700)
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div style={styles.formBox}>
        <h2 style={styles.title}>Create account</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" value={formData.name} onChange={handleInputChange} required style={styles.input} />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="mobile">Mobile</label>
              <input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} required style={styles.input} />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} style={styles.input} />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} required minLength="6" style={styles.input} />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="accountType">Account type</label>
            <select id="accountType" name="accountType" value={formData.accountType} onChange={handleInputChange} style={styles.input}>
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="accountName">Account name</label>
            <input
              id="accountName"
              name="accountName"
              value={formData.accountName}
              onChange={handleInputChange}
              placeholder={accountNamePlaceholder}
              required
              style={styles.input}
            />
          </div>

          {formData.accountType === 'SOCIETY' && (
            <div style={styles.formGroup}>
              <label htmlFor="societyName">Society name</label>
              <input id="societyName" name="societyName" value={formData.societyName} onChange={handleInputChange} style={styles.input} />
            </div>
          )}

          {formData.accountType === 'KIRANA_STORE' && (
            <div style={styles.formGroup}>
              <label htmlFor="storeName">Store name</label>
              <input id="storeName" name="storeName" value={formData.storeName} onChange={handleInputChange} style={styles.input} />
            </div>
          )}

          <div style={styles.formGroup}>
            <label htmlFor="address">Address</label>
            <textarea id="address" name="address" value={formData.address} onChange={handleInputChange} rows="3" style={styles.textarea} />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={styles.bottomText}>
          Already have an account? <Link to="/login" style={styles.link}>Login</Link>
        </p>
      </div>
    </div>
  )
}

const resolveRole = (accountType) => {
  if (accountType === 'SOCIETY') return 'ADMIN'
  if (accountType === 'KIRANA_STORE') return 'STORE_OWNER'
  return 'OWNER'
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '1rem'
  },
  formBox: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '560px'
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#1a1a1a'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    marginTop: '0.5rem',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    marginTop: '0.5rem',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#646cff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem'
  },
  bottomText: {
    textAlign: 'center',
    marginTop: '1rem',
    color: '#666'
  },
  link: {
    color: '#646cff',
    textDecoration: 'none'
  }
}
