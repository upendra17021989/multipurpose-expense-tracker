import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

export const Navbar = () => {
  const navigate = useNavigate()
  const { user, currentAccount, accounts, setSession, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAccountChange = async (event) => {
    const accountId = event.target.value
    if (!accountId || String(currentAccount?.id) === accountId) return

    try {
      const response = await authAPI.switchAccount(accountId)
      const { token, user, accounts, currentAccount } = response.data
      setSession(token, user, accounts, currentAccount)
      toast.success(`Switched to ${currentAccount.accountName}`)
      navigate('/home')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to switch account')
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link className="nav-logo" to="/home">Expense Tracker</Link>
        <div className="nav-links">
          <Link to="/home">Dashboard</Link>
          <Link to="/expenses">Expenses</Link>
          <Link to="/categories">Categories</Link>
          {currentAccount?.accountType === 'INDIVIDUAL' && <Link to="/budget">Budget</Link>}
          {currentAccount?.accountType === 'SOCIETY' && <Link to="/society/flats">Flats</Link>}
        </div>
        <div className="nav-right">
          {accounts.length > 1 && (
            <select value={currentAccount?.id || ''} onChange={handleAccountChange}>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
            </select>
          )}
          {currentAccount && <span className="account-badge">{currentAccount.accountType}</span>}
          {user && <span className="user-name">{user.name}</span>}
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
    </nav>
  )
}
