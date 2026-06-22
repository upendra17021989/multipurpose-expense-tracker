import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export const Navbar = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <h1 style={styles.logo}>Expense Tracker</h1>
        <div style={styles.rightSection}>
          {user && <span style={styles.userName}>{user.name}</span>}
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>
    </nav>
  )
}

const styles = {
  navbar: {
    backgroundColor: '#1a1a1a',
    color: 'white',
    padding: '1rem 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1rem'
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  userName: {
    fontSize: '0.9rem'
  },
  logoutBtn: {
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    borderRadius: '4px'
  }
}
