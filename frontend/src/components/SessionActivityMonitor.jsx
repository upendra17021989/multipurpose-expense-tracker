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

const isMobileAppExperience = () => {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent || ''
  const isAndroid = /Android/i.test(userAgent)
  const isCapacitor = Boolean(window.Capacitor)
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
  const isSmallTouchScreen = window.matchMedia?.('(max-width: 820px) and (pointer: coarse)').matches
  return isAndroid || isCapacitor || isStandalone || isSmallTouchScreen
}

export const SessionActivityMonitor = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAppLocked = useAuthStore((state) => state.isAppLocked)
  const logout = useAuthStore((state) => state.logout)
  const lockApp = useAuthStore((state) => state.lockApp)
  const unlockApp = useAuthStore((state) => state.unlockApp)
  const navigate = useNavigate()

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'token' && !event.newValue) logout()
      if (event.key === 'appLocked' && event.newValue === 'true') lockApp()
      if (event.key === 'appLocked' && !event.newValue) unlockApp()
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [lockApp, logout, unlockApp])

  useEffect(() => {
    if (!isAuthenticated || isAppLocked) return undefined

    let timeoutId

    const expireSession = () => {
      if (isMobileAppExperience()) {
        lockApp()
        toast.info('App locked due to inactivity. Unlock to continue.')
        return
      }

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
      const lastActivity = Number(localStorage.getItem('lastActivityAt'))
      if (lastActivity && Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
        expireSession()
        return
      }

      localStorage.setItem('lastActivityAt', String(Date.now()))
      scheduleExpiry()
    }

    const checkSessionOnResume = () => {
      if (document.visibilityState === 'visible') scheduleExpiry()
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
    document.addEventListener('visibilitychange', checkSessionOnResume)
    window.addEventListener('pageshow', scheduleExpiry)
    window.addEventListener('focus', scheduleExpiry)

    return () => {
      window.clearTimeout(timeoutId)
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity)
      )
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', checkSessionOnResume)
      window.removeEventListener('pageshow', scheduleExpiry)
      window.removeEventListener('focus', scheduleExpiry)
    }
  }, [isAuthenticated, isAppLocked, lockApp, logout, navigate])

  return null
}
