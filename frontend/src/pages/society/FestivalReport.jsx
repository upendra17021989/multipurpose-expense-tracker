import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  expenseAPI,
  festivalCollectionAPI,
  festivalEventAPI
} from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'
import './FestivalReport.css'

const statusSelected = (selected, status) =>
  selected === null || selected.includes(status)

const incomeColumnOptions = [
  ['flat', 'Flat'],
  ['owner', 'Owner'],
  ['expected', 'Expected'],
  ['collected', 'Collected'],
  ['pending', 'Pending'],
  ['excess', 'Excess'],
  ['refunded', 'Refunded'],
  ['status', 'Status']
]
const blockColumnOptions = [
  ['block', 'Block'],
  ['flats', 'Flats'],
  ['paid', 'Paid'],
  ['partial', 'Partial'],
  ['expected', 'Expected'],
  ['collected', 'Collected'],
  ['pending', 'Pending'],
  ['excess', 'Excess'],
  ['refunded', 'Refunded']
]
const expenseColumnOptions = [
  ['date', 'Date'],
  ['description', 'Description / line items'],
  ['vendor', 'Vendor'],
  ['mode', 'Mode'],
  ['reference', 'Reference'],
  ['status', 'Status'],
  ['amount', 'Amount']
]

export const FestivalReport = () => {
  const { festivalEventId } = useParams()
  const account = useAuthStore((state) => state.currentAccount)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState('collections')
  const [search, setSearch] = useState('')
  const [selectedBlock, setSelectedBlock] = useState('')
  const [blockPdfMode, setBlockPdfMode] = useState(false)
  const [blockReceipts, setBlockReceipts] = useState([])
  const [blockReceiptsLoading, setBlockReceiptsLoading] = useState(false)
  const [blockReceiptsError, setBlockReceiptsError] = useState('')
  const [incomeStatuses, setIncomeStatuses] = useState(null)
  const [expenseStatuses, setExpenseStatuses] = useState(null)
  const [includeIncome, setIncludeIncome] = useState(true)
  const [includeExpenses, setIncludeExpenses] = useState(true)
  const [incomeColumns, setIncomeColumns] = useState(
    incomeColumnOptions.map(([key]) => key)
  )
  const [blockColumns, setBlockColumns] = useState(
    blockColumnOptions.map(([key]) => key)
  )
  const [expenseColumns, setExpenseColumns] = useState(
    expenseColumnOptions.map(([key]) => key)
  )
  useEffect(() => {
    let active = true
    setData(null)
    setError('')
    setIncomeStatuses(null)
    setExpenseStatuses(null)
    const loadReport = async () => {
      try {
        const [festival, firstCollections, expenses] = await Promise.all([
          festivalEventAPI.getFestival(festivalEventId),
          festivalCollectionAPI.getCollections(festivalEventId, {
            page: 0,
            size: 100
          }),
          expenseAPI.getExpenses()
        ])
        const firstPage = firstCollections.data || {}
        const remainingPages = Array.from(
          { length: Math.max(0, Number(firstPage.totalPages || 0) - 1) },
          (_, index) => index + 1
        )
        const remainingResponses = await Promise.all(
          remainingPages.map((page) =>
            festivalCollectionAPI.getCollections(festivalEventId, {
              page,
              size: 100
            })
          )
        )
        const allCollections = [
          firstPage,
          ...remainingResponses.map((response) => response.data || {})
        ].flatMap((page) => page.content || [])
        if (active)
          setData({
            festival: festival.data,
            collections: allCollections,
            expenses: (expenses.data || []).filter(
              (row) =>
                String(row.festivalEventId) === String(festivalEventId) &&
                row.expenseType === 'FESTIVAL'
            )
          })
      } catch {
        if (active)
          setError('Unable to load the festival report. Please retry.')
      }
    }
    loadReport()
    return () => {
      active = false
    }
  }, [festivalEventId, account?.id, revision])

  const sum = (rows, key) =>
    rows.reduce((total, row) => total + Number(row[key] || 0), 0)
  const collections = data?.collections || []
  const expenses = data?.expenses || []
  const availableIncomeStatuses = [
    ...new Set(collections.map((row) => row.paymentStatus).filter(Boolean))
  ].sort()
  const availableExpenseStatuses = [
    ...new Set(expenses.map((row) => row.status).filter(Boolean))
  ].sort()
  const selectedCollections = useMemo(
    () =>
      includeIncome
        ? collections.filter(
            (row) =>
              incomeStatuses === null ||
              incomeStatuses.includes(row.paymentStatus)
          )
        : [],
    [collections, includeIncome, incomeStatuses]
  )
  const selectedExpenses = useMemo(
    () =>
      includeExpenses
        ? expenses.filter(
            (row) =>
              expenseStatuses === null || expenseStatuses.includes(row.status)
          )
        : [],
    [expenses, includeExpenses, expenseStatuses]
  )
  const collected = sum(selectedCollections, 'collectedAmount')
  const refunded = sum(selectedCollections, 'refundedAmount')
  const paid = sum(
    selectedExpenses.filter((row) => row.status === 'PAID'),
    'amount'
  )
  const recorded = sum(selectedExpenses, 'amount')
  const matches = (values) =>
    values.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    )
  const visibleCollections = selectedCollections.filter((row) =>
    matches([
      row.blockName,
      row.flatNumber,
      `${row.blockName}-${row.flatNumber}`,
      row.ownerName,
      row.paymentStatus
    ])
  )
  const visibleExpenses = selectedExpenses.filter((row) =>
    matches([
      row.description,
      row.categoryName,
      row.vendorName,
      row.status,
      row.paymentMode,
      ...(row.items || []).map((item) => item.itemName)
    ])
  )
  const blockCollections = useMemo(
    () =>
      Object.values(
        selectedCollections.reduce((result, row) => {
          const block = row.blockName || 'Unassigned'
          if (!result[block])
            result[block] = {
              block,
              flats: 0,
              expected: 0,
              collected: 0,
              pending: 0,
              excess: 0,
              refunded: 0,
              paid: 0,
              partial: 0
            }
          const item = result[block]
          item.flats += 1
          item.expected += Number(row.expectedAmount || 0)
          item.collected += Number(row.collectedAmount || 0)
          item.pending += Number(row.pendingAmount || 0)
          item.excess += Number(row.excessAmount || 0)
          item.refunded += Number(row.refundedAmount || 0)
          if (row.paymentStatus === 'PAID' || row.paymentStatus === 'EXCESS')
            item.paid += 1
          if (row.paymentStatus === 'PARTIAL') item.partial += 1
          return result
        }, {})
      ).sort((a, b) =>
        a.block.localeCompare(b.block, undefined, { numeric: true })
      ),
    [selectedCollections]
  )
  const visibleBlockCollections = selectedBlock
    ? blockCollections.filter((row) => row.block === selectedBlock)
    : blockCollections
  const blockTotals = blockCollections.reduce(
    (totals, row) => {
      blockColumnOptions.slice(1).forEach(([key]) => {
        totals[key] += Number(row[key] || 0)
      })
      return totals
    },
    Object.fromEntries(blockColumnOptions.slice(1).map(([key]) => [key, 0]))
  )
  const selectedBlockPayments = selectedBlock
    ? selectedCollections.filter(
        (row) =>
          row.blockName === selectedBlock &&
          Number(row.collectedAmount || 0) > 0
      )
    : []
  useEffect(() => {
    let active = true
    if (!selectedBlock || !data) {
      setBlockReceipts([])
      setBlockReceiptsError('')
      setBlockReceiptsLoading(false)
      return () => {
        active = false
      }
    }
    const paidCollections = selectedCollections.filter(
      (row) =>
        row.blockName === selectedBlock && Number(row.collectedAmount || 0) > 0
    )
    setBlockReceipts([])
    setBlockReceiptsError('')
    setBlockReceiptsLoading(true)
    Promise.all(
      paidCollections.map(async (collection) => {
        const response = await festivalCollectionAPI.getReceipts(collection.id)
        return (response.data || []).map((receipt) => ({
          ...receipt,
          collection
        }))
      })
    )
      .then((groups) => {
        if (active)
          setBlockReceipts(
            groups
              .flat()
              .sort((a, b) =>
                String(b.paymentDate).localeCompare(String(a.paymentDate))
              )
          )
      })
      .catch(() => {
        if (active)
          setBlockReceiptsError(
            'Unable to load individual payment details for this block.'
          )
      })
      .finally(() => {
        if (active) setBlockReceiptsLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedBlock, data, selectedCollections])
  const downloadBlockPdf = () => {
    if (!selectedBlock) return
    setBlockPdfMode(true)
    window.setTimeout(() => window.print(), 0)
  }
  useEffect(() => {
    const finishPrint = () => setBlockPdfMode(false)
    window.addEventListener('afterprint', finishPrint)
    return () => window.removeEventListener('afterprint', finishPrint)
  }, [])
  const categories = Object.entries(
    selectedExpenses.reduce((result, row) => {
      const key = row.categoryName || 'Uncategorized'
      result[key] = (result[key] || 0) + Number(row.amount || 0)
      return result
    }, {})
  ).sort((a, b) => b[1] - a[1])
  const toggleStatus = (setter, available, status) =>
    setter((current) => {
      const selected = current === null ? available : current
      return selected.includes(status)
        ? selected.filter((value) => value !== status)
        : [...selected, status]
    })
  const toggleColumn = (setter, column) =>
    setter((current) =>
      current.includes(column)
        ? current.length === 1
          ? current
          : current.filter((value) => value !== column)
        : [...current, column]
    )
  const changeIncomeSection = (checked) => {
    setIncludeIncome(checked)
    if (!checked && includeExpenses) setView('expenses')
    if (checked && !includeExpenses) setView('collections')
  }
  const changeExpenseSection = (checked) => {
    setIncludeExpenses(checked)
    if (checked) setView('expenses')
    else if (includeIncome) setView('collections')
  }
  return (
    <Shell
      title="Festival collection & expense report"
      eyebrow="Society module"
    >
      <div className="festival-report-actions">
        <Link to="/society/festivals">← All festivals</Link>
        <Link to={`/society/festival-collections/${festivalEventId}`}>
          Collections & receipts
        </Link>
        <Link to={`/society/festivals/${festivalEventId}/expenses`}>
          Expenses & estimates
        </Link>
        <button onClick={() => setRevision((value) => value + 1)}>
          Refresh
        </button>
        {data && (
          <button
            className="primary"
            disabled={!includeIncome && !includeExpenses}
            onClick={() => window.print()}
          >
            Download customized PDF
          </button>
        )}
      </div>
      {error ? (
        <p role="alert">
          {error}{' '}
          <button onClick={() => setRevision((value) => value + 1)}>
            Retry
          </button>
        </p>
      ) : !data ? (
        <p role="status">Loading festival report…</p>
      ) : (
        <article
          className={`festival-report ${blockPdfMode ? 'block-pdf-mode' : ''}`}
        >
          <header className="festival-report-header">
            <p>{account?.societyName || account?.accountName}</p>
            <h2>
              {data.festival.festivalName} · {data.festival.year}
            </h2>
            <p>
              {formatDate(data.festival.startDate)} –{' '}
              {formatDate(data.festival.endDate)} · {data.festival.status}
            </p>
            <small>Entire event · all dates · amounts in INR</small>
          </header>
          <section className="festival-report-customizer">
            <h3>Customize downloaded report</h3>
            <div className="festival-report-section-options">
              <label>
                <input
                  type="checkbox"
                  checked={includeIncome}
                  onChange={(event) =>
                    changeIncomeSection(event.target.checked)
                  }
                />{' '}
                Income / collections
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeExpenses}
                  onChange={(event) =>
                    changeExpenseSection(event.target.checked)
                  }
                />{' '}
                Expense details
              </label>
            </div>
            {includeIncome && (
              <>
                <fieldset>
                  <legend>Income status</legend>
                  {availableIncomeStatuses.map((status) => (
                    <label key={status}>
                      <input
                        type="checkbox"
                        checked={statusSelected(incomeStatuses, status)}
                        onChange={() =>
                          toggleStatus(
                            setIncomeStatuses,
                            availableIncomeStatuses,
                            status
                          )
                        }
                      />
                      {status}
                    </label>
                  ))}
                  {!availableIncomeStatuses.length && (
                    <span>No income statuses</span>
                  )}
                </fieldset>
                <fieldset>
                  <legend>Flat-wise income columns</legend>
                  {incomeColumnOptions.map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={incomeColumns.includes(key)}
                        disabled={
                          incomeColumns.length === 1 &&
                          incomeColumns.includes(key)
                        }
                        onChange={() => toggleColumn(setIncomeColumns, key)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Block-wise income columns</legend>
                  {blockColumnOptions.map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={blockColumns.includes(key)}
                        disabled={
                          blockColumns.length === 1 &&
                          blockColumns.includes(key)
                        }
                        onChange={() => toggleColumn(setBlockColumns, key)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            {includeExpenses && (
              <>
                <fieldset>
                  <legend>Expense status</legend>
                  {availableExpenseStatuses.map((status) => (
                    <label key={status}>
                      <input
                        type="checkbox"
                        checked={statusSelected(expenseStatuses, status)}
                        onChange={() =>
                          toggleStatus(
                            setExpenseStatuses,
                            availableExpenseStatuses,
                            status
                          )
                        }
                      />
                      {status}
                    </label>
                  ))}
                  {!availableExpenseStatuses.length && (
                    <span>No expense statuses</span>
                  )}
                </fieldset>
                <fieldset>
                  <legend>Expense columns</legend>
                  {expenseColumnOptions.map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={expenseColumns.includes(key)}
                        disabled={
                          expenseColumns.length === 1 &&
                          expenseColumns.includes(key)
                        }
                        onChange={() => toggleColumn(setExpenseColumns, key)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            <p className="muted">
              Summary totals, detail rows, and the downloaded PDF use these
              selections.
            </p>
          </section>
          <SummaryGrid
            items={[
              [
                'Expected contributions',
                formatCurrency(sum(selectedCollections, 'expectedAmount'))
              ],
              ['Collected', formatCurrency(collected)],
              [
                'Pending contributions',
                formatCurrency(sum(selectedCollections, 'pendingAmount'))
              ],
              ['Paid expenses', formatCurrency(paid)],
              ['Refunded contributions', formatCurrency(refunded)],
              [
                'Net after paid expenses',
                formatCurrency(collected - refunded - paid)
              ]
            ]}
          />
          <section className="festival-report-reconciliation">
            <div>
              <span>Event budget</span>
              <strong>
                {data.festival.budgetAmount == null
                  ? 'Not set'
                  : formatCurrency(data.festival.budgetAmount)}
              </strong>
            </div>
            <div>
              <span>Selected recorded expenses</span>
              <strong>{formatCurrency(recorded)}</strong>
            </div>
            <div>
              <span>Selected excess contributions</span>
              <strong>
                {formatCurrency(sum(selectedCollections, 'excessAmount'))}
              </strong>
            </div>
            <div>
              <span>Budget less selected expenses</span>
              <strong>
                {data.festival.budgetAmount == null
                  ? 'Not set'
                  : formatCurrency(
                      Number(data.festival.budgetAmount) - recorded
                    )}
              </strong>
            </div>
            <p>
              Totals and downloaded detail rows reflect the selected income and
              expense statuses. Net is selected collections less selected
              refunds and selected paid expenses; it is not a bank
              reconciliation.
            </p>
          </section>
          <div className="festival-report-controls">
            <div role="group" aria-label="Report details">
              <button
                aria-pressed={view === 'collections'}
                onClick={() => {
                  setView('collections')
                  setSearch('')
                }}
              >
                Flat-wise collections ({collections.length})
              </button>
              <button
                aria-pressed={view === 'blocks'}
                onClick={() => {
                  setView('blocks')
                  setSearch('')
                }}
              >
                Block-wise report ({blockCollections.length})
              </button>
              <button
                aria-pressed={view === 'expenses'}
                onClick={() => {
                  setView('expenses')
                  setSearch('')
                }}
              >
                Expense details ({expenses.length})
              </button>
            </div>
            {view === 'blocks' ? (
              <div className="festival-block-pdf-controls">
                <select
                  aria-label="Select block for report"
                  value={selectedBlock}
                  onChange={(event) => setSelectedBlock(event.target.value)}
                >
                  <option value="">All blocks</option>
                  {blockCollections.map((row) => (
                    <option key={row.block} value={row.block}>
                      {row.block}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="primary"
                  disabled={!selectedBlock || blockReceiptsLoading}
                  onClick={downloadBlockPdf}
                >
                  {blockReceiptsLoading
                    ? 'Loading payments…'
                    : 'Download Block PDF'}
                </button>
              </div>
            ) : (
              <input
                aria-label="Search report details"
                placeholder={
                  view === 'collections'
                    ? 'Search flat, owner or status'
                    : 'Search expense, vendor or status'
                }
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            )}
          </div>
          <section
            className={`festival-report-detail festival-income-detail ${view !== 'collections' ? 'report-hidden' : ''} ${!includeIncome ? 'report-excluded' : ''}`}
          >
            <h3>Flat-wise collections</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {incomeColumns.includes('flat') && <th>Flat</th>}
                    {incomeColumns.includes('owner') && <th>Owner</th>}
                    {incomeColumns.includes('expected') && <th>Expected</th>}
                    {incomeColumns.includes('collected') && <th>Collected</th>}
                    {incomeColumns.includes('pending') && <th>Pending</th>}
                    {incomeColumns.includes('excess') && <th>Excess</th>}
                    {incomeColumns.includes('refunded') && <th>Refunded</th>}
                    {incomeColumns.includes('status') && <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedCollections.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        view === 'collections' &&
                        !visibleCollections.includes(row)
                          ? 'report-search-hidden'
                          : ''
                      }
                    >
                      {incomeColumns.includes('flat') && (
                        <td>
                          {row.blockName}-{row.flatNumber}
                        </td>
                      )}
                      {incomeColumns.includes('owner') && (
                        <td>{row.ownerName}</td>
                      )}
                      {incomeColumns.includes('expected') && (
                        <td>{formatCurrency(row.expectedAmount)}</td>
                      )}
                      {incomeColumns.includes('collected') && (
                        <td>{formatCurrency(row.collectedAmount)}</td>
                      )}
                      {incomeColumns.includes('pending') && (
                        <td>{formatCurrency(row.pendingAmount)}</td>
                      )}
                      {incomeColumns.includes('excess') && (
                        <td>{formatCurrency(row.excessAmount)}</td>
                      )}
                      {incomeColumns.includes('refunded') && (
                        <td>{formatCurrency(row.refundedAmount)}</td>
                      )}
                      {incomeColumns.includes('status') && (
                        <td>{row.paymentStatus}</td>
                      )}
                    </tr>
                  ))}
                  {!selectedCollections.length && (
                    <tr>
                      <td
                        colSpan={incomeColumns.length}
                        className="empty-state"
                      >
                        No collection demands recorded for this festival.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {view === 'collections' &&
              !!collections.length &&
              !visibleCollections.length && (
                <p className="festival-report-no-results">
                  No collections match your search.
                </p>
              )}
          </section>
          <section
            className={`festival-report-detail festival-block-report festival-income-detail ${view !== 'blocks' ? 'report-hidden' : ''} ${!includeIncome ? 'report-excluded' : ''}`}
          >
            <h3>
              {selectedBlock
                ? `${selectedBlock} collection report`
                : 'Block-wise collection report'}
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {blockColumns.includes('block') && <th>Block</th>}
                    {blockColumns.includes('flats') && <th>Flats</th>}
                    {blockColumns.includes('paid') && <th>Paid</th>}
                    {blockColumns.includes('partial') && <th>Partial</th>}
                    {blockColumns.includes('expected') && <th>Expected</th>}
                    {blockColumns.includes('collected') && <th>Collected</th>}
                    {blockColumns.includes('pending') && <th>Pending</th>}
                    {blockColumns.includes('excess') && <th>Excess</th>}
                    {blockColumns.includes('refunded') && <th>Refunded</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleBlockCollections.map((row) => (
                    <tr key={row.block}>
                      {blockColumns.includes('block') && (
                        <td>
                          <strong>{row.block}</strong>
                        </td>
                      )}
                      {blockColumns.includes('flats') && <td>{row.flats}</td>}
                      {blockColumns.includes('paid') && <td>{row.paid}</td>}
                      {blockColumns.includes('partial') && (
                        <td>{row.partial}</td>
                      )}
                      {blockColumns.includes('expected') && (
                        <td>{formatCurrency(row.expected)}</td>
                      )}
                      {blockColumns.includes('collected') && (
                        <td>{formatCurrency(row.collected)}</td>
                      )}
                      {blockColumns.includes('pending') && (
                        <td>{formatCurrency(row.pending)}</td>
                      )}
                      {blockColumns.includes('excess') && (
                        <td>{formatCurrency(row.excess)}</td>
                      )}
                      {blockColumns.includes('refunded') && (
                        <td>{formatCurrency(row.refunded)}</td>
                      )}
                    </tr>
                  ))}
                  {!visibleBlockCollections.length && (
                    <tr>
                      <td colSpan={blockColumns.length} className="empty-state">
                        No block collection data available.
                      </td>
                    </tr>
                  )}
                </tbody>
                {!!blockCollections.length && (
                  <tfoot>
                    <tr className="festival-block-total-row">
                      {blockColumns.includes('block') && (
                        <th scope="row">Total all blocks</th>
                      )}
                      {blockColumns.includes('flats') && (
                        <td>{blockTotals.flats}</td>
                      )}
                      {blockColumns.includes('paid') && (
                        <td>{blockTotals.paid}</td>
                      )}
                      {blockColumns.includes('partial') && (
                        <td>{blockTotals.partial}</td>
                      )}
                      {blockColumns.includes('expected') && (
                        <td>{formatCurrency(blockTotals.expected)}</td>
                      )}
                      {blockColumns.includes('collected') && (
                        <td>{formatCurrency(blockTotals.collected)}</td>
                      )}
                      {blockColumns.includes('pending') && (
                        <td>{formatCurrency(blockTotals.pending)}</td>
                      )}
                      {blockColumns.includes('excess') && (
                        <td>{formatCurrency(blockTotals.excess)}</td>
                      )}
                      {blockColumns.includes('refunded') && (
                        <td>{formatCurrency(blockTotals.refunded)}</td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {selectedBlock && (
              <div className="festival-block-contributors">
                <h3>Flats that paid ({selectedBlockPayments.length})</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Flat</th>
                        <th>Owner</th>
                        <th>Expected</th>
                        <th>Paid</th>
                        <th>Pending</th>
                        <th>Excess</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBlockPayments.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {row.blockName}-{row.flatNumber}
                          </td>
                          <td>{row.ownerName || '-'}</td>
                          <td>{formatCurrency(row.expectedAmount)}</td>
                          <td>
                            <strong>
                              {formatCurrency(row.collectedAmount)}
                            </strong>
                          </td>
                          <td>{formatCurrency(row.pendingAmount)}</td>
                          <td>{formatCurrency(row.excessAmount)}</td>
                          <td>{row.paymentStatus}</td>
                        </tr>
                      ))}
                      {!selectedBlockPayments.length && (
                        <tr>
                          <td colSpan={7} className="empty-state">
                            No contributions have been recorded for this block.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <h3>Payment details ({blockReceipts.length})</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Flat</th>
                        <th>Owner</th>
                        <th>Receipt</th>
                        <th>Mode</th>
                        <th>Reference</th>
                        <th>Collected by</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockReceipts.map((receipt) => (
                        <tr key={receipt.id}>
                          <td>{formatDate(receipt.paymentDate)}</td>
                          <td>
                            {receipt.collection.blockName}-
                            {receipt.collection.flatNumber}
                          </td>
                          <td>{receipt.collection.ownerName || '-'}</td>
                          <td>{receipt.receiptNumber || '-'}</td>
                          <td>{receipt.paymentMode}</td>
                          <td>
                            {receipt.utr ||
                              receipt.chequeNumber ||
                              receipt.transactionId ||
                              '-'}
                          </td>
                          <td>{receipt.collectedBy || '-'}</td>
                          <td>
                            <strong>
                              {formatCurrency(receipt.amountPaid)}
                            </strong>
                          </td>
                        </tr>
                      ))}
                      {blockReceiptsLoading && (
                        <tr>
                          <td colSpan={8} className="empty-state">
                            Loading payment details…
                          </td>
                        </tr>
                      )}
                      {!blockReceiptsLoading && !blockReceipts.length && (
                        <tr>
                          <td colSpan={8} className="empty-state">
                            No payment transactions found for this block.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {blockReceiptsError && <p role="alert">{blockReceiptsError}</p>}
              </div>
            )}
          </section>
          <section
            className={`festival-report-detail festival-expense-detail ${view !== 'expenses' ? 'report-hidden' : ''} ${!includeExpenses ? 'report-excluded' : ''}`}
          >
            <h3>Expense details</h3>
            <div className="table-wrap">
              <table
                className={expenseColumnOptions
                  .filter(([key]) => !expenseColumns.includes(key))
                  .map(([key]) => `hide-expense-${key}`)
                  .join(' ')}
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description / category</th>
                    <th>Vendor</th>
                    <th>Mode</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExpenses.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        view === 'expenses' && !visibleExpenses.includes(row)
                          ? 'report-search-hidden'
                          : ''
                      }
                    >
                      <td>{formatDate(row.expenseDate)}</td>
                      <td>
                        {row.description || row.categoryName || '—'}
                        <small className="festival-report-category">
                          {row.description ? row.categoryName : ''}
                        </small>
                        {(row.items || []).map((item) => (
                          <span
                            className="festival-expense-line-row"
                            key={item.id}
                          >
                            <span>{item.itemName}</span>
                            <small>
                              Qty {item.quantity || 1}
                              {item.unitPrice != null
                                ? ` × ${formatCurrency(item.unitPrice)}`
                                : ''}
                            </small>
                            <strong>{formatCurrency(item.amount)}</strong>
                          </span>
                        ))}
                      </td>
                      <td>{row.vendorName || '—'}</td>
                      <td>{row.paymentMode}</td>
                      <td>
                        {row.utr ||
                          row.chequeNumber ||
                          row.transactionId ||
                          '—'}
                      </td>
                      <td>{row.status}</td>
                      <td>{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                  {!selectedExpenses.length && (
                    <tr>
                      <td
                        colSpan={expenseColumns.length}
                        className="empty-state"
                      >
                        No expenses recorded for this festival.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {view === 'expenses' &&
              !!expenses.length &&
              !visibleExpenses.length && (
                <p className="festival-report-no-results">
                  No expenses match your search.
                </p>
              )}
          </section>
          <section
            className={`festival-report-breakdown ${view !== 'expenses' ? 'report-hidden' : ''} ${!includeExpenses ? 'report-excluded' : ''}`}
          >
            <h3>Recorded expenses by category</h3>
            {categories.map(([name, amount]) => (
              <div key={name}>
                <span>{name}</span>
                <strong>{formatCurrency(amount)}</strong>
              </div>
            ))}
            {!categories.length && (
              <p>No expense categories to summarize yet.</p>
            )}
          </section>
        </article>
      )}
    </Shell>
  )
}
