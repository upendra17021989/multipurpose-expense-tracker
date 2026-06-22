import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  isAuthenticated: !!localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accounts: JSON.parse(localStorage.getItem('accounts') || '[]'),
  currentAccount: JSON.parse(localStorage.getItem('currentAccount') || 'null'),
  token: localStorage.getItem('token'),

  login: (token, user, accounts) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('accounts', JSON.stringify(accounts))
    localStorage.setItem('currentAccount', JSON.stringify(accounts[0]))
    set({
      isAuthenticated: true,
      token,
      user,
      accounts,
      currentAccount: accounts[0]
    })
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
