import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DocumentAssistant } from './DocumentAssistant'

const api = vi.hoisted(() => ({ documents: vi.fn(), documentStatus: vi.fn(), enableDocument: vi.fn(), disableDocument: vi.fn(), askDocument: vi.fn() }))
vi.mock('../api/chat', () => ({ chatAPI: api }))
vi.mock('./DashboardRouter', () => ({ Shell: ({ children }) => <main>{children}</main> }))
const document = { id: 5, title: 'Policy', contentType: 'application/pdf', sharedWithMe: false }
beforeEach(() => {
  vi.clearAllMocks()
  api.documents.mockResolvedValue({ data: { content: [document], last: true } })
  api.documentStatus.mockResolvedValue({ data: { status: 'NOT_INDEXED' } })
  api.enableDocument.mockResolvedValue({ data: { status: 'QUEUED' } })
  api.disableDocument.mockResolvedValue({})
  api.askDocument.mockResolvedValue({ data: { mode: 'DOCUMENT_AI', answer: 'Premium 1500 [1]', sources: [{ id: 'p1', title: 'Policy / page 1 / part 1' }] } })
})
afterEach(cleanup)
const mount = async () => {
  const view = render(<MemoryRouter><DocumentAssistant onBack={() => {}} aiConfigured /></MemoryRouter>)
  await screen.findByRole('option', { name: 'Policy' })
  fireEvent.change(screen.getByLabelText('Document'), { target: { value: '5' } })
  return view
}
it('requires explicit owner consent and does not index on selection', async () => {
  await mount(); await screen.findByText('Indexing: NOT_INDEXED')
  expect(api.enableDocument).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Enable indexing / retry' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Enable indexing / retry' }))
  await waitFor(() => expect(api.enableDocument).toHaveBeenCalledWith(5, expect.any(AbortSignal)))
})
it('shared readers can ask but cannot change indexing consent', async () => {
  api.documents.mockResolvedValue({ data: { content: [{ ...document, sharedWithMe: true }], last: true } })
  api.documentStatus.mockResolvedValue({ data: { status: 'READY' } })
  render(<MemoryRouter><DocumentAssistant onBack={() => {}} aiConfigured /></MemoryRouter>)
  await screen.findByRole('option', { name: 'Policy (shared)' })
  fireEvent.change(screen.getByLabelText('Document'), { target: { value: '5' } })
  await screen.findByText('Indexing: READY')
  expect(screen.queryByRole('checkbox')).toBeNull()
  fireEvent.change(screen.getByLabelText('Your document question'), { target: { value: 'premium' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask document' }))
  expect(await screen.findByText('Premium 1500 [1]')).toBeTruthy()
  expect(screen.getByText('[1] Policy / page 1 / part 1')).toBeTruthy()
})
it('aborts an in-flight answer when the selected document changes', async () => {
  api.documentStatus.mockResolvedValue({ data: { status: 'READY' } })
  let resolve
  api.askDocument.mockReturnValue(new Promise((done) => { resolve = done }))
  await mount(); await screen.findByText('Indexing: READY')
  fireEvent.change(screen.getByLabelText('Your document question'), { target: { value: 'premium' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask document' }))
  await waitFor(() => expect(api.askDocument).toHaveBeenCalled())
  const signal = api.askDocument.mock.calls[0][2]
  fireEvent.change(screen.getByLabelText('Document'), { target: { value: '' } })
  expect(signal.aborted).toBe(true)
  await act(async () => resolve({ data: { answer: 'Old private answer' } }))
  expect(screen.queryByText('Old private answer')).toBeNull()
})
it('deletes the displayed answer when the owner disables indexing', async () => {
  api.documentStatus.mockResolvedValue({ data: { status: 'READY' } })
  await mount(); await screen.findByText('Indexing: READY')
  fireEvent.change(screen.getByLabelText('Your document question'), { target: { value: 'premium' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask document' }))
  await screen.findByText('Premium 1500 [1]')
  api.documentStatus.mockResolvedValue({ data: { status: 'NOT_INDEXED' } })
  fireEvent.click(screen.getByRole('button', { name: 'Disable and delete index' }))
  await screen.findByText('Indexing: NOT_INDEXED')
  expect(screen.queryByText('Premium 1500 [1]')).toBeNull()
})
