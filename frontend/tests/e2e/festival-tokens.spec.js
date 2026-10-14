import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('tokens per page resizes preview and downloads 12 tokens on each full A4 page', async ({ page }, testInfo) => {
  test.setTimeout(60000)
  page.on('pageerror', error => console.error('Browser error:', error.message))
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()) })
  await page.addInitScript(() => {
    const account = { id: 1, accountType: 'SOCIETY', accountName: 'Pramukh Glory Society', role: 'ADMIN' }
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test User' }))
    localStorage.setItem('currentAccount', JSON.stringify(account))
    localStorage.setItem('accounts', JSON.stringify([account]))
    localStorage.setItem('lastActivityAt', String(Date.now()))
  })
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ json: {} }))
  await page.goto('/society/festival-tokens')
  await expect(page.getByText('200 tokens · 13 A4 pages')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Kids token 1', exact: true })).toBeVisible()
  await expect(page.locator('.festival-token-cell')).toHaveCount(16)
  for (const count of [4, 8, 20, 12]) {
    await page.getByLabel('Tokens per A4 page').selectOption(String(count))
    await expect(page.locator('.festival-token-cell')).toHaveCount(count)
    const fits = await page.locator('.festival-token-sheet').evaluate(sheet => {
      const outer = sheet.getBoundingClientRect()
      return [...sheet.querySelectorAll('canvas')].every(canvas => {
        const rect = canvas.getBoundingClientRect()
        const cell = canvas.parentElement.getBoundingClientRect()
        return rect.top >= cell.top && rect.bottom <= cell.bottom && rect.left >= cell.left && rect.right <= cell.right && cell.bottom <= outer.bottom
      })
    })
    expect(fits).toBe(true)
  }
  await expect(page.getByText('200 tokens · 17 A4 pages')).toBeVisible()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Kids token 50', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Adults token 51', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('kids-adults-preview.png'), fullPage: true })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download A4 PDF' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('festival-tokens-1-200.pdf')
  const path = testInfo.outputPath('tokens.pdf')
  await download.saveAs(path)
  const pdf = (await readFile(path)).toString('latin1')
  expect(pdf.startsWith('%PDF-')).toBe(true)
  expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(17)
  expect(pdf.match(/\/MediaBox \[0 0 595\.28 841\.89\]/g)).toHaveLength(17)
  // PNG alpha masks create a second image object for each numbered badge.
  expect(pdf.match(/\/Subtype \/Image\b/g)).toHaveLength(400)
  await page.getByLabel('Last token', { exact: true }).fill('40')
  await expect(page.locator('.festival-token-error')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download A4 PDF' })).toBeDisabled()
})
