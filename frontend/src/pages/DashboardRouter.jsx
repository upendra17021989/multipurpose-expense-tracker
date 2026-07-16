import { Link, Navigate, useLocation } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatDate } from '../utils/format'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { dailyQuoteAPI, expenseAPI, expenseCategoryAPI, kiranaProductAPI, personalBudgetAPI, societyAnnualCollectionAPI, societyFlatAPI, societyMembershipAPI } from '../api/endpoints'
import { useI18n } from '../i18n'

const accountLabels = {
  INDIVIDUAL: 'Personal Expense Tracker',
  SOCIETY: 'Society Expense Management',
  KIRANA_STORE: 'Kirana Store Management',
  SPORTS: 'Sports Management'
}

export const DashboardRouter = () => {
  const { currentAccount } = useAuthStore()

  if (!currentAccount) {
    return (
      <Shell title="Select an account">
        <p className="muted">No active account was found. Please log in again.</p>
      </Shell>
    )
  }

  if (currentAccount.accountType === 'SOCIETY') return <SocietyDashboard />
  if (currentAccount.accountType === 'KIRANA_STORE') return <KiranaDashboard />
  if (currentAccount.accountType === 'SPORTS') return <Navigate to="/sports" replace />
  return <PersonalDashboard />
}

export const Shell = ({ title, eyebrow = 'Dashboard', actions, children }) => {
  const { tx } = useI18n()
  const location = useLocation()
  const currentAccount = useAuthStore((state) => state.currentAccount)
  const isReadOnlySocietyMember = currentAccount?.accountType === 'SOCIETY' && currentAccount?.role === 'MEMBER'
  const showIndividualBack = currentAccount?.accountType === 'INDIVIDUAL' && !['/home', '/dashboard'].includes(location.pathname)

  return (
    <div>
      <Navbar />
      <main className="page-shell">
        <div className="page-header">
          <div>
            {showIndividualBack && <Link className="page-back-link" to="/home">{tx('Back to dashboard')}</Link>}
            <p className="eyebrow">{tx(eyebrow)}</p>
            <h1>{tx(title)}</h1>
          </div>
          {actions && !isReadOnlySocietyMember && <div className="header-actions">{actions}</div>}
        </div>
        {isReadOnlySocietyMember && <section className="alert-panel">You have view-only access to this society.</section>}
        {children}
      </main>
    </div>
  )
}

