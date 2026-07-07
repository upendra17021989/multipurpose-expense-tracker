import { useAuthStore } from '../store/authStore'

export const AppLockOverlay = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAppLocked = useAuthStore((state) => state.isAppLocked)
  const unlockApp = useAuthStore((state) => state.unlockApp)
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  if (!isAuthenticated || !isAppLocked) return null

  return (
    <div className="app-lock-backdrop" role="dialog" aria-modal="true" aria-labelledby="app-lock-title">
      <section className="app-lock-card">
        <div className="app-lock-icon" aria-hidden="true">🔒</div>
        <p className="eyebrow">Secure session</p>
        <h1 id="app-lock-title">App locked</h1>
        <p>
          {user?.name ? `${user.name}, y` : 'Y'}our session is still active. Unlock to continue without logging in again.
        </p>
        <div className="app-lock-actions">
          <button className="primary" type="button" onClick={unlockApp}>Unlock</button>
          <button type="button" onClick={logout}>Log out</button>
        </div>
      </section>
    </div>
  )
}
