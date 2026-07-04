import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sharedExpenseAPI } from '../../api/endpoints'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'
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
export const SharedExpenseGroup = () => {
  const [activeSection, setActiveSection] = useState('balances')
  const { groupId } = useParams()
  const [group, setGroup] = useState(null)
  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [expensePage, setExpensePage] = useState(1)
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
    shares: {}
  })
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
      { ...expense, totalAmount: Number(expense.totalAmount), payers, shares },
      'Expense added'
    ).then((saved) =>
      saved && setExpense({
        description: '',
        category: '',
        expenseDate: today,
        totalAmount: '',
        splitType: 'EQUAL',
        participantIds: [],
        payers: {},
        shares: {}
      })
    )
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
    const heading = (label) =>
      [...page.querySelectorAll('h2')].find(
        (node) => node.textContent.trim() === label
      )
    const sections = {
      balances: page.querySelector('.summary-grid'),
      members: heading('Members')?.closest('.two-column-grid'),
      expense: heading('Add shared expense')?.closest('section'),
      history: heading('Expense history')?.closest('section'),
      activity: heading('Activity')?.closest('section'),
      archived: heading('Archive group')?.closest('section')
    }
    const invite = heading('Invite registered user')?.closest('section')
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
  const expensePageCount = Math.max(
    1,
    Math.ceil((group.expenses?.length || 0) / expensePageSize)
  )
  const currentExpensePage = Math.min(expensePage, expensePageCount)
  const visibleExpenses = (group.expenses || []).slice(
    (currentExpensePage - 1) * expensePageSize,
    currentExpensePage * expensePageSize
  )
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
  return (
    <Shell
      title={group.name}
      eyebrow="Shared expenses"
      actions={
        <>
          <button type="button" className="button-link" disabled={exporting} onClick={exportGroup}>
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button type="button" className="button-link" disabled={exportingPdf} onClick={exportGroupPdf}>
            {exportingPdf ? 'Exporting...' : 'Export PDF'}
          </button>
          <Link className="button-link" to="/personal/shared-expenses">
            All groups
          </Link>
        </>
      }
    >
      <nav className="shared-expense-submenu" aria-label="Group navigation">
        <button
          className={activeSection === 'balances' ? 'active' : ''}
          type="button"
          onClick={() => setActiveSection('balances')}
        >
          Balances
        </button>
        <button
          className={activeSection === 'expense' ? 'active' : ''}
          type="button"
          onClick={() => setActiveSection('expense')}
        >
          Add expense
        </button>
        <button
          className={activeSection === 'members' ? 'active' : ''}
          type="button"
          onClick={() => setActiveSection('members')}
        >
          Members
        </button>
        <button
          className={activeSection === 'history' ? 'active' : ''}
          type="button"
          onClick={() => setActiveSection('history')}
        >
          History
        </button>
        <button
          className={activeSection === 'activity' ? 'active' : ''}
          type="button"
          onClick={() => setActiveSection('activity')}
        >
          Activity
        </button>
        <button
          className={activeSection === 'archived' ? 'active' : ''}
          type="button"
          onClick={() => setActiveSection('archived')}
        >
          Archive
        </button>
      </nav>
      <SummaryGrid
        items={group.balances.map((x) => [
          x.memberName,
          x.balance > 0
            ? `Gets ${formatCurrency(x.balance)}`
            : x.balance < 0
              ? `Owes ${formatCurrency(-x.balance)}`
              : 'Settled'
        ])}
      />
      <section className="form-panel">
        <h2>Invite registered user</h2>
        <form className="inline-form" onSubmit={inviteUser}>
          <input
            type="email"
            placeholder="Email"
            value={invite.email}
            onChange={(e) => setInvite({ email: e.target.value, mobile: '' })}
          />
          <input
            placeholder="Or mobile"
            value={invite.mobile}
            onChange={(e) => setInvite({ mobile: e.target.value, email: '' })}
          />
          <button className="primary" disabled={submitting !== null}>
            {submitting === 'invite' ? 'Sending...' : 'Send invitation'}
          </button>
        </form>
      </section>
      <div className="two-column-grid">
        <section className="form-panel">
          <h2>Members</h2>
          <form onSubmit={addMember}>
            <input
              placeholder="Name"
              required
              value={member.memberName}
              onChange={(e) =>
                setMember({ ...member, memberName: e.target.value })
              }
            />
            <input
              placeholder="Email (optional)"
              type="email"
              value={member.email}
              onChange={(e) => setMember({ ...member, email: e.target.value })}
            />
            <input
              placeholder="Mobile (optional)"
              value={member.mobile}
              onChange={(e) => setMember({ ...member, mobile: e.target.value })}
            />
            <button className="primary" disabled={submitting !== null}>
              {submitting === 'member' ? 'Adding...' : 'Add member'}
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
                    Deactivate
                  </button>
                )}
              </p>
            ))}
          </div>
        </section>
        <section className="form-panel">
          <h2>Settle up</h2>
          <form onSubmit={addSettlement}>
            <select
              required
              value={settle.paidByMemberId}
              onChange={(e) =>
                setSettle({ ...settle, paidByMemberId: e.target.value })
              }
            >
              <option value="">Paid by</option>
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
              <option value="">Paid to</option>
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
              placeholder="Amount"
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
              {submitting === 'settlement' ? 'Recording...' : 'Record settlement'}
            </button>
          </form>
        </section>
      </div>
      <section className="form-panel">
        <h2>Add shared expense</h2>
        <form onSubmit={addExpense}>
          <div className="form-grid">
            <input
              required
              placeholder="Description"
              value={expense.description}
              onChange={(e) =>
                setExpense({ ...expense, description: e.target.value })
              }
            />
            <select
              required
              aria-label="Category"
              value={expense.category}
              onChange={(e) =>
                setExpense({ ...expense, category: e.target.value })
              }
            >
              <option value="">Select category</option>
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
              placeholder="Total amount"
              value={expense.totalAmount}
              onChange={(e) =>
                setExpense({ ...expense, totalAmount: e.target.value })
              }
            />
            <select
              value={expense.splitType}
              onChange={(e) =>
                setExpense({ ...expense, splitType: e.target.value })
              }
            >
              <option value="EQUAL">Split equally</option>
              <option value="EXACT">Exact amounts</option>
            </select>
          </div>
          <h3>Who paid?</h3>
          <div className="participant-grid">
            {active.map((x) => (
              <label key={x.id}>
                {x.memberName}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Paid amount"
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
          <div className="section-heading-row">
            <h3>Who shares it?</h3>
            <button type="button" onClick={toggleAllParticipants}>
              {allParticipantsSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="participant-grid">
            {active.map((x) => (
              <label key={x.id}>
                <input
                  type="checkbox"
                  checked={expense.participantIds.includes(x.id)}
                  onChange={() => toggle(x.id)}
                />
                {x.memberName}
                {expense.splitType === 'EXACT' &&
                  expense.participantIds.includes(x.id) && (
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Share"
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
          <button className="primary" disabled={submitting !== null}>
            {submitting === 'expense' ? 'Adding...' : 'Add expense'}
          </button>
        </form>
      </section>
      <section className="report-panel">
        <div className="section-heading-row expense-history-heading">
          <h2>Expense history</h2>
          <button type="button" className="danger" disabled={!selectedExpenseIds.length || reversingExpenses} onClick={reverseSelectedExpenses}>
            {reversingExpenses ? 'Reversing...' : `Reverse selected${selectedExpenseIds.length ? ` (${selectedExpenseIds.length})` : ''}`}
          </button>
        </div>
        <div className="table-wrap shared-expense-history-wrap">
          <table className="shared-expense-history">
            <thead>
              <tr>
                <th className="selection-cell"><input type="checkbox" aria-label="Select all expenses on this page" checked={allVisibleSelected} disabled={!selectableVisibleIds.length} onChange={toggleVisibleExpenses} /></th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Paid by</th>
                <th>Split</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {visibleExpenses.map((x) => (
                <tr key={x.id}>
                  <td data-label="Select" className="selection-cell">
                    {x.reversed ? <span className="reversed-badge">Reversed</span> : <input type="checkbox" aria-label={`Select ${x.description}`} checked={selectedExpenseIds.includes(x.id)} onChange={() => toggleExpenseSelection(x.id)} />}
                  </td>
                  <td data-label="Date">{formatDate(x.expenseDate)}</td>
                  <td data-label="Description">{x.description}</td>
                  <td data-label="Category">{x.category || '-'}</td>
                  <td data-label="Paid by">{x.paidBy}</td>
                  <td data-label="Split">{x.splitType}</td>
                  <td data-label="Amount">{formatCurrency(x.totalAmount)}</td>
                </tr>
              ))}
              {!group.expenses?.length && (
                <tr><td colSpan="7" className="empty-state">No expenses yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {expensePageCount > 1 && (
          <nav className="table-pagination" aria-label="Expense history pages">
            <button type="button" disabled={currentExpensePage === 1} onClick={() => setExpensePage((page) => Math.max(1, page - 1))}>Previous</button>
            <span>Page {currentExpensePage} of {expensePageCount}</span>
            <button type="button" disabled={currentExpensePage === expensePageCount} onClick={() => setExpensePage((page) => Math.min(expensePageCount, page + 1))}>Next</button>
          </nav>
        )}
      </section>
      <section className="report-panel">
        <h2>Activity</h2>
        {(group.activities || []).map((x) => (
          <p key={x.id}>
            <strong>{x.actorName}</strong> {x.message}{' '}
            <span className="muted">
              {new Date(x.createdAt).toLocaleString()}
            </span>
          </p>
        ))}
        {!group.activities?.length && (
          <p className="empty-state">No activity yet.</p>
        )}
      </section>
      <section className="archive-danger-zone">
        <div>
          <h2>Archive group</h2>
          <p>
            {group.active
              ? 'Hide this group from active groups while preserving its members, expenses, settlements, and activity history.'
              : 'This group is archived. Its financial history is preserved.'}
          </p>
        </div>
        {group.active && (
          <button type="button" className="danger" onClick={archiveGroup}>
            Archive this group
          </button>
        )}
      </section>
    </Shell>
  )
}
