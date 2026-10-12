import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Assistant } from './Assistant'

const mocks = vi.hoisted(() => ({
  state: { currentAccount: { id: 1, accountType: 'INDIVIDUAL' }, token: 'first-token', isAppLocked: false, isAuthenticated: true },
  status: vi.fn(), send: vi.fn()
}))
vi.mock('../api/chat', () => ({ chatAPI: { status: mocks.status, send: mocks.send } }))
vi.mock('../store/authStore', () => ({ useAuthStore: (selector) => selector(mocks.state) }))
vi.mock('./DashboardRouter', () => ({ Shell: ({ children, title }) => <main><h1>{title}</h1>{children}</main> }))

const mount = () => render(<MemoryRouter><Assistant /></MemoryRouter>)
const ask = async () => {
  await screen.findByText('Help search is available. AI answers have not been enabled.')
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'How do I import expenses?' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
}
const reply = { data: { answer: 'Review the preview before import.', mode: 'HELP_SEARCH', sources: [{ id: 'import', title: 'Import expenses', url: '/expenses' }], summary: null } }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.state = { currentAccount: { id: 1, accountType: 'INDIVIDUAL' }, token: 'first-token', isAppLocked: false, isAuthenticated: true }
  mocks.status.mockResolvedValue({ data: { enabled: true, aiConfigured: false } })
  mocks.send.mockResolvedValue(reply)
})
afterEach(cleanup)

describe('assistant', () => {
  it('shows a grounded help reply and safe source links', async () => {
    mount(); await ask()
    expect(await screen.findByText(reply.data.answer)).toBeTruthy()
    expect(screen.getByRole('link', { name: '[1] Import expenses' }).getAttribute('href')).toBe('/expenses')
    expect(mocks.send.mock.calls[0][0]).toEqual({ mode: 'HELP', message: 'How do I import expenses?', month: null })
  })

  it('sends an explicit month summary without a user-supplied account id', async () => {
    mount()
    await screen.findByText('Help search is available. AI answers have not been enabled.')
    fireEvent.change(screen.getByLabelText('Ask about'), { target: { value: 'EXPENSE_SUMMARY' } })
    fireEvent.change(screen.getByLabelText('Summary month'), { target: { value: '2026-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get summary' }))
    await waitFor(() => expect(mocks.send).toHaveBeenCalled())
    expect(mocks.send.mock.calls[0][0]).toEqual({ mode: 'EXPENSE_SUMMARY', message: null, month: '2026-10' })
  })

  it('aborts delayed replies on workspace switch and clears history', async () => {
    let resolve
    mocks.send.mockReturnValue(new Promise((done) => { resolve = done }))
    const view = mount(); await ask()
    const signal = mocks.send.mock.calls[0][1]
    mocks.state = { ...mocks.state, currentAccount: { id: 9, accountType: 'SOCIETY' }, token: 'new-token' }
    view.rerender(<MemoryRouter><Assistant /></MemoryRouter>)
    expect(signal.aborted).toBe(true)
    await act(async () => resolve(reply))
    expect(screen.queryByText(reply.data.answer)).toBeNull()
    expect(screen.queryByRole('option', { name: 'Expense summary' })).toBeNull()
  })

  it('clears already displayed replies when the login token changes', async () => {
    const view = mount(); await ask(); await screen.findByText(reply.data.answer)
    mocks.state = { ...mocks.state, token: 'replacement-token' }
    view.rerender(<MemoryRouter><Assistant /></MemoryRouter>)
    expect(screen.queryByText(reply.data.answer)).toBeNull()
  })

  it('does not render or request chat while locked', () => {
    mocks.state = { ...mocks.state, isAppLocked: true }
    mount(); expect(mocks.status).not.toHaveBeenCalled(); expect(screen.queryByRole('main')).toBeNull()
  })

  it('renders provider output as text and rejects external source URLs', async () => {
    mocks.send.mockResolvedValue({ data: { ...reply.data, answer: '<script>alert(1)</script>', sources: [{ id: 'evil', title: 'External', url: 'javascript:alert(1)' }] } })
    const view = mount(); await ask()
    expect(await screen.findByText('<script>alert(1)</script>')).toBeTruthy()
    expect(view.container.querySelector('script')).toBeNull()
    expect(screen.queryByRole('link', { name: /External/ })).toBeNull()
  })

  it('shows request errors and allows retry without inventing a reply', async () => {
    mocks.send.mockRejectedValue({ response: { data: { message: 'Please wait before trying again.' } } })
    mount(); await ask()
    expect((await screen.findByRole('alert')).textContent).toContain('Please wait')
    expect(screen.getByRole('button', { name: 'Ask' }).disabled).toBe(false)
    expect(screen.queryByText(reply.data.answer)).toBeNull()
  })

  it('disables submission when the server feature is disabled', async () => {
    mocks.status.mockResolvedValue({ data: { enabled: false, aiConfigured: false } })
    mount(); await screen.findByText('The assistant is currently disabled.')
    expect(screen.getByRole('button', { name: 'Ask' }).disabled).toBe(true)
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
