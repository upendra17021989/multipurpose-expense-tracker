import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAuthStore } from '../store/authStore'

export const Navbar = () => {
  const navigate = useNavigate()
  const { user, currentAccount, accounts, setSession, logout } = useAuthStore()
  const { canInstall, hasNativePrompt, promptInstall } = useInstallPrompt()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setAccountOpen(false)
    setMenuOpen(false)
    navigate('/login')
  }

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (!hasNativePrompt) {
      toast.info(
        'Open Chrome menu and choose "Add to Home screen" or "Install app".'
      )
      closeMenus()
      return
    }
    if (accepted) {
      toast.success('App installed')
      closeMenus()
    }
  }

  const handleAccountChange = async (event) => {
    const accountId = event.target.value
    if (!accountId || String(currentAccount?.id) === accountId) return

    try {
      const response = await authAPI.switchAccount(accountId)
      const { token, user, accounts, currentAccount } = response.data
      setSession(token, user, accounts, currentAccount)
      toast.success(`Switched to ${currentAccount.accountName}`)
      setMenuOpen(false)
      setAccountOpen(false)
      navigate('/home')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to switch account')
    }
  }

  const closeMenus = () => {
    setMenuOpen(false)
    setModuleOpen(false)
    setAccountOpen(false)
  }

  const moduleLabel =
    currentAccount?.accountType === 'KIRANA_STORE'
      ? 'Kirana'
      : currentAccount?.accountType === 'SOCIETY'
        ? 'Society'
        : currentAccount?.accountType === 'SPORTS'
          ? 'Sports'
          : 'Personal'

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-topline">
          <Link
            className="nav-logo"
            to="/home"
            onClick={() => setMenuOpen(false)}
          >
            Expense Tracker
          </Link>
          <button
            type="button"
            className="nav-menu-toggle"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <div className="nav-links">
            <Link to="/home" onClick={closeMenus}>
              Dashboard
            </Link>
            {currentAccount?.accountType !== 'SPORTS' &&
              currentAccount?.accountType !== 'SOCIETY' && (
              <Link to="/expenses" onClick={closeMenus}>
                Expenses
              </Link>
            )}
            {currentAccount?.accountType !== 'SPORTS' &&
              currentAccount?.accountType !== 'INDIVIDUAL' && (
              <Link to="/categories" onClick={closeMenus}>
                Categories
              </Link>
            )}
            {currentAccount?.accountType === 'INDIVIDUAL' && (
              <Link to="/personal/shared-expenses" onClick={closeMenus}>
                Shared Expenses
              </Link>
            )}
            <div className={`nav-dropdown ${moduleOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="nav-dropdown-trigger"
                onClick={() => setModuleOpen((open) => !open)}
              >
                {moduleLabel}
              </button>
              <div className="nav-dropdown-panel">
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/categories" onClick={closeMenus}>
                    Categories
                  </Link>
                )}
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/budget" onClick={closeMenus}>
                    Budget
                  </Link>
                )}
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/personal/reports" onClick={closeMenus}>
                    Reports
                  </Link>
                )}
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/personal/friends" onClick={closeMenus}>
                    Friends
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/flats" onClick={closeMenus}>
                    Flats
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/vendors" onClick={closeMenus}>
                    Vendors
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/staff" onClick={closeMenus}>
                    Staff
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/festivals" onClick={closeMenus}>
                    Festivals
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/festival-collections" onClick={closeMenus}>
                    Collections
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/annual-finance" onClick={closeMenus}>
                    Annual Finance
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/products" onClick={closeMenus}>
                    Products
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/sales" onClick={closeMenus}>
                    Sales
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/purchases" onClick={closeMenus}>
                    Purchases
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/suppliers" onClick={closeMenus}>
                    Suppliers
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/customers" onClick={closeMenus}>
                    Customers
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/customer-credit" onClick={closeMenus}>
                    Customer Credit
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/supplier-payments" onClick={closeMenus}>
                    Supplier Dues
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/reports" onClick={closeMenus}>
                    Reports
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports" onClick={closeMenus}>
                    Overview
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/members" onClick={closeMenus}>
                    Members
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/events" onClick={closeMenus}>
                    Events
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/expenses" onClick={closeMenus}>
                    Expenses
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/collections" onClick={closeMenus}>
                    Collections
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/reports" onClick={closeMenus}>
                    Reports
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="nav-right">
            {canInstall && (
              <button
                type="button"
                className="install-btn"
                onClick={handleInstall}
              >
                Install app
              </button>
            )}
            <div className={`nav-account ${accountOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="nav-account-trigger"
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span>{user?.name || 'Account'}</span>
                {currentAccount && (
                  <span className="account-badge">
                    {currentAccount.accountType}
                  </span>
                )}
              </button>
              <div className="nav-account-panel">
                {accounts.length > 1 && (
                  <label>
                    Account
                    <select
                      value={currentAccount?.id || ''}
                      onChange={handleAccountChange}
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.accountName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {accounts.length <= 1 && currentAccount && (
                  <p className="nav-account-name">
                    {currentAccount.accountName}
                  </p>
                )}
                <Link to="/profile" onClick={closeMenus}>
                  Edit account details
                </Link>
                <Link to="/change-password" onClick={closeMenus}>
                  Change password
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
