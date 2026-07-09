import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { personalDocumentAPI } from '../../api/endpoints'
import { DocumentForm, DOCUMENT_CATEGORIES } from '../../components/DocumentForm'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const labels = Object.fromEntries(DOCUMENT_CATEGORIES)
const statusFor = (date) => {
  if (!date) return ['No expiry', 'neutral']
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expiry = new Date(`${date}T00:00:00`)
  if (expiry < today) return ['Expired', 'danger']
  const soon = new Date(today); soon.setDate(soon.getDate() + 30)
  return expiry <= soon ? ['Expiring soon', 'warning'] : ['Active', 'success']
}
const blankFilters = { query: '', category: '', status: '', sort: 'createdAt', direction: 'DESC' }
const maskReference = (value) => {
  if (!value) return '-'
  if (value.length <= 4) return '*'.repeat(value.length)
  return `${'*'.repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`
}

export const MyDocumentsFull = () => {
  const { currentAccount } = useAuthStore()
  const [summary, setSummary] = useState({ total: 0, expiringSoon: 0, expired: 0 })
  const [documents, setDocuments] = useState([])
  const [filters, setFilters] = useState(blankFilters)
  const [applied, setApplied] = useState(blankFilters)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const load = useCallback(async () => {
    if (currentAccount?.accountType !== 'INDIVIDUAL') return setLoading(false)
    setLoading(true)
    try {
      const params = { ...applied, page, size: 10 }
      Object.keys(params).forEach((key) => params[key] === '' && delete params[key])
      const [summaryResult, listResult] = await Promise.all([personalDocumentAPI.summary(), personalDocumentAPI.list(params)])
      setSummary(summaryResult.data); setDocuments(listResult.data.content || []); setTotalPages(listResult.data.totalPages || 0)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load your documents') }
    finally { setLoading(false) }
  }, [applied, currentAccount?.accountType, currentAccount?.id, page])
  useEffect(() => { load() }, [load])

  const save = async (metadata, file) => {
    setSaving(true)
    try {
      editing ? await personalDocumentAPI.update(editing.id, metadata) : await personalDocumentAPI.create(metadata, file)
      toast.success(editing ? 'Document updated' : 'Document uploaded'); setEditing(null); setFormOpen(false); await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to save document') }
    finally { setSaving(false) }
  }
  const download = async (document) => {
    try {
      const response = await personalDocumentAPI.download(document.id)
      const url = URL.createObjectURL(response.data); const link = window.document.createElement('a')
      link.href = url; link.download = document.originalFileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to download document') }
  }
  const preview = async (document) => {
    try {
      const response = await personalDocumentAPI.download(document.id)
      const url = URL.createObjectURL(new Blob([response.data], { type: document.contentType }))
      const previewWindow = window.open(url, '_blank', 'noopener,noreferrer')
      if (!previewWindow) toast.info('Allow pop-ups to preview this document.')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to preview document') }
  }
  const remove = async (document) => {
    if (!window.confirm(`Delete "${document.title}"? This cannot be undone.`)) return
    try { await personalDocumentAPI.delete(document.id); toast.success('Document deleted'); await load() }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to delete document') }
  }
  const share = async (document) => {
    const recipient = window.prompt('Enter the recipient’s email address or mobile number')
    if (!recipient?.trim()) return
    try { await personalDocumentAPI.share(document.id, recipient.trim()); toast.success('Document shared') }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to share document') }
  }
  if (currentAccount?.accountType !== 'INDIVIDUAL') return <Shell title="My Documents" eyebrow="Individual module"><p className="muted">Available only for individual accounts.</p></Shell>

  return <Shell title="My Documents" eyebrow="Individual module">
    <section className="summary-grid compact document-desktop-summary">
      <article className="summary-card"><span>Total documents</span><strong>{summary.total}</strong></article>
      <article className="summary-card"><span>Expiring soon</span><strong>{summary.expiringSoon}</strong></article>
      <article className="summary-card"><span>Expired</span><strong>{summary.expired}</strong></article>
    </section>
    {formOpen && <div className="modal-backdrop document-form-backdrop" role="presentation" onMouseDown={() => { if (!saving) { setFormOpen(false); setEditing(null) } }}>
      <div className="document-form-dialog" role="dialog" aria-modal="true" aria-label={editing ? 'Edit document' : 'Add document'} onMouseDown={(event) => event.stopPropagation()}>
        <DocumentForm document={editing} saving={saving} onSubmit={save} onCancel={() => { if (!saving) { setFormOpen(false); setEditing(null) } }} />
      </div>
    </div>}
    <section className="panel">
      <div className="section-heading-row"><div><h2>Stored documents</h2><p className="muted">Financial, policy, tax, investment, and identity records.</p></div><button className="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>Add document</button></div>
      <div className="document-mobile-toolbar">
        <button className="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>Add document</button>
        <button onClick={() => setFiltersOpen(true)}>Filters</button>
      </div>
      <div className="document-mobile-stats">
        <span><strong>{summary.total}</strong> Total</span>
        <span><strong>{summary.expiringSoon}</strong> Expiring soon</span>
        <span><strong>{summary.expired}</strong> Expired</span>
      </div>
      <form className="document-filters" onSubmit={(event) => { event.preventDefault(); setPage(0); setApplied(filters) }}>
        <input aria-label="Search documents" placeholder="Search title, issuer, number, or tags" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
        <select aria-label="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option>{DOCUMENT_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="EXPIRING_SOON">Expiring soon</option><option value="EXPIRED">Expired</option><option value="NO_EXPIRY">No expiry</option></select>
        <select aria-label="Sort" value={`${filters.sort}:${filters.direction}`} onChange={(e) => { const [sort, direction] = e.target.value.split(':'); setFilters({ ...filters, sort, direction }) }}><option value="createdAt:DESC">Newest first</option><option value="createdAt:ASC">Oldest first</option><option value="title:ASC">Title A-Z</option><option value="expiryDate:ASC">Expiry date</option></select>
        <button type="submit">Apply</button><button type="button" onClick={() => { setFilters(blankFilters); setApplied(blankFilters); setPage(0) }}>Clear</button>
      </form>
      {filtersOpen && <div className="modal-backdrop document-filter-backdrop" role="presentation" onMouseDown={() => setFiltersOpen(false)}>
        <section className="expense-modal document-filter-modal" role="dialog" aria-modal="true" aria-labelledby="document-filter-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="expense-modal-header"><div><h2 id="document-filter-title">Filter documents</h2><p className="muted">Find the documents you need.</p></div><button className="modal-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>×</button></div>
          <div className="document-filter-fields">
            <label>Search<input placeholder="Title, issuer, number or tags" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} /></label>
            <label>Category<select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option>{DOCUMENT_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="EXPIRING_SOON">Expiring soon</option><option value="EXPIRED">Expired</option><option value="NO_EXPIRY">No expiry</option></select></label>
            <label>Sort<select value={`${filters.sort}:${filters.direction}`} onChange={(e) => { const [sort, direction] = e.target.value.split(':'); setFilters({ ...filters, sort, direction }) }}><option value="createdAt:DESC">Newest first</option><option value="createdAt:ASC">Oldest first</option><option value="title:ASC">Title A-Z</option><option value="expiryDate:ASC">Expiry date</option></select></label>
          </div>
          <div className="expense-modal-actions"><button onClick={() => { setFilters(blankFilters); setApplied(blankFilters); setPage(0) }}>Clear all</button><button className="primary" onClick={() => { setPage(0); setApplied(filters); setFiltersOpen(false) }}>Apply filters</button></div>
        </section>
      </div>}
      {!loading && documents.length > 0 && <div className="document-mobile-list">{documents.map((document) => {
        const [status, tone] = statusFor(document.expiryDate)
        return <details className="document-mobile-row" key={document.id}>
          <summary><span><strong>{document.title}</strong><small>{labels[document.category]} · {document.expiryDate || 'No expiry'}</small>{document.sharedWithMe && <em>Shared with me</em>}</span><span className={`document-status ${tone}`}>{status}</span><span className="document-row-chevron" aria-hidden="true">⌄</span></summary>
          <div className="document-mobile-details"><dl><div><dt>File</dt><dd>{document.originalFileName}</dd></div><div><dt>Issuer</dt><dd>{document.issuer || '-'}</dd></div><div><dt>Reference</dt><dd>{maskReference(document.documentNumber)}</dd></div><div><dt>Issue date</dt><dd>{document.issueDate || '-'}</dd></div><div><dt>Expiry date</dt><dd>{document.expiryDate || 'No expiry'}</dd></div></dl>
            <div className="document-actions"><button onClick={() => preview(document)}>View</button><button onClick={() => download(document)}>Download</button>{!document.sharedWithMe && <><button onClick={() => share(document)}>Share</button><button onClick={() => { setEditing(document); setFormOpen(true) }}>Edit</button><button className="danger" onClick={() => remove(document)}>Delete</button></>}</div>
          </div>
        </details>
      })}</div>}
      {loading ? <p className="muted document-state">Loading documents...</p> : documents.length === 0 ? <p className="muted document-state">No documents match your filters.</p> : <div className="document-list">{documents.map((document) => {
        const [status, tone] = statusFor(document.expiryDate)
        return <article className="document-card" key={document.id}><div className="document-card-main"><div><h3>{document.title}</h3><p>{labels[document.category]} · {document.originalFileName}</p></div><span className={`document-status ${tone}`}>{status}</span></div>
          {document.sharedWithMe && <p className="shared-document-label">Shared with me · Read only</p>}
          <dl><div><dt>Issuer</dt><dd>{document.issuer || '-'}</dd></div><div><dt>Reference</dt><dd title="Sensitive number masked">{maskReference(document.documentNumber)}</dd></div><div><dt>Issue date</dt><dd>{document.issueDate || '-'}</dd></div><div><dt>Expiry date</dt><dd>{document.expiryDate || 'No expiry'}</dd></div></dl>
          {document.tags && <p className="document-tags">{document.tags}</p>}<div className="document-actions"><button onClick={() => preview(document)}>View</button><button onClick={() => download(document)}>Download</button>{!document.sharedWithMe && <><button onClick={() => share(document)}>Share</button><button onClick={() => { setEditing(document); setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button><button className="danger" onClick={() => remove(document)}>Delete</button></>}</div></article>
      })}</div>}
      {totalPages > 1 && <div className="document-pagination"><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </Shell>
}
