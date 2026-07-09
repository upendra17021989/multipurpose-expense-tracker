import { useAuthStore } from '../store/authStore'
import { Navigate } from 'react-router-dom'

export const ProtectedRoute = ({ children, requireSystemAdmin = false }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireSystemAdmin && !user?.systemAdmin) {
    return <Navigate to="/home" replace />
  }

  return children
}