const PersonalDashboard = () => {
  const [expenses, setExpenses] = useState([])
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [expenseForm, setExpenseForm] = useState(createDashboardExpenseForm())
  const [dailyQuote, setDailyQuote] = useState(null)
  const { tx } = useI18n()

  const loadDashboard = () => {
    setLoading(true)
    Promise.all([
      expenseAPI.getExpenses(),
      personalBudgetAPI.getCurrentBudget().catch(() => ({ data: null }))
    ])
      .then(([expenseResponse, budgetResponse]) => {
        setExpenses(expenseResponse.data || [])
        setBudget(budgetResponse.data || null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard()
    expenseCategoryAPI.getCategories()
      .then((response) => setCategories(response.data || []))
      .catch(() => toast.error('Unable to load expense categories'))
    dailyQuoteAPI.getToday()
      .then((response) => setDailyQuote(response.data || null))
      .catch(() => setDailyQuote(null))
  }, [])

  const summary = useMemo(() => buildExpenseSummary(expenses), [expenses])
  const budgetAmount = Number(budget?.monthlyBudget || 0)
  const remaining = Math.max(budgetAmount - summary.monthTotal, 0)
  const budgetPercent = budgetAmount ? Math.min(Math.round((summary.monthTotal / budgetAmount) * 100), 100) : 0
  const budgetUsed = budgetAmount ? `${budgetPercent}%` : 'Not set'
  const updateExpenseForm = (field, value) => setExpenseForm((current) => ({ ...current, [field]: value }))
  const resetAndCloseExpenseModal = () => {
    setExpenseForm(createDashboardExpenseForm())
    setExpenseModalOpen(false)
  }
  const saveDashboardExpense = async (event) => {
    event.preventDefault()
    if ((expenseForm.paymentMode === 'UPI' || expenseForm.paymentMode === 'NEFT') && !expenseForm.utr.trim()) {
      toast.error('UTR is required for UPI/NEFT')
      return
    }
    if (expenseForm.paymentMode === 'CHEQUE' && !expenseForm.chequeNumber.trim()) {
      toast.error('Cheque number is required')
      return
    }
    const payload = {
      ...expenseForm,
      categoryId: Number(expenseForm.categoryId),
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
      vendorName: expenseForm.vendorName || null,
      transactionId: expenseForm.transactionId || null,
      utr: expenseForm.utr || null,
      chequeNumber: expenseForm.chequeNumber || null,
      remarks: null
    }
    setExpenseSaving(true)
    try {
      await expenseAPI.createExpense(payload)
      toast.success('Expense created')
      resetAndCloseExpenseModal()
      loadDashboard()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save expense')
    } finally {
      setExpenseSaving(false)
    }
  }

  return (
    <Shell
      title={accountLabels.INDIVIDUAL}
      actions={<button className="button-link" type="button" onClick={() => setExpenseModalOpen(true)}>{tx('Add Expense')}</button>}
    >
      {expenseModalOpen && (
        <div className="modal-backdrop personal-dashboard-expense-backdrop" role="presentation" onMouseDown={resetAndCloseExpenseModal}>
          <section className="expense-modal personal-dashboard-expense-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-expense-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="expense-modal-header">
              <div>
                <h2 id="dashboard-expense-title">{tx('Add expense')}</h2>
                <p className="muted">{tx('Capture a personal expense without leaving the dashboard.')}</p>
              </div>
              <button type="button" className="modal-close" onClick={resetAndCloseExpenseModal}>×</button>
            </div>
            <form onSubmit={saveDashboardExpense}>
              <div className="expense-modal-form">
                <label>{tx('Date')}<input type="date" required value={expenseForm.expenseDate} onChange={(event) => updateExpenseForm('expenseDate', event.target.value)} /></label>
                <label>{tx('Category')}<select required value={expenseForm.categoryId} onChange={(event) => updateExpenseForm('categoryId', event.target.value)}><option value="">{tx('Select category')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}</select></label>
                <label>{tx('Amount')}<input type="number" min="1" step="0.01" required value={expenseForm.amount} onChange={(event) => updateExpenseForm('amount', event.target.value)} /></label>
                <label>{tx('Payment mode')}<select required value={expenseForm.paymentMode} onChange={(event) => updateExpenseForm('paymentMode', event.target.value)}><option value="CASH">{tx('Cash')}</option><option value="BANK">{tx('Bank')}</option><option value="UPI">UPI</option><option value="CARD">{tx('Card')}</option><option value="NEFT">NEFT</option><option value="CHEQUE">{tx('Cheque')}</option></select></label>
                <label>{tx('Vendor')}<input value={expenseForm.vendorName} onChange={(event) => updateExpenseForm('vendorName', event.target.value)} /></label>
                <label>{tx('Transaction ID')}<input value={expenseForm.transactionId} onChange={(event) => updateExpenseForm('transactionId', event.target.value)} /></label>
                {(expenseForm.paymentMode === 'UPI' || expenseForm.paymentMode === 'NEFT') && <label>UTR<input required value={expenseForm.utr} onChange={(event) => updateExpenseForm('utr', event.target.value)} /></label>}
                {expenseForm.paymentMode === 'CHEQUE' && <label>{tx('Cheque number')}<input required value={expenseForm.chequeNumber} onChange={(event) => updateExpenseForm('chequeNumber', event.target.value)} /></label>}
                <label className="document-wide">{tx('Description')}<textarea rows="3" value={expenseForm.description} onChange={(event) => updateExpenseForm('description', event.target.value)} /></label>
              </div>
              <div className="expense-modal-actions">
                <button type="button" onClick={resetAndCloseExpenseModal}>{tx('Cancel')}</button>
                <button className="primary" disabled={expenseSaving}>{expenseSaving ? tx('Saving...') : tx('Save Expense')}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      <section className="personal-dashboard-hero">
        <div className="personal-dashboard-hero-copy">
          <span>{tx('Monthly pulse')}</span>
          <h2>{budgetAmount ? `${budgetUsed} of budget used` : 'Set a monthly budget to track progress'}</h2>
          <p>{budgetAmount ? `${formatCurrency(remaining)} remaining this month` : 'Create a budget and turn this screen into your spending command center.'}</p>
        </div>
        <div className="personal-budget-meter" aria-label="Monthly budget usage">
          <div><i style={{ width: `${budgetPercent}%` }} /></div>
          <strong>{formatCurrency(summary.monthTotal)}</strong>
          <small>{budgetAmount ? `of ${formatCurrency(budgetAmount)}` : 'spent this month'}</small>
        </div>
      </section>

      {dailyQuote && <aside className="personal-daily-quote" aria-label={tx('Quote of the day')}>
        <span aria-hidden="true">&ldquo;</span>
        <div>
          <p>{dailyQuote.quote}</p>
          <footer>
            <strong>&mdash; {dailyQuote.author}</strong>
            {dailyQuote.sourceUrl && <a href={dailyQuote.sourceUrl} target="_blank" rel="noreferrer">Inspired by {dailyQuote.sourceName}</a>}
          </footer>
        </div>
      </aside>}

      <section className="personal-dashboard-panel">
          <div className="personal-panel-heading">
            <div>
              <h2>{tx('Quick actions')}</h2>
              <p>{tx('Jump into the work you do most often.')}</p>
            </div>
          </div>
          <div className="personal-action-grid">
            <DashboardAction to="/personal/expenses" icon="Rs" title={tx('Personal expenses')} text={tx('Track spending, budgets, and reports')} />
            <DashboardAction to="/personal/shared-expenses" icon="=" title={tx('Shared expenses')} text={tx('Groups and settlements')} />
            <DashboardAction to="/personal/friends" icon="Fr" title={tx('Friends')} text={tx('Manage shared contacts')} />
            <DashboardAction to="/personal/documents" icon="Doc" title={tx('Documents')} text={tx('Store receipts and files')} />
            <DashboardAction to="/personal/todos" icon="Ok" title={tx('Tasks')} text={tx('Plan personal work')} />
            <DashboardAction to="/feedback" icon="Fb" title={tx('Feedback')} text={tx('Share ideas and issues')} />
          </div>
      </section>

      <section className="personal-dashboard-panel">
        <div className="personal-panel-heading">
          <div>
            <h2>{tx('Category focus')}</h2>
            <p>{tx("Where this month's money is going.")}</p>
          </div>
        </div>
        <div className="personal-category-bars">
          {summary.categoryBreakdown.map(([category, amount]) => (
            <div className="personal-category-row" key={category}>
              <span>{category}</span>
              <div><i style={{ width: `${summary.monthTotal ? Math.round((amount / summary.monthTotal) * 100) : 0}%` }} /></div>
              <strong>{formatCurrency(amount)}</strong>
            </div>
          ))}
          {!loading && summary.categoryBreakdown.length === 0 && <p className="empty-state">{tx('Categories will appear once expenses are recorded this month.')}</p>}
        </div>
      </section>
    </Shell>
  )
}

const DashboardAction = ({ to, onClick, icon, title, text }) => {
  const content = (
    <>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </>
  )
  if (onClick) {
    return <button className="personal-action-card" type="button" onClick={onClick}>{content}</button>
  }
  return (
    <Link className="personal-action-card" to={to}>
      {content}
    </Link>
  )
}

const createDashboardExpenseForm = () => ({
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: '',
  expenseType: 'PERSONAL',
  festivalEventId: '',
  description: '',
  amount: '',
  paymentMode: 'CASH',
  transactionId: '',
  utr: '',
  chequeNumber: '',
  vendorName: '',
  status: 'DRAFT'
})

const SocietyDashboard = () => {
  const currentAccount = useAuthStore((state) => state.currentAccount)
  const [expenses, setExpenses] = useState([])
  const [flats, setFlats] = useState([])

  useEffect(() => {
    Promise.all([
      expenseAPI.getExpenses(),
      societyFlatAPI.getFlats().catch(() => ({ data: [] }))
    ]).then(([expenseResponse, flatResponse]) => {
      setExpenses(expenseResponse.data || [])
      setFlats(flatResponse.data || [])
    })
  }, [])

  const summary = useMemo(() => buildExpenseSummary(expenses), [expenses])
  const pending = expenses.filter((expense) => expense.status === 'SUBMITTED').length

  return (
    <Shell title={accountLabels.SOCIETY}>
      <SummaryGrid
        items={[
          ['This Month', formatCurrency(summary.monthTotal)],
          ['Festival Spend', formatCurrency(summary.festivalTotal)],
          ['Pending Approvals', pending],
          ['Active Flats', flats.length]
        ]}
      />
      <ActionRow actions={(currentAccount?.role === 'MEMBER'
        ? [[ 'View Expenses', '/expenses' ], [ 'Categories', '/categories' ], [ 'Flat Master', '/society/flats' ], [ 'Festivals', '/society/festivals' ], [ 'Collections', '/society/festival-collections' ]]
        : [[ 'Add Expense', '/expenses/new' ], [ 'View Expenses', '/expenses' ], [ 'Categories', '/categories' ], [ 'Flat Master', '/society/flats' ], [ 'Festivals', '/society/festivals' ], [ 'Collections', '/society/festival-collections' ]])} />
    </Shell>
  )
}

export const SocietyMemberDirectory = () => {
  const currentAccount = useAuthStore((state) => state.currentAccount)
  const [requests, setRequests] = useState([])
  const [members, setMembers] = useState([])
  const [approvalForms, setApprovalForms] = useState({})
  const [flats, setFlats] = useState([])
  const [ledgerRows, setLedgerRows] = useState([])
  const [ledgerByFlat, setLedgerByFlat] = useState({})
  const [ledgerPages, setLedgerPages] = useState({})
  const [flatLedgerPage, setFlatLedgerPage] = useState(1)
  const [filters, setFilters] = useState({ flat: '', name: '', month: '', year: '' })
  const [activeTab, setActiveTab] = useState('directory')
  const [memberPage, setMemberPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const isAdmin = currentAccount?.role === 'ADMIN'
  const financialYear = (() => { const date = new Date(); const year = date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear(); return `${year}-${year + 1}` })()

  const loadRequests = () => {
    setLoading(true)
    const requests = isAdmin ? societyMembershipAPI.getPending() : Promise.resolve({ data: [] })
    const flats = isAdmin ? societyFlatAPI.getFlats() : Promise.resolve({ data: [] })
    const ledger = isAdmin ? Promise.resolve({ data: [] }) : societyAnnualCollectionAPI.ledger(financialYear)
    Promise.all([requests, societyMembershipAPI.getMembers(), flats, ledger])
      .then(([requestResponse, memberResponse, flatResponse, ledgerResponse]) => {
        const requestRows = requestResponse.data || []
        const flatRows = flatResponse.data || []
        setRequests(requestRows)
        setMembers(memberResponse.data || [])
        setFlats(flatRows)
        setLedgerRows(ledgerResponse.data || [])
        setApprovalForms(buildApprovalForms(requestRows, flatRows))
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load membership requests'))
      .finally(() => setLoading(false))
  }

  useEffect(loadRequests, [isAdmin])

  const normalizeBlock = (value) => String(value || '').trim().toLowerCase().replace(/\bblock\b/g, '').replace(/[^a-z0-9]/g, '')
  const normalizeFlat = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const relationOptions = ['Resident', 'Owner', 'Tenant', 'Family member', 'Committee member']
  const matchingRelation = (value) => relationOptions.find((option) => option.toLowerCase() === String(value || '').trim().toLowerCase()) || 'Resident'

  const buildApprovalForms = (requestRows, flatRows) => requestRows.reduce((forms, request) => {
    const requestedBlock = normalizeBlock(request.requestedBlockName)
    const requestedFlat = normalizeFlat(request.requestedFlatNumber)
    const matchingFlat = requestedBlock && requestedFlat
      ? flatRows.find((flat) => normalizeBlock(flat.blockName) === requestedBlock && normalizeFlat(flat.flatNumber) === requestedFlat)
      : null
    forms[request.id] = {
      flatId: matchingFlat?.id ? String(matchingFlat.id) : '',
      relation: matchingRelation(request.requestedRelation)
    }
    return forms
  }, {})

  const requestedFlatLabel = (request) => {
    const parts = [request.requestedBlockName, request.requestedFlatNumber].filter(Boolean)
    const flat = parts.length ? parts.join('-') : 'Not provided'
    return `${flat}${request.requestedRelation ? ` as ${request.requestedRelation}` : ''}`
  }

  const updateApprovalForm = (requestId, field, value) => {
    setApprovalForms((forms) => ({
      ...forms,
      [requestId]: { ...(forms[requestId] || { relation: 'Resident' }), [field]: value }
    }))
  }

  const respond = async (request, approve) => {
    try {
      if (approve) {
        const form = approvalForms[request.id] || {}
        if (!form.flatId) {
          toast.error('Select a flat before approving this member')
          return
        }
        const response = await societyMembershipAPI.approve(request.id, {
          flatId: Number(form.flatId),
          relation: form.relation || 'Resident'
        })
        setMembers((items) => [...items, response.data])
      } else await societyMembershipAPI.reject(request.id)
      setRequests((items) => items.filter((item) => item.id !== request.id))
      setApprovalForms((forms) => {
        const next = { ...forms }
        delete next[request.id]
        return next
      })
      toast.success(`${request.name}'s request ${approve ? 'approved' : 'rejected'}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update membership request')
    }
  }

  const updateRole = async (member, role) => {
    try {
      const response = await societyMembershipAPI.updateMemberRole(member.id, role)
      setMembers((items) => items.map((item) => item.id === member.id ? response.data : item))
      toast.success(`${member.name}'s role updated to ${role.toLowerCase()}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update member role')
    }
  }

  const memberCard = (member) => (
    <article className="shared-invitation-card society-member-role-card" key={member.id}>
      <div className="society-membership-person">
        <strong>{member.name}</strong>
        <small>{member.mobile}{member.email ? ` - ${member.email}` : ''}</small>
        <small>Flat: {requestedFlatLabel(member)}</small>
      </div>
      {isAdmin ? <label>
        Access role
        <select aria-label={`Access role for ${member.name}`} value={member.role} onChange={(event) => updateRole(member, event.target.value)}>
          <option value="MEMBER">Member</option>
          <option value="TREASURER">Treasurer</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label> : <div className="society-member-role-value"><small>Access role</small><strong>{String(member.role || 'MEMBER').toLowerCase()}</strong></div>}
    </article>
  )

  const membersForFlat = (flat) => members.filter((member) =>
    filteredMembers.some((filtered) => filtered.id === member.id) &&
    normalizeBlock(member.requestedBlockName) === normalizeBlock(flat.blockName) &&
    normalizeFlat(member.requestedFlatNumber) === normalizeFlat(flat.flatNumber))

  const transactionsForFlat = (flat) => (ledgerByFlat[flat.id] || []).filter((row) => {
    const date = String(row.paymentDate || '')
    return (!filters.month || date.slice(5, 7) === filters.month) && (!filters.year || date.slice(0, 4) === filters.year)
  })

  const financialLedger = (rows, ledgerKey) => {
    const pageSize = 10
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
    const page = Math.min(ledgerPages[ledgerKey] || 1, pageCount)
    const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)
    return <>
    <div className="table-wrap society-flat-financial-table"><table><thead><tr><th>Date</th><th>Mode</th><th>Payer</th><th>Reference</th><th>Details</th><th className="numeric">Amount</th></tr></thead><tbody>
      {visibleRows.map((row) => <tr key={row.id}><td>{formatDate(row.paymentDate)}</td><td>{row.paymentMode}</td><td>{row.sourceName || '-'}</td><td>{row.referenceNumber || row.transactionId || '-'}</td><td>{row.remarks || '-'}</td><td className="numeric">{formatCurrency(row.amount)}</td></tr>)}
      {!rows.length && <tr><td colSpan="6" className="empty-state">No cash or bank book transactions for this flat in {financialYear}.</td></tr>}
    </tbody></table></div>
    {pageCount > 1 && <nav className="table-pagination" aria-label="Ledger transaction pages"><button disabled={page === 1} onClick={() => setLedgerPages((pages) => ({ ...pages, [ledgerKey]: 1 }))}>«</button><button disabled={page === 1} onClick={() => setLedgerPages((pages) => ({ ...pages, [ledgerKey]: page - 1 }))}>‹</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setLedgerPages((pages) => ({ ...pages, [ledgerKey]: page + 1 }))}>›</button><button disabled={page === pageCount} onClick={() => setLedgerPages((pages) => ({ ...pages, [ledgerKey]: pageCount }))}>»</button></nav>}
    <div className="society-flat-ledger-total"><span>{financialYear} collection total</span><strong>{formatCurrency(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</strong></div>
  </>}

  const years = [...new Set([
    ...members.map((member) => String(member.requestedAt || '').slice(0, 4)),
    ...ledgerRows.map((row) => String(row.paymentDate || '').slice(0, 4)),
    ...Object.values(ledgerByFlat).flat().map((row) => String(row.paymentDate || '').slice(0, 4)),
    financialYear.slice(0, 4)
  ].filter(Boolean))].sort().reverse()
  const filteredMembers = members.filter((member) => {
    return (!filters.flat || normalizeFlat(member.requestedFlatNumber).includes(normalizeFlat(filters.flat)))
      && (!filters.name || String(member.name || '').toLowerCase().includes(filters.name.trim().toLowerCase()))
  })
  const filteredLedgerRows = ledgerRows.filter((row) => {
    const date = String(row.paymentDate || '')
    return (!filters.month || date.slice(5, 7) === filters.month) && (!filters.year || date.slice(0, 4) === filters.year)
  })
  const filteredFlats = flats.filter((flat) => {
    const flatMatches = !filters.flat || normalizeFlat(flat.flatNumber).includes(normalizeFlat(filters.flat))
    const nameMatches = !filters.name || membersForFlat(flat).length > 0
    const dateMatches = !(filters.month || filters.year) || ledgerByFlat[flat.id] === undefined || transactionsForFlat(flat).length > 0
    return flatMatches && nameMatches && dateMatches
  })
  const flatPageSize = 5
  const flatPageCount = Math.max(1, Math.ceil(filteredFlats.length / flatPageSize))
  const currentFlatPage = Math.min(flatLedgerPage, flatPageCount)
  const visibleLedgerFlats = filteredFlats.slice((currentFlatPage - 1) * flatPageSize, currentFlatPage * flatPageSize)
  const memberPageCount = Math.max(1, Math.ceil(filteredMembers.length / 10))
  const currentMemberPage = Math.min(memberPage, memberPageCount)
  const visibleMembers = filteredMembers.slice((currentMemberPage - 1) * 10, currentMemberPage * 10)
  const visibleFlatIds = visibleLedgerFlats.map((flat) => flat.id).join(',')

  useEffect(() => {
    if (!isAdmin || activeTab !== 'ledger' || !visibleLedgerFlats.length) return
    const missing = visibleLedgerFlats.filter((flat) => ledgerByFlat[flat.id] === undefined)
    if (!missing.length) return
    Promise.all(missing.map((flat) => societyAnnualCollectionAPI.ledger(financialYear, flat.id)
      .then((response) => [flat.id, response.data || []])))
      .then((entries) => setLedgerByFlat((current) => ({ ...current, ...Object.fromEntries(entries) })))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load flat ledger'))
  }, [isAdmin, activeTab, visibleFlatIds, financialYear])

  return (
    <Shell title="Society Member Directory" eyebrow="Society module">
    <div className="shared-expense-submenu" role="tablist" aria-label="Society directory sections">
      <button role="tab" aria-selected={activeTab === 'directory'} className={activeTab === 'directory' ? 'active' : ''} onClick={() => setActiveTab('directory')}>Member Directory</button>
      <button role="tab" aria-selected={activeTab === 'ledger'} className={activeTab === 'ledger' ? 'active' : ''} onClick={() => setActiveTab('ledger')}>Financial Ledger</button>
    </div>
    <section className="toolbar-panel society-member-filters">
      <label>Flat number<input type="search" value={filters.flat} placeholder="Search flat" onChange={(event) => { setFilters((current) => ({ ...current, flat: event.target.value })); setFlatLedgerPage(1) }} /></label>
      <label>Member name<input type="search" value={filters.name} placeholder="Search name" onChange={(event) => { setFilters((current) => ({ ...current, name: event.target.value })); setFlatLedgerPage(1) }} /></label>
      <label>Month<select value={filters.month} onChange={(event) => { setFilters((current) => ({ ...current, month: event.target.value })); setFlatLedgerPage(1) }}><option value="">All months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}</select></label>
      <label>Year<select value={filters.year} onChange={(event) => { setFilters((current) => ({ ...current, year: event.target.value })); setFlatLedgerPage(1) }}><option value="">All years</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
      <button type="button" onClick={() => { setFilters({ flat: '', name: '', month: '', year: '' }); setFlatLedgerPage(1); setLedgerPages({}) }}>Clear filters</button>
    </section>
    <section className="panel">
      {activeTab === 'directory' && isAdmin && <><h2>Society membership requests</h2>
      {loading && <p className="muted">Checking for new requests...</p>}
      {!loading && !requests.length && <p className="muted">No pending membership requests.</p>}
      {requests.map((request) => (
        <article className="shared-invitation-card society-membership-request" key={request.id}>
          <div className="society-membership-person">
            <strong>{request.name}</strong>
            <small>{request.mobile}{request.email ? ` - ${request.email}` : ''}</small>
            <small>Requested flat: {requestedFlatLabel(request)}</small>
          </div>
          <label>
            Flat
            <select aria-label={`Flat for ${request.name}`} value={approvalForms[request.id]?.flatId || ''} onChange={(event) => updateApprovalForm(request.id, 'flatId', event.target.value)}>
              <option value="">Select flat</option>
              {flats.map((flat) => <option key={flat.id} value={flat.id}>{flat.blockName}-{flat.flatNumber} ({flat.ownerName})</option>)}
            </select>
          </label>
          <label>
            Relation
            <select aria-label={`Relation for ${request.name}`} value={approvalForms[request.id]?.relation || 'Resident'} onChange={(event) => updateApprovalForm(request.id, 'relation', event.target.value)}>
              <option value="Resident">Resident</option>
              <option value="Owner">Owner</option>
              <option value="Tenant">Tenant</option>
              <option value="Family member">Family member</option>
              <option value="Committee member">Committee member</option>
            </select>
          </label>
          <div className="table-actions">
            <button className="primary" type="button" onClick={() => respond(request, true)}>Approve</button>
            <button type="button" onClick={() => respond(request, false)}>Reject</button>
          </div>
        </article>
      ))}</>}
      {activeTab === 'directory' && <><h2>Society member directory</h2>
      {!loading && !filteredMembers.length && <p className="muted">No society members match these filters.</p>}
      <div className="society-member-directory">{visibleMembers.map(memberCard)}</div>
      {memberPageCount > 1 && <nav className="table-pagination" aria-label="Member directory pages"><button disabled={currentMemberPage === 1} onClick={() => setMemberPage(1)}>«</button><button disabled={currentMemberPage === 1} onClick={() => setMemberPage((page) => Math.max(1, page - 1))}>‹</button><span>Members page {currentMemberPage} of {memberPageCount}</span><button disabled={currentMemberPage === memberPageCount} onClick={() => setMemberPage((page) => Math.min(memberPageCount, page + 1))}>›</button><button disabled={currentMemberPage === memberPageCount} onClick={() => setMemberPage(memberPageCount)}>»</button></nav>}</>}
      {activeTab === 'ledger' && <><h2>{isAdmin ? 'Flat financial ledgers' : 'Your flat financial ledger'}</h2>
      {isAdmin ? <><div className="society-flat-ledger-list">{visibleLedgerFlats.map((flat) => {
        const transactions = transactionsForFlat(flat)
        return <section className="society-flat-ledger" key={flat.id}>
          <header><div><strong>{flat.blockName}-{flat.flatNumber}</strong><small>Flat owner: {flat.ownerName || 'Not recorded'}</small></div><span>{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}</span></header>
          {financialLedger(transactions, `flat-${flat.id}`)}
        </section>
      })}</div>{flatPageCount > 1 && <nav className="table-pagination" aria-label="Flat ledger pages"><button disabled={currentFlatPage === 1} onClick={() => setFlatLedgerPage(1)}>«</button><button disabled={currentFlatPage === 1} onClick={() => setFlatLedgerPage((page) => Math.max(1, page - 1))}>‹</button><span>Flats page {currentFlatPage} of {flatPageCount}</span><button disabled={currentFlatPage === flatPageCount} onClick={() => setFlatLedgerPage((page) => Math.min(flatPageCount, page + 1))}>›</button><button disabled={currentFlatPage === flatPageCount} onClick={() => setFlatLedgerPage(flatPageCount)}>»</button></nav>}</> : financialLedger(filteredLedgerRows, 'my-flat')}</>}
    </section>
    </Shell>
  )
}

const KiranaDashboard = () => {
  const [expenses, setExpenses] = useState([])
  const [lowStock, setLowStock] = useState([])

  useEffect(() => {
    Promise.all([
      expenseAPI.getExpenses(),
      kiranaProductAPI.getLowStockProducts().catch(() => ({ data: [] }))
    ]).then(([expenseResponse, stockResponse]) => {
      setExpenses(expenseResponse.data || [])
      setLowStock(stockResponse.data || [])
    })
  }, [])

  const summary = useMemo(() => buildExpenseSummary(expenses), [expenses])

  return (
    <Shell title={accountLabels.KIRANA_STORE}>
      <SummaryGrid
        items={[
          ['Store Expenses', formatCurrency(summary.monthTotal)],
          ['Today Expenses', formatCurrency(summary.todayTotal)],
          ['Low Stock Items', lowStock.length],
          ['Payment Modes', summary.paymentModes]
        ]}
      />
      <ActionRow actions={[[ 'New Sale', '/kirana/sales/new' ], [ 'New Purchase', '/kirana/purchases/new' ], [ 'Reports', '/kirana/reports' ], [ 'Sales', '/kirana/sales' ], [ 'Purchases', '/kirana/purchases' ], [ 'Customer Credit', '/kirana/customer-credit' ], [ 'Supplier Dues', '/kirana/supplier-payments' ], [ 'Products', '/kirana/products' ]]} />
    </Shell>
  )
}

export const SummaryGrid = ({ items }) => (
  <section className="summary-grid">
    {items.map(([label, value]) => (
      <article className="summary-card" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    ))}
  </section>
)

export const ActionRow = ({ actions }) => (
  <div className="action-row">
    {actions.map(([label, to]) => (
      <Link className="button-link" key={to} to={to}>{label}</Link>
    ))}
  </div>
)

const buildExpenseSummary = (expenses) => {
  const today = new Date().toISOString().slice(0, 10)
  const monthPrefix = today.slice(0, 7)
  const categoryTotals = new Map()
  const paymentModes = new Set()
  let todayTotal = 0
  let monthTotal = 0
  let festivalTotal = 0
  let todayCount = 0
  let monthCount = 0

  expenses.forEach((expense) => {
    const amount = Number(expense.amount || 0)
    if (expense.expenseDate === today) {
      todayTotal += amount
      todayCount += 1
    }
    if (expense.expenseDate?.startsWith(monthPrefix)) {
      monthTotal += amount
      monthCount += 1
    }
    if (expense.expenseType === 'FESTIVAL') festivalTotal += amount
    if (expense.expenseDate?.startsWith(monthPrefix) && expense.categoryName) categoryTotals.set(expense.categoryName, (categoryTotals.get(expense.categoryName) || 0) + amount)
    if (expense.paymentMode) paymentModes.add(expense.paymentMode)
  })
  const categoryBreakdown = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const [topCategory, topCategoryAmount] = categoryBreakdown[0] || []

  return {
    todayTotal,
    todayCount,
    monthTotal,
    monthCount,
    festivalTotal,
    topCategory,
    topCategoryAmount,
    categoryBreakdown,
    paymentModes: paymentModes.size || '-'
  }
}



