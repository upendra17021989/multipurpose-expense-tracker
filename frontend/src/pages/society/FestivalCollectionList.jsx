import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalCollectionAPI, festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const FestivalCollectionList = () => {
  const { festivalEventId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [festival, setFestival] = useState(null)
  const [collections, setCollections] = useState([])
  const [summary, setSummary] = useState(null)
  const [expectedAmount, setExpectedAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [editingDemandId, setEditingDemandId] = useState(null)
  const [demandForm, setDemandForm] = useState({ expectedAmount: '', remarks: '' })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      festivalEventAPI.getFestival(festivalEventId),
      festivalCollectionAPI.getCollections(festivalEventId),
      festivalCollectionAPI.getSummary(festivalEventId)
    ])
      .then(([festivalResponse, collectionResponse, summaryResponse]) => {
        setFestival(festivalResponse.data)
        setCollections(collectionResponse.data || [])
        setSummary(summaryResponse.data || null)
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load collections'))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [festivalEventId])

  const visibleCollections = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return collections.filter((collection) => [collection.blockName, collection.flatNumber, collection.ownerName, collection.paymentStatus]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)))
      .filter((collection) => !filters.status || collection.paymentStatus === filters.status)
  }, [collections, filters])

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

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Festival Collections" eyebrow="Society module">
        <p className="muted">Festival collections are available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={festival ? `${festival.festivalName} Collections` : 'Festival Collections'} eyebrow="Society module" actions={<Link className="button-link" to="/society/festival-collections">All Festivals</Link>}>
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

      <form className="inline-form collection-demand-form" onSubmit={generateDemand}>
        <label>
          Same Amount For All Flats
          <input type="number" min="0.01" step="0.01" value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} required placeholder="2500" />
        </label>
        <label>
          Remarks
          <input value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional note" />
        </label>
        <button type="submit" className="primary" disabled={generating}>{generating ? 'Generating...' : 'Generate Demand'}</button>
      </form>

      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search flat, owner, status" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
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

      <div className="table-wrap">
        <table>
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
                  {editingDemandId === collection.id ? (
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
                  ) : (
                    <>
                      <button onClick={() => startDemandEdit(collection)}>Demand</button>
                      <button onClick={() => navigate(`/society/festival-collections/${festivalEventId}/${collection.id}/payment`)}>Payment</button>
                      <button onClick={() => navigate(`/society/festival-collections/${festivalEventId}/${collection.id}/receipts`)}>Receipts</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && visibleCollections.length === 0 && <tr><td colSpan="8" className="empty-state">Generate demand to create flat-wise collection rows.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading collections...</p>}
    </Shell>
  )
}
