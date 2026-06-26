import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const SportsCollectionReceipts = () => {
  const { collectionId } = useParams()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')
  const { currentAccount } = useAuthStore()
  const isSportsAdmin = ['OWNER', 'ADMIN', 'TREASURER'].includes(currentAccount?.role)
  const [collection, setCollection] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadReceipts = () => {
    setLoading(true)
    const collectionRequest = eventId
      ? sportsAPI.getCollections(eventId).then((response) => (response.data || []).find((item) => String(item.id) === String(collectionId)) || null)
      : Promise.resolve(null)

    Promise.all([
      collectionRequest,
      sportsAPI.getReceipts(collectionId)
    ])
      .then(([collectionData, receiptResponse]) => {
        setCollection(collectionData)
        setReceipts(receiptResponse.data || [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load receipts'))
      .finally(() => setLoading(false))
  }

  useEffect(loadReceipts, [collectionId, eventId])

  const voidReceipt = async (receipt) => {
    const voidReason = window.prompt(`Reason for voiding ${receipt.receiptNumber}`)
    if (!voidReason || !voidReason.trim()) return
    try {
      await sportsAPI.voidReceipt(receipt.id, { voidReason: voidReason.trim() })
      toast.success('Receipt voided')
      loadReceipts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to void receipt')
    }
  }

  const activeReceipts = useMemo(() => receipts.filter((receipt) => receipt.status !== 'VOIDED'), [receipts])
  const receiptTotal = useMemo(() => activeReceipts.reduce((sum, receipt) => sum + Number(receipt.amountPaid || 0), 0), [activeReceipts])

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Receipts" eyebrow="Sports"><p className="muted">Sports receipts are available for sports accounts.</p></Shell>
  }

  return (
    <Shell
      title="Sports Collection Receipts"
      eyebrow="Sports module"
      actions={(
        <>
          <Link className="button-link" to={eventId ? `/sports/collections?eventId=${eventId}` : '/sports/collections'}>Collections</Link>
          <button onClick={() => window.print()}>Print</button>
        </>
      )}
    >
      {collection && (
        <SummaryGrid items={[
          ['Member', collection.memberName],
          ['Event', collection.eventName],
          ['Expected', formatCurrency(collection.expectedAmount)],
          ['Collected', formatCurrency(collection.collectedAmount)],
          ['Pending', formatCurrency(collection.pendingAmount)],
          ['Status', collection.paymentStatus]
        ]} />
      )}
      {!collection && eventId && !loading && <p className="muted">Collection details were not found for this event.</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Date</th>
              <th className="numeric">Amount</th>
              <th>Mode</th>
              <th>Reference</th>
              <th>Collected By</th>
              <th>Remarks</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td>{receipt.receiptNumber}</td>
                <td>{formatDate(receipt.paymentDate)}</td>
                <td className="numeric">{formatCurrency(receipt.amountPaid)}</td>
                <td>{receipt.paymentMode}</td>
                <td>{receipt.utr || receipt.chequeNumber || receipt.transactionId || '-'}</td>
                <td>{receipt.collectedBy}</td>
                <td>{receipt.remarks || '-'}</td>
                <td>{receipt.status || 'ACTIVE'}{receipt.voidReason ? ` - ${receipt.voidReason}` : ''}</td>
                <td className="table-actions">{isSportsAdmin && receipt.status !== 'VOIDED' && <button className="danger" onClick={() => voidReceipt(receipt)}>Void</button>}</td>
              </tr>
            ))}
            {!loading && receipts.length === 0 && <tr><td colSpan="9" className="empty-state">No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {!loading && receipts.length > 0 && (
        <section className="receipt-total">
          <span>Total active receipts</span>
          <strong>{formatCurrency(receiptTotal)}</strong>
        </section>
      )}
      {loading && <p className="muted">Loading receipts...</p>}
    </Shell>
  )
}
