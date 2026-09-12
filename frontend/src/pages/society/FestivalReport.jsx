import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
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

const blankOtherContribution = () => ({
  sourceType: 'DONATION', contributionKind: 'MONETARY', contributorName: '',
  contactDetails: '', itemName: '', quantity: '', amount: '',
  paymentDate: new Date().toISOString().slice(0, 10), paymentMode: 'CASH',
  transactionReference: '', collectedBy: '', description: '',
  specialMention: false, anonymous: false
})

export const FestivalReport = () => {
  const { festivalEventId } = useParams()
  const [searchParams] = useSearchParams()
  const account = useAuthStore((state) => state.currentAccount)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [otherForm, setOtherForm] = useState(blankOtherContribution)
  const [editingOtherId, setEditingOtherId] = useState(null)
  const [view, setView] = useState(searchParams.get('view') === 'other' ? 'other' : 'summary')
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
  const [reportOptionsTab, setReportOptionsTab] = useState('income')
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
        const [festival, firstCollections, expenses, otherCollections] = await Promise.all([
          festivalEventAPI.getFestival(festivalEventId),
          festivalCollectionAPI.getCollections(festivalEventId, {
            page: 0,
            size: 100
          }),
          expenseAPI.getExpenses(),
          festivalCollectionAPI.getOtherCollections(festivalEventId)
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
            otherCollections: otherCollections.data || [],
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
  const otherCollections = data?.otherCollections || []
  const monetaryContributions = otherCollections.filter(row => (row.contributionKind || 'MONETARY') === 'MONETARY')
  const otherCollected = sum(monetaryContributions, 'amount')
  const canManageOther = ['ADMIN', 'SUPERVISOR', 'TREASURER'].includes(account?.role)
  const resetOtherForm = () => { setEditingOtherId(null); setOtherForm(blankOtherContribution()) }
  const saveOtherCollection = async (event) => { event.preventDefault(); try { const payload={...otherForm,amount:otherForm.amount?Number(otherForm.amount):null,paymentMode:otherForm.contributionKind==='MONETARY'?otherForm.paymentMode:null,transactionReference:otherForm.contributionKind==='MONETARY'?otherForm.transactionReference:''}; if(editingOtherId) await festivalCollectionAPI.updateOtherCollection(festivalEventId,editingOtherId,payload); else await festivalCollectionAPI.addOtherCollection(festivalEventId,payload); toast.success(editingOtherId?'Contribution updated':'Contribution added'); resetOtherForm(); setRevision(value=>value+1) } catch(error){ toast.error(error.response?.data?.message||'Unable to save contribution') } }
  const editOtherCollection = row => { setEditingOtherId(row.id); setOtherForm({ sourceType:row.sourceType,contributionKind:row.contributionKind||'MONETARY',contributorName:row.anonymous?'':row.contributorName||'',contactDetails:row.contactDetails||'',itemName:row.itemName||'',quantity:row.quantity||'',amount:row.amount??'',paymentDate:row.paymentDate,paymentMode:row.paymentMode||'CASH',transactionReference:row.transactionReference||'',collectedBy:row.collectedBy||'',description:row.description||'',specialMention:Boolean(row.specialMention),anonymous:Boolean(row.anonymous) }); setView('other') }
  const deleteOtherCollection = async id => { if(!window.confirm('Delete this other collection?'))return; try{await festivalCollectionAPI.deleteOtherCollection(festivalEventId,id);toast.success('Other collection deleted');setRevision(value=>value+1)}catch(error){toast.error(error.response?.data?.message||'Unable to delete other collection')} }
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
  const collected = sum(selectedCollections, 'collectedAmount') + (includeIncome ? otherCollected : 0)
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
    if (!checked && includeExpenses) {
      setView('expenses')
      setReportOptionsTab('expenses')
    }
    if (checked && !includeExpenses) {
      setView('collections')
      setReportOptionsTab('income')
    }
  }
  const changeExpenseSection = (checked) => {
    setIncludeExpenses(checked)
    if (checked) {
      setView('expenses')
      if (!includeIncome) setReportOptionsTab('expenses')
    }
    else if (includeIncome) {
      setView('collections')
      setReportOptionsTab('income')
    }
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
            <div className="festival-customizer-tabs" role="tablist" aria-label="Report customization options">
              <button
                type="button"
                role="tab"
                aria-selected={reportOptionsTab === 'income'}
                disabled={!includeIncome}
                onClick={() => setReportOptionsTab('income')}
              >
                Income options
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={reportOptionsTab === 'expenses'}
                disabled={!includeExpenses}
                onClick={() => setReportOptionsTab('expenses')}
              >
                Expense options
              </button>
            </div>
            {includeIncome && reportOptionsTab === 'income' && (
              <div className="festival-customizer-panel festival-customizer-income-panel" role="tabpanel">
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
              </div>
            )}
            {includeExpenses && reportOptionsTab === 'expenses' && (
              <div className="festival-customizer-panel" role="tabpanel">
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
              </div>
            )}
            <p className="muted">
              Summary totals, detail rows, and the downloaded PDF use these
              selections.
            </p>
          </section>
          <div className={`festival-summary-view ${view !== 'summary' ? 'report-hidden' : ''}`}>
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
          </div>
          <div className="festival-report-controls">
            <div role="group" aria-label="Report details">
              <button
                aria-pressed={view === 'summary'}
                onClick={() => {
                  setView('summary')
                  setSearch('')
                }}
              >
                Summary
              </button>
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
                aria-pressed={view === 'other'}
                onClick={() => {
                  setView('other')
                  setSearch('')
                }}
              >
                Other collections ({otherCollections.length})
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
            {view === 'summary' ? null : view === 'blocks' ? (
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
            <div className="table-wrap festival-mobile-table">
              <table>
                <thead><tr><th>Flat</th><th>Collected</th><th>Status</th></tr></thead>
                <tbody>
                  {visibleCollections.map((row) => <tr key={row.id}><td><strong>{row.blockName}-{row.flatNumber}</strong><small>{row.ownerName || '-'}</small></td><td>{formatCurrency(row.collectedAmount)}</td><td>{row.paymentStatus}</td></tr>)}
                  {!visibleCollections.length && <tr><td colSpan={3} className="empty-state">No matching collections.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-wrap festival-desktop-table">
              <table>
                <thead>
                  <tr>
                    {incomeColumns.includes('flat') && <th>Flat</th>}
                    {incomeColumns.includes('owner') && <th className="mobile-report-hide">Owner</th>}
                    {incomeColumns.includes('expected') && <th className="mobile-report-hide">Expected</th>}
                    {incomeColumns.includes('collected') && <th>Collected</th>}
                    {incomeColumns.includes('pending') && <th className="mobile-report-hide">Pending</th>}
                    {incomeColumns.includes('excess') && <th className="mobile-report-hide">Excess</th>}
                    {incomeColumns.includes('refunded') && <th className="mobile-report-hide">Refunded</th>}
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
                        <td className="mobile-report-hide">{row.ownerName}</td>
                      )}
                      {incomeColumns.includes('expected') && (
                        <td className="mobile-report-hide">{formatCurrency(row.expectedAmount)}</td>
                      )}
                      {incomeColumns.includes('collected') && (
                        <td>{formatCurrency(row.collectedAmount)}</td>
                      )}
                      {incomeColumns.includes('pending') && (
                        <td className="mobile-report-hide">{formatCurrency(row.pendingAmount)}</td>
                      )}
                      {incomeColumns.includes('excess') && (
                        <td className="mobile-report-hide">{formatCurrency(row.excessAmount)}</td>
                      )}
                      {incomeColumns.includes('refunded') && (
                        <td className="mobile-report-hide">{formatCurrency(row.refundedAmount)}</td>
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
          <section className={`festival-report-detail festival-other-detail festival-income-detail ${view !== 'other' ? 'report-hidden' : ''} ${!includeIncome ? 'report-excluded' : ''}`}>
            <div className="section-heading-row"><div><h3>Contributions & special mentions</h3><p>Record money, donated items, sponsored materials, and volunteered services separately from flat collections.</p></div><strong>Cash received: {formatCurrency(otherCollected)}</strong></div>
            {canManageOther && <form className="form-panel festival-contribution-form" onSubmit={saveOtherCollection}>
              <h3>{editingOtherId ? 'Edit contribution' : 'Add contribution'}</h3>
              <div className="form-grid two">
                <label>Contribution kind<select value={otherForm.contributionKind} onChange={e=>setOtherForm({...otherForm,contributionKind:e.target.value})}><option value="MONETARY">Money</option><option value="IN_KIND">Item / material</option><option value="SERVICE">Volunteered service</option></select></label>
                <label>Source type<select value={otherForm.sourceType} onChange={e=>setOtherForm({...otherForm,sourceType:e.target.value})}>{['DONATION','SPONSORSHIP','STALL_FEE','ADVERTISEMENT','VENDOR_CONTRIBUTION','COMMITTEE_CONTRIBUTION','INTEREST','OTHER'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
                <label>Contributor / source name<input disabled={otherForm.anonymous} value={otherForm.contributorName} onChange={e=>setOtherForm({...otherForm,contributorName:e.target.value})} required={!otherForm.anonymous}/></label>
                {otherForm.contributionKind!=='MONETARY'&&<><label>Item / service name<input value={otherForm.itemName} onChange={e=>setOtherForm({...otherForm,itemName:e.target.value})} placeholder="e.g. Ganesh idol, flowers, Day 1 prasad" required/></label><label>Quantity / period<input value={otherForm.quantity} onChange={e=>setOtherForm({...otherForm,quantity:e.target.value})} placeholder="e.g. 25 garlands or Day 1"/></label></>}
                <label>{otherForm.contributionKind==='MONETARY'?'Amount':'Estimated value (optional)'}<input type="number" min="0.01" step="0.01" value={otherForm.amount} onChange={e=>setOtherForm({...otherForm,amount:e.target.value})} required={otherForm.contributionKind==='MONETARY'}/></label>
                <label>Contribution date<input type="date" value={otherForm.paymentDate} onChange={e=>setOtherForm({...otherForm,paymentDate:e.target.value})} required/></label>
                {otherForm.contributionKind==='MONETARY'&&<><label>Payment mode<select value={otherForm.paymentMode} onChange={e=>setOtherForm({...otherForm,paymentMode:e.target.value})}>{['CASH','BANK','UPI','CARD','NEFT','CHEQUE'].map(value=><option key={value}>{value}</option>)}</select></label><label>Transaction reference<input value={otherForm.transactionReference} onChange={e=>setOtherForm({...otherForm,transactionReference:e.target.value})}/></label></>}
                <label>Received / recorded by<input value={otherForm.collectedBy} onChange={e=>setOtherForm({...otherForm,collectedBy:e.target.value})} required/></label>
                <label>Contact details<input value={otherForm.contactDetails} onChange={e=>setOtherForm({...otherForm,contactDetails:e.target.value})}/></label>
                <label className="document-wide">Description / acknowledgement<textarea value={otherForm.description} onChange={e=>setOtherForm({...otherForm,description:e.target.value})} placeholder="Details to include in the festival report or donor acknowledgement"/></label>
                <label className="festival-contribution-check"><input type="checkbox" checked={otherForm.specialMention} onChange={e=>setOtherForm({...otherForm,specialMention:e.target.checked})}/><span>Show as special contribution mention</span></label>
                <label className="festival-contribution-check"><input type="checkbox" checked={otherForm.anonymous} onChange={e=>setOtherForm({...otherForm,anonymous:e.target.checked,contributorName:e.target.checked?'':otherForm.contributorName})}/><span>Anonymous contribution</span></label>
              </div>
              <div className="form-actions">{editingOtherId&&<button type="button" onClick={resetOtherForm}>Cancel edit</button>}<button className="primary">{editingOtherId?'Update contribution':'Add contribution'}</button></div>
            </form>}
            <div className="table-wrap"><table><thead><tr><th>Date</th><th>Kind / source</th><th>Contributor</th><th>Contribution / special mention</th><th>Payment</th><th>Recorded by</th><th className="numeric">Amount / value</th>{canManageOther&&<th>Actions</th>}</tr></thead><tbody>{otherCollections.map(row=><tr key={row.id}><td>{formatDate(row.paymentDate)}</td><td><strong>{(row.contributionKind||'MONETARY').replaceAll('_',' ')}</strong><br/><small>{row.sourceType.replaceAll('_',' ')}</small></td><td><strong>{row.contributorName}</strong>{row.contactDetails&&<><br/><small>{row.contactDetails}</small></>}</td><td>{row.specialMention&&<span className="status-pill approved">Special mention</span>} {row.itemName&&<><strong>{row.itemName}</strong>{row.quantity&&<> · {row.quantity}</>}<br/></>}{row.description||(!row.itemName?'-':'')}</td><td>{row.paymentMode||'Not applicable'}{row.transactionReference&&<><br/><small>{row.transactionReference}</small></>}</td><td>{row.collectedBy}</td><td className="numeric">{row.amount!=null?formatCurrency(row.amount):'-'}{row.amount!=null&&(row.contributionKind||'MONETARY')!=='MONETARY'&&<><br/><small>Estimated value</small></>}</td>{canManageOther&&<td className="table-actions"><button onClick={()=>editOtherCollection(row)}>Edit</button><button className="danger" onClick={()=>deleteOtherCollection(row.id)}>Delete</button></td>}</tr>)}{!otherCollections.length&&<tr><td colSpan={canManageOther?8:7} className="empty-state">No contributions recorded for this festival.</td></tr>}</tbody></table></div>
          </section>
          <section
            className={`festival-report-detail festival-block-report festival-income-detail ${view !== 'blocks' ? 'report-hidden' : ''} ${!includeIncome ? 'report-excluded' : ''}`}
          >
            <h3>
              {selectedBlock
                ? `${selectedBlock} collection report`
                : 'Block-wise collection report'}
            </h3>
            <div className="table-wrap festival-mobile-table">
              <table>
                <thead><tr><th>Block</th><th>Collected</th><th>Pending</th></tr></thead>
                <tbody>
                  {visibleBlockCollections.map((row) => <tr key={row.block}><td><strong>{row.block}</strong><small>{row.flats} flats</small></td><td>{formatCurrency(row.collected)}</td><td>{formatCurrency(row.pending)}</td></tr>)}
                  {!visibleBlockCollections.length && <tr><td colSpan={3} className="empty-state">No block data available.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-wrap festival-desktop-table">
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
            className={`festival-report-breakdown festival-expense-category-breakdown ${view !== 'expenses' ? 'report-hidden' : ''} ${!includeExpenses ? 'report-excluded' : ''}`}
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
