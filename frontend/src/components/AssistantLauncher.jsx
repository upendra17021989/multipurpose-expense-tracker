import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import '../pages/Assistant.css'

export const AssistantLauncher = () => {
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  const locked = useAuthStore((state) => state.isAppLocked)
  const location = useLocation()
  if (!authenticated || locked || location.pathname === '/assistant') return null
  return <Link className="assistant-launcher" to="/assistant" state={{ from: location.pathname + location.search + location.hash }} aria-label="Open site assistant" title="Ask assistant">
    <svg className="assistant-launcher-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      <path d="M8 11h8M8 14h5" />
    </svg>
    <span className="assistant-launcher-label">Ask assistant</span>
  </Link>
}
