import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { kiranaProductAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const units = ['KG', 'GRAM', 'LITRE', 'ML', 'PIECE', 'PACKET']

const initialForm = {
  productName: '',
  category: '',
  unit: 'PIECE',
  purchasePrice: '',
  sellingPrice: '',
  openingStock: '0',
  lowStockAlertQty: '',
  barcode: ''
}

export const ProductForm = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(productId)

  useEffect(() => {
    if (!isEdit) return
    kiranaProductAPI.getProduct(productId)
      .then((response) => {
        const product = response.data
        setForm({
          productName: product.productName || '',
          category: product.category || '',
          unit: product.unit || 'PIECE',
          purchasePrice: product.purchasePrice || '',
          sellingPrice: product.sellingPrice || '',
          openingStock: product.openingStock || '0',
          lowStockAlertQty: product.lowStockAlertQty || '',
          barcode: product.barcode || ''
        })
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load product'))
  }, [isEdit, productId])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (Number(form.sellingPrice) < Number(form.purchasePrice)) {
      toast.error('Selling price should not be lower than purchase price')
      return
    }

    const payload = {
      productName: form.productName.trim(),
      category: form.category.trim() || null,
      unit: form.unit,
      purchasePrice: Number(form.purchasePrice),
      sellingPrice: Number(form.sellingPrice),
      openingStock: Number(form.openingStock || 0),
      lowStockAlertQty: form.lowStockAlertQty === '' ? null : Number(form.lowStockAlertQty),
      barcode: form.barcode.trim() || null
    }

    setSaving(true)
    try {
      if (isEdit) await kiranaProductAPI.updateProduct(productId, payload)
      else await kiranaProductAPI.createProduct(payload)
      toast.success(isEdit ? 'Product updated' : 'Product created')
      navigate('/kirana/products')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save product')
    } finally {
      setSaving(false)
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title={isEdit ? 'Edit Product' : 'Add Product'} eyebrow="Kirana module">
        <p className="muted">Product inventory is available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title={isEdit ? 'Edit Product' : 'Add Product'} eyebrow="Kirana module">
      <form className="form-panel narrow" onSubmit={handleSubmit}>
        <div className="form-grid two">
          <label>
            Product Name
            <input value={form.productName} onChange={(event) => update('productName', event.target.value)} required />
          </label>
          <label>
            Category
            <input value={form.category} onChange={(event) => update('category', event.target.value)} placeholder="Grocery, Dairy, Snacks" />
          </label>
          <label>
            Unit
            <select value={form.unit} onChange={(event) => update('unit', event.target.value)} required>
              {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <label>
            Barcode
            <input value={form.barcode} onChange={(event) => update('barcode', event.target.value)} />
          </label>
          <label>
            Purchase Price
            <input type="number" min="0.01" step="0.01" value={form.purchasePrice} onChange={(event) => update('purchasePrice', event.target.value)} required />
          </label>
          <label>
            Selling Price
            <input type="number" min="0.01" step="0.01" value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} required />
          </label>
          <label>
            Opening Stock
            <input type="number" min="0" step="0.001" value={form.openingStock} onChange={(event) => update('openingStock', event.target.value)} required disabled={isEdit} />
          </label>
          <label>
            Low Stock Alert Qty
            <input type="number" min="0" step="0.001" value={form.lowStockAlertQty} onChange={(event) => update('lowStockAlertQty', event.target.value)} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/kirana/products')}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</button>
        </div>
      </form>
    </Shell>
  )
}
