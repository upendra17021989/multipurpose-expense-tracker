import { act, fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FestivalCollectionForm } from './FestivalCollectionForm'
import { festivalCollectionAPI } from '../../api/endpoints'

vi.mock('../../api/endpoints', () => ({ festivalCollectionAPI: { getCollection: vi.fn() } }))
vi.mock('../../store/authStore', () => ({ useAuthStore: () => ({ currentAccount: { accountType: 'SOCIETY', role: 'ADMIN' }, user: { name: 'Collector' } }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useParams: () => ({}) }))
vi.mock('../DashboardRouter', () => ({
  Shell: ({ children }) => <div>{children}</div>,
  SummaryGrid: ({ items }) => <div data-testid="collection-summary">{items.map(([label, value]) => <div key={label}>{label}: {value}</div>)}</div>
}))
afterEach(cleanup)

it('shows the selected collection immediately and preserves an amount typed while details load', async () => {
  let resolveDetails
  festivalCollectionAPI.getCollection.mockReturnValue(new Promise(resolve => { resolveDetails = resolve }))
  const collection = { id: 1, blockName: 'A', flatNumber: '101', expectedAmount: 2500, collectedAmount: 500, pendingAmount: 2000 }
  render(<FestivalCollectionForm collectionId={1} initialCollection={collection} onClose={() => {}} />)
  expect(screen.getByTestId('collection-summary').textContent).toContain('A-101')
  expect(screen.queryByText('Loading collection...')).toBeNull()
  const amount = screen.getByLabelText('Amount Paid')
  expect(amount.value).toBe('2000')
  expect(screen.getByText('Save Payment').disabled).toBe(true)
  fireEvent.change(amount, { target: { value: '1500' } })
  await act(async () => { resolveDetails({ data: { ...collection, pendingAmount: 1900 } }) })
  expect(amount.value).toBe('1500')
  expect(screen.getByText('Save Payment').disabled).toBe(false)
  expect(screen.getAllByTestId('collection-summary')).toHaveLength(1)
})