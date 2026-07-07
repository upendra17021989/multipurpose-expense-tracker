import { create } from 'zustand'

const saveSession = (token, user, accounts, currentAccount) => {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('accounts', JSON.stringify(accounts))
  localStorage.setItem('currentAccount', JSON.stringify(currentAccount))
  localStorage.setItem('lastActivityAt', String(Date.now()))
}

export const useAuthStore = create((set) => ({
  isAuthenticated: !!localStorage.getItem('token'),
  isAppLocked: localStorage.getItem('appLocked') === 'true',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accounts: JSON.parse(localStorage.getItem('accounts') || '[]'),
  currentAccount: JSON.parse(localStorage.getItem('currentAccount') || 'null'),
  token: localStorage.getItem('token'),

  login: (token, user, accounts, currentAccount) => {
    const selectedAccount = currentAccount || accounts[0]
    saveSession(token, user, accounts, selectedAccount)
    set({
      isAuthenticated: true,
      token,
      user,
      accounts,
      currentAccount: selectedAccount
    })
  },

  setSession: (token, user, accounts, currentAccount) => {
    saveSession(token, user, accounts, currentAccount)
    set({ token, user, accounts, currentAccount, isAuthenticated: true })
  },

  selectAccount: (account) => {
    localStorage.setItem('currentAccount', JSON.stringify(account))
    set({ currentAccount: account })
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  lockApp: () => {
    localStorage.setItem('appLocked', 'true')
    localStorage.setItem('appLockedAt', String(Date.now()))
    set({ isAppLocked: true })
  },

  unlockApp: () => {
    localStorage.removeItem('appLocked')
    localStorage.removeItem('appLockedAt')
    localStorage.setItem('lastActivityAt', String(Date.now()))
    set({ isAppLocked: false })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('accounts')
    localStorage.removeItem('currentAccount')
    localStorage.removeItem('lastActivityAt')
    localStorage.removeItem('appLocked')
    localStorage.removeItem('appLockedAt')
    set({
      isAuthenticated: false,
      token: null,
      user: null,
      accounts: [],
      currentAccount: null,
      isAppLocked: false
    })
  }
}))
