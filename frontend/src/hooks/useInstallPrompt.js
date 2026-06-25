import { useEffect, useState } from 'react'

export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || false)
  const [isAndroidBrowser] = useState(() => /Android/i.test(navigator.userAgent || ''))

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleAppInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) return null

    installPrompt.prompt()
    const result = await installPrompt.userChoice
    setInstallPrompt(null)
    return result?.outcome === 'accepted'
  }

  return {
    canInstall: (Boolean(installPrompt) || isAndroidBrowser) && !installed,
    hasNativePrompt: Boolean(installPrompt),
    promptInstall
  }
}
