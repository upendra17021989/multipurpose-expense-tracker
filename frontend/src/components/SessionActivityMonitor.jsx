import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuthStore } from '../store/authStore'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000
const configuredTimeout = Number(import.meta.env.VITE_INACTIVITY_TIMEOUT_MS)
const INACTIVITY_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS

const activityEvents = [
  'click',
  'keydown',
  'pointerdown',
  'scroll',
  'touchstart'
]

export const SessionActivityMonitor = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) return undefined

    let timeoutId

    const expireSession = () => {
      logout()
      toast.info('Your session expired due to inactivity. Please log in again.')
      navigate('/login', { replace: true })
    }

    const scheduleExpiry = () => {
      window.clearTimeout(timeoutId)
      const lastActivity = Number(localStorage.getItem('lastActivityAt'))
      const elapsed = Date.now() - (lastActivity || Date.now())
      const remaining = INACTIVITY_TIMEOUT_MS - elapsed

      if (remaining <= 0) {
        expireSession()
        return
      }

      timeoutId = window.setTimeout(expireSession, remaining)
    }

    const recordActivity = () => {
      localStorage.setItem('lastActivityAt', String(Date.now()))
      scheduleExpiry()
    }

    const handleStorage = (event) => {
      if (event.key === 'lastActivityAt') scheduleExpiry()
      if (event.key === 'token' && !event.newValue) expireSession()
    }

    if (!localStorage.getItem('lastActivityAt')) recordActivity()
    else scheduleExpiry()

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true })
    )
    window.addEventListener('storage', handleStorage)

    return () => {
      window.clearTimeout(timeoutId)
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity)
      )
      window.removeEventListener('storage', handleStorage)
    }
  }, [isAuthenticated, logout, navigate])

  return null
}
