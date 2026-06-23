import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalCollectionAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const FestivalCollectionReceipt = () => {
  const { festivalEventId, collectionId } = useParams()
  const { currentAccount } = useAuthStore()
  const [collection, setCollection] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      festivalCollectionAPI.getCollection(collectionId),
      festivalCollectionAPI.getReceipts(collectionId)
    ])
      .then(([collectionResponse, receiptResponse]) => {
        setCollection(collectionResponse.data)
        setReceipts(receiptResponse.data || [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load receipts'))
      .finally(() => setLoading(false))
  }, [collectionId])

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Collection Receipts" eyebrow="Society module">
        <p className="muted">Festival collections are available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Collection Receipts"
      eyebrow="Society module"
      actions={<Link className="button-link" to={`/society/festival-collections/${festivalEventId}/${collectionId}/payment`}>Add Payment</Link>}
    >
      {collection && (
        <SummaryGrid items={[
          ['Flat', `${collection.blockName}-${collection.flatNumber}`],
          ['Owner', collection.ownerName],
          ['Collected', formatCurrency(collection.collectedAmount)],
          ['Status', collection.paymentStatus]
        ]} />
      )}

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
              </tr>
            ))}
            {!loading && receipts.length === 0 && <tr><td colSpan="7" className="empty-state">No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading receipts...</p>}
    </Shell>
  )
}
