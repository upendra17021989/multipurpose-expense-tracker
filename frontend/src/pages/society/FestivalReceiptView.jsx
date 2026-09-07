import { Link, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalCollectionAPI, festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell } from '../DashboardRouter'
import './FestivalReceiptView.css'

export const FestivalCollectionReceipt = ({ collectionId: selectedId, initialReceiptId, onClose }) => {
  const params = useParams()
  const collectionId = selectedId || params.collectionId
  const { currentAccount } = useAuthStore()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(initialReceiptId || '')
  const [downloading, setDownloading] = useState(false)
  const [retry, setRetry] = useState(0)
  const dialog = useRef(null)
  const modal = Boolean(onClose)
  useEffect(() => {
    if (!modal) return
    const element = dialog.current
    const focus = document.activeElement
    const overflow = document.body.style.overflow
    element.showModal(); document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; focus?.focus() }
  }, [modal])
  useEffect(() => {
    let active = true
    setError(''); setData(null)
    Promise.all([festivalCollectionAPI.getCollection(collectionId), festivalCollectionAPI.getReceipts(collectionId)])
      .then(async ([collection, receipts]) => {
        const festival = await festivalEventAPI.getFestival(collection.data.festivalEventId)
        if (!active) return
        const rows = [...(receipts.data || [])].sort((a, b) => b.id - a.id)
        setData({ collection: collection.data, receipts: rows, festival: festival.data })
        setSelected((value) => rows.some((item) => String(item.id) === String(value)) ? value : rows[0]?.id || '')
      })
      .catch(() => { if (active) setError('Unable to load receipts. Please try again.') })
    return () => { active = false }
  }, [collectionId, retry])
  const receipt = data?.receipts.find((item) => String(item.id) === String(selected))
  const download = async () => {
    if (!receipt || downloading) return
    setDownloading(true)
    try {
      const response = await festivalCollectionAPI.downloadReceipt(collectionId, receipt.id)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${data.festival.festivalName}-${receipt.receiptNumber || receipt.id}`.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf'
      document.body.appendChild(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch { toast.error('Unable to download receipt PDF. Please try again.') }
    finally { setDownloading(false) }
  }
  const content = <>
    <header className="festival-receipt-heading"><div><h2 id="festival-receipt-title">Festival receipts</h2><p>Select a payment to view or download its receipt.</p></div>{onClose && <button aria-label="Close receipts" onClick={onClose}>×</button>}</header>
    {error ? <p role="alert">{error} <button onClick={() => setRetry((value) => value + 1)}>Retry</button></p> : !data ? <p role="status">Loading receipts…</p> : !receipt ? <p className="empty-state">No payments recorded yet. A receipt will be available after a payment is saved.</p> : <>
      <div className="festival-receipt-toolbar"><label>Payment receipt<select value={selected} onChange={(event) => setSelected(event.target.value)}>{data.receipts.map((item) => <option key={item.id} value={item.id}>{item.receiptNumber} · {formatDate(item.paymentDate)} · {formatCurrency(item.amountPaid)}</option>)}</select></label><button className="primary" disabled={downloading} onClick={download}>{downloading ? 'Downloading…' : 'Download PDF'}</button></div>
      <article className="festival-receipt-paper" aria-label="Payment receipt">
        <header><h2>{currentAccount?.societyName || currentAccount?.accountName}</h2>{currentAccount?.address && <p>{currentAccount.address}</p>}<span>FESTIVAL CONTRIBUTION RECEIPT</span><h3>{data.festival.festivalName} · {data.festival.year}</h3></header>
        <div className="festival-receipt-meta"><div><small>Receipt number</small><strong>{receipt.receiptNumber}</strong></div><div><small>Payment date</small><strong>{formatDate(receipt.paymentDate)}</strong></div></div>
        <dl>{[['Received from', data.collection.ownerName], ['Flat / Block', `${data.collection.blockName} - ${data.collection.flatNumber}`], ['Purpose', `${data.festival.festivalName} festival contribution`], ['Payment mode', receipt.paymentMode], ['UTR', receipt.utr], ['Cheque number', receipt.chequeNumber], ['Transaction ID', receipt.transactionId], ['Collected by', receipt.collectedBy]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <section className="festival-receipt-amount"><span>AMOUNT RECEIVED</span><strong>{formatCurrency(receipt.amountPaid)}</strong></section>
        {receipt.remarks && <p><strong>Remarks: </strong>{receipt.remarks}</p>}
        <footer><p>Thank you for contributing to {data.festival.festivalName}.</p><small>This is a computer-generated acknowledgement of the payment recorded by the society. Cheque payments are subject to realization. Retain this receipt for your records.</small></footer>
      </article>
    </>}
  </>
  if (onClose) return <dialog ref={dialog} className="festival-receipt-modal" aria-labelledby="festival-receipt-title" onCancel={(event) => { event.preventDefault(); onClose() }}>{content}</dialog>
  return <Shell title="Collection Receipts" eyebrow="Society module"><Link to={`/society/festival-collections/${params.festivalEventId}`}>Back to collections</Link>{content}</Shell>
}
