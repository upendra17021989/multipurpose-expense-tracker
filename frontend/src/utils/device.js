import { useEffect, useState } from 'react'

const MOBILE_OR_TABLET_QUERY = '(max-width: 1024px)'

export const isMobileOrTabletDevice = () => {
  if (typeof window === 'undefined') return false

  return Boolean(window.matchMedia?.(MOBILE_OR_TABLET_QUERY).matches)
}

export const useIsMobileOrTabletDevice = () => {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(isMobileOrTabletDevice)

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(MOBILE_OR_TABLET_QUERY)
    const updateDeviceType = () => setIsMobileOrTablet(isMobileOrTabletDevice())

    mediaQuery?.addEventListener('change', updateDeviceType)
    window.addEventListener('resize', updateDeviceType)

    return () => {
      mediaQuery?.removeEventListener('change', updateDeviceType)
      window.removeEventListener('resize', updateDeviceType)
    }
  }, [])

  return isMobileOrTablet
}
