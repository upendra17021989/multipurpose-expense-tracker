import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)
const currentYear = new Date().getFullYear()
const paymentModes = ['CASH', 'BANK', 'UPI', 'CARD', 'NEFT', 'CHEQUE']

export const SportsDashboard = () => {
  const { currentAccount } = useAuthStore()
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [expenses, setExpenses] = useState([])
  const [collections, setCollections] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [memberForm, setMemberForm] = useState({ memberName: '', mobile: '', role: '' })
  const [eventForm, setEventForm] = useState({ eventName: '', year: currentYear, startDate: today, endDate: today, budgetAmount: '' })
  const [expenseForm, setExpenseForm] = useState({ sportsEventId: '', expenseDate: today, category: '', amount: '', paymentMode: 'CASH', vendorName: '', utr: '', chequeNumber: '', description: '' })
  const [demandForm, setDemandForm] = useState({ expectedAmount: '', remarks: '' })
  const [paymentForm, setPaymentForm] = useState({ collectionId: '', paymentDate: today, amountPaid: '', paymentMode: 'CASH', collectedBy: '', utr: '', chequeNumber: '', remarks: '' })
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    Promise.all([sportsAPI.getMembers(), sportsAPI.getEvents(), sportsAPI.getExpenses()])
      .then(([memberResponse, eventResponse, expenseResponse]) => {
        setMembers(memberResponse.data || [])
        setEvents(eventResponse.data || [])
        setExpenses(expenseResponse.data || [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sports data'))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  useEffect(() => {
    if (!selectedEventId) {
      setCollections([])
      setSummary(null)
      return
    }
    Promise.all([sportsAPI.getCollections(selectedEventId), sportsAPI.getCollectionSummary(selectedEventId)])
      .then(([collectionResponse, summaryResponse]) => {
        setCollections(collectionResponse.data || [])
        setSummary(summaryResponse.data || null)
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sports collections'))
  }, [selectedEventId])

  const totals = useMemo(() => ({
    members: members.length,
    events: events.length,
    expense: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    collected: events.reduce((sum, event) => sum + Number(event.collectedAmount || 0), 0)
  }), [members, events, expenses])

  const submitMember = async (event) => {
    event.preventDefault()
    try {
      await sportsAPI.createMember({ ...memberForm, memberName: memberForm.memberName.trim() })
      setMemberForm({ memberName: '', mobile: '', role: '' })
      toast.success('Member added')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add member')
    }
  }

  const submitEvent = async (event) => {
    event.preventDefault()
    try {
      await sportsAPI.createEvent({ ...eventForm, year: Number(eventForm.year), budgetAmount: eventForm.budgetAmount === '' ? null : Number(eventForm.budgetAmount) })
      setEventForm({ eventName: '', year: currentYear, startDate: today, endDate: today, budgetAmount: '' })
      toast.success('Event added')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add event')
    }
  }

  const submitExpense = async (event) => {
    event.preventDefault()
    try {
      await sportsAPI.createExpense({ ...expenseForm, sportsEventId: expenseForm.sportsEventId ? Number(expenseForm.sportsEventId) : null, amount: Number(expenseForm.amount), utr: expenseForm.utr || null, chequeNumber: expenseForm.chequeNumber || null })
      setExpenseForm({ sportsEventId: '', expenseDate: today, category: '', amount: '', paymentMode: 'CASH', vendorName: '', utr: '', chequeNumber: '', description: '' })
      toast.success('Sports expense added')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add expense')
    }
  }

  const generateDemand = async (event) => {
    event.preventDefault()
    if (!selectedEventId) return toast.error('Select an event first')
    try {
      const response = await sportsAPI.generateDemand({ sportsEventId: Number(selectedEventId), expectedAmount: Number(demandForm.expectedAmount), remarks: demandForm.remarks || null })
      setCollections(response.data || [])
      setDemandForm({ expectedAmount: '', remarks: '' })
      toast.success('Demand generated')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to generate demand')
    }
  }

  const addPayment = async (event) => {
    event.preventDefault()
    if (!paymentForm.collectionId) return toast.error('Select member demand first')
    try {
      await sportsAPI.addPayment(paymentForm.collectionId, { ...paymentForm, amountPaid: Number(paymentForm.amountPaid), utr: paymentForm.utr || null, chequeNumber: paymentForm.chequeNumber || null })
      setPaymentForm({ collectionId: '', paymentDate: today, amountPaid: '', paymentMode: 'CASH', collectedBy: '', utr: '', chequeNumber: '', remarks: '' })
      toast.success('Payment added')
      const [collectionResponse, summaryResponse] = await Promise.all([sportsAPI.getCollections(selectedEventId), sportsAPI.getCollectionSummary(selectedEventId)])
      setCollections(collectionResponse.data || [])
      setSummary(summaryResponse.data || null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add payment')
    }
  }

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Module" eyebrow="Sports"><p className="muted">Sports module is available for sports accounts.</p></Shell>
  }

  return (
    <Shell title="Sports Management" eyebrow="Sports module">
      <SummaryGrid items={[[ 'Members', totals.members ], [ 'Events', totals.events ], [ 'Expenses', formatCurrency(totals.expense) ], [ 'Collected', formatCurrency(totals.collected) ]]} />

      <form className="inline-form" onSubmit={submitMember}>
        <input placeholder="Member name" value={memberForm.memberName} onChange={(event) => setMemberForm({ ...memberForm, memberName: event.target.value })} required />
        <input placeholder="Mobile" value={memberForm.mobile} onChange={(event) => setMemberForm({ ...memberForm, mobile: event.target.value })} />
        <input placeholder="Role" value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })} />
        <button className="primary" type="submit">Add Member</button>
      </form>

      <form className="inline-form" onSubmit={submitEvent}>
        <input placeholder="Event name" value={eventForm.eventName} onChange={(event) => setEventForm({ ...eventForm, eventName: event.target.value })} required />
        <input type="number" min="2020" max="2100" value={eventForm.year} onChange={(event) => setEventForm({ ...eventForm, year: event.target.value })} required />
        <input type="date" value={eventForm.startDate} onChange={(event) => setEventForm({ ...eventForm, startDate: event.target.value })} required />
        <input type="date" value={eventForm.endDate} onChange={(event) => setEventForm({ ...eventForm, endDate: event.target.value })} required />
        <input type="number" min="0" step="0.01" placeholder="Budget" value={eventForm.budgetAmount} onChange={(event) => setEventForm({ ...eventForm, budgetAmount: event.target.value })} />
        <button className="primary" type="submit">Add Event</button>
      </form>

      <form className="inline-form" onSubmit={submitExpense}>
        <select value={expenseForm.sportsEventId} onChange={(event) => setExpenseForm({ ...expenseForm, sportsEventId: event.target.value })}>
          <option value="">No event</option>
          {events.map((sportsEvent) => <option key={sportsEvent.id} value={sportsEvent.id}>{sportsEvent.eventName}</option>)}
        </select>
        <input type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm({ ...expenseForm, expenseDate: event.target.value })} required />
        <input placeholder="Category" value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} required />
        <input type="number" min="0.01" step="0.01" placeholder="Amount" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} required />
        <select value={expenseForm.paymentMode} onChange={(event) => setExpenseForm({ ...expenseForm, paymentMode: event.target.value })}>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
        <button className="primary" type="submit">Add Expense</button>
      </form>

      <section className="toolbar-panel flat-toolbar">
        <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
          <option value="">Select event for collections</option>
          {events.map((sportsEvent) => <option key={sportsEvent.id} value={sportsEvent.id}>{sportsEvent.eventName}</option>)}
        </select>
        {summary && <strong>{formatCurrency(summary.totalCollected)} collected / {formatCurrency(summary.totalExpected)} expected</strong>}
      </section>

      <form className="inline-form" onSubmit={generateDemand}>
        <input type="number" min="0.01" step="0.01" placeholder="Amount per member" value={demandForm.expectedAmount} onChange={(event) => setDemandForm({ ...demandForm, expectedAmount: event.target.value })} required />
        <input placeholder="Remarks" value={demandForm.remarks} onChange={(event) => setDemandForm({ ...demandForm, remarks: event.target.value })} />
        <button className="primary" type="submit">Generate Demand</button>
      </form>

      <form className="inline-form" onSubmit={addPayment}>
        <select value={paymentForm.collectionId} onChange={(event) => setPaymentForm({ ...paymentForm, collectionId: event.target.value })} required>
          <option value="">Select member demand</option>
          {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.memberName} - {formatCurrency(collection.pendingAmount)} pending</option>)}
        </select>
        <input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} required />
        <input type="number" min="0.01" step="0.01" placeholder="Amount paid" value={paymentForm.amountPaid} onChange={(event) => setPaymentForm({ ...paymentForm, amountPaid: event.target.value })} required />
        <select value={paymentForm.paymentMode} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMode: event.target.value })}>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
        <input placeholder="Collected by" value={paymentForm.collectedBy} onChange={(event) => setPaymentForm({ ...paymentForm, collectedBy: event.target.value })} required />
        <button className="primary" type="submit">Add Payment</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Member</th><th className="numeric">Expected</th><th className="numeric">Collected</th><th className="numeric">Pending</th><th>Status</th></tr></thead>
          <tbody>
            {collections.map((collection) => <tr key={collection.id}><td>{collection.memberName}</td><td className="numeric">{formatCurrency(collection.expectedAmount)}</td><td className="numeric">{formatCurrency(collection.collectedAmount)}</td><td className="numeric">{formatCurrency(collection.pendingAmount)}</td><td>{collection.paymentStatus}</td></tr>)}
            {selectedEventId && collections.length === 0 && <tr><td colSpan="5" className="empty-state">Generate demand to create member collections.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Event</th><th>Category</th><th className="numeric">Amount</th><th>Payment</th></tr></thead>
          <tbody>
            {expenses.map((expense) => <tr key={expense.id}><td>{formatDate(expense.expenseDate)}</td><td>{expense.eventName || '-'}</td><td>{expense.category}</td><td className="numeric">{formatCurrency(expense.amount)}</td><td>{expense.paymentMode}</td></tr>)}
            {!loading && expenses.length === 0 && <tr><td colSpan="5" className="empty-state">No sports expenses found.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  )
}