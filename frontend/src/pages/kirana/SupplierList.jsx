import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { kiranaSupplierAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const SupplierList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadSuppliers = () => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') {
      setLoading(false)
      return
    }
    setLoading(true)
    kiranaSupplierAPI.getSuppliers()
      .then((response) => setSuppliers(Array.isArray(response.data) ? response.data : []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load suppliers'))
      .finally(() => setLoading(false))
  }

  useEffect(loadSuppliers, [currentAccount?.accountType])

  const visibleSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return suppliers.filter((supplier) => !query || [supplier.supplierName, supplier.mobile, supplier.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)))
  }, [suppliers, search])

  const totalDue = suppliers.reduce((sum, supplier) => sum + Number(supplier.currentDue || 0), 0)

  const remove = async (supplierId) => {
    if (!window.confirm('Delete this supplier?')) return
    try {
      await kiranaSupplierAPI.deleteSupplier(supplierId)
      toast.success('Supplier deleted')
      loadSuppliers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title="Suppliers" eyebrow="Kirana module">
        <p className="muted">Suppliers are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Suppliers" eyebrow="Kirana module" actions={<Link className="button-link" to="/kirana/suppliers/new">Add Supplier</Link>}>
      <SummaryGrid items={[
        ['Suppliers', suppliers.length],
        ['Total Due', formatCurrency(totalDue)],
        ['With Dues', suppliers.filter((supplier) => Number(supplier.currentDue || 0) > 0).length],
        ['Shown', visibleSuppliers.length]
      ]} />

      <section className="toolbar-panel">
        <input placeholder="Search supplier, mobile, email" value={search} onChange={(event) => setSearch(event.target.value)} />
        <strong>{visibleSuppliers.length} shown</strong>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Address</th>
              <th className="numeric">Opening</th>
              <th className="numeric">Current Due</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td>{supplier.supplierName}</td>
                <td>{supplier.mobile}</td>
                <td>{supplier.email || '-'}</td>
                <td>{supplier.address || '-'}</td>
                <td className="numeric">{formatCurrency(supplier.openingBalance)}</td>
                <td className="numeric">{formatCurrency(supplier.currentDue)}</td>
                <td className="table-actions">
                  <button onClick={() => navigate(`/kirana/suppliers/${supplier.id}/edit`)}>Edit</button>
                  <button className="danger" onClick={() => remove(supplier.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && visibleSuppliers.length === 0 && <tr><td colSpan="7" className="empty-state">No suppliers found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading suppliers...</p>}
    </Shell>
  )
}
