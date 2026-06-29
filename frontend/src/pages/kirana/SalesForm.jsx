import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { kiranaCustomerAPI, kiranaProductAPI, kiranaSalesAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)
const newItem = () => ({ productId: '', quantity: '1', sellingPrice: '' })

export const SalesForm = () => {
  const navigate = useNavigate()
  const { saleId } = useParams()
  const { currentAccount } = useAuthStore()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    saleDate: today,
    customerId: '',
    paymentMode: 'CASH',
    discount: '0',
    amountPaid: '',
    remarks: '',
    items: [newItem()]
  })

  useEffect(() => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') return
    Promise.all([kiranaProductAPI.getProducts(), kiranaCustomerAPI.getCustomers()])
      .then(([productResponse, customerResponse]) => {
        setProducts(Array.isArray(productResponse.data) ? productResponse.data : [])
        setCustomers(Array.isArray(customerResponse.data) ? customerResponse.data : [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sale masters'))
  }, [currentAccount?.accountType])

  useEffect(() => {
    if (!saleId) return
    kiranaSalesAPI.getSale(saleId)
      .then(({ data }) => setForm({
        saleDate: data.saleDate,
        customerId: data.customerId || '',
        paymentMode: data.paymentMode,
        discount: data.discount ?? '0',
        amountPaid: data.amountPaid ?? '',
        remarks: data.remarks || '',
        items: (data.items || []).map((item) => ({ productId: item.productId, quantity: item.quantity, sellingPrice: item.sellingPrice }))
      }))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sale'))
  }, [saleId])

  const totals = useMemo(() => {
    const totalAmount = form.items.reduce((sum, item) => {
      const product = products.find((entry) => String(entry.id) === String(item.productId))
      const price = Number(item.sellingPrice || product?.sellingPrice || 0)
      return sum + Number(item.quantity || 0) * price
    }, 0)
    const discount = Number(form.discount || 0)
    const netAmount = Math.max(totalAmount - discount, 0)
    const amountPaid = form.amountPaid === '' ? (form.paymentMode === 'CREDIT' ? 0 : netAmount) : Number(form.amountPaid || 0)
    const balanceAmount = Math.max(netAmount - amountPaid, 0)
    return { totalAmount, discount, netAmount, amountPaid, balanceAmount }
  }, [form, products])

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === 'productId') {
          const product = products.find((entry) => String(entry.id) === String(value))
          return { ...item, productId: value, sellingPrice: product?.sellingPrice || '' }
        }
        return { ...item, [field]: value }
      })
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (totals.balanceAmount > 0 && !form.customerId) {
      toast.error('Select a customer for pending credit')
      return
    }
    if (totals.amountPaid > totals.netAmount) {
      toast.error('Amount paid cannot exceed net amount')
      return
    }

    const payload = {
      saleDate: form.saleDate,
      customerId: form.customerId ? Number(form.customerId) : null,
      paymentMode: form.paymentMode,
      discount: Number(form.discount || 0),
      amountPaid: totals.amountPaid,
      remarks: form.remarks.trim() || null,
      items: form.items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        sellingPrice: Number(item.sellingPrice)
      }))
    }

    setSaving(true)
    try {
      if (saleId) await kiranaSalesAPI.updateSale(saleId, payload)
      else await kiranaSalesAPI.createSale(payload)
      toast.success(saleId ? 'Sale updated' : 'Sale saved')
      navigate('/kirana/sales')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save sale')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title={saleId ? 'Edit Sale' : 'New Sale'} eyebrow="Kirana module">
        <p className="muted">Sales are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={saleId ? 'Edit Sale' : 'New Sale'} eyebrow="Kirana module">
      <SummaryGrid items={[
        ['Total', formatCurrency(totals.totalAmount)],
        ['Discount', formatCurrency(totals.discount)],
        ['Net Amount', formatCurrency(totals.netAmount)],
        ['Balance', formatCurrency(totals.balanceAmount)]
      ]} />

      <form className="form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Sale Date
            <input type="date" value={form.saleDate} onChange={(event) => setForm({ ...form, saleDate: event.target.value })} required />
          </label>
          <label>
            Customer
            <select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
              <option value="">Walk-in customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerName} - {customer.mobile}</option>)}
            </select>
          </label>
          <label>
            Payment Mode
            <select value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value, amountPaid: '' })}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="CREDIT">Credit</option>
              <option value="MIXED">Mixed</option>
            </select>
          </label>
          <label>
            Amount Paid
            <input type="number" min="0" step="0.01" value={form.amountPaid} placeholder={String(totals.amountPaid)} onChange={(event) => setForm({ ...form, amountPaid: event.target.value })} />
          </label>
          <label>
            Discount
            <input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} />
          </label>
          <label>
            Remarks
            <input value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
          </label>
        </div>

        <div className="line-items">
          {form.items.map((item, index) => {
            const product = products.find((entry) => String(entry.id) === String(item.productId))
            const lineTotal = Number(item.quantity || 0) * Number(item.sellingPrice || product?.sellingPrice || 0)
            return (
              <section className="line-item-row" key={index}>
                <label>
                  Product
                  <select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)} required>
                    <option value="">Select product</option>
                    {products.map((entry) => <option key={entry.id} value={entry.id}>{entry.productName} ({entry.currentStock} {entry.unit})</option>)}
                  </select>
                </label>
                <label>
                  Quantity
                  <input type="number" min="0.01" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                </label>
                <label>
                  Selling Price
                  <input type="number" min="0.01" step="0.01" value={item.sellingPrice} onChange={(event) => updateItem(index, 'sellingPrice', event.target.value)} required />
                </label>
                <strong>{formatCurrency(lineTotal)}</strong>
                {form.items.length > 1 && <button type="button" className="danger" onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>}
              </section>
            )
          })}
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => setForm({ ...form, items: [...form.items, newItem()] })}>Add Item</button>
          <button type="button" onClick={() => navigate('/kirana/sales')}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : saleId ? 'Update Sale' : 'Save Sale'}</button>
        </div>
      </form>
    </Shell>
  )
}
