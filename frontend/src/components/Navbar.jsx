import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { LANGUAGES, useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'

export const Navbar = () => {
  const navigate = useNavigate()
  const { user, currentAccount, accounts, setSession, logout } = useAuthStore()
  const { canInstall, hasNativePrompt, promptInstall } = useInstallPrompt()
  const { language, setLanguage, tx } = useI18n()
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
            {tx('Expense Tracker')}
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
              {tx('Dashboard')}
            </Link>
            {user?.systemAdmin && (
              <Link to="/system-admin" onClick={closeMenus}>
                {tx('System Admin')}
              </Link>
            )}
            {currentAccount?.accountType !== 'SPORTS' &&
              currentAccount?.accountType !== 'SOCIETY' && (
              <Link to="/expenses" onClick={closeMenus}>
                {tx('Expenses')}
              </Link>
            )}
            {currentAccount?.accountType !== 'SPORTS' &&
              currentAccount?.accountType !== 'INDIVIDUAL' &&
              currentAccount?.accountType !== 'SOCIETY' && (
              <Link to="/categories" onClick={closeMenus}>
                {tx('Categories')}
              </Link>
            )}
            {currentAccount?.accountType === 'SOCIETY' && (
              <Link to="/society/annual-finance" onClick={closeMenus}>
                {tx('Annual Finance')}
              </Link>
            )}
            {currentAccount?.accountType === 'SOCIETY' && (
              <Link to="/society/festivals" onClick={closeMenus}>
                {tx('Festivals')}
              </Link>
            )}
            {currentAccount?.accountType === 'INDIVIDUAL' && (
              <Link to="/personal/shared-expenses" onClick={closeMenus}>
                {tx('Shared Expenses')}
              </Link>
            )}
            {currentAccount?.accountType === 'INDIVIDUAL' && (
              <Link to="/personal/documents" onClick={closeMenus}>
                {tx('My Documents')}
              </Link>
            )}
            <div className={`nav-dropdown ${moduleOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="nav-dropdown-trigger"
                onClick={() => setModuleOpen((open) => !open)}
              >
                {tx(moduleLabel)}
              </button>
              <div className="nav-dropdown-panel">
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/categories" onClick={closeMenus}>
                    {tx('Categories')}
                  </Link>
                )}
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/budget" onClick={closeMenus}>
                    {tx('Budget')}
                  </Link>
                )}
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/personal/reports" onClick={closeMenus}>
                    {tx('Reports')}
                  </Link>
                )}
                {currentAccount?.accountType === 'INDIVIDUAL' && (
                  <Link to="/personal/friends" onClick={closeMenus}>
                    {tx('Friends')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/categories" onClick={closeMenus}>
                    {tx('Categories')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/flats" onClick={closeMenus}>
                    {tx('Flats')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/vendors" onClick={closeMenus}>
                    {tx('Vendors')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/staff" onClick={closeMenus}>
                    {tx('Staff')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SOCIETY' && (
                  <Link to="/society/festival-collections" onClick={closeMenus}>
                    {tx('Collections')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/products" onClick={closeMenus}>
                    {tx('Products')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/sales" onClick={closeMenus}>
                    {tx('Sales')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/purchases" onClick={closeMenus}>
                    {tx('Purchases')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/suppliers" onClick={closeMenus}>
                    {tx('Suppliers')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/customers" onClick={closeMenus}>
                    {tx('Customers')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/customer-credit" onClick={closeMenus}>
                    {tx('Customer Credit')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/supplier-payments" onClick={closeMenus}>
                    {tx('Supplier Dues')}
                  </Link>
                )}
                {currentAccount?.accountType === 'KIRANA_STORE' && (
                  <Link to="/kirana/reports" onClick={closeMenus}>
                    {tx('Reports')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports" onClick={closeMenus}>
                    {tx('Overview')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/members" onClick={closeMenus}>
                    {tx('Members')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/events" onClick={closeMenus}>
                    {tx('Events')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/expenses" onClick={closeMenus}>
                    {tx('Expenses')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/collections" onClick={closeMenus}>
                    {tx('Collections')}
                  </Link>
                )}
                {currentAccount?.accountType === 'SPORTS' && (
                  <Link to="/sports/reports" onClick={closeMenus}>
                    {tx('Reports')}
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
                {tx('Install app')}
              </button>
            )}
            <label className="language-picker">
              <span>{tx('Language')}</span>
              <select
                aria-label={tx('Language')}
                title={tx('Language')}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.code} value={item.code}>{item.shortLabel}</option>
                ))}
              </select>
            </label>
            <div className={`nav-account ${accountOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="nav-account-trigger"
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span>{user?.name || tx('Account')}</span>
                {currentAccount && (
                  <span className="account-badge">
                    {currentAccount.accountType}
                  </span>
                )}
              </button>
              <div className="nav-account-panel">
                {accounts.length > 1 && (
                  <label>
                    {tx('Account')}
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
                  {tx('Edit account details')}
                </Link>
                <Link to="/change-password" onClick={closeMenus}>
                  {tx('Change password')}
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  {tx('Logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
