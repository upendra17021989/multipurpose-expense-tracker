import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Shell } from '../DashboardRouter'
import { societyFlatAPI, societyJournalAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'

const currentYear = () => {
  const now = new Date()
  const start = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear()
  return `${start}-${start + 1}`
}

export const JournalBook = () => {
  const account = useAuthStore((state) => state.currentAccount)
  const canImport = account?.role === 'ADMIN'
  const [financialYear, setFinancialYear] = useState(currentYear())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [flats, setFlats] = useState([])
  const [working, setWorking] = useState(false)
  const years = useMemo(() => {
    const start = Number(currentYear().slice(0, 4))
    return Array.from({ length: Math.max(1, start - 2024 + 1) }, (_, index) => `${start - index}-${start - index + 1}`)
  }, [])

  const load = () => {
    setLoading(true)
    societyJournalAPI.list(financialYear, page - 1, 20, search.trim())
      .then((response) => setResult(response.data || { content: [], totalElements: 0, totalPages: 0 }))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load journal book'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [financialYear, page, search])
  useEffect(() => {
    if (!canImport) return
    societyFlatAPI.getFlats().then((response) => setFlats(response.data || [])).catch(() => {})
  }, [canImport])

  const previewFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setWorking(true)
    try { setPreview((await societyJournalAPI.preview(file, financialYear)).data) }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to preview journal book') }
    finally { setWorking(false); event.target.value = '' }
  }

  const setLineFlat = (voucherIndex, lineIndex, flatId) => {
    setPreview((current) => {
      const vouchers = current.vouchers.map((voucher, vi) => vi !== voucherIndex ? voucher : {
        ...voucher,
        lines: voucher.lines.map((line, li) => li !== lineIndex ? line : {
          ...line,
          flatId: flatId ? Number(flatId) : null,
          flatLabel: flatId ? (() => { const flat = flats.find((item) => String(item.id) === String(flatId)); return flat ? `${flat.blockName}-${flat.flatNumber}` : null })() : null,
          errors: flatId ? [] : ['Select the member or unit for this debit line']
        })
      })
      return { ...current, vouchers }
    })
  }

  const readyVouchers = preview?.vouchers?.filter((voucher) => !voucher.duplicate && !voucher.errors?.length && voucher.lines.every((line) => !line.errors?.length)) || []
  const confirmImport = async () => {
    if (!readyVouchers.length) return
    setWorking(true)
    try {
      const response = await societyJournalAPI.import(financialYear, readyVouchers)
      toast.success(`Posted ${response.data.created} journal voucher(s); skipped ${response.data.skipped}`)
      setPreview(null); setImportOpen(false); setPage(1); load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to import journal vouchers') }
    finally { setWorking(false) }
  }

  return <Shell title="Journal Book" eyebrow="Society module" actions={canImport && <button className="primary" onClick={() => setImportOpen(true)}>Import Journal Book</button>}>
    <section className="toolbar-panel">
      <label>Financial year<select value={financialYear} onChange={(event) => { setFinancialYear(event.target.value); setPage(1) }}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
      <label>Search<input type="search" placeholder="Voucher, member, block, unit or ledger" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
      <strong>{result.totalElements || 0} vouchers</strong>
    </section>
    <section className="panel">
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Voucher</th><th>Reference</th><th>Type</th><th>Particulars</th><th className="numeric">Debit</th><th className="numeric">Credit</th></tr></thead>
        <tbody>{(result.content || []).map((voucher) => voucher.lines.map((line, index) => <tr key={`${voucher.voucherNumber}-${line.lineNumber}`}>
          {index === 0 && <><td rowSpan={voucher.lines.length}>{formatDate(voucher.date)}</td><td rowSpan={voucher.lines.length}><strong>{voucher.voucherNumber}</strong></td><td rowSpan={voucher.lines.length}>{voucher.referenceNumber || '-'}</td><td rowSpan={voucher.lines.length}>{voucher.voucherType}</td></>}
          <td><strong>{line.flatLabel || line.ledgerName}</strong>{line.particulars && <small className="journal-line-note">{line.particulars}</small>}</td><td className="numeric">{Number(line.debit) ? formatCurrency(line.debit) : '-'}</td><td className="numeric">{Number(line.credit) ? formatCurrency(line.credit) : '-'}</td>
        </tr>))}
        {!loading && !result.content?.length && <tr><td colSpan="7" className="empty-state">No journal vouchers found for {financialYear}.</td></tr>}
        {loading && <tr><td colSpan="7" className="empty-state">Loading journal book...</td></tr>}</tbody></table></div>
      {result.totalPages > 1 && <nav className="table-pagination"><button disabled={page === 1} onClick={() => setPage(1)}>«</button><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>‹</button><span>Page {page} of {result.totalPages}</span><button disabled={page === result.totalPages} onClick={() => setPage((value) => value + 1)}>›</button><button disabled={page === result.totalPages} onClick={() => setPage(result.totalPages)}>»</button></nav>}
    </section>

    {importOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => !working && setImportOpen(false)}><section className="expense-modal journal-import-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
      <div className="expense-modal-header"><div><h2>Import journal book</h2><p className="muted">Upload Excel data with Date, Particulars, Reference No., Voucher Type, Voucher No., Debit and Credit columns.</p></div><button className="modal-close" onClick={() => setImportOpen(false)}>×</button></div>
      {!preview && <label className="import-dropzone">Select Excel journal book<input type="file" accept=".xlsx,.xls" onChange={previewFile} disabled={working} /></label>}
      {working && !preview && <p className="muted">Reading and validating vouchers...</p>}
      {preview && <><div className="summary-grid"><article><span>Vouchers</span><strong>{preview.totalVouchers}</strong></article><article><span>Ready</span><strong>{readyVouchers.length}</strong></article><article><span>Duplicates</span><strong>{preview.duplicateVouchers}</strong></article><article><span>Review</span><strong>{preview.vouchers.length - readyVouchers.length - preview.duplicateVouchers}</strong></article></div>
        <div className="table-wrap journal-preview-table"><table><thead><tr><th>Voucher</th><th>Date</th><th>Ledger</th><th>Member / Unit</th><th className="numeric">Debit</th><th className="numeric">Credit</th><th>Status</th></tr></thead><tbody>
          {preview.vouchers.map((voucher, vi) => voucher.lines.map((line, li) => <tr key={`${vi}-${li}`} className={voucher.duplicate || voucher.errors?.length || line.errors?.length ? 'import-row-warning' : ''}>
            {li === 0 && <><td rowSpan={voucher.lines.length}>{voucher.voucherNumber || 'Missing'}<small>{voucher.voucherType}</small></td><td rowSpan={voucher.lines.length}>{voucher.date ? formatDate(voucher.date) : '-'}</td></>}
            <td>{line.ledgerName}</td><td>{Number(line.debit) > 0 ? <select value={line.flatId || ''} onChange={(event) => setLineFlat(vi, li, event.target.value)}><option value="">Select member / unit</option>{flats.map((flat) => <option key={flat.id} value={flat.id}>{flat.blockName}-{flat.flatNumber} — {flat.ownerName}</option>)}</select> : '-'}</td>
            <td className="numeric">{Number(line.debit) ? formatCurrency(line.debit) : '-'}</td><td className="numeric">{Number(line.credit) ? formatCurrency(line.credit) : '-'}</td><td>{voucher.duplicate ? 'Duplicate' : [...(voucher.errors || []), ...(line.errors || [])].join('; ') || 'Ready'}</td>
          </tr>))}</tbody></table></div>
        <div className="expense-modal-actions"><button onClick={() => setPreview(null)} disabled={working}>Choose another file</button><button className="primary" onClick={confirmImport} disabled={working || !readyVouchers.length}>{working ? 'Posting...' : `Post ${readyVouchers.length} vouchers`}</button></div></>}
    </section></div>}
  </Shell>
}
