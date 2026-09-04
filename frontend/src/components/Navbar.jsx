import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authAPI } from '../api/endpoints'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { LANGUAGES, useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { getNavigationGroups, isNavigationItemActive } from './navigationConfig'

const glyphs = {
  Dashboard: 'D',
  Expenses: 'E',
  Categories: 'C',
  Budget: 'B',
  Reports: 'R',
  'Shared Expenses': 'S',
  Friends: 'F',
  Documents: 'D',
  Tasks: 'T',
  'Office Hours': 'O',
  'Annual Finance': 'A',
  'Financial Ledger': 'L',
  'Journal Book': 'J',
  Festivals: 'F',
  Collections: 'C',
  Flats: 'F',
  'Member Directory': 'M',
  Vendors: 'V',
  Staff: 'S',
  Sales: 'S',
  Purchases: 'P',
  Products: 'P',
  Customers: 'C',
  'Customer Credit': 'C',
  Suppliers: 'S',
  'Supplier Dues': 'D',
  Overview: 'O',
  Members: 'M',
  Events: 'E',
  'System Admin': 'A',
  Feedback: '?'
}

export const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const panelRef = useRef(null)
  const openButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const { user, currentAccount, accounts, setSession, logout } = useAuthStore()
  const { canInstall, hasNativePrompt, promptInstall } = useInstallPrompt()
  const { language, setLanguage, tx } = useI18n()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const groups = getNavigationGroups(
    currentAccount?.accountType,
    user?.systemAdmin
  )
  const closeDrawer = (restoreFocus = false) => {
    setDrawerOpen(false)
    setAccountOpen(false)
    if (restoreFocus) window.setTimeout(() => openButtonRef.current?.focus(), 0)
  }

  useEffect(() => {
    closeDrawer()
  }, [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return undefined
    document.body.classList.add('sidebar-drawer-open')
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer(true)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [
        ...panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), select:not([disabled])'
        )
      ]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('sidebar-drawer-open')
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [drawerOpen])

  const handleAccountChange = async (event) => {
    const accountId = event.target.value
    if (!accountId || String(currentAccount?.id) === accountId) return
    try {
      const response = await authAPI.switchAccount(accountId)
      const {
        token,
        user: nextUser,
        accounts: nextAccounts,
        currentAccount: nextAccount
      } = response.data
      setSession(token, nextUser, nextAccounts, nextAccount)
      toast.success(`Switched to ${nextAccount.accountName}`)
      closeDrawer()
      navigate('/home')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to switch account')
    }
  }

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (!hasNativePrompt)
      toast.info(
        'Open Chrome menu and choose "Add to Home screen" or "Install app".'
      )
    else if (accepted) toast.success('App installed')
    closeDrawer()
  }

  const handleLogout = () => {
    logout()
    closeDrawer()
    navigate('/login')
  }

  const navigationLink = (item) => {
    const active = isNavigationItemActive(location.pathname, item)
    return (
      <Link
        key={item.to}
        to={item.to}
        className={`sidebar-nav-link${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => closeDrawer()}
      >
        <span className="sidebar-nav-glyph" aria-hidden="true">
          {glyphs[item.label] || item.label[0]}
        </span>
        <span>{tx(item.label)}</span>
      </Link>
    )
  }

  return (
    <>
      <header className="sidebar-mobile-bar">
        <button
          ref={openButtonRef}
          type="button"
          className="sidebar-menu-button"
          aria-label={tx('Open navigation menu')}
          aria-expanded={drawerOpen}
          aria-controls="primary-sidebar"
          onClick={() => setDrawerOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <Link to="/home">{tx('Expense Tracker')}</Link>
        <span className="sidebar-mobile-avatar" aria-hidden="true">
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </span>
      </header>
      {drawerOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label={tx('Close navigation menu')}
          onClick={() => closeDrawer(true)}
        />
      )}
      <aside
        ref={panelRef}
        id="primary-sidebar"
        className={`app-sidebar${drawerOpen ? ' open' : ''}`}
        aria-label={tx('Application sidebar')}
      >
        <div className="sidebar-heading">
          <Link to="/home" onClick={() => closeDrawer()}>
            {tx('Expense Tracker')}
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className="sidebar-close-button"
            aria-label={tx('Close navigation menu')}
            onClick={() => closeDrawer(true)}
          >
            ×
          </button>
          <p title={currentAccount?.accountName}>
            {currentAccount?.accountName || tx('No workspace selected')}
          </p>
          {currentAccount?.accountType && (
            <span>{tx(currentAccount.accountType.replaceAll('_', ' '))}</span>
          )}
        </div>
        <nav className="sidebar-nav" aria-label={tx('Primary navigation')}>
          {navigationLink({ label: 'Dashboard', to: '/home', exact: true })}
          {groups.map((group) => (
            <section className="sidebar-nav-group" key={group.label}>
              <h2>{tx(group.label)}</h2>
              {group.items.map(navigationLink)}
            </section>
          ))}
        </nav>
        <div className="sidebar-account">
          <button
            type="button"
            className="sidebar-account-trigger"
            aria-expanded={accountOpen}
            aria-controls="sidebar-account-menu"
            onClick={() => setAccountOpen((open) => !open)}
          >
            <span className="sidebar-avatar" aria-hidden="true">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </span>
            <span className="sidebar-account-copy">
              <strong>{user?.name || tx('Account')}</strong>
              <small>{currentAccount?.accountName}</small>
            </span>
            <span aria-hidden="true">{accountOpen ? '⌄' : '⌃'}</span>
          </button>
          {accountOpen && (
            <div id="sidebar-account-menu" className="sidebar-account-menu">
              {accounts.length > 1 && (
                <label>
                  {tx('Workspace')}
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
              <label>
                {tx('Language')}
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.shortLabel}
                    </option>
                  ))}
                </select>
              </label>
              <Link to="/workspaces" onClick={() => closeDrawer()}>
                {tx('Workspaces')}
              </Link>
              <Link to="/profile" onClick={() => closeDrawer()}>
                {tx('Edit account details')}
              </Link>
              <Link to="/change-password" onClick={() => closeDrawer()}>
                {tx('Change password')}
              </Link>
              {canInstall && (
                <button type="button" onClick={handleInstall}>
                  {tx('Install app')}
                </button>
              )}
              <button
                type="button"
                className="sidebar-logout"
                onClick={handleLogout}
              >
                {tx('Logout')}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
