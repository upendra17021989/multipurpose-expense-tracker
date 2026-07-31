import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sharedExpenseAPI } from '../../api/endpoints'
import { formatCurrency, formatDate } from '../../utils/format'
import { useI18n } from '../../i18n'
import { Shell } from '../DashboardRouter'
const today = new Date().toISOString().slice(0, 10)
const sharedExpenseCategories = [
  'Food & Dining',
  'Groceries',
  'Sports & Recreation',
  'Travel',
  'Transportation',
  'Rent',
  'Utilities',
  'Household',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Accommodation',
  'Events & Parties',
  'Subscriptions',
  'Education',
  'Gifts',
  'Miscellaneous'
]
const sharedGroupSections = new Set(['balances', 'expense', 'members', 'history', 'activity', 'export', 'archived'])
export const SharedExpenseGroup = () => {
  const { tx } = useI18n()
  const navigate = useNavigate()
  const { groupId, section } = useParams()
  const activeSection = sharedGroupSections.has(section) ? section : 'balances'
  const openSection = (nextSection) => navigate(`/personal/shared-expenses/${groupId}/${nextSection}`)
  const [group, setGroup] = useState(null)
  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [insightRange, setInsightRange] = useState('all')
  const [insightDates, setInsightDates] = useState({ from: '', to: '' })
  const [expensePage, setExpensePage] = useState(1)
  const [expenseSort, setExpenseSort] = useState({ key: 'expenseDate', direction: 'desc' })
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([])
  const [reversingExpenses, setReversingExpenses] = useState(false)
  const [member, setMember] = useState({
    memberName: '',
    email: '',
    mobile: ''
  })
  const [invite, setInvite] = useState({ email: '', mobile: '' })
  const [expense, setExpense] = useState({
    description: '',
    category: '',
    expenseDate: today,
    totalAmount: '',
    splitType: 'EQUAL',
    participantIds: [],
    payers: {},
    shares: {},
    items: []
  })
  const [itemizedExpense, setItemizedExpense] = useState(false)
  const [showPayerModal, setShowPayerModal] = useState(false)
  const [showParticipantModal, setShowParticipantModal] = useState(false)
  const [settle, setSettle] = useState({
    paidByMemberId: '',
    paidToMemberId: '',
    amount: '',
    settlementDate: today,
    paymentMode: 'UPI',
    notes: ''
  })
  const load = () =>
    sharedExpenseAPI
      .getGroup(groupId)
      .then((r) => setGroup(r.data))
      .catch((e) =>
        toast.error(e.response?.data?.message || 'Unable to load group')
      )
  useEffect(() => {
    if (section && !sharedGroupSections.has(section)) {
      navigate(`/personal/shared-expenses/${groupId}/balances`, { replace: true })
    }
  }, [groupId, navigate, section])
  useEffect(() => {
    load()
  }, [groupId])
  useEffect(() => {
    setExpensePage(1)
  }, [groupId, group?.expenses?.length])
  const active = useMemo(
    () => group?.members?.filter((x) => x.active) || [],
    [group]
  )
  const submit = async (action, api, data, success) => {
    if (submittingRef.current) return false
    submittingRef.current = true
    setSubmitting(action)
    try {
      const r = await api(groupId, data)
      setGroup(r.data)
      toast.success(success)
      return true
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to save')
      return false
    } finally {
      submittingRef.current = false
      setSubmitting(null)
    }
  }
  const addMember = (e) => {
    e.preventDefault()
    submit('member', sharedExpenseAPI.addMember, member, 'Member added').then(
      (saved) => saved && setMember({ memberName: '', email: '', mobile: '' })
    )
  }
  const inviteUser = async (e) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting('invite')
    try {
      await sharedExpenseAPI.inviteUser(groupId, invite)
      setInvite({ email: '', mobile: '' })
      toast.success('Invitation sent')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send invitation')
    } finally {
      submittingRef.current = false
      setSubmitting(null)
    }
  }
  const toggle = (id) =>
    setExpense((x) => ({
      ...x,
      participantIds: x.participantIds.includes(id)
        ? x.participantIds.filter((v) => v !== id)
        : [...x.participantIds, id]
    }))
  const allParticipantsSelected =
    active.length > 0 &&
    active.every((x) => expense.participantIds.includes(x.id))
  const toggleAllParticipants = () =>
    setExpense((x) => ({
      ...x,
      participantIds: allParticipantsSelected
        ? []
        : active.map((member) => member.id)
    }))
  const addExpense = (e) => {
    e.preventDefault()
    const items = itemizedExpense ? expense.items.filter((item) => item.itemName.trim() && Number(item.amount) > 0) : []
    if (itemizedExpense && items.length !== expense.items.length) {
      toast.error('Enter a name and amount for every item, or remove the empty row')
      return
    }
    const totalAmount = itemizedExpense ? items.reduce((sum, item) => sum + Number(item.amount), 0) : Number(expense.totalAmount)
    const shares =
      expense.splitType === 'EXACT'
        ? expense.participantIds.map((memberId) => ({
            memberId,
            amount: Number(expense.shares[memberId] || 0)
          }))
        : null
    const payers = Object.entries(expense.payers)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([memberId, amount]) => ({
        memberId: Number(memberId),
        amount: Number(amount)
      }))
    submit(
      'expense',
      sharedExpenseAPI.addExpense,
      { ...expense, totalAmount, items: items.map((item) => ({ itemName: item.itemName.trim(), quantity: Number(item.quantity || 1), unitPrice: item.unitPrice === '' ? null : Number(item.unitPrice), amount: Number(item.amount) })), payers, shares },
      'Expense added'
    ).then((saved) => {
      if (!saved) return
      setExpense({
        description: '', category: '', expenseDate: today, totalAmount: '',
        splitType: 'EQUAL', participantIds: [], payers: {}, shares: {}, items: []
      })
      setItemizedExpense(false)
    })
  }
  const addSettlement = (e) => {
    e.preventDefault()
    submit(
      'settlement',
      sharedExpenseAPI.addSettlement,
      {
        ...settle,
        paidByMemberId: Number(settle.paidByMemberId),
        paidToMemberId: Number(settle.paidToMemberId),
        amount: Number(settle.amount)
      },
      'Settlement recorded'
    ).then((saved) => saved && setSettle({ ...settle, amount: '', notes: '' }))
  }
  const reverseSelectedExpenses = async () => {
    if (!selectedExpenseIds.length || reversingExpenses) return
    if (!window.confirm(`Reverse ${selectedExpenseIds.length} selected expense(s)? Their balances will be removed.`)) return
    setReversingExpenses(true)
    try {
      await Promise.all(selectedExpenseIds.map((id) => sharedExpenseAPI.reverseExpense(id)))
      setSelectedExpenseIds([])
      await load()
      toast.success(`${selectedExpenseIds.length} expense(s) reversed`)
    } catch (e) {
      await load()
      toast.error(e.response?.data?.message || 'Unable to reverse all selected expenses')
    } finally {
      setReversingExpenses(false)
    }
  }
  const deactivateMember = async (x) => {
    if (!window.confirm(`Deactivate ${x.memberName}?`)) return
    try {
      const r = await sharedExpenseAPI.updateMember(groupId, x.id, {
        memberName: x.memberName,
        email: x.email || null,
        mobile: x.mobile || null,
        active: false
      })
      setGroup(r.data)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to update member')
    }
  }
  const exportGroup = async () => {
    setExporting(true)
    try {
      const response = await sharedExpenseAPI.exportGroup(groupId)
      const disposition = response.headers['content-disposition'] || ''
      const fileName =
        disposition.match(/filename="?([^";]+)"?/i)?.[1] ||
        'shared-expenses.xlsx'
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Excel export downloaded')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to export group')
    } finally {
      setExporting(false)
    }
  }
  const exportGroupPdf = async () => {
    setExportingPdf(true)
    try {
      const response = await sharedExpenseAPI.exportGroupPdf(groupId)
      const disposition = response.headers['content-disposition'] || ''
      const fileName =
        disposition.match(/filename="?([^";]+)"?/i)?.[1] ||
        'shared-expenses.pdf'
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('PDF export downloaded')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }
  const archiveGroup = async () => {
    if (
      !window.confirm(
        'Archive this group? It will be hidden from active groups, but its history will be preserved.'
      )
    )
      return
    try {
      const r = await sharedExpenseAPI.updateGroup(groupId, {
        name: group.name,
        active: false
      })
      setGroup(r.data)
      toast.success('Group archived')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to archive group')
    }
  }
  useEffect(() => {
    if (!group) return
    const page = document.querySelector('.page-shell')
    if (!page) return
    const sections = {
      balances: page.querySelector('[data-shared-section="balances"]'),
      members: page.querySelector('[data-shared-section="members"]'),
      expense: page.querySelector('[data-shared-section="expense"]'),
      history: page.querySelector('[data-shared-section="history"]'),
      activity: page.querySelector('[data-shared-section="activity"]'),
      archived: page.querySelector('[data-shared-section="archived"]'),
      export: page.querySelector('[data-shared-section="export"]')
    }
    const invite = page.querySelector('[data-shared-section="invite"]')
    Object.values(sections).forEach((node) =>
      node?.classList.add('shared-tab-hidden')
    )
    invite?.classList.add('shared-tab-hidden')
    sections[activeSection]?.classList.remove('shared-tab-hidden')
    if (activeSection === 'members')
      invite?.classList.remove('shared-tab-hidden')
    return () => {
      Object.values(sections).forEach((node) =>
        node?.classList.remove('shared-tab-hidden')
      )
      invite?.classList.remove('shared-tab-hidden')
    }
  }, [activeSection, group])
  if (!group)
    return (
      <Shell title="Shared Expenses">
        <p className="muted">Loading group...</p>
      </Shell>
    )
  const expensePageSize = 10
  const sortedExpenses = sortRows(group.expenses || [], expenseSort, sharedExpenseSortAccessors)
  const expensePageCount = Math.max(
    1,
    Math.ceil(sortedExpenses.length / expensePageSize)
  )
  const currentExpensePage = Math.min(expensePage, expensePageCount)
  const visibleExpenses = sortedExpenses.slice(
    (currentExpensePage - 1) * expensePageSize,
    currentExpensePage * expensePageSize
  )
  const totalSpent = (group.expenses || [])
    .filter((x) => !x.reversed)
    .reduce((total, x) => total + Number(x.totalAmount || 0), 0)
  const activeExpenses = (group.expenses || []).filter((x) => !x.reversed)
  const currentMonth = today.slice(0, 7)
  const insightExpenses = activeExpenses.filter((item) => {
    if (insightRange === 'month') return item.expenseDate?.startsWith(currentMonth)
    if (insightRange === 'custom') {
      if (insightDates.from && item.expenseDate < insightDates.from) return false
      if (insightDates.to && item.expenseDate > insightDates.to) return false
    }
    return true
  })
  const insightTotal = insightExpenses.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
  const paidByMember = (group.members || []).map((member) => ({
    memberId: member.id,
    memberName: member.memberName,
    amount: insightExpenses.reduce(
      (sum, item) => sum + (item.payers || [])
        .filter((payer) => payer.memberId === member.id)
        .reduce((payerSum, payer) => payerSum + Number(payer.amount || 0), 0),
      0
    )
  })).sort((a, b) => b.amount - a.amount)
  const categoryTotals = Object.values(insightExpenses.reduce((totals, item) => {
    const category = item.category || tx('Uncategorized')
    totals[category] ||= { category, amount: 0, count: 0 }
    totals[category].amount += Number(item.totalAmount || 0)
    totals[category].count += 1
    return totals
  }, {})).sort((a, b) => b.amount - a.amount)
  const settledMembers = (group.balances || []).filter((x) => Number(x.balance || 0) === 0).length
  const unsettledMembers = Math.max((group.balances || []).length - settledMembers, 0)
  const recentActivity = group.activities?.[0]
  const selectableVisibleIds = visibleExpenses.filter((x) => !x.reversed).map((x) => x.id)
  const allVisibleSelected = selectableVisibleIds.length > 0 && selectableVisibleIds.every((id) => selectedExpenseIds.includes(id))
  const toggleVisibleExpenses = () => setSelectedExpenseIds((selected) =>
    allVisibleSelected
      ? selected.filter((id) => !selectableVisibleIds.includes(id))
      : [...new Set([...selected, ...selectableVisibleIds])]
  )
  const toggleExpenseSelection = (id) => setSelectedExpenseIds((selected) =>
    selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]
  )
  const toggleExpenseSort = (key) => {
    setExpenseSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
    setExpensePage(1)
  }
  return (
    <Shell
      title={group.name}
      eyebrow="Shared expenses"
      actions={
        <div className="shared-mobile-actions">
          <Link className="button-link" to="/personal/shared-expenses">
            {tx('All groups')}
          </Link>
        </div>
      }
    >
      <section className="shared-group-hero">
        <div>
          <span>{tx(group.active ? 'Active shared group' : 'Archived shared group')}</span>
          <h2>{formatCurrency(totalSpent)} {tx('tracked across')} {group.expenses?.length || 0} {tx('expenses')}</h2>
          <p>{recentActivity ? recentActivity.message : tx('Add the first expense or invite members to start the shared ledger.')}</p>
        </div>
        <div className="shared-group-pulse">
          <article><span>{tx('Members')}</span><strong>{active.length}</strong></article>
          <article><span>{tx('Unsettled')}</span><strong>{unsettledMembers}</strong></article>
          <article><span>{tx('Settled')}</span><strong>{settledMembers}</strong></article>
        </div>
      </section>
      <nav className="shared-expense-submenu" aria-label="Group navigation">
        <button
          className={activeSection === 'balances' ? 'active' : ''}
          type="button"
          onClick={() => openSection('balances')}
        >
          {tx('Balances')}
        </button>
        <button
          className={activeSection === 'expense' ? 'active' : ''}
          type="button"
          onClick={() => openSection('expense')}
        >
          {tx('Add expense')}
        </button>
        <button
          className={activeSection === 'members' ? 'active' : ''}
          type="button"
          onClick={() => openSection('members')}
        >
          {tx('Members')}
        </button>
        <button
          className={activeSection === 'history' ? 'active' : ''}
          type="button"
          onClick={() => openSection('history')}
        >
          {tx('History')}
        </button>
        <button
          className={activeSection === 'activity' ? 'active' : ''}
          type="button"
          onClick={() => openSection('activity')}
        >
          {tx('Activity')}
        </button>
        <button
          className={activeSection === 'export' ? 'active' : ''}
          type="button"
          onClick={() => openSection('export')}
        >
          {tx('Export')}
        </button>
        <button
          className={activeSection === 'archived' ? 'active' : ''}
          type="button"
          onClick={() => openSection('archived')}
        >
          {tx('Archive')}
        </button>
      </nav>
      <section className="shared-balances-page" data-shared-section="balances">
        <div className="shared-balance-board">
        {(group.balances || []).map((x) => {
          const balance = Number(x.balance || 0)
          return (
            <article className={balance > 0 ? 'gets' : balance < 0 ? 'owes' : 'settled'} key={x.memberId || x.memberName}>
              <span>{x.memberName?.charAt(0)?.toUpperCase() || 'M'}</span>
              <div>
                <strong>{x.memberName}</strong>
                <small>{tx(balance > 0 ? 'Gets back' : balance < 0 ? 'Needs to pay' : 'All settled')}</small>
              </div>
              <b>{balance > 0 ? formatCurrency(balance) : balance < 0 ? formatCurrency(-balance) : tx('Settled')}</b>
            </article>
          )
        })}
        {!group.balances?.length && <p className="empty-state">{tx('Add members to see balances here.')}</p>}
        </div>
        <div className="shared-insight-filters" aria-label={tx('Expense insight date range')}>
          <div className="shared-insight-presets">
            {[
              ['all', 'All time'],
              ['month', 'This month'],
              ['custom', 'Custom range']
            ].map(([value, label]) => (
              <button
                key={value}
                className={insightRange === value ? 'active' : ''}
                type="button"
                onClick={() => setInsightRange(value)}
              >
                {tx(label)}
              </button>
            ))}
          </div>
          {insightRange === 'custom' && (
            <div className="shared-insight-dates">
              <label>{tx('From')}<input type="date" value={insightDates.from} max={insightDates.to || undefined} onChange={(e) => setInsightDates({ ...insightDates, from: e.target.value })} /></label>
              <label>{tx('To')}<input type="date" value={insightDates.to} min={insightDates.from || undefined} onChange={(e) => setInsightDates({ ...insightDates, to: e.target.value })} /></label>
            </div>
          )}
        </div>
        <div className="shared-expense-insights">
          <section className="report-panel">
            <h2>{tx('Paid by member')}</h2>
            <div className="shared-insight-list">
              {paidByMember.map((item) => (
                <article key={item.memberId}>
                  <div><strong>{item.memberName}</strong><span>{insightTotal ? Math.round((item.amount / insightTotal) * 100) : 0}%</span></div>
                  <div className="shared-insight-track"><span style={{ width: `${insightTotal ? (item.amount / insightTotal) * 100 : 0}%` }} /></div>
                  <b>{formatCurrency(item.amount)}</b>
                </article>
              ))}
            </div>
          </section>
          <section className="report-panel">
            <h2>{tx('Spending by category')}</h2>
            <div className="shared-insight-list">
              {categoryTotals.map((item) => (
                <article key={item.category}>
                  <div><strong>{item.category}</strong><span>{item.count} {tx(item.count === 1 ? 'expense' : 'expenses')}</span></div>
                  <div className="shared-insight-track category"><span style={{ width: `${insightTotal ? (item.amount / insightTotal) * 100 : 0}%` }} /></div>
                  <b>{formatCurrency(item.amount)}</b>
                </article>
              ))}
              {!categoryTotals.length && <p className="empty-state">{tx('Add expenses to see category insights.')}</p>}
            </div>
          </section>
        </div>
      </section>
      <section className="form-panel" data-shared-section="invite">
        <h2>{tx('Invite registered user')}</h2>
        <form className="inline-form" onSubmit={inviteUser}>
          <input
            type="email"
            placeholder={tx('Email')}
            value={invite.email}
            onChange={(e) => setInvite({ email: e.target.value, mobile: '' })}
          />
          <input
            placeholder={tx('Or mobile')}
            value={invite.mobile}
            onChange={(e) => setInvite({ mobile: e.target.value, email: '' })}
          />
          <button className="primary" disabled={submitting !== null}>
            {submitting === 'invite' ? tx('Sending...') : tx('Send invitation')}
          </button>
        </form>
      </section>
      <div className="two-column-grid" data-shared-section="members">
        <section className="form-panel">
          <h2>{tx('Members')}</h2>
          <form onSubmit={addMember}>
            <input
              placeholder={tx('Name')}
              required
              value={member.memberName}
              onChange={(e) =>
                setMember({ ...member, memberName: e.target.value })
              }
            />
            <input
              placeholder={tx('Email (optional)')}
              type="email"
              value={member.email}
              onChange={(e) => setMember({ ...member, email: e.target.value })}
            />
            <input
              placeholder={tx('Mobile (optional)')}
              value={member.mobile}
              onChange={(e) => setMember({ ...member, mobile: e.target.value })}
            />
            <button className="primary" disabled={submitting !== null}>
              {submitting === 'member' ? tx('Adding...') : tx('Add member')}
            </button>
          </form>
          <div>
            {active.map((x) => (
              <p key={x.id}>
                {x.memberName}{' '}
                {!x.userId && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => deactivateMember(x)}
                  >
                    {tx('Deactivate')}
                  </button>
                )}
              </p>
            ))}
          </div>
        </section>
        <section className="form-panel">
          <h2>{tx('Settle up')}</h2>
          <form onSubmit={addSettlement}>
            <select
              required
              value={settle.paidByMemberId}
              onChange={(e) =>
                setSettle({ ...settle, paidByMemberId: e.target.value })
              }
            >
              <option value="">{tx('Paid by')}</option>
              {active.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.memberName}
                </option>
              ))}
            </select>
            <select
              required
              value={settle.paidToMemberId}
              onChange={(e) =>
                setSettle({ ...settle, paidToMemberId: e.target.value })
              }
            >
              <option value="">{tx('Paid to')}</option>
              {active.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.memberName}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder={tx('Amount')}
              value={settle.amount}
              onChange={(e) => setSettle({ ...settle, amount: e.target.value })}
            />
            <input
              type="date"
              required
              value={settle.settlementDate}
              onChange={(e) =>
                setSettle({ ...settle, settlementDate: e.target.value })
              }
            />
            <button className="primary" disabled={submitting !== null}>
              {submitting === 'settlement' ? tx('Recording...') : tx('Record settlement')}
            </button>
          </form>
        </section>
      </div>
      <section className="form-panel" data-shared-section="expense">
        <h2>{tx('Add shared expense')}</h2>
        <form onSubmit={addExpense}>
          <div className="form-grid">
            <input
              required
              placeholder={tx('Description')}
              value={expense.description}
              onChange={(e) =>
                setExpense({ ...expense, description: e.target.value })
              }
            />
            <select
              required
              aria-label={tx('Category')}
              value={expense.category}
              onChange={(e) =>
                setExpense({ ...expense, category: e.target.value })
              }
            >
              <option value="">{tx('Select category')}</option>
              {sharedExpenseCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input
              required
              type="date"
              value={expense.expenseDate}
              onChange={(e) =>
                setExpense({ ...expense, expenseDate: e.target.value })
              }
            />
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder={tx('Total amount')}
              value={itemizedExpense ? expense.items.reduce((sum, item) => sum + Number(item.amount || 0), 0) || '' : expense.totalAmount}
              onChange={(e) =>
                setExpense({ ...expense, totalAmount: e.target.value })
              }
              disabled={itemizedExpense}
            />
            <select
              value={expense.splitType}
              onChange={(e) =>
                setExpense({ ...expense, splitType: e.target.value })
              }
            >
              <option value="EQUAL">{tx('Split equally')}</option>
              <option value="EXACT">{tx('Exact amounts')}</option>
            </select>
          </div>
          <section className="alert-panel expense-items-panel">
            <label className="expense-items-toggle">
              <input type="checkbox" checked={itemizedExpense} onChange={(event) => {
                const enabled = event.target.checked
                setItemizedExpense(enabled)
                if (enabled && expense.items.length === 0) setExpense({ ...expense, items: [{ itemName: '', quantity: 1, unitPrice: '', amount: '' }] })
              }} />
              <span><strong>{tx('Add item details')}</strong><small> {tx('Optional — useful for bills with multiple items')}</small></span>
            </label>
            {itemizedExpense && <>
              {expense.items.map((item, index) => (
                <div className="expense-item-row" key={index}>
                  <input placeholder={tx('Item name')} value={item.itemName} onChange={(event) => setExpense({ ...expense, items: expense.items.map((row, rowIndex) => rowIndex === index ? { ...row, itemName: event.target.value } : row) })} />
                  <input type="number" min="0.001" step="0.001" placeholder={tx('Qty')} value={item.quantity} onChange={(event) => setExpense({ ...expense, items: expense.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value, amount: row.unitPrice !== '' ? (Number(event.target.value) * Number(row.unitPrice)).toFixed(2) : row.amount } : row) })} />
                  <input type="number" min="0" step="0.01" placeholder={tx('Unit price')} value={item.unitPrice ?? ''} onChange={(event) => setExpense({ ...expense, items: expense.items.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: event.target.value, amount: event.target.value !== '' ? (Number(row.quantity || 1) * Number(event.target.value)).toFixed(2) : row.amount } : row) })} />
                  <input type="number" min="0.01" step="0.01" placeholder={tx('Total')} value={item.amount} disabled={item.unitPrice !== '' && item.unitPrice != null} onChange={(event) => setExpense({ ...expense, items: expense.items.map((row, rowIndex) => rowIndex === index ? { ...row, amount: event.target.value } : row) })} />
                  <button type="button" disabled={expense.items.length === 1} onClick={() => setExpense({ ...expense, items: expense.items.filter((_, rowIndex) => rowIndex !== index) })}>{tx('Remove')}</button>
                </div>
              ))}
              <button type="button" onClick={() => setExpense({ ...expense, items: [...expense.items, { itemName: '', quantity: 1, unitPrice: '', amount: '' }] })}>+ {tx('Add another item')}</button>
            </>}
          </section>
          <div className="section-heading-row">
            <h3>{tx('Who paid?')}</h3>
            <button type="button" className="secondary" onClick={() => setShowPayerModal(true)}>
              {tx('Set payer amounts')}
            </button>
          </div>
          <div className="summary-chip-row">
            {active.filter((x) => expense.payers[x.id] || '').map((x) => (
              <span key={x.id} className="summary-chip">
                {x.memberName}: {expense.payers[x.id]}
              </span>
            ))}
            {!active.some((x) => expense.payers[x.id] || '') && <span className="summary-chip muted">{tx('No amounts set')}</span>}
          </div>
          <div className="section-heading-row">
            <h3>{tx('Who shares it?')}</h3>
            <div className="section-heading-actions">
              <button type="button" className="secondary" onClick={() => setShowParticipantModal(true)}>
                {tx('Choose participants')}
              </button>
              <button type="button" onClick={toggleAllParticipants}>
                {allParticipantsSelected ? tx('Clear all') : tx('Select all')}
              </button>
            </div>
          </div>
          <div className="summary-chip-row">
            {active.filter((x) => expense.participantIds.includes(x.id)).map((x) => (
              <span key={x.id} className="summary-chip">
                {x.memberName}
              </span>
            ))}
            {!active.some((x) => expense.participantIds.includes(x.id)) && <span className="summary-chip muted">{tx('No participants selected')}</span>}
          </div>
          {showPayerModal && (
            <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowPayerModal(false)}>
              <section className="expense-modal shared-expense-summary-modal" role="dialog" aria-modal="true" aria-labelledby="payer-summary-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="expense-modal-header">
                  <div>
                    <h2 id="payer-summary-title">{tx('Who paid?')}</h2>
                    <p className="muted">{tx('Review payer amounts before saving the expense.')}</p>
                  </div>
                  <button type="button" className="modal-close" aria-label={tx('Close')} onClick={() => setShowPayerModal(false)}>×</button>
                </div>
                <div className="expense-modal-form">
                  {active.map((x) => (
                    <label key={x.id} className="summary-modal-field">
                      <span>{x.memberName}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={tx('Paid amount')}
                        value={expense.payers[x.id] || ''}
                        onChange={(e) =>
                          setExpense({
                            ...expense,
                            payers: { ...expense.payers, [x.id]: e.target.value }
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="expense-modal-actions">
                  <button type="button" onClick={() => setShowPayerModal(false)}>{tx('Close')}</button>
                </div>
              </section>
            </div>
          )}
          {showParticipantModal && (
            <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowParticipantModal(false)}>
              <section className="expense-modal shared-expense-summary-modal" role="dialog" aria-modal="true" aria-labelledby="participant-summary-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="expense-modal-header">
                  <div>
                    <h2 id="participant-summary-title">{tx('Who shares it?')}</h2>
                    <p className="muted">{tx('Review who is part of this expense split.')}</p>
                  </div>
                  <button type="button" className="modal-close" aria-label={tx('Close')} onClick={() => setShowParticipantModal(false)}>×</button>
                </div>
                <div className="expense-modal-form">
                  <div className="section-heading-row">
                    <strong>{tx('Participants')}</strong>
                    <button type="button" onClick={toggleAllParticipants}>
                      {allParticipantsSelected ? tx('Clear all') : tx('Select all')}
                    </button>
                  </div>
                  {active.map((x) => (
                    <label key={x.id} className="summary-modal-field summary-modal-checkbox">
                      <input
                        type="checkbox"
                        checked={expense.participantIds.includes(x.id)}
                        onChange={() => toggle(x.id)}
                      />
                      <span>{x.memberName}</span>
                      {expense.splitType === 'EXACT' &&
                        expense.participantIds.includes(x.id) && (
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder={tx('Share')}
                            value={expense.shares[x.id] || ''}
                            onChange={(e) =>
                              setExpense({
                                ...expense,
                                shares: { ...expense.shares, [x.id]: e.target.value }
                              })
                            }
                          />
                        )}
                    </label>
                  ))}
                </div>
                <div className="expense-modal-actions">
                  <button type="button" onClick={() => setShowParticipantModal(false)}>{tx('Close')}</button>
                </div>
              </section>
            </div>
          )}
          <button className="primary" disabled={submitting !== null}>
            {submitting === 'expense' ? tx('Adding...') : tx('Add expense')}
          </button>
        </form>
      </section>
      <section className="report-panel" data-shared-section="history">
        <div className="section-heading-row expense-history-heading">
          <h2>{tx('Expense history')}</h2>
          <button type="button" className="danger" disabled={!selectedExpenseIds.length || reversingExpenses} onClick={reverseSelectedExpenses}>
            {reversingExpenses ? tx('Reversing...') : `${tx('Reverse selected')}${selectedExpenseIds.length ? ` (${selectedExpenseIds.length})` : ''}`}
          </button>
        </div>
        <div className="shared-history-mobile-list">
          {visibleExpenses.map((x) => (
            <details className="personal-expense-row shared-history-row" key={x.id}>
              <summary>
                <span className="shared-history-select" onClick={(event) => event.stopPropagation()}>
                  {x.reversed ? <span className="reversed-badge">{tx('Reversed')}</span> : <input type="checkbox" aria-label={`${tx('Select')} ${x.description}`} checked={selectedExpenseIds.includes(x.id)} onChange={() => toggleExpenseSelection(x.id)} />}
                </span>
                <span className="personal-expense-row-main">
                  <span className="personal-expense-row-heading">
                    <strong>{x.category || tx('Uncategorized')}</strong>
                    <strong className="personal-expense-row-amount">{formatCurrency(x.totalAmount)}</strong>
                  </span>
                  <span className="personal-expense-row-description">{x.description || tx('No description')}</span>
                  <span className="personal-expense-row-meta">{formatDate(x.expenseDate)} - {tx('Paid by')} {x.paidBy || '-'}</span>
                </span>
                <span className="personal-expense-chevron" aria-hidden="true">⌄</span>
              </summary>
              <div className="personal-expense-details">
                <dl>
                  <div><dt>{tx('Date')}</dt><dd>{formatDate(x.expenseDate)}</dd></div>
                  <div><dt>{tx('Description')}</dt><dd>{x.description || '-'}</dd></div>
                  <div><dt>{tx('Category')}</dt><dd>{x.category || '-'}</dd></div>
                  <div><dt>{tx('Paid by')}</dt><dd>{x.paidBy || '-'}</dd></div>
                  <div><dt>{tx('Split')}</dt><dd>{x.splitType || '-'}</dd></div>
                  <div><dt>{tx('Amount')}</dt><dd>{formatCurrency(x.totalAmount)}</dd></div>
                  {x.items?.length > 0 && <div><dt>{tx('Items')}</dt><dd>{x.items.map((item) => `${item.itemName} × ${Number(item.quantity || 1)} (${formatCurrency(item.amount)})`).join(', ')}</dd></div>}
                </dl>
              </div>
            </details>
          ))}
          {!group.expenses?.length && <p className="empty-state">{tx('No expenses yet.')}</p>}
        </div>
        <div className="table-wrap shared-expense-history-wrap shared-history-desktop-table">
          <table className="shared-expense-history">
            <thead>
              <tr>
                <th className="selection-cell"><input type="checkbox" aria-label={tx('Select all expenses on this page')} checked={allVisibleSelected} disabled={!selectableVisibleIds.length} onChange={toggleVisibleExpenses} /></th>
                <SortableTh label="Date" sortKey="expenseDate" sort={expenseSort} onSort={toggleExpenseSort} />
                <SortableTh label="Description" sortKey="description" sort={expenseSort} onSort={toggleExpenseSort} />
                <SortableTh label="Category" sortKey="category" sort={expenseSort} onSort={toggleExpenseSort} />
                <SortableTh label="Paid by" sortKey="paidBy" sort={expenseSort} onSort={toggleExpenseSort} />
                <SortableTh label="Split" sortKey="splitType" sort={expenseSort} onSort={toggleExpenseSort} />
                <SortableTh label="Amount" sortKey="totalAmount" sort={expenseSort} onSort={toggleExpenseSort} />
              </tr>
            </thead>
            <tbody>
              {visibleExpenses.map((x) => (
                <tr key={x.id}>
                  <td data-label="Select" className="selection-cell">
                    {x.reversed ? <span className="reversed-badge">{tx('Reversed')}</span> : <input type="checkbox" aria-label={`${tx('Select')} ${x.description}`} checked={selectedExpenseIds.includes(x.id)} onChange={() => toggleExpenseSelection(x.id)} />}
                  </td>
                  <td data-label="Date">{formatDate(x.expenseDate)}</td>
                  <td data-label="Description">
                    <div className="shared-expense-description-cell">
                      <span>{x.description}</span>
                      {x.items?.length > 0 && (
                        <details className="shared-expense-items-details">
                          <summary>{tx('View item details')}</summary>
                          <ul>
                            {x.items.map((item, itemIndex) => (
                              <li key={`${x.id}-item-${itemIndex}`}>
                                <span>{item.itemName}</span>
                                <small>{item.unitPrice !== null && item.unitPrice !== undefined && item.unitPrice !== '' ? `${Number(item.quantity || 1)} x ${formatCurrency(item.unitPrice)}` : `${tx('Qty')} ${Number(item.quantity || 1)}`}</small>
                                <strong>{formatCurrency(item.amount)}</strong>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </td>
                  <td data-label="Category">{x.category || '-'}</td>
                  <td data-label="Paid by">{x.paidBy}</td>
                  <td data-label="Split">{x.splitType}</td>
                  <td data-label="Amount">{formatCurrency(x.totalAmount)}</td>
                </tr>
              ))}
              {!group.expenses?.length && (
                <tr><td colSpan="7" className="empty-state">{tx('No expenses yet.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {expensePageCount > 1 && (
          <nav className="table-pagination" aria-label="Expense history pages">
            <button type="button" aria-label={tx('First')} title={tx('First')} disabled={currentExpensePage === 1} onClick={() => setExpensePage(1)}>«</button>
            <button type="button" aria-label={tx('Previous')} title={tx('Previous')} disabled={currentExpensePage === 1} onClick={() => setExpensePage((page) => Math.max(1, page - 1))}>‹</button>
            <span>{tx('Page')} {currentExpensePage} {tx('of')} {expensePageCount}</span>
            <button type="button" aria-label={tx('Next')} title={tx('Next')} disabled={currentExpensePage === expensePageCount} onClick={() => setExpensePage((page) => Math.min(expensePageCount, page + 1))}>›</button>
            <button type="button" aria-label={tx('Last')} title={tx('Last')} disabled={currentExpensePage === expensePageCount} onClick={() => setExpensePage(expensePageCount)}>»</button>
          </nav>
        )}
      </section>
      <section className="report-panel" data-shared-section="activity">
        <h2>{tx('Activity')}</h2>
        {(group.activities || []).map((x) => (
          <p key={x.id}>
            <strong>{x.actorName}</strong> {x.message}{' '}
            <span className="muted">
              {new Date(x.createdAt).toLocaleString()}
            </span>
          </p>
        ))}
        {!group.activities?.length && (
          <p className="empty-state">{tx('No activity yet.')}</p>
        )}
      </section>
      <section className="report-panel shared-export-page" data-shared-section="export">
        <div className="shared-export-heading">
          <div>
            <h2>{tx('Export group')}</h2>
            <p>{tx('Download the complete shared expense report in your preferred format.')}</p>
          </div>
        </div>
        <div className="shared-export-options">
          <article>
            <span className="shared-export-icon" aria-hidden="true">XLSX</span>
            <div>
              <h3>{tx('Excel report')}</h3>
              <p>{tx('Best for filtering, calculations, and detailed expense analysis.')}</p>
            </div>
            <button className="primary" type="button" disabled={exporting} onClick={exportGroup}>
              {exporting ? tx('Exporting...') : tx('Export Excel')}
            </button>
          </article>
          <article>
            <span className="shared-export-icon pdf" aria-hidden="true">PDF</span>
            <div>
              <h3>{tx('PDF report')}</h3>
              <p>{tx('Best for sharing, printing, and keeping a readable record.')}</p>
            </div>
            <button className="primary" type="button" disabled={exportingPdf} onClick={exportGroupPdf}>
              {exportingPdf ? tx('Exporting...') : tx('Export PDF')}
            </button>
          </article>
        </div>
      </section>
      <section className="archive-danger-zone" data-shared-section="archived">
        <div>
          <h2>{tx('Archive group')}</h2>
          <p>
            {group.active
              ? 'Hide this group from active groups while preserving its members, expenses, settlements, and activity history.'
              : 'This group is archived. Its financial history is preserved.'}
          </p>
        </div>
        {group.active && (
          <button type="button" className="danger" onClick={archiveGroup}>
            {tx('Archive this group')}
          </button>
        )}
      </section>
    </Shell>
  )
}

const sharedExpenseSortAccessors = {
  expenseDate: (expense) => expense.expenseDate || '',
  description: (expense) => expense.description || '',
  category: (expense) => expense.category || '',
  paidBy: (expense) => expense.paidBy || '',
  splitType: (expense) => expense.splitType || '',
  totalAmount: (expense) => Number(expense.totalAmount || 0)
}

const sortRows = (rows, sort, accessors) => [...rows].sort((a, b) => {
  const getValue = accessors[sort.key] || (() => '')
  const first = getValue(a)
  const second = getValue(b)
  const direction = sort.direction === 'asc' ? 1 : -1
  const comparison = typeof first === 'number' || typeof second === 'number'
    ? Number(first || 0) - Number(second || 0)
    : String(first || '').localeCompare(String(second || ''), undefined, { numeric: true, sensitivity: 'base' })
  return comparison * direction || Number(b.id || 0) - Number(a.id || 0)
})

const SortableTh = ({ label, sortKey, sort, onSort, className }) => {
  const { tx } = useI18n()
  const sortState = sort.key === sortKey ? sort.direction : null
  const sortLabel = sortState === 'asc' ? tx('Ascending') : sortState === 'desc' ? tx('Descending') : tx('Sort')

  return (
    <th className={className}>
      <button type="button" className="sortable-header" aria-label={`${tx(label)}: ${sortLabel}`} title={sortLabel} onClick={() => onSort(sortKey)}>
        <span>{tx(label)}</span>
        <span className="sort-symbol" aria-hidden="true">{sortState === 'asc' ? '▲' : sortState === 'desc' ? '▼' : '↕'}</span>
      </button>
    </th>
  )
}

