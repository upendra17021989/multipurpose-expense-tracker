import { expect, test } from '@playwright/test'

const publicRoutes = ['/login', '/register', '/reset-password']

const protectedRoutes = [
  '/profile', '/change-password', '/workspaces', '/home', '/dashboard',
  '/expenses', '/expenses/new', '/expenses/1/edit', '/categories', '/budget',
  '/personal/reports', '/personal/shared-expenses', '/personal/shared-expenses/1',
  '/personal/shared-expenses/1/expenses', '/personal/friends', '/personal/documents',
  '/personal/todos', '/society/flats', '/society/member-directory', '/society/flats/new',
  '/society/flats/1/edit', '/society/vendors', '/society/vendors/new',
  '/society/vendors/1/edit', '/society/staff', '/society/staff/new',
  '/society/staff/1/edit', '/society/festivals', '/society/festivals/new',
  '/society/festivals/1/edit', '/society/festival-collections',
  '/society/annual-finance', '/society/join', '/society/annual-collections',
  '/society/festival-collections/1', '/society/festival-collections/1/1/payment',
  '/society/festival-collections/1/1/receipts', '/kirana/products',
  '/kirana/products/new', '/kirana/products/1/edit', '/kirana/suppliers',
  '/kirana/suppliers/new', '/kirana/suppliers/1/edit', '/kirana/customers',
  '/kirana/customers/new', '/kirana/customers/1/edit', '/kirana/sales',
  '/kirana/sales/new', '/kirana/sales/1/edit', '/kirana/purchases',
  '/kirana/purchases/new', '/kirana/purchases/1/edit', '/kirana/customer-credit',
  '/kirana/supplier-payments', '/kirana/reports', '/sports', '/sports/members',
  '/sports/events', '/sports/expenses', '/sports/collections',
  '/sports/collections/1/receipts', '/sports/reports', '/system-admin',
  '/system-admin/users', '/system-admin/accounts', '/system-admin/audit-logs',
  '/system-admin/health', '/system-admin/storage', '/system-admin/settings'
]

const user = {
  id: 1, name: 'Playwright Admin', fullName: 'Playwright Admin',
  mobile: '9999999999', email: 'playwright@example.test', systemAdmin: true
}

const account = {
  id: 1, name: 'Playwright Workspace', accountName: 'Playwright Workspace',
  accountType: 'INDIVIDUAL', type: 'INDIVIDUAL', role: 'ADMIN'
}

test.beforeEach(async ({ page }) => {
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const noContent = route.request().method() === 'DELETE'
    await route.fulfill({
      status: noContent ? 204 : 200,
      contentType: 'application/json',
      body: noContent ? '' : JSON.stringify([])
    })
  })
})

for (const route of publicRoutes) {
  test(`public page renders: ${route}`, async ({ page }) => {
    await page.goto(route)
    await expect(page.locator('#root')).not.toBeEmpty()
    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`))
  })
}

test.describe('authenticated navigation', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [{
        origin: 'http://127.0.0.1:4173',
        localStorage: [
          { name: 'token', value: 'playwright-token' },
          { name: 'user', value: JSON.stringify(user) },
          { name: 'accounts', value: JSON.stringify([account]) },
          { name: 'currentAccount', value: JSON.stringify(account) },
          { name: 'lastActivityAt', value: String(Date.now()) }
        ]
      }]
    }
  })

  for (const route of protectedRoutes) {
    test(`protected page renders: ${route}`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('#root')).not.toBeEmpty()
      await expect(page).not.toHaveURL(/\/login$/)
      await expect(page.locator('body')).not.toContainText('Cannot read properties of')
    })
  }

  test('combined full-site navigation video', async ({ page }) => {
    test.setTimeout(120_000)
    for (const route of [...publicRoutes, ...protectedRoutes]) {
      await test.step(`Visit ${route}`, async () => {
        await page.goto(route)
        await expect(page.locator('#root')).not.toBeEmpty()
        if (!publicRoutes.includes(route)) await expect(page).not.toHaveURL(/\/login$/)
        await page.waitForTimeout(350)
      })
    }
  })
})
