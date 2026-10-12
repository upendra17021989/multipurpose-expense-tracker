import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import '../pages/Assistant.css'

export const AssistantLauncher = () => {
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  const locked = useAuthStore((state) => state.isAppLocked)
  const location = useLocation()
  if (!authenticated || locked || location.pathname === '/assistant') return null
  return <Link className="assistant-launcher" to="/assistant" aria-label="Open site assistant">Ask assistant</Link>
}
