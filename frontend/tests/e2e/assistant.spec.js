import { expect, test } from '@playwright/test'

const account = { id: 1, accountName: 'Personal workspace', accountType: 'INDIVIDUAL', role: 'OWNER' }

const authenticate = async (page) => {
  await page.addInitScript((workspace) => {
    localStorage.setItem('token', 'assistant-test-token')
    localStorage.setItem('user', JSON.stringify({ id: 2, name: 'Test user', mobile: '9999999999' }))
    localStorage.setItem('accounts', JSON.stringify([workspace]))
    localStorage.setItem('currentAccount', JSON.stringify(workspace))
    localStorage.setItem('lastActivityAt', String(Date.now()))
  }, account)
}

const mockApi = async (page) => {
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const path = new URL(route.request().url()).pathname
    let data = []
    if (path === '/api/chat/status') data = { enabled: true, aiConfigured: false }
    if (path === '/api/chat') {
      const body = route.request().postDataJSON()
      expect(body.accountId).toBeUndefined()
      data = body.mode === 'HELP' ? {
        answer: 'In an authorized society workspace, open Expenses, choose Import Excel, review the preview and confirm. [1]', mode: 'HELP_SEARCH',
        sources: [{ id: 'expense-import', title: 'Import expenses', url: '/expenses' }], summary: null
      } : {
        answer: 'Your recorded personal expenses for 2026-10 total INR 250.30 across 2 entries.', mode: 'LIVE_DATA',
        sources: [{ id: 'personal-expenses', title: 'Personal expenses', url: '/personal/expenses' }],
        summary: { startDate: '2026-10-01', endDate: '2026-10-31', total: 250.30, count: 2,
          categories: [{ category: 'Food', amount: 250.30 }], scope: 'Deleted and rejected entries are excluded.' }
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
  })
}

test('assistant redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto('/assistant')
  await expect(page).toHaveURL(/\/login$/)
})

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`assistant help and summary work on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await authenticate(page)
    await mockApi(page)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/assistant')
    await expect(page.getByRole('heading', { name: 'Site assistant', exact: true })).toBeVisible()
    await expect(page.getByText('Help search is available. AI answers have not been enabled.')).toBeVisible()
    await page.getByLabel('Your question').fill('How do I import expenses?')
    await page.getByRole('button', { name: 'Ask', exact: true }).click()
    await expect(page.getByRole('link', { name: '[1] Import expenses' })).toHaveAttribute('href', '/expenses')
    await page.getByLabel('Ask about').selectOption('EXPENSE_SUMMARY')
    await page.getByLabel('Summary month').fill('2026-10')
    await page.getByRole('button', { name: 'Get summary' }).click()
    await expect(page.getByText(/total INR 250.30/)).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Food', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(errors).toEqual([])
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath(`assistant-${viewport.name}.png`), fullPage: true })
  })
}
