import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { kiranaProductAPI, kiranaPurchaseAPI, kiranaSupplierAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const today = new Date().toISOString().slice(0, 10)
const newItem = () => ({ productId: '', quantity: '1', purchasePrice: '' })

export const PurchaseForm = () => {
  const navigate = useNavigate()
  const { purchaseId } = useParams()
  const { currentAccount } = useAuthStore()
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    purchaseDate: today,
    supplierId: '',
    invoiceNumber: '',
    paymentMode: 'CASH',
    discount: '0',
    amountPaid: '',
    remarks: '',
    items: [newItem()]
  })

  useEffect(() => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') return
    Promise.all([kiranaProductAPI.getProducts(), kiranaSupplierAPI.getSuppliers()])
      .then(([productResponse, supplierResponse]) => {
        setProducts(Array.isArray(productResponse.data) ? productResponse.data : [])
        setSuppliers(Array.isArray(supplierResponse.data) ? supplierResponse.data : [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load purchase masters'))
  }, [currentAccount?.accountType])

  useEffect(() => {
    if (!purchaseId) return
    kiranaPurchaseAPI.getPurchase(purchaseId)
      .then(({ data }) => setForm({
        purchaseDate: data.purchaseDate,
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber || '',
        paymentMode: data.paymentMode,
        discount: data.discount ?? '0',
        amountPaid: data.amountPaid ?? '',
        remarks: data.remarks || '',
        items: (data.items || []).map((item) => ({ productId: item.productId, quantity: item.quantity, purchasePrice: item.purchasePrice }))
      }))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load purchase'))
  }, [purchaseId])

  const totals = useMemo(() => {
    const totalAmount = form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.purchasePrice || 0), 0)
    const discount = Number(form.discount || 0)
    const netAmount = Math.max(totalAmount - discount, 0)
    const amountPaid = form.amountPaid === '' ? (form.paymentMode === 'CREDIT' ? 0 : netAmount) : Number(form.amountPaid || 0)
    const balanceAmount = Math.max(netAmount - amountPaid, 0)
    return { totalAmount, discount, netAmount, amountPaid, balanceAmount }
  }, [form])

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === 'productId') {
          const product = products.find((entry) => String(entry.id) === String(value))
          return { ...item, productId: value, purchasePrice: product?.purchasePrice || '' }
        }
        return { ...item, [field]: value }
      })
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (totals.amountPaid > totals.netAmount) {
      toast.error('Amount paid cannot exceed net amount')
      return
    }
    const payload = {
      purchaseDate: form.purchaseDate,
      supplierId: Number(form.supplierId),
      invoiceNumber: form.invoiceNumber.trim(),
      paymentMode: form.paymentMode,
      discount: Number(form.discount || 0),
      amountPaid: totals.amountPaid,
      remarks: form.remarks.trim() || null,
      items: form.items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice)
      }))
    }
    setSaving(true)
    try {
      if (purchaseId) await kiranaPurchaseAPI.updatePurchase(purchaseId, payload)
      else await kiranaPurchaseAPI.createPurchase(payload)
      toast.success(purchaseId ? 'Purchase updated' : 'Purchase saved')
      navigate('/kirana/purchases')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save purchase')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title={purchaseId ? 'Edit Purchase' : 'New Purchase'} eyebrow="Kirana module">
        <p className="muted">Purchases are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={purchaseId ? 'Edit Purchase' : 'New Purchase'} eyebrow="Kirana module">
      <SummaryGrid items={[
        ['Total', formatCurrency(totals.totalAmount)],
        ['Discount', formatCurrency(totals.discount)],
        ['Net Amount', formatCurrency(totals.netAmount)],
        ['Balance', formatCurrency(totals.balanceAmount)]
      ]} />

      <form className="form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Purchase Date
            <input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} required />
          </label>
          <label>
            Supplier
            <select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })} required>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName} - {supplier.mobile}</option>)}
            </select>
          </label>
          <label>
            Invoice Number
            <input value={form.invoiceNumber} onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} required />
          </label>
          <label>
            Payment Mode
            <select value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value, amountPaid: '' })}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank</option>
              <option value="NEFT">NEFT</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CREDIT">Credit</option>
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
        </div>

        <div className="line-items">
          {form.items.map((item, index) => {
            const lineTotal = Number(item.quantity || 0) * Number(item.purchasePrice || 0)
            return (
              <section className="line-item-row" key={index}>
                <label>
                  Product
                  <select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)} required>
                    <option value="">Select product</option>
                    {products.map((entry) => <option key={entry.id} value={entry.id}>{entry.productName} ({entry.unit})</option>)}
                  </select>
                </label>
                <label>
                  Quantity
                  <input type="number" min="0.01" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                </label>
                <label>
                  Purchase Price
                  <input type="number" min="0.01" step="0.01" value={item.purchasePrice} onChange={(event) => updateItem(index, 'purchasePrice', event.target.value)} required />
                </label>
                <strong>{formatCurrency(lineTotal)}</strong>
                {form.items.length > 1 && <button type="button" className="danger" onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>}
              </section>
            )
          })}
        </div>

        <label>
          Remarks
          <textarea rows="3" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
        </label>

        <div className="form-actions">
          <button type="button" onClick={() => setForm({ ...form, items: [...form.items, newItem()] })}>Add Item</button>
          <button type="button" onClick={() => navigate('/kirana/purchases')}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : purchaseId ? 'Update Purchase' : 'Save Purchase'}</button>
        </div>
      </form>
    </Shell>
  )
}
