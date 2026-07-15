import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import { authAPI, societyMembershipAPI } from '../api/endpoints'
import 'react-toastify/dist/ReactToastify.css'

const accountTypeLabels = {
  INDIVIDUAL: 'Individual',
  SOCIETY: 'Society',
  KIRANA_STORE: 'Kirana store',
  SPORTS: 'Sports'
}

const RequiredLabel = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} style={styles.requiredLabel}>
    <span>{children}</span><span style={styles.requiredAsterisk}>*</span>
  </label>
)

export const Register = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [societies, setSocieties] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    accountType: 'INDIVIDUAL',
    accountName: '',
    address: '',
    societyName: '',
    storeName: '',
    societyMode: 'JOIN',
    societyId: '',
    blockName: '',
    flatNumber: '',
    relation: 'Resident'
  })

  useEffect(() => {
    societyMembershipAPI.listSocieties()
      .then((response) => setSocieties(response.data || []))
      .catch(() => setSocieties([]))
  }, [])

  const accountNamePlaceholder = useMemo(() => {
    if (formData.accountType === 'SOCIETY') return 'e.g. Shree Residency Society'
    if (formData.accountType === 'KIRANA_STORE') return 'e.g. Patel Kirana Store'
    if (formData.accountType === 'SPORTS') return 'e.g. Sunday Cricket Club'
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
      role: resolveRole(formData.accountType, formData.societyMode),
      societyId: formData.accountType === 'SOCIETY' && formData.societyMode === 'JOIN'
        ? Number(formData.societyId) : null,
      createNewSociety: formData.accountType === 'SOCIETY' && formData.societyMode === 'CREATE',
      societyName: formData.accountType === 'SOCIETY' ? formData.societyName || formData.accountName : '',
      blockName: formData.accountType === 'SOCIETY' && formData.societyMode === 'JOIN' ? formData.blockName.trim() : '',
      flatNumber: formData.accountType === 'SOCIETY' && formData.societyMode === 'JOIN' ? formData.flatNumber.trim() : '',
      relation: formData.accountType === 'SOCIETY' && formData.societyMode === 'JOIN' ? formData.relation : '',
      storeName: formData.accountType === 'KIRANA_STORE' ? formData.storeName || formData.accountName : ''
    }

    try {
      await authAPI.register(payload)
      toast.success(formData.accountType === 'SOCIETY' && formData.societyMode === 'JOIN'
        ? 'Registration successful. Your request was sent to the society admins for approval.'
        : 'Registration successful. Please login.')
      setTimeout(() => navigate('/login'), 700)
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="auth-card" style={styles.formBox}>
        <h2 style={styles.title}>Create account</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <RequiredLabel htmlFor="name">Name</RequiredLabel>
              <input id="name" name="name" value={formData.name} onChange={handleInputChange} required style={styles.input} />
            </div>

            <div style={styles.formGroup}>
              <RequiredLabel htmlFor="mobile">Mobile</RequiredLabel>
              <input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} required style={styles.input} />
            </div>
          </div>

          <div style={styles.formGroup}>
            <RequiredLabel htmlFor="email">Email</RequiredLabel>
            <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required style={styles.input} />
          </div>

          <div style={styles.formGroup}>
            <RequiredLabel htmlFor="password">Password</RequiredLabel>
            <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} required minLength="6" style={styles.input} />
          </div>

          <div style={styles.formGroup}>
            <RequiredLabel htmlFor="accountType">Account type</RequiredLabel>
            <select id="accountType" name="accountType" value={formData.accountType} onChange={handleInputChange} required style={styles.input}>
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {formData.accountType !== 'SOCIETY' || formData.societyMode === 'CREATE' ? <div style={styles.formGroup}>
            <RequiredLabel htmlFor="accountName">Account name</RequiredLabel>
            <input
              id="accountName"
              name="accountName"
              value={formData.accountName}
              onChange={handleInputChange}
              placeholder={accountNamePlaceholder}
              required
              style={styles.input}
            />
          </div> : null}

          {formData.accountType === 'SOCIETY' && (
            <>
              <div style={styles.formGroup}>
                <RequiredLabel htmlFor="societyMode">Society registration</RequiredLabel>
                <select id="societyMode" name="societyMode" value={formData.societyMode} onChange={handleInputChange} style={styles.input}>
                  <option value="JOIN">Join an existing society</option>
                  <option value="CREATE">Create my own society</option>
                </select>
              </div>
              {formData.societyMode === 'JOIN' ? (
                <>
                  <div style={styles.formGroup}>
                    <RequiredLabel htmlFor="societyId">Choose society</RequiredLabel>
                    <select id="societyId" name="societyId" value={formData.societyId} onChange={handleInputChange} required style={styles.input}>
                      <option value="">Select a society</option>
                      {societies.map((society) => (
                        <option key={society.id} value={society.id}>
                          {society.name}{society.address ? ` - ${society.address}` : ''}
                        </option>
                      ))}
                    </select>
                    {!societies.length && <small>No existing societies found. Choose Create my own society.</small>}
                  </div>
                  <div style={styles.formGroup}>
                    <RequiredLabel htmlFor="blockName">Block</RequiredLabel>
                    <input id="blockName" name="blockName" value={formData.blockName} onChange={handleInputChange} placeholder="e.g. A" required style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <RequiredLabel htmlFor="flatNumber">Flat number</RequiredLabel>
                    <input id="flatNumber" name="flatNumber" value={formData.flatNumber} onChange={handleInputChange} placeholder="e.g. 302" required style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <RequiredLabel htmlFor="relation">Relation</RequiredLabel>
                    <select id="relation" name="relation" value={formData.relation} onChange={handleInputChange} required style={styles.input}>
                      <option value="Resident">Resident</option>
                      <option value="Owner">Owner</option>
                      <option value="Tenant">Tenant</option>
                      <option value="Family member">Family member</option>
                      <option value="Committee member">Committee member</option>
                    </select>
                  </div>
                </>
              ) : (
                <div style={styles.formGroup}>
                  <RequiredLabel htmlFor="societyName">Society name</RequiredLabel>
                  <input id="societyName" name="societyName" value={formData.societyName} onChange={handleInputChange} required style={styles.input} />
                </div>
              )}
            </>
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
          Already have an account? <Link to="/login" style={styles.link}>Login</Link> and open Workspaces from the account menu to add or join another workspace.
        </p>
      </div>
    </div>
  )
}

const resolveRole = (accountType, societyMode) => {
  if (accountType === 'SOCIETY') return societyMode === 'JOIN' ? 'MEMBER' : 'ADMIN'
  if (accountType === 'SPORTS') return 'ADMIN'
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
  requiredLabel: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '0.2rem',
    width: 'auto'
  },
  requiredAsterisk: {
    display: 'inline',
    color: '#dc2626',
    fontWeight: 700
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


