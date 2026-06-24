import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { kiranaLedgerAPI, kiranaSupplierAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)

export const SupplierPaymentLedger = () => {
  const { currentAccount } = useAuthStore()
  const [suppliers, setSuppliers] = useState([])
  const [entries, setEntries] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [form, setForm] = useState({ transactionDate: today, amount: '', paymentMode: 'CASH', referenceId: '', remarks: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = () => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      kiranaSupplierAPI.getSuppliers(),
      kiranaLedgerAPI.getSupplierLedger(supplierId || null)
    ])
      .then(([supplierResponse, ledgerResponse]) => {
        setSuppliers(Array.isArray(supplierResponse.data) ? supplierResponse.data : [])
        setEntries(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load supplier ledger'))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [currentAccount?.accountType, supplierId])

  const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === String(supplierId))
  const totals = useMemo(() => ({
    debit: entries.reduce((sum, entry) => sum + Number(entry.debitAmount || 0), 0),
    credit: entries.reduce((sum, entry) => sum + Number(entry.creditAmount || 0), 0),
    balance: supplierId ? Number(selectedSupplier?.currentDue || 0) : suppliers.reduce((sum, supplier) => sum + Number(supplier.currentDue || 0), 0)
  }), [entries, suppliers, supplierId, selectedSupplier])

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!supplierId) {
      toast.error('Select a supplier before recording payment')
      return
    }
    setSaving(true)
    try {
      await kiranaLedgerAPI.recordSupplierPayment(supplierId, {
        transactionDate: form.transactionDate,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        referenceId: form.referenceId.trim() || null,
        remarks: form.remarks.trim() || null
      })
      toast.success('Supplier payment recorded')
      setForm({ transactionDate: today, amount: '', paymentMode: 'CASH', referenceId: '', remarks: '' })
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to record payment')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title="Supplier Payment Ledger" eyebrow="Kirana module">
        <p className="muted">Supplier ledgers are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Supplier Payment Ledger" eyebrow="Kirana module" actions={<Link className="button-link" to="/kirana/customer-credit">Customer Credit</Link>}>
      <SummaryGrid items={[
        ['Purchase Credits', formatCurrency(totals.debit)],
        ['Payments Made', formatCurrency(totals.credit)],
        ['Current Due', formatCurrency(totals.balance)],
        ['Entries', entries.length]
      ]} />

      <section className="toolbar-panel">
        <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="">All suppliers</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName} - {formatCurrency(supplier.currentDue)}</option>)}
        </select>
        <strong>{entries.length} entries</strong>
      </section>

      <form className="inline-form" onSubmit={submitPayment}>
        <input type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} required />
        <input type="number" min="0.01" step="0.01" placeholder="Amount paid" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
        <select value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })}>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank</option>
          <option value="NEFT">NEFT</option>
          <option value="CHEQUE">Cheque</option>
        </select>
        <input placeholder="Reference" value={form.referenceId} onChange={(event) => setForm({ ...form, referenceId: event.target.value })} />
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Type</th>
              <th className="numeric">Debit</th>
              <th className="numeric">Credit</th>
              <th className="numeric">Balance</th>
              <th>Mode</th>
              <th>Reference</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDate(entry.transactionDate)}</td>
                <td>{entry.supplierName}</td>
                <td>{entry.transactionType}</td>
                <td className="numeric">{formatCurrency(entry.debitAmount)}</td>
                <td className="numeric">{formatCurrency(entry.creditAmount)}</td>
                <td className="numeric">{formatCurrency(entry.balanceAmount)}</td>
                <td>{entry.paymentMode || '-'}</td>
                <td>{entry.referenceId || '-'}</td>
                <td>{entry.remarks || '-'}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && <tr><td colSpan="9" className="empty-state">No supplier ledger entries found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading supplier ledger...</p>}
    </Shell>
  )
}
