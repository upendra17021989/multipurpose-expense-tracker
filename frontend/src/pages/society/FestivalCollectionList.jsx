import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalCollectionAPI, festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'
import { FestivalPaymentModal } from './FestivalPaymentModal'
import { FestivalCollectionReceipt } from './FestivalCollectionReceipt'
import './FestivalCollectionList.css'

export const FestivalCollectionList = () => {
  const { festivalEventId } = useParams()
  const { currentAccount } = useAuthStore()
  const canManageDemand = currentAccount?.role !== 'MEMBER' && currentAccount?.role !== 'BLOCK_REPRESENTATIVE'
  const canAddPayment = currentAccount?.role !== 'MEMBER'
  const assignedBlock = currentAccount?.role === 'BLOCK_REPRESENTATIVE' ? currentAccount?.assignedBlockName : ''
  const [festival, setFestival] = useState(null)
  const [collections, setCollections] = useState([])
  const [summary, setSummary] = useState(null)
  const [expectedAmount, setExpectedAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [editingDemandId, setEditingDemandId] = useState(null)
  const [demandForm, setDemandForm] = useState({ expectedAmount: '', remarks: '' })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [paymentCollection, setPaymentCollection] = useState(null)
  const [receiptCollection, setReceiptCollection] = useState(null)
  const [mobileSection, setMobileSection] = useState('collections')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      festivalEventAPI.getFestival(festivalEventId),
      festivalCollectionAPI.getCollections(festivalEventId, { page, size: 10, search: filters.search, status: filters.status, blockName: assignedBlock }),
      festivalCollectionAPI.getSummary(festivalEventId)
    ])
      .then(([festivalResponse, collectionResponse, summaryResponse]) => {
        setFestival(festivalResponse.data)
        setCollections(collectionResponse.data?.content || [])
        setTotalPages(collectionResponse.data?.totalPages || 0)
        setTotalElements(collectionResponse.data?.totalElements || 0)
        setSummary(summaryResponse.data || null)
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load collections'))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [assignedBlock, festivalEventId, filters.search, filters.status, page])

  const visibleCollections = collections

  const generateDemand = async (event) => {
    event.preventDefault()
    setGenerating(true)
    try {
      await festivalCollectionAPI.generateDemand({
        festivalEventId: Number(festivalEventId),
        expectedAmount: Number(expectedAmount),
        remarks: remarks.trim() || null
      })
      toast.success('Collection demand generated')
      setExpectedAmount('')
      setRemarks('')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to generate demand')
    } finally {
      setGenerating(false)
    }
  }

  const startDemandEdit = (collection) => {
    setEditingDemandId(collection.id)
    setDemandForm({
      expectedAmount: collection.expectedAmount || '',
      remarks: collection.remarks || ''
    })
  }

  const cancelDemandEdit = () => {
    setEditingDemandId(null)
    setDemandForm({ expectedAmount: '', remarks: '' })
  }

  const updateDemand = async (collectionId) => {
    try {
      await festivalCollectionAPI.updateDemand(collectionId, {
        festivalEventId: Number(festivalEventId),
        expectedAmount: Number(demandForm.expectedAmount),
        remarks: demandForm.remarks.trim() || null
      })
      toast.success('Demand updated')
      cancelDemandEdit()
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update demand')
    }
  }

  const sharePage = async () => {
    const shareData = { title: festival ? `${festival.festivalName} Collections` : 'Festival Collections', url: window.location.href }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await navigator.clipboard.writeText(shareData.url)
        toast.success('Share link copied')
      }
    } catch (error) {
      if (error.name !== 'AbortError') toast.error('Unable to share this link')
    }
  }

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Festival Collections" eyebrow="Society module">
        <p className="muted">Festival collections are available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={festival ? `${festival.festivalName} Collections` : 'Festival Collections'} eyebrow="Society module" actions={<div className="header-actions collection-header-actions"><button type="button" onClick={sharePage}>Share</button><Link className="button-link" to="/society/festival-collections">All Festivals</Link></div>}>
      <div className="festival-collections-page">
      <nav className="collection-mobile-tabs" aria-label="Collection sections">
        <button type="button" aria-pressed={mobileSection === 'collections'} onClick={() => setMobileSection('collections')}>Collections <span>{totalElements}</span></button>
        <button type="button" aria-pressed={mobileSection === 'overview'} onClick={() => setMobileSection('overview')}>Overview</button>
        {canManageDemand && <button type="button" aria-pressed={mobileSection === 'demand'} onClick={() => setMobileSection('demand')}>Demand</button>}
      </nav>
      <section className={`collection-overview-section ${mobileSection !== 'overview' ? 'mobile-section-hidden' : ''}`} aria-label="Collection overview">
      <SummaryGrid items={[
        ['Expected', formatCurrency(summary?.totalExpected)],
        ['Collected', formatCurrency(summary?.totalCollected)],
        ['Pending', formatCurrency(summary?.totalPending)],
        ['Excess', formatCurrency(summary?.totalExcess)],
        ['Paid Flats', `${summary?.paidFlats || 0}/${summary?.totalFlats || 0}`],
        ['Partial Flats', summary?.partialFlats || 0],
        ['Pending Flats', summary?.pendingFlats || 0],
        ['Excess Flats', summary?.excessFlats || 0]
      ]} />
      <div className="form-actions"><Link className="button-link secondary" to={`/society/festivals/${festivalEventId}/expenses`}>Expense details & estimates</Link><Link className="button-link secondary" to={`/society/festivals/${festivalEventId}/report`}>Collection & expense report</Link></div>
      </section>

      {canManageDemand && <form className={`inline-form collection-demand-form collection-demand-section ${mobileSection !== 'demand' ? 'mobile-section-hidden' : ''}`} onSubmit={generateDemand}>
        <label>
          Same Amount For All Flats
          <input type="number" min="0.01" step="0.01" value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} required placeholder="2500" />
        </label>
        <label>
          Remarks
          <input value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional note" />
        </label>
        <button type="submit" className="primary" disabled={generating}>{generating ? 'Generating...' : 'Generate Demand'}</button>
      </form>}

      <section className={`collection-records-section ${mobileSection !== 'collections' ? 'mobile-section-hidden' : ''}`} aria-label="Flat-wise collections">
      <div className="collection-records-heading"><div><h2>Flat-wise collections</h2><p>Search a flat or open a row to record payments and view receipts.</p></div><strong>{totalElements} records</strong></div>
      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search flat, owner, status" value={filters.search} onChange={(event) => { setPage(0); setFilters({ ...filters, search: event.target.value }) }} />
        <select value={filters.status} onChange={(event) => { setPage(0); setFilters({ ...filters, status: event.target.value }) }}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="EXCESS">Excess</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <strong>{assignedBlock ? `${assignedBlock} · ` : ''}{totalElements} found</strong>
      </section>

      <div className="table-wrap">
        <table className="festival-collections-table">
          <thead>
            <tr>
              <th>Flat</th>
              <th>Owner</th>
              <th className="numeric">Expected</th>
              <th className="numeric">Collected</th>
              <th className="numeric">Pending</th>
              <th className="numeric">Excess</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCollections.map((collection) => (
              <tr key={collection.id}>
                <td>{collection.blockName}-{collection.flatNumber}</td>
                <td>{collection.ownerName}</td>
                <td className="numeric">
                  {canManageDemand && editingDemandId === collection.id ? (
                    <input className="table-input" type="number" min="0.01" step="0.01" value={demandForm.expectedAmount} onChange={(event) => setDemandForm({ ...demandForm, expectedAmount: event.target.value })} />
                  ) : formatCurrency(collection.expectedAmount)}
                </td>
                <td className="numeric">{formatCurrency(collection.collectedAmount)}</td>
                <td className="numeric">{formatCurrency(collection.pendingAmount)}</td>
                <td className="numeric">{formatCurrency(collection.excessAmount)}</td>
                <td><span className={`status-pill ${String(collection.paymentStatus).toLowerCase()}`}>{collection.paymentStatus}</span></td>
                <td className="table-actions">
                  {editingDemandId === collection.id ? (
                    <>
                      <button className="primary" onClick={() => updateDemand(collection.id)}>Save</button>
                      <button onClick={cancelDemandEdit}>Cancel</button>
                    </>
                  ) : canAddPayment ? (
                    <>
                      {canManageDemand && <button onClick={() => startDemandEdit(collection)}>Demand</button>}
                      <button onClick={() => setPaymentCollection(collection)}>Payment</button>
                      <button onClick={() => setReceiptCollection({ id: collection.id })}>Receipts</button>
                    </>
                  ) : <button onClick={() => setReceiptCollection({ id: collection.id })}>Receipts</button>}
                </td>
              </tr>
            ))}
            {!loading && visibleCollections.length === 0 && <tr><td colSpan="8" className="empty-state">Generate demand to create flat-wise collection rows.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="festival-collection-mobile-list" aria-busy={loading}>
        {visibleCollections.map((collection) => (
          <details className="festival-collection-card" key={collection.id}>
            <summary>
              <span className="festival-collection-row-main">
                <strong>{collection.blockName}-{collection.flatNumber}</strong>
                <small>{collection.ownerName || 'Owner not specified'}</small>
              </span>
              <span className="festival-collection-row-balance">
                <strong>{formatCurrency(collection.pendingAmount)}</strong>
                <span className={`status-pill ${String(collection.paymentStatus).toLowerCase()}`}>{collection.paymentStatus}</span>
              </span>
              <span className="festival-collection-row-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div className="festival-collection-card-details">
            <dl>
              <div>
                <dt>Expected</dt>
                <dd>{canManageDemand && editingDemandId === collection.id
                  ? <input type="number" min="0.01" step="0.01" value={demandForm.expectedAmount} onChange={(event) => setDemandForm({ ...demandForm, expectedAmount: event.target.value })} />
                  : formatCurrency(collection.expectedAmount)}</dd>
              </div>
              <div><dt>Collected</dt><dd>{formatCurrency(collection.collectedAmount)}</dd></div>
              <div><dt>Pending</dt><dd>{formatCurrency(collection.pendingAmount)}</dd></div>
              <div><dt>Excess</dt><dd>{formatCurrency(collection.excessAmount)}</dd></div>
            </dl>
            <div className="festival-collection-card-actions">
              {editingDemandId === collection.id ? (
                <>
                  <button type="button" className="primary" onClick={() => updateDemand(collection.id)}>Save</button>
                  <button type="button" onClick={cancelDemandEdit}>Cancel</button>
                </>
              ) : canAddPayment ? (
                <>
                  {canManageDemand && <button type="button" onClick={() => startDemandEdit(collection)}>Edit demand</button>}
                  <button type="button" onClick={() => setPaymentCollection(collection)}>Add payment</button>
                  <button type="button" onClick={() => setReceiptCollection({ id: collection.id })}>Receipts</button>
                </>
              ) : <button type="button" onClick={() => setReceiptCollection({ id: collection.id })}>View receipts</button>}
            </div>
            </div>
          </details>
        ))}
        {!loading && visibleCollections.length === 0 && <p className="festival-collection-mobile-empty">Generate demand to create flat-wise collection rows.</p>}
      </div>
      {totalPages > 1 && <nav className="table-pagination" aria-label="Collection pages"><button type="button" disabled={page === 0 || loading} onClick={() => setPage(0)}>«</button><button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>‹</button><span>Page {page + 1} of {totalPages}</span><button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>›</button><button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(totalPages - 1)}>»</button></nav>}
      {loading && <p className="muted">Loading collections...</p>}
      </section>
      {canAddPayment && paymentCollection && <FestivalPaymentModal collection={paymentCollection} onClose={() => setPaymentCollection(null)} onSaved={(receipt) => { setReceiptCollection({ id: paymentCollection.id, receiptId: receipt.id }); setPaymentCollection(null); loadData() }} />}
      {receiptCollection && <FestivalCollectionReceipt collectionId={receiptCollection.id} initialReceiptId={receiptCollection.receiptId} onClose={() => setReceiptCollection(null)} />}
      </div>
    </Shell>
  )
}
