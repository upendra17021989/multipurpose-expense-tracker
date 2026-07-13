import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 120000

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add JWT token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle response errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = error.config?.url || ''
    const isLoginRequest = /\/auth\/(login(?:\/\d+)?|register|reset-password)(?:\?|$)/.test(requestPath)
    if (error.response?.status === 401 && !isLoginRequest) {
      // The server rejected the current session. Clear all session state before
      // redirecting so mobile/PWA clients cannot remain on a protected screen.
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
