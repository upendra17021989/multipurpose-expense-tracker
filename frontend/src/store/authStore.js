import { create } from 'zustand'

const saveSession = (token, user, accounts, currentAccount) => {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('accounts', JSON.stringify(accounts))
  localStorage.setItem('currentAccount', JSON.stringify(currentAccount))
}

export const useAuthStore = create((set) => ({
  isAuthenticated: !!localStorage.getItem('token'),
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

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('accounts')
    localStorage.removeItem('currentAccount')
    set({
      isAuthenticated: false,
      token: null,
      user: null,
      accounts: [],
      currentAccount: null
    })
  }
}))
