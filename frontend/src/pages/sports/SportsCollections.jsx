import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)
const paymentModes = ['CASH', 'BANK', 'UPI', 'CARD', 'NEFT', 'CHEQUE']

export const SportsCollections = () => {
  const { currentAccount } = useAuthStore()
  const isSportsAdmin = ['OWNER', 'ADMIN', 'TREASURER'].includes(currentAccount?.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [collections, setCollections] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('eventId') || '')
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [demandForm, setDemandForm] = useState({ expectedAmount: '', remarks: '', memberMode: 'ALL', sportsMemberIds: [] })
  const [paymentForm, setPaymentForm] = useState({ collectionId: '', paymentDate: today, amountPaid: '', paymentMode: 'CASH', collectedBy: '', utr: '', chequeNumber: '', remarks: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([sportsAPI.getEvents(), sportsAPI.getMembers()])
      .then(([eventResponse, memberResponse]) => {
        setEvents(eventResponse.data || [])
        setMembers(memberResponse.data || [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sports setup'))
  }, [])

  const loadCollections = () => {
    if (!selectedEventId) {
      setCollections([])
      setSummary(null)
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([sportsAPI.getCollections(selectedEventId), sportsAPI.getCollectionSummary(selectedEventId)])
      .then(([collectionResponse, summaryResponse]) => {
        setCollections(collectionResponse.data || [])
        setSummary(summaryResponse.data || null)
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load collections'))
      .finally(() => setLoading(false))
  }

  useEffect(loadCollections, [selectedEventId])

  const chooseEvent = (eventId) => {
    setSelectedEventId(eventId)
    if (eventId) setSearchParams({ eventId })
    else setSearchParams({})
  }

  const visibleCollections = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return collections
      .filter((collection) => !filters.status || collection.paymentStatus === filters.status)
      .filter((collection) => !query || [collection.memberName, collection.mobile, collection.paymentStatus].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)))
  }, [collections, filters])

  const paymentCollections = useMemo(() => {
    const statusOrder = { PENDING: 0, PARTIAL: 1, PAID: 2, EXCESS: 3, REFUNDED: 4 }
    return [...collections].sort((a, b) => {
      const statusDiff = (statusOrder[a.paymentStatus] ?? 99) - (statusOrder[b.paymentStatus] ?? 99)
      if (statusDiff !== 0) return statusDiff
      return String(a.memberName || '').localeCompare(String(b.memberName || ''))
    })
  }, [collections])

  const generateDemand = async (event) => {
    event.preventDefault()
    if (!selectedEventId) return toast.error('Select an event first')
    try {
      const sportsMemberIds = demandForm.memberMode === 'SELECTED' ? demandForm.sportsMemberIds.map(Number) : []
      if (demandForm.memberMode === 'SELECTED' && sportsMemberIds.length === 0) return toast.error('Select at least one member')
      await sportsAPI.generateDemand({ sportsEventId: Number(selectedEventId), expectedAmount: Number(demandForm.expectedAmount), sportsMemberIds, remarks: demandForm.remarks.trim() || null })
      setDemandForm({ expectedAmount: '', remarks: '', memberMode: 'ALL', sportsMemberIds: [] })
      toast.success('Demand generated')
      loadCollections()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to generate demand')
    }
  }


  const toggleDemandMember = (memberId) => {
    setDemandForm((current) => {
      const id = String(memberId)
      const selected = current.sportsMemberIds.includes(id)
      return {
        ...current,
        sportsMemberIds: selected
          ? current.sportsMemberIds.filter((value) => value !== id)
          : [...current.sportsMemberIds, id]
      }
    })
  }
  const addPayment = async (event) => {
    event.preventDefault()
    if (!paymentForm.collectionId) return toast.error('Select a member demand')
    try {
      await sportsAPI.addPayment(paymentForm.collectionId, { ...paymentForm, amountPaid: Number(paymentForm.amountPaid), utr: paymentForm.utr || null, chequeNumber: paymentForm.chequeNumber || null, remarks: paymentForm.remarks || null })
      setPaymentForm({ collectionId: '', paymentDate: today, amountPaid: '', paymentMode: 'CASH', collectedBy: '', utr: '', chequeNumber: '', remarks: '' })
      toast.success('Payment added')
      loadCollections()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add payment')
    }
  }

  const removeDemand = async (collection) => {
    if (Number(collection.collectedAmount || 0) > 0) return toast.error('Cannot remove demand after payment is collected')
    if (!window.confirm(`Remove demand for ${collection.memberName}?`)) return
    try {
      await sportsAPI.deleteDemand(collection.id)
      toast.success('Demand removed')
      loadCollections()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to remove demand')
    }
  }

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Collections" eyebrow="Sports"><p className="muted">Sports collections are available for sports accounts.</p></Shell>
  }

  return (
    <Shell title="Sports Collections" eyebrow="Sports module">
      <SummaryGrid items={[
        ['Expected', formatCurrency(summary?.totalExpected)],
        ['Collected', formatCurrency(summary?.totalCollected)],
        ['Pending', formatCurrency(summary?.totalPending)],
        ['Paid Members', `${summary?.paidMembers || 0}/${summary?.totalMembers || 0}`],
        ['Partial', summary?.partialMembers || 0],
        ['Excess', summary?.excessMembers || 0]
      ]} />
      <section className="toolbar-panel flat-toolbar">
        <select value={selectedEventId} onChange={(event) => chooseEvent(event.target.value)}>
          <option value="">Select event</option>
          {events.map((sportsEvent) => <option key={sportsEvent.id} value={sportsEvent.id}>{sportsEvent.eventName} ({sportsEvent.year})</option>)}
        </select>
        <input placeholder="Search member, mobile, status" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="EXCESS">Excess</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <strong>{visibleCollections.length} shown</strong>
      </section>
      {isSportsAdmin && <form className="inline-form" onSubmit={generateDemand}>
        <input type="number" min="0.01" step="0.01" placeholder="Amount per member" value={demandForm.expectedAmount} onChange={(event) => setDemandForm({ ...demandForm, expectedAmount: event.target.value })} required />
        <select value={demandForm.memberMode} onChange={(event) => setDemandForm({ ...demandForm, memberMode: event.target.value, sportsMemberIds: [] })}>
          <option value="ALL">All active members</option>
          <option value="SELECTED">Selected members only</option>
        </select>
        <input placeholder="Remarks" value={demandForm.remarks} onChange={(event) => setDemandForm({ ...demandForm, remarks: event.target.value })} />
        <button className="primary" type="submit" disabled={!selectedEventId}>Generate Demand</button>
      </form>}
      {isSportsAdmin && demandForm.memberMode === 'SELECTED' && (
        <section className="toolbar-panel flat-toolbar">
          {members.map((member) => (
            <label key={member.id}>
              <input type="checkbox" checked={demandForm.sportsMemberIds.includes(String(member.id))} onChange={() => toggleDemandMember(member.id)} />
              {member.memberName}
            </label>
          ))}
          <strong>{demandForm.sportsMemberIds.length} selected</strong>
        </section>
      )}
      {isSportsAdmin && <form className="inline-form" onSubmit={addPayment}>
        <select value={paymentForm.collectionId} onChange={(event) => setPaymentForm({ ...paymentForm, collectionId: event.target.value })} required>
          <option value="">Select member demand</option>
          {paymentCollections.map((collection) => <option key={collection.id} value={collection.id}>{collection.memberName} - {formatCurrency(collection.pendingAmount)} pending ({collection.paymentStatus})</option>)}
        </select>
        <input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} required />
        <input type="number" min="0.01" step="0.01" placeholder="Amount paid" value={paymentForm.amountPaid} onChange={(event) => setPaymentForm({ ...paymentForm, amountPaid: event.target.value })} required />
        <select value={paymentForm.paymentMode} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMode: event.target.value })}>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
        <input placeholder="UTR" value={paymentForm.utr} onChange={(event) => setPaymentForm({ ...paymentForm, utr: event.target.value })} />
        <input placeholder="Collected by" value={paymentForm.collectedBy} onChange={(event) => setPaymentForm({ ...paymentForm, collectedBy: event.target.value })} required />
        <button className="primary" type="submit" disabled={!selectedEventId}>Add Payment</button>
      </form>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Member</th><th>Mobile</th><th className="numeric">Expected</th><th className="numeric">Collected</th><th className="numeric">Pending</th><th className="numeric">Excess</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {visibleCollections.map((collection) => {
              const canRemoveDemand = Number(collection.collectedAmount || 0) === 0
              return (
                <tr key={collection.id}>
                  <td>{collection.memberName}</td>
                  <td>{collection.mobile || '-'}</td>
                  <td className="numeric">{formatCurrency(collection.expectedAmount)}</td>
                  <td className="numeric">{formatCurrency(collection.collectedAmount)}</td>
                  <td className="numeric">{formatCurrency(collection.pendingAmount)}</td>
                  <td className="numeric">{formatCurrency(collection.excessAmount)}</td>
                  <td><span className={`status-pill ${String(collection.paymentStatus).toLowerCase()}`}>{collection.paymentStatus}</span></td>
                  <td className="table-actions">
                    <Link className="button-link secondary" to={`/sports/collections/${collection.id}/receipts?eventId=${selectedEventId}`}>Receipts</Link>
                    {isSportsAdmin && canRemoveDemand && <button type="button" className="danger" onClick={() => removeDemand(collection)}>Remove Demand</button>}
                  </td>
                </tr>
              )
            })}
            {!loading && selectedEventId && visibleCollections.length === 0 && <tr><td colSpan="8" className="empty-state">Generate demand to create member-wise collection rows.</td></tr>}
            {!selectedEventId && <tr><td colSpan="8" className="empty-state">Select an event to manage collections.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading collections...</p>}
    </Shell>
  )
}

