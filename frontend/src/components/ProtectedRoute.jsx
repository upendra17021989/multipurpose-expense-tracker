import { useAuthStore } from '../store/authStore'
import { Navigate } from 'react-router-dom'
import { useIsMobileOrTabletDevice } from '../utils/device'

export const ProtectedRoute = ({ children, requireSystemAdmin = false }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAppLocked = useAuthStore((state) => state.isAppLocked)
  const user = useAuthStore((state) => state.user)
  const isMobileOrTablet = useIsMobileOrTabletDevice()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // The lock overlay is rendered at the application root. Avoid mounting the
  // protected page underneath it, since page effects would otherwise continue
  // making authenticated API requests while the application is locked.
  if (isAppLocked && isMobileOrTablet) return null

  if (requireSystemAdmin && !user?.systemAdmin) {
    return <Navigate to="/home" replace />
  }

  return children
}
