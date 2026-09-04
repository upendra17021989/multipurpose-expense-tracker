import { describe, expect, it } from 'vitest'
import { getNavigationGroups, isNavigationItemActive } from './navigationConfig'

const labels = (accountType, isAdmin = false) =>
  getNavigationGroups(accountType, isAdmin).flatMap((group) =>
    group.items.map((item) => item.label)
  )

describe('sidebar navigation configuration', () => {
  it('returns only Individual modules for an Individual account', () => {
    const items = labels('INDIVIDUAL')
    expect(items).toContain('Shared Expenses')
    expect(items).toContain('Budget')
    expect(items).not.toContain('Products')
    expect(items).not.toContain('Flats')
  })

  it('returns account-specific modules for Society, Kirana, and Sports accounts', () => {
    expect(labels('SOCIETY')).toContain('Financial Ledger')
    expect(labels('KIRANA_STORE')).toContain('Supplier Dues')
    expect(labels('SPORTS')).toContain('Events')
  })

  it('shows administration only to system administrators', () => {
    expect(labels('INDIVIDUAL', false)).not.toContain('System Admin')
    expect(labels('INDIVIDUAL', true)).toContain('System Admin')
  })

  it('matches nested routes while keeping dashboard and sports overview exact', () => {
    expect(
      isNavigationItemActive('/personal/shared-expenses/42/balances', {
        label: 'Shared Expenses',
        to: '/personal/shared-expenses'
      })
    ).toBe(true)
    expect(
      isNavigationItemActive('/expenses/42/edit', {
        label: 'Expenses',
        to: '/expenses'
      })
    ).toBe(true)
    expect(
      isNavigationItemActive('/dashboard', { label: 'Dashboard', to: '/home' })
    ).toBe(true)
    expect(
      isNavigationItemActive('/sports/events', {
        label: 'Overview',
        to: '/sports',
        exact: true
      })
    ).toBe(false)
  })
})
