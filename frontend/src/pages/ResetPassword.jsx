import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'

export const ResetPassword = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ mobile: '', email: '', newPassword: '', confirmPassword: '' })
  const handleChange = ({ target: { name, value } }) => setFormData((current) => ({ ...current, [name]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPassword(formData)
      toast.success('Password reset successfully. You can now log in.')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={styles.container}><div className="auth-card" style={styles.formBox}>
      <h2 style={styles.title}>Reset password</h2>
      <p style={styles.helperText}>Verify your registered mobile number and email, then choose a new password.</p>
      <form onSubmit={handleSubmit}>
        <Field label="Mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} />
        <Field label="Registered email" name="email" type="email" value={formData.email} onChange={handleChange} />
        <Field label="New password" name="newPassword" type="password" value={formData.newPassword} onChange={handleChange} minLength={6} />
        <Field label="Confirm password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} minLength={6} />
        <button type="submit" disabled={loading} style={styles.button}>{loading ? 'Resetting...' : 'Reset password'}</button>
      </form>
      <p style={styles.bottomText}><Link to="/login" style={styles.link}>Back to login</Link></p>
    </div></div>
  )
}

const Field = ({ label, ...props }) => <div style={styles.formGroup}><label htmlFor={props.name}>{label}</label><input id={props.name} required style={styles.input} {...props} /></div>
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  formBox: { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px' },
  title: { textAlign: 'center', marginBottom: '0.75rem', color: '#1a1a1a' }, helperText: { color: '#666', marginBottom: '1.25rem' },
  formGroup: { marginBottom: '1rem' }, input: { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', marginTop: '0.5rem' },
  button: { width: '100%', padding: '0.75rem', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  bottomText: { textAlign: 'center', marginTop: '1rem' }, link: { color: '#646cff', textDecoration: 'none' }
}
