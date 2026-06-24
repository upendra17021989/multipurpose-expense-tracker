import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { kiranaCustomerAPI, kiranaLedgerAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)

export const CustomerCreditLedger = () => {
  const { currentAccount } = useAuthStore()
  const [customers, setCustomers] = useState([])
  const [entries, setEntries] = useState([])
  const [customerId, setCustomerId] = useState('')
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
      kiranaCustomerAPI.getCustomers(),
      kiranaLedgerAPI.getCustomerLedger(customerId || null)
    ])
      .then(([customerResponse, ledgerResponse]) => {
        setCustomers(Array.isArray(customerResponse.data) ? customerResponse.data : [])
        setEntries(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load customer ledger'))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [currentAccount?.accountType, customerId])

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId))
  const totals = useMemo(() => ({
    debit: entries.reduce((sum, entry) => sum + Number(entry.debitAmount || 0), 0),
    credit: entries.reduce((sum, entry) => sum + Number(entry.creditAmount || 0), 0),
    balance: customerId ? Number(selectedCustomer?.currentCredit || 0) : customers.reduce((sum, customer) => sum + Number(customer.currentCredit || 0), 0)
  }), [entries, customers, customerId, selectedCustomer])

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!customerId) {
      toast.error('Select a customer before recording payment')
      return
    }
    setSaving(true)
    try {
      await kiranaLedgerAPI.recordCustomerPayment(customerId, {
        transactionDate: form.transactionDate,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        referenceId: form.referenceId.trim() || null,
        remarks: form.remarks.trim() || null
      })
      toast.success('Customer payment recorded')
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
      <Shell title="Customer Credit Ledger" eyebrow="Kirana module">
        <p className="muted">Customer ledgers are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Customer Credit Ledger" eyebrow="Kirana module" actions={<Link className="button-link" to="/kirana/supplier-payments">Supplier Dues</Link>}>
      <SummaryGrid items={[
        ['Credit Sales', formatCurrency(totals.debit)],
        ['Payments', formatCurrency(totals.credit)],
        ['Current Credit', formatCurrency(totals.balance)],
        ['Entries', entries.length]
      ]} />

      <section className="toolbar-panel">
        <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">All customers</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerName} - {formatCurrency(customer.currentCredit)}</option>)}
        </select>
        <strong>{entries.length} entries</strong>
      </section>

      <form className="inline-form" onSubmit={submitPayment}>
        <input type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} required />
        <input type="number" min="0.01" step="0.01" placeholder="Amount received" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
        <select value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })}>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank</option>
          <option value="CARD">Card</option>
        </select>
        <input placeholder="Reference" value={form.referenceId} onChange={(event) => setForm({ ...form, referenceId: event.target.value })} />
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
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
                <td>{entry.customerName}</td>
                <td>{entry.transactionType}</td>
                <td className="numeric">{formatCurrency(entry.debitAmount)}</td>
                <td className="numeric">{formatCurrency(entry.creditAmount)}</td>
                <td className="numeric">{formatCurrency(entry.balanceAmount)}</td>
                <td>{entry.paymentMode || '-'}</td>
                <td>{entry.referenceId || '-'}</td>
                <td>{entry.remarks || '-'}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && <tr><td colSpan="9" className="empty-state">No customer ledger entries found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading customer ledger...</p>}
    </Shell>
  )
}
