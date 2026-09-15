import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { expenseAPI, festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell, SummaryGrid } from '../DashboardRouter'
import { formatCurrency, formatDate } from '../../utils/format'
import { ExpenseModal } from './annual-finance/ExpenseModal'
import './FestivalPaymentModal.css'
import './FestivalExpenses.css'

export const FestivalExpenses = () => {
  const { festivalEventId } = useParams()
  const account = useAuthStore((state) => state.currentAccount)
  const canWrite = ['ADMIN', 'SUPERVISOR', 'TREASURER'].includes(account?.role)
  const [festival, setFestival] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [expenseCount, setExpenseCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [estimates, setEstimates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [estimateError, setEstimateError] = useState('')
  const [revision, setRevision] = useState(0)
  const [tab, setTab] = useState('actual')
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const refresh = () => setRevision((value) => value + 1)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setEstimateError('')
    Promise.all([festivalEventAPI.getFestival(festivalEventId), festivalEventAPI.getEstimates(festivalEventId).catch(() => null)])
      .then(([event, planned]) => {
        if (!active) return
        setFestival(event.data)
        setEstimates(planned?.data || [])
        if (!planned) setEstimateError('Estimated expenses could not be loaded. Please retry or contact your administrator.')
      }).catch(() => { if (active) setError('Unable to load festival expenses. Please retry.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [festivalEventId, account?.id, revision])
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setExpensesLoading(true)
      setExpenses([])
      expenseAPI.getFestivalExpensesPage(festivalEventId, { page, size: pageSize, search: search.trim() })
        .then(({ data }) => {
          if (!active) return
          setExpenses(data.content || [])
          setTotalPages(data.totalPages || 0)
          if (!search.trim()) setExpenseCount(data.totalElements || 0)
          if (data.totalPages > 0 && page >= data.totalPages) setPage(data.totalPages - 1)
        })
        .catch(() => { if (active) setError('Unable to load festival expenses. Please retry.') })
        .finally(() => { if (active) setExpensesLoading(false) })
    }, search ? 300 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [festivalEventId, page, pageSize, search, revision, account?.id])
  const actual = Number(festival?.totalExpense || 0)
  const planned = estimates.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const remaining = planned - actual
  const visible = tab === 'actual' ? expenses : estimates.filter((row) => [row.description, row.vendorName, row.categoryName].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())))
  const removeEstimate = async (row) => {
    if (!window.confirm(`Delete estimate "${row.description}"?`)) return
    try { await festivalEventAPI.deleteEstimate(festivalEventId, row.id); toast.success('Estimate deleted'); refresh() }
    catch { toast.error('Unable to delete estimate') }
  }
  return <Shell title={festival ? `${festival.festivalName} · Expenses & estimates` : 'Festival expenses & estimates'} eyebrow="Society module" actions={<Link className="button-link" to={`/society/festival-collections/${festivalEventId}`}>Collections</Link>}>
    <div className={`festival-expenses-page festival-expenses-${tab}`}>
    <Link to="/society/festivals">← All festivals</Link>
    {loading ? <p role="status">Loading festival expenses…</p> : error ? <p role="alert">{error} <button onClick={refresh}>Retry</button></p> : <>
      <SummaryGrid items={[
        ['Event budget', festival?.budgetAmount == null ? 'Not set' : formatCurrency(festival.budgetAmount)],
        ['Estimated expenses', estimateError ? 'Unavailable' : formatCurrency(planned)],
        ['Recorded expenses', formatCurrency(actual)],
        [remaining < 0 ? 'Above estimate' : 'Estimate remaining', estimateError ? 'Unavailable' : formatCurrency(Math.abs(remaining))]
      ]} />
      <section className="alert-panel">Recorded expenses include all statuses, including drafts and rejected entries, matching the festival expense total. Estimates are planning amounts and do not change collections or recorded expenses.{festival?.budgetAmount != null && <> Budget remaining: <strong>{formatCurrency(Number(festival.budgetAmount) - actual)}</strong>.</>}</section>
      <section className="toolbar-panel"><button aria-pressed={tab === 'actual'} onClick={() => { setTab('actual'); setSearch(''); setPage(0) }}>Actual expense details ({expenseCount})</button><button aria-pressed={tab === 'estimated'} onClick={() => { setTab('estimated'); setSearch('') }}>Estimated expense details ({estimateError ? '—' : estimates.length})</button><input aria-label="Search festival expenses" placeholder="Search description, vendor or category" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} />{canWrite && <button className="primary" disabled={tab === 'estimated' && !!estimateError} onClick={() => setModal({ type: tab })}>{tab === 'actual' ? 'Add expense' : 'Add estimate'}</button>}</section>
      {tab === 'estimated' && estimateError ? <p role="alert">{estimateError} <button onClick={refresh}>Retry</button></p> : <><div className="table-wrap"><table><thead><tr>{tab === 'actual' && <th>Date</th>}<th>Description</th><th>Category</th><th>Vendor</th>{tab === 'estimated' ? <><th>Quantity</th><th>Unit cost</th></> : <><th>Payment mode</th><th>Status</th></>}<th className="numeric">Amount</th><th>Remarks</th>{canWrite && <th>Actions</th>}</tr></thead><tbody>{visible.map((row) => <tr key={row.id}>{tab === 'actual' && <td>{formatDate(row.expenseDate)}</td>}<td>{row.description || '—'}</td><td>{row.categoryName || '—'}</td><td>{row.vendorName || '—'}</td>{tab === 'estimated' ? <><td>{row.quantity}</td><td>{formatCurrency(row.unitCost)}</td></> : <><td>{row.paymentMode}</td><td>{row.status}</td></>}<td className="numeric">{formatCurrency(row.amount)}</td><td>{row.remarks || '—'}</td>{canWrite && <td className="table-actions"><button disabled={tab === 'actual' && row.status === 'APPROVED'} title={row.status === 'APPROVED' ? 'Approved expenses cannot be edited' : undefined} onClick={() => setModal({ type: tab, item: row })}>Edit</button>{tab === 'estimated' && <button className="danger" onClick={() => removeEstimate(row)}>Delete</button>}</td>}</tr>)}{tab === 'actual' && expensesLoading ? <tr><td colSpan={canWrite ? 9 : 8} className="empty-state">Loading expenses…</td></tr> : !visible.length && <tr><td colSpan={tab === 'actual' ? (canWrite ? 9 : 8) : (canWrite ? 8 : 7)} className="empty-state">{search ? 'No matching entries.' : tab === 'actual' ? 'No expenses recorded for this festival yet.' : 'Plan items such as decorations, food, lighting, or entertainment.'}</td></tr>}</tbody></table></div>{tab === 'actual' && <div className="expense-pagination-bar"><label>Rows per page <select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}>{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>{totalPages > 1 && <nav className="table-pagination" aria-label="Expense pages"><button disabled={page === 0 || expensesLoading} onClick={() => setPage(0)}>«</button><button disabled={page === 0 || expensesLoading} onClick={() => setPage((value) => Math.max(0, value - 1))}>‹</button><span>Page {page + 1} of {totalPages}</span><button disabled={page + 1 >= totalPages || expensesLoading} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>›</button><button disabled={page + 1 >= totalPages || expensesLoading} onClick={() => setPage(totalPages - 1)}>»</button></nav>}</div>}</>}
      {canWrite && modal?.type === 'actual' && <ExpenseModal open financialYear={`${festival.year}-${festival.year + 1}`} festival={festival} expense={modal.item} onClose={() => setModal(null)} onSaved={refresh} />}
      {canWrite && modal?.type === 'estimated' && <EstimateModal festivalId={festivalEventId} item={modal.item} onClose={() => setModal(null)} onSaved={refresh} />}
    </>}
    </div>
  </Shell>
}

