import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { kiranaSalesAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { exportWorkbook, numberValue } from '../../utils/exportExcel'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const SalesList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [sales, setSales] = useState([])
  const [filters, setFilters] = useState({ search: '', paymentMode: '', startDate: '', endDate: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') {
      setLoading(false)
      return
    }
    setLoading(true)
    kiranaSalesAPI.getSales()
      .then((response) => setSales(Array.isArray(response.data) ? response.data : []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load sales'))
      .finally(() => setLoading(false))
  }, [currentAccount?.accountType])

  const visibleSales = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return sales
      .filter((sale) => !query || [sale.customerName, sale.paymentMode, sale.remarks]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)))
      .filter((sale) => !filters.paymentMode || sale.paymentMode === filters.paymentMode)
      .filter((sale) => !filters.startDate || sale.saleDate >= filters.startDate)
      .filter((sale) => !filters.endDate || sale.saleDate <= filters.endDate)
  }, [sales, filters])

  const totalSales = visibleSales.reduce((sum, sale) => sum + Number(sale.netAmount || 0), 0)
  const totalCredit = visibleSales.reduce((sum, sale) => sum + Number(sale.balanceAmount || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const todaySales = sales.filter((sale) => sale.saleDate === today).reduce((sum, sale) => sum + Number(sale.netAmount || 0), 0)

  const exportSales = () => {
    exportWorkbook([
      {
        name: 'Sales',
        rows: visibleSales.map((sale) => ({
          Date: sale.saleDate,
          Customer: sale.customerName || 'Walk-in',
          PaymentMode: sale.paymentMode,
          Items: sale.items?.length || 0,
          Total: numberValue(sale.totalAmount),
          Discount: numberValue(sale.discount),
          Net: numberValue(sale.netAmount),
          Paid: numberValue(sale.amountPaid),
          Balance: numberValue(sale.balanceAmount),
          Remarks: sale.remarks || ''
        }))
      },
      {
        name: 'Sale Items',
        rows: visibleSales.flatMap((sale) => (sale.items || []).map((item) => ({
          SaleId: sale.id,
          Date: sale.saleDate,
          Customer: sale.customerName || 'Walk-in',
          Product: item.productName,
          Quantity: numberValue(item.quantity),
          SellingPrice: numberValue(item.sellingPrice),
          LineTotal: numberValue(item.lineTotal)
        })))
      }
    ], 'kirana-sales')
  }

  const cancelSale = async (saleId) => {
    if (!window.confirm('Cancel this sale and restore its stock?')) return
    try {
      await kiranaSalesAPI.cancelSale(saleId)
      setSales((current) => current.filter((sale) => sale.id !== saleId))
      toast.success('Sale cancelled')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to cancel sale')
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title="Sales" eyebrow="Kirana module">
        <p className="muted">Sales are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Sales"
      eyebrow="Kirana module"
      actions={<><button onClick={exportSales}>Export Excel</button><Link className="button-link" to="/kirana/sales/new">New Sale</Link></>}
    >
      <SummaryGrid items={[
        ['Today Sales', formatCurrency(todaySales)],
        ['Filtered Sales', formatCurrency(totalSales)],
        ['Credit Pending', formatCurrency(totalCredit)],
        ['Bills', visibleSales.length]
      ]} />

      <section className="toolbar-panel">
        <input placeholder="Search customer, mode, remarks" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.paymentMode} onChange={(event) => setFilters({ ...filters, paymentMode: event.target.value })}>
          <option value="">All payment modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="CREDIT">Credit</option>
          <option value="MIXED">Mixed</option>
        </select>
        <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
        <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Payment</th>
              <th className="numeric">Items</th>
              <th className="numeric">Total</th>
              <th className="numeric">Discount</th>
              <th className="numeric">Net</th>
              <th className="numeric">Paid</th>
              <th className="numeric">Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleSales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDate(sale.saleDate)}</td>
                <td>{sale.customerName || 'Walk-in'}</td>
                <td>{sale.paymentMode}</td>
                <td className="numeric">{sale.items?.length || 0}</td>
                <td className="numeric">{formatCurrency(sale.totalAmount)}</td>
                <td className="numeric">{formatCurrency(sale.discount)}</td>
                <td className="numeric">{formatCurrency(sale.netAmount)}</td>
                <td className="numeric">{formatCurrency(sale.amountPaid)}</td>
                <td className="numeric">{formatCurrency(sale.balanceAmount)}</td>
                <td className="table-actions"><button onClick={() => navigate(`/kirana/sales/${sale.id}/edit`)}>Edit</button><button className="danger" onClick={() => cancelSale(sale.id)}>Cancel</button></td>
              </tr>
            ))}
            {!loading && visibleSales.length === 0 && <tr><td colSpan="10" className="empty-state">No sales found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading sales...</p>}
    </Shell>
  )
}
