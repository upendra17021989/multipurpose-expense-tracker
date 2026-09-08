import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { expenseAPI, festivalCollectionAPI, festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'
import './FestivalReport.css'

export const FestivalReport = () => {
  const { festivalEventId } = useParams()
  const account = useAuthStore((state) => state.currentAccount)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState('collections')
  const [search, setSearch] = useState('')
  useEffect(() => {
    let active = true
    setData(null); setError('')
    const loadReport = async () => {
      try {
        const [festival, firstCollections, expenses] = await Promise.all([
          festivalEventAPI.getFestival(festivalEventId),
          festivalCollectionAPI.getCollections(festivalEventId, { page: 0, size: 100 }),
          expenseAPI.getExpenses()
        ])
        const firstPage = firstCollections.data || {}
        const remainingPages = Array.from({ length: Math.max(0, Number(firstPage.totalPages || 0) - 1) }, (_, index) => index + 1)
        const remainingResponses = await Promise.all(remainingPages.map((page) => festivalCollectionAPI.getCollections(festivalEventId, { page, size: 100 })))
        const allCollections = [firstPage, ...remainingResponses.map((response) => response.data || {})]
          .flatMap((page) => page.content || [])
        if (active) setData({ festival: festival.data, collections: allCollections, expenses: (expenses.data || []).filter((row) => String(row.festivalEventId) === String(festivalEventId) && row.expenseType === 'FESTIVAL') })
      } catch {
        if (active) setError('Unable to load the festival report. Please retry.')
      }
    }
    loadReport()
    return () => { active = false }
  }, [festivalEventId, account?.id, revision])

  const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0)
  const collections = data?.collections || []
  const expenses = data?.expenses || []
  const collected = sum(collections, 'collectedAmount')
  const refunded = sum(collections, 'refundedAmount')
  const paid = sum(expenses.filter((row) => row.status === 'PAID'), 'amount')
  const recorded = sum(expenses, 'amount')
  const matches = (values) => values.some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))
  const visibleCollections = collections.filter((row) => matches([row.blockName, row.flatNumber, `${row.blockName}-${row.flatNumber}`, row.ownerName, row.paymentStatus]))
  const visibleExpenses = expenses.filter((row) => matches([row.description, row.categoryName, row.vendorName, row.status, row.paymentMode]))
  const blockCollections = useMemo(() => Object.values(collections.reduce((result, row) => {
    const block = row.blockName || 'Unassigned'
    if (!result[block]) result[block] = { block, flats: 0, expected: 0, collected: 0, pending: 0, excess: 0, refunded: 0, paid: 0, partial: 0 }
    const item = result[block]
    item.flats += 1
    item.expected += Number(row.expectedAmount || 0)
    item.collected += Number(row.collectedAmount || 0)
    item.pending += Number(row.pendingAmount || 0)
    item.excess += Number(row.excessAmount || 0)
    item.refunded += Number(row.refundedAmount || 0)
    if (row.paymentStatus === 'PAID' || row.paymentStatus === 'EXCESS') item.paid += 1
    if (row.paymentStatus === 'PARTIAL') item.partial += 1
    return result
  }, {})).sort((a, b) => a.block.localeCompare(b.block, undefined, { numeric: true })), [collections])
  const categories = Object.entries(expenses.reduce((result, row) => {
    const key = row.categoryName || 'Uncategorized'
    result[key] = (result[key] || 0) + Number(row.amount || 0)
    return result
  }, {})).sort((a, b) => b[1] - a[1])
  return <Shell title="Festival collection & expense report" eyebrow="Society module">
    <div className="festival-report-actions"><Link to="/society/festivals">← All festivals</Link><Link to={`/society/festival-collections/${festivalEventId}`}>Collections & receipts</Link><Link to={`/society/festivals/${festivalEventId}/expenses`}>Expenses & estimates</Link><button onClick={() => setRevision((value) => value + 1)}>Refresh</button>{data && <button className="primary" onClick={() => window.print()}>Download PDF</button>}</div>
    {error ? <p role="alert">{error} <button onClick={() => setRevision((value) => value + 1)}>Retry</button></p> : !data ? <p role="status">Loading festival report…</p> : <article className="festival-report">
      <header className="festival-report-header"><p>{account?.societyName || account?.accountName}</p><h2>{data.festival.festivalName} · {data.festival.year}</h2><p>{formatDate(data.festival.startDate)} – {formatDate(data.festival.endDate)} · {data.festival.status}</p><small>Entire event · all dates · amounts in INR</small></header>
      <SummaryGrid items={[
        ['Expected contributions', formatCurrency(sum(collections, 'expectedAmount'))],
        ['Collected', formatCurrency(collected)],
        ['Pending contributions', formatCurrency(sum(collections, 'pendingAmount'))],
        ['Paid expenses', formatCurrency(paid)],
        ['Refunded contributions', formatCurrency(refunded)],
        ['Net after paid expenses', formatCurrency(collected - refunded - paid)]
      ]} />
      <section className="festival-report-reconciliation"><div><span>Event budget</span><strong>{data.festival.budgetAmount == null ? 'Not set' : formatCurrency(data.festival.budgetAmount)}</strong></div><div><span>All recorded expenses</span><strong>{formatCurrency(recorded)}</strong></div><div><span>Excess contributions</span><strong>{formatCurrency(sum(collections, 'excessAmount'))}</strong></div><div><span>Budget less recorded expenses</span><strong>{data.festival.budgetAmount == null ? 'Not set' : formatCurrency(Number(data.festival.budgetAmount) - recorded)}</strong></div><p>Paid expenses include only entries marked PAID. Recorded expenses include every status, including drafts and rejected entries, matching the festival overview. Net after paid expenses is collected contributions less refunds and paid expenses; it is not a bank reconciliation. Summary totals always cover the entire event.</p></section>
      <div className="festival-report-controls"><div role="group" aria-label="Report details"><button aria-pressed={view === 'collections'} onClick={() => { setView('collections'); setSearch('') }}>Flat-wise collections ({collections.length})</button><button aria-pressed={view === 'blocks'} onClick={() => { setView('blocks'); setSearch('') }}>Block-wise report ({blockCollections.length})</button><button aria-pressed={view === 'expenses'} onClick={() => { setView('expenses'); setSearch('') }}>Expense details ({expenses.length})</button></div>{view !== 'blocks' && <input aria-label="Search report details" placeholder={view === 'collections' ? 'Search flat, owner or status' : 'Search expense, vendor or status'} value={search} onChange={(event) => setSearch(event.target.value)} />}</div>
      <section className={`festival-report-detail ${view !== 'collections' ? 'report-hidden' : ''}`}><h3>Flat-wise collections</h3><div className="table-wrap"><table><thead><tr><th>Flat</th><th>Owner</th><th>Expected</th><th>Collected</th><th>Pending</th><th>Excess</th><th>Refunded</th><th>Status</th></tr></thead><tbody>{collections.map((row) => <tr key={row.id} className={view === 'collections' && !visibleCollections.includes(row) ? 'report-search-hidden' : ''}><td>{row.blockName}-{row.flatNumber}</td><td>{row.ownerName}</td><td>{formatCurrency(row.expectedAmount)}</td><td>{formatCurrency(row.collectedAmount)}</td><td>{formatCurrency(row.pendingAmount)}</td><td>{formatCurrency(row.excessAmount)}</td><td>{formatCurrency(row.refundedAmount)}</td><td>{row.paymentStatus}</td></tr>)}{!collections.length && <tr><td colSpan={8} className="empty-state">No collection demands recorded for this festival.</td></tr>}</tbody></table></div>{view === 'collections' && !!collections.length && !visibleCollections.length && <p className="festival-report-no-results">No collections match your search.</p>}</section>
      <section className={`festival-report-detail festival-block-report ${view !== 'blocks' ? 'report-hidden' : ''}`}><h3>Block-wise collection report</h3><div className="table-wrap"><table><thead><tr><th>Block</th><th>Flats</th><th>Paid</th><th>Partial</th><th>Expected</th><th>Collected</th><th>Pending</th><th>Excess</th><th>Refunded</th></tr></thead><tbody>{blockCollections.map((row) => <tr key={row.block}><td><strong>{row.block}</strong></td><td>{row.flats}</td><td>{row.paid}</td><td>{row.partial}</td><td>{formatCurrency(row.expected)}</td><td>{formatCurrency(row.collected)}</td><td>{formatCurrency(row.pending)}</td><td>{formatCurrency(row.excess)}</td><td>{formatCurrency(row.refunded)}</td></tr>)}{!blockCollections.length && <tr><td colSpan={9} className="empty-state">No block collection data available.</td></tr>}</tbody></table></div></section>
      <section className={`festival-report-detail ${view !== 'expenses' ? 'report-hidden' : ''}`}><h3>Expense details</h3><div className="table-wrap"><table><thead><tr><th>Date</th><th>Description / category</th><th>Vendor</th><th>Mode</th><th>Reference</th><th>Status</th><th>Amount</th></tr></thead><tbody>{expenses.map((row) => <tr key={row.id} className={view === 'expenses' && !visibleExpenses.includes(row) ? 'report-search-hidden' : ''}><td>{formatDate(row.expenseDate)}</td><td>{row.description || row.categoryName || '—'}<small className="festival-report-category">{row.description ? row.categoryName : ''}</small></td><td>{row.vendorName || '—'}</td><td>{row.paymentMode}</td><td>{row.utr || row.chequeNumber || row.transactionId || '—'}</td><td>{row.status}</td><td>{formatCurrency(row.amount)}</td></tr>)}{!expenses.length && <tr><td colSpan={7} className="empty-state">No expenses recorded for this festival.</td></tr>}</tbody></table></div>{view === 'expenses' && !!expenses.length && !visibleExpenses.length && <p className="festival-report-no-results">No expenses match your search.</p>}</section>
      <section className="festival-report-breakdown"><h3>Recorded expenses by category</h3>{categories.map(([name, amount]) => <div key={name}><span>{name}</span><strong>{formatCurrency(amount)}</strong></div>)}{!categories.length && <p>No expense categories to summarize yet.</p>}</section>
    </article>}
  </Shell>
}
