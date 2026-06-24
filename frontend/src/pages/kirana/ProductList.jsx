import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { kiranaProductAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const ProductList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [products, setProducts] = useState([])
  const [filters, setFilters] = useState({ search: '', stock: '', category: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProducts = () => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    kiranaProductAPI.getProducts()
      .then((response) => setProducts(Array.isArray(response.data) ? response.data : []))
      .catch((error) => {
        const message = error.response?.data?.message || 'Unable to load products'
        setProducts([])
        setError(message)
        toast.error(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadProducts, [currentAccount?.accountType])

  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products])

  const visibleProducts = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return products
      .filter((product) => !query || [product.productName, product.category, product.barcode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)))
      .filter((product) => !filters.category || product.category === filters.category)
      .filter((product) => {
        const currentStock = Number(product.currentStock || 0)
        const lowStockQty = Number(product.lowStockAlertQty || 0)
        const isLowStock = lowStockQty > 0 && currentStock <= lowStockQty
        if (filters.stock === 'LOW') return isLowStock
        if (filters.stock === 'AVAILABLE') return currentStock > 0
        if (filters.stock === 'OUT') return currentStock <= 0
        return true
      })
  }, [products, filters])

  const summary = useMemo(() => {
    const inventoryValue = products.reduce((sum, product) => sum + Number(product.currentStock || 0) * Number(product.purchasePrice || 0), 0)
    const lowStockCount = products.filter((product) => {
      const currentStock = Number(product.currentStock || 0)
      const lowStockQty = Number(product.lowStockAlertQty || 0)
      return lowStockQty > 0 && currentStock <= lowStockQty
    }).length
    const outOfStockCount = products.filter((product) => Number(product.currentStock || 0) <= 0).length
    return { inventoryValue, lowStockCount, outOfStockCount }
  }, [products])

  const deleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return
    try {
      await kiranaProductAPI.deleteProduct(productId)
      toast.success('Product deleted')
      loadProducts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title="Products" eyebrow="Kirana module">
        <p className="muted">Product inventory is available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Product Inventory" eyebrow="Kirana module" actions={<Link className="button-link" to="/kirana/products/new">Add Product</Link>}>
      <SummaryGrid items={[
        ['Products', products.length],
        ['Inventory Value', formatCurrency(summary.inventoryValue)],
        ['Low Stock', summary.lowStockCount],
        ['Out of Stock', summary.outOfStockCount]
      ]} />

      <section className="toolbar-panel">
        <input placeholder="Search product, category, barcode" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select value={filters.stock} onChange={(event) => setFilters({ ...filters, stock: event.target.value })}>
          <option value="">All stock</option>
          <option value="LOW">Low stock</option>
          <option value="AVAILABLE">Available</option>
          <option value="OUT">Out of stock</option>
        </select>
        <strong>{visibleProducts.length} shown</strong>
      </section>

      {error && <section className="alert-panel error">{error}</section>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Unit</th>
              <th className="numeric">Purchase</th>
              <th className="numeric">Selling</th>
              <th className="numeric">Stock</th>
              <th className="numeric">Low Alert</th>
              <th>Barcode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => {
              const isLowStock = Number(product.lowStockAlertQty || 0) > 0 && Number(product.currentStock || 0) <= Number(product.lowStockAlertQty || 0)
              return (
                <tr key={product.id}>
                  <td>{product.productName}</td>
                  <td>{product.category || '-'}</td>
                  <td>{product.unit}</td>
                  <td className="numeric">{formatCurrency(product.purchasePrice)}</td>
                  <td className="numeric">{formatCurrency(product.sellingPrice)}</td>
                  <td className="numeric">
                    <span className={isLowStock ? 'stock-low' : ''}>{product.currentStock}</span>
                  </td>
                  <td className="numeric">{product.lowStockAlertQty || '-'}</td>
                  <td>{product.barcode || '-'}</td>
                  <td className="table-actions">
                    <button onClick={() => navigate(`/kirana/products/${product.id}/edit`)}>Edit</button>
                    <button className="danger" onClick={() => deleteProduct(product.id)}>Delete</button>
                  </td>
                </tr>
              )
            })}
            {!loading && visibleProducts.length === 0 && <tr><td colSpan="9" className="empty-state">No products found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading products...</p>}
    </Shell>
  )
}
