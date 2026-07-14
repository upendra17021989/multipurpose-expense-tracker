import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { societyAnnualCollectionAPI } from '../../../api/endpoints'
import { formatCurrency, formatDate } from '../../../utils/format'

export const BankBookImportModal = ({ open, financialYear, flats, onClose, onImported }) => {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!open) { setFile(null); setPreview(null); setWorking(false) }
  }, [open])

  const importableRows = useMemo(() => (preview?.rows || []).filter(row => !row.duplicate && row.flatId && !row.errors?.length), [preview])
  if (!open) return null

  const previewFile = async () => {
    if (!file) return toast.error('Select an Excel cash or bank book')
    setWorking(true)
    try {
      const response = await societyAnnualCollectionAPI.previewBankBook(file, financialYear)
      setPreview(response.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to preview the cash / bank book')
    } finally { setWorking(false) }
  }

  const selectFlat = (index, flatId) => setPreview(current => ({
    ...current,
    rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, flatId: flatId ? Number(flatId) : null } : row)
  }))

  const confirmImport = async () => {
    if (!importableRows.length) return toast.error('There are no valid rows to import')
    setWorking(true)
    try {
      const response = await societyAnnualCollectionAPI.importBankBook({ fileName: preview.fileName, financialYear, rows: importableRows })
      toast.success(`${response.data.created} cash / bank book entries imported`)
      onImported()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to import the cash / bank book')
    } finally { setWorking(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={() => !working && onClose()}>
    <section className="expense-modal import-modal bank-book-import-modal" role="dialog" aria-modal="true" aria-labelledby="bank-book-import-title" onMouseDown={event => event.stopPropagation()}>
      <div className="expense-modal-header"><div><h2 id="bank-book-import-title">Import Cash / Bank Book</h2><p className="muted">Cash and bank receipts will create maintenance collections for {financialYear}.</p></div><button type="button" className="modal-close" aria-label="Close" onClick={onClose} disabled={working}>&times;</button></div>
      <div className="expense-modal-form">
        <label>Cash or bank book Excel<input type="file" accept=".xlsx,.xls" onChange={event => { setFile(event.target.files?.[0] || null); setPreview(null) }}/></label>
        <button type="button" onClick={previewFile} disabled={!file || working}>{working && !preview ? 'Reading...' : 'Preview Import'}</button>
      </div>
      {preview && <>
        <div className="import-summary"><span><strong>{preview.readyRows}</strong> matched</span><span><strong>{preview.unmatchedRows}</strong> need flat</span><span><strong>{preview.duplicateRows}</strong> duplicates</span><span><strong>{preview.skippedRows}</strong> ignored</span><span><strong>{formatCurrency(preview.totalAmount)}</strong> receipt total</span></div>
        <div className="table-wrap bank-book-preview-table"><table><thead><tr><th>Row</th><th>Date</th><th>Mode</th><th>Excel flat</th><th>Matched flat</th><th>Payer</th><th>Reference</th><th>Voucher</th><th className="numeric">Amount</th><th>Status</th></tr></thead><tbody>
          {preview.rows.map((row, index) => <tr key={`${row.rowNumber}-${row.sourceReference}`}><td>{row.rowNumber}</td><td>{row.date ? formatDate(row.date) : '-'}</td><td>{row.paymentMode}</td><td>{row.flatText || '-'}</td><td><select aria-label={`Flat for Excel row ${row.rowNumber}`} value={row.flatId || ''} disabled={row.duplicate} onChange={event => selectFlat(index, event.target.value)}><option value="">Select flat</option>{flats.map(flat => <option key={flat.id} value={flat.id}>{flat.blockName}-{flat.flatNumber}</option>)}</select></td><td>{row.sourceName || '-'}</td><td>{row.referenceNumber || row.transactionId || '-'}</td><td>{row.voucherNumber || '-'}</td><td className="numeric">{formatCurrency(row.debit)}</td><td>{row.duplicate ? <span className="status-pill cancelled">Duplicate</span> : row.errors?.length ? <span className="status-pill overdue">Invalid</span> : row.flatId ? <span className="status-pill paid">Ready</span> : <span className="status-pill pending">Select flat</span>}</td></tr>)}
        </tbody></table></div>
        <div className="expense-modal-actions"><button type="button" onClick={onClose} disabled={working}>Cancel</button><button type="button" className="primary" onClick={confirmImport} disabled={working || !importableRows.length}>{working ? 'Importing...' : `Import ${importableRows.length} Rows`}</button></div>
      </>}
    </section>
  </div>
}
