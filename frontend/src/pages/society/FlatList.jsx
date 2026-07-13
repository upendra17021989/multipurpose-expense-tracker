import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { societyFlatAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const FlatList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const canWrite = currentAccount?.role !== 'MEMBER'
  const [flats, setFlats] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)

  const loadFlats = () => {
    setLoading(true)
    societyFlatAPI.getFlats()
      .then((response) => setFlats(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load flats'))
      .finally(() => setLoading(false))
  }

  useEffect(loadFlats, [])

  const visibleFlats = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return flats
    return flats.filter((flat) => [flat.blockName, flat.flatNumber, flat.ownerName, flat.mobile, flat.email, flat.residentType]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)))
  }, [flats, search])
  const pageCount = Math.max(1, Math.ceil(visibleFlats.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagedFlats = visibleFlats.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => setPage(1), [search, pageSize])

  const summary = useMemo(() => {
    const blocks = new Set(flats.map((flat) => flat.blockName).filter(Boolean))
    const owners = flats.filter((flat) => flat.residentType === 'OWNER').length
    const tenants = flats.filter((flat) => flat.residentType === 'TENANT').length
    return { blocks: blocks.size, owners, tenants }
  }, [flats])

  const remove = async (flatId) => {
    if (!window.confirm('Delete this flat?')) return
    try {
      await societyFlatAPI.deleteFlat(flatId)
      toast.success('Flat deleted')
      loadFlats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  const handlePreview = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const response = await societyFlatAPI.previewImport(file)
      setPreview(response.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to read flat import CSV')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const confirmImport = async () => {
    const rows = (preview?.rows || []).filter((row) => !row.duplicate && !row.errors?.length)
    if (!rows.length) {
      toast.error('No valid flat rows to import')
      return
    }
    setImporting(true)
    try {
      const response = await societyFlatAPI.confirmImport(rows)
      toast.success(`Imported ${response.data.created} flat(s); skipped ${response.data.skipped}`)
      setPreview(null)
      setImportOpen(false)
      loadFlats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Flat import failed')
    } finally {
      setImporting(false)
    }
  }

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Flat Master" eyebrow="Society module">
        <p className="muted">Flat master is available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Flat Master"
      eyebrow="Society module"
      actions={canWrite && <div className="table-actions"><button type="button" onClick={() => setImportOpen(true)}>Import CSV</button><Link className="button-link" to="/society/flats/new">Add Flat</Link></div>}
    >
      <SummaryGrid items={[
        ['Total Flats', flats.length],
        ['Blocks', summary.blocks],
        ['Owner Occupied', summary.owners],
        ['Tenant Occupied', summary.tenants]
      ]} />

      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search block, flat, owner, mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
        <strong>{visibleFlats.length} shown</strong>
      </section>

      <div className="table-wrap">
        <table className="flat-master-table">
          <thead>
            <tr>
              <th>Block</th>
              <th>Flat</th>
              <th>Owner</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Resident</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedFlats.map((flat) => (
              <tr key={flat.id}>
                <td>{flat.blockName}</td>
                <td>{flat.flatNumber}</td>
                <td className="flat-owner-name">{flat.ownerName}</td>
                <td>{flat.mobile || '-'}</td>
                <td>{flat.email || '-'}</td>
                <td>{flat.residentType}</td>
                <td>{flat.active ? 'Active' : 'Inactive'}</td>
                <td className="table-actions">
                  {canWrite ? <>
                    <button onClick={() => navigate(`/society/flats/${flat.id}/edit`)}>Edit</button>
                    <button className="danger" onClick={() => remove(flat.id)}>Delete</button>
                  </> : <span className="muted">View only</span>}
                </td>
              </tr>
            ))}
            {!loading && visibleFlats.length === 0 && <tr><td colSpan="8" className="empty-state">No flats found.</td></tr>}
          </tbody>
        </table>
      </div>
      {visibleFlats.length > 0 && (
        <div className="flat-table-footer">
          <label>
            Rows
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <nav className="table-pagination" aria-label="Flat master pages">
            <button type="button" aria-label="First page" title="First page" disabled={currentPage === 1} onClick={() => setPage(1)}>«</button>
            <button type="button" aria-label="Previous page" title="Previous page" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
            <span>Page {currentPage} of {pageCount}</span>
            <button type="button" aria-label="Next page" title="Next page" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button>
            <button type="button" aria-label="Last page" title="Last page" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)}>»</button>
          </nav>
        </div>
      )}
      {loading && <p className="muted">Loading flats...</p>}

      {canWrite && importOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !importing && setImportOpen(false)}>
          <section className="expense-modal import-modal flat-import-modal" role="dialog" aria-modal="true" aria-labelledby="flat-import-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="expense-modal-header">
              <div>
                <h2 id="flat-import-title">Import flat master</h2>
                <p className="muted">Upload the CSV prepared from the member ledger. Required columns: blockName, flatNumber, ownerName.</p>
              </div>
              <button className="modal-close" aria-label="Close" onClick={() => setImportOpen(false)} disabled={importing}>×</button>
            </div>
            {!preview && (
              <label className="import-dropzone">
                <strong>{importing ? 'Reading CSV...' : 'Choose flat master CSV'}</strong>
                <span>Use flat_master_import.csv or a CSV with mobile, email, residentType columns.</span>
                <input type="file" accept=".csv,text/csv" onChange={handlePreview} disabled={importing} />
              </label>
            )}
            {preview && (
              <>
                <div className="import-summary">
                  <span><strong>{preview.totalRows}</strong> rows</span>
                  <span><strong>{preview.readyRows}</strong> ready</span>
                  <span><strong>{preview.duplicateRows}</strong> duplicates</span>
                  <span><strong>{preview.warningRows}</strong> need review</span>
                </div>
                <div className="table-wrap import-table-wrap">
                  <table>
                    <thead>
                      <tr><th>Row</th><th>Block</th><th>Flat</th><th>Owner</th><th>Resident</th><th>Review</th></tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={row.rowNumber} className={row.duplicate || row.errors?.length ? 'import-row-disabled' : ''}>
                          <td>{row.rowNumber}</td>
                          <td>{row.blockName || '-'}</td>
                          <td>{row.flatNumber || '-'}</td>
                          <td>{row.ownerName || '-'}</td>
                          <td>{row.residentType || 'OWNER'}</td>
                          <td>
                            {row.duplicate && <span className="status-pill rejected">Duplicate</span>}
                            {[...(row.errors || []), ...(row.warnings || [])].map((message) => <small key={message}>{message}</small>)}
                            {!row.duplicate && !row.errors?.length && !row.warnings?.length && <span className="status-pill paid">Ready</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="expense-modal-actions">
                  <button onClick={() => setPreview(null)} disabled={importing}>Choose another file</button>
                  <button className="primary" onClick={confirmImport} disabled={importing || !preview.readyRows}>{importing ? 'Importing...' : `Import ${preview.readyRows} flats`}</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </Shell>
  )
}