const EstimateModal = ({ festivalId, item, onClose, onSaved }) => {
  const ref = useRef(null)
  const [form, setForm] = useState(item || { description: '', categoryName: '', vendorName: '', quantity: '1', unitCost: '', remarks: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    const dialog = ref.current; const focus = document.activeElement; const overflow = document.body.style.overflow
    dialog.showModal(); document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; focus?.focus() }
  }, [])
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const save = async (event) => {
    event.preventDefault(); if (saving) return; setSaving(true)
    const payload = { ...form, description: form.description.trim(), categoryName: form.categoryName.trim(), quantity: Number(form.quantity), unitCost: Number(form.unitCost) }
    try {
      if (item) await festivalEventAPI.updateEstimate(festivalId, item.id, payload)
      else await festivalEventAPI.createEstimate(festivalId, payload)
      toast.success('Estimate saved'); onSaved(); onClose()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to save estimate') }
    finally { setSaving(false) }
  }
  return <dialog ref={ref} className="festival-payment-modal" aria-labelledby="estimate-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}><header className="festival-payment-heading"><div><h2 id="estimate-title">{item ? 'Edit estimate' : 'Add estimated expense'}</h2><p>Plan costs without recording a payment.</p></div><button aria-label="Close estimate" disabled={saving} onClick={onClose}>×</button></header><form onSubmit={save}><div className="form-grid two"><label>Description<input required maxLength={200} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Stage decoration" /></label><label>Category<input required maxLength={100} value={form.categoryName} onChange={(e) => update('categoryName', e.target.value)} placeholder="Decorations" /></label><label>Vendor / supplier<input maxLength={200} value={form.vendorName || ''} onChange={(e) => update('vendorName', e.target.value)} /></label><label>Quantity<input required type="number" min="0.001" max="999999999.999" step="0.001" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} /></label><label>Estimated unit cost<input required type="number" min="0" max="9999999999.99" step="0.01" value={form.unitCost} onChange={(e) => update('unitCost', e.target.value)} /></label><label>Remarks<textarea maxLength={1000} value={form.remarks || ''} onChange={(e) => update('remarks', e.target.value)} /></label></div><p className="receipt-total">Estimated amount <strong>{formatCurrency(Number(form.quantity || 0) * Number(form.unitCost || 0))}</strong></p><div className="form-actions"><button type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save estimate'}</button></div></form></dialog>
}
