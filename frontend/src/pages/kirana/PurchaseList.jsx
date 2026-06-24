import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { kiranaPurchaseAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const PurchaseList = () => {
  const { currentAccount } = useAuthStore()
  const [purchases, setPurchases] = useState([])
  const [filters, setFilters] = useState({ search: '', paymentMode: '', startDate: '', endDate: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') {
      setLoading(false)
      return
    }
    setLoading(true)
    kiranaPurchaseAPI.getPurchases()
      .then((response) => setPurchases(Array.isArray(response.data) ? response.data : []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load purchases'))
      .finally(() => setLoading(false))
  }, [currentAccount?.accountType])

  const visiblePurchases = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return purchases
      .filter((purchase) => !query || [purchase.supplierName, purchase.invoiceNumber, purchase.paymentMode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)))
      .filter((purchase) => !filters.paymentMode || purchase.paymentMode === filters.paymentMode)
      .filter((purchase) => !filters.startDate || purchase.purchaseDate >= filters.startDate)
      .filter((purchase) => !filters.endDate || purchase.purchaseDate <= filters.endDate)
  }, [purchases, filters])

  const totalPurchase = visiblePurchases.reduce((sum, purchase) => sum + Number(purchase.netAmount || 0), 0)
  const totalDue = visiblePurchases.reduce((sum, purchase) => sum + Number(purchase.balanceAmount || 0), 0)

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title="Purchases" eyebrow="Kirana module">
        <p className="muted">Purchases are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Purchases" eyebrow="Kirana module" actions={<Link className="button-link" to="/kirana/purchases/new">New Purchase</Link>}>
      <SummaryGrid items={[
        ['Filtered Purchase', formatCurrency(totalPurchase)],
        ['Supplier Due', formatCurrency(totalDue)],
        ['Bills', visiblePurchases.length],
        ['All Purchases', purchases.length]
      ]} />

      <section className="toolbar-panel">
        <input placeholder="Search supplier, invoice, mode" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.paymentMode} onChange={(event) => setFilters({ ...filters, paymentMode: event.target.value })}>
          <option value="">All payment modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank</option>
          <option value="NEFT">NEFT</option>
          <option value="CHEQUE">Cheque</option>
          <option value="CREDIT">Credit</option>
        </select>
        <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
        <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Invoice</th>
              <th>Payment</th>
              <th className="numeric">Items</th>
              <th className="numeric">Total</th>
              <th className="numeric">Discount</th>
              <th className="numeric">Net</th>
              <th className="numeric">Paid</th>
              <th className="numeric">Balance</th>
            </tr>
          </thead>
          <tbody>
            {visiblePurchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{formatDate(purchase.purchaseDate)}</td>
                <td>{purchase.supplierName}</td>
                <td>{purchase.invoiceNumber}</td>
                <td>{purchase.paymentMode}</td>
                <td className="numeric">{purchase.items?.length || 0}</td>
                <td className="numeric">{formatCurrency(purchase.totalAmount)}</td>
                <td className="numeric">{formatCurrency(purchase.discount)}</td>
                <td className="numeric">{formatCurrency(purchase.netAmount)}</td>
                <td className="numeric">{formatCurrency(purchase.amountPaid)}</td>
                <td className="numeric">{formatCurrency(purchase.balanceAmount)}</td>
              </tr>
            ))}
            {!loading && visiblePurchases.length === 0 && <tr><td colSpan="10" className="empty-state">No purchases found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading purchases...</p>}
    </Shell>
  )
}
