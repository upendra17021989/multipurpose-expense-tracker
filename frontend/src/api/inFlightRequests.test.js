import { expect, it, vi } from 'vitest'
import { createInFlightRequests } from './inFlightRequests'

it('shares overlapping reads and fetches fresh data after completion', async () => {
  const read = createInFlightRequests()
  let resolve
  const fetch = vi.fn(() => new Promise((done) => { resolve = done }))
  const first = read('account-1:dashboard', fetch)
  const second = read('account-1:dashboard', fetch)
  expect(second).toBe(first)
  await Promise.resolve()
  expect(fetch).toHaveBeenCalledTimes(1)
  resolve('dashboard')
  expect(await second).toBe('dashboard')
  const fresh = vi.fn().mockResolvedValue('updated')
  expect(await read('account-1:dashboard', fresh)).toBe('updated')
  expect(fresh).toHaveBeenCalledTimes(1)
})

it('keeps request scopes separate and retries failed reads', async () => {
  const read = createInFlightRequests()
  const fetch = vi.fn().mockResolvedValue('data')
  await Promise.all([read('account-1:dashboard', fetch), read('account-2:dashboard', fetch)])
  expect(fetch).toHaveBeenCalledTimes(2)
  await expect(read('failed', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline')
  expect(await read('failed', () => Promise.resolve('retried'))).toBe('retried')
})
