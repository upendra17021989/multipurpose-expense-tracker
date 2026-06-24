import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'react-toastify'
import { expenseAPI, kiranaCustomerAPI, kiranaProductAPI, kiranaPurchaseAPI, kiranaSalesAPI, kiranaSupplierAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { exportWorkbook, numberValue } from '../../utils/exportExcel'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const colors = ['#0f766e', '#2563eb', '#c2410c', '#7c3aed', '#ca8a04', '#be123c', '#475569']

export const KiranaReports = () => {
  const { currentAccount } = useAuthStore()
  const [sales, setSales] = useState([])
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [filters, setFilters] = useState({ startDate: monthStart(), endDate: today() })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') {
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      kiranaSalesAPI.getSales(),
      kiranaPurchaseAPI.getPurchases(),
      kiranaProductAPI.getProducts(),
      kiranaCustomerAPI.getCustomers(),
      kiranaSupplierAPI.getSuppliers(),
      expenseAPI.getExpenses().catch(() => ({ data: [] }))
    ])
      .then(([saleResponse, purchaseResponse, productResponse, customerResponse, supplierResponse, expenseResponse]) => {
        setSales(Array.isArray(saleResponse.data) ? saleResponse.data : [])
        setPurchases(Array.isArray(purchaseResponse.data) ? purchaseResponse.data : [])
        setProducts(Array.isArray(productResponse.data) ? productResponse.data : [])
        setCustomers(Array.isArray(customerResponse.data) ? customerResponse.data : [])
        setSuppliers(Array.isArray(supplierResponse.data) ? supplierResponse.data : [])
        setExpenses(Array.isArray(expenseResponse.data) ? expenseResponse.data : [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load kirana reports'))
      .finally(() => setLoading(false))
  }, [currentAccount?.accountType])

  const report = useMemo(() => buildReport({ sales, purchases, products, customers, suppliers, expenses, filters }), [sales, purchases, products, customers, suppliers, expenses, filters])

  const exportReport = () => {
    exportWorkbook([
      {
        name: 'Summary',
        rows: [
          { Metric: 'Net Sales', Amount: report.netSales },
          { Metric: 'Purchases', Amount: report.netPurchases },
          { Metric: 'Store Expenses', Amount: report.storeExpenses },
          { Metric: 'Gross Margin', Amount: report.grossProfit },
          { Metric: 'Estimated Net Profit', Amount: report.estimatedNetProfit },
          { Metric: 'Inventory Value', Amount: report.inventoryValue },
          { Metric: 'Customer Credit', Amount: report.customerCredit },
          { Metric: 'Supplier Dues', Amount: report.supplierDues }
        ]
      },
      {
        name: 'Sales',
        rows: report.filteredSales.map((sale) => ({
          Date: sale.saleDate,
          Customer: sale.customerName || 'Walk-in',
          PaymentMode: sale.paymentMode,
          Total: numberValue(sale.totalAmount),
          Discount: numberValue(sale.discount),
          Net: numberValue(sale.netAmount),
          Paid: numberValue(sale.amountPaid),
          Balance: numberValue(sale.balanceAmount)
        }))
      },
      {
        name: 'Purchases',
        rows: report.filteredPurchases.map((purchase) => ({
          Date: purchase.purchaseDate,
          Supplier: purchase.supplierName,
          Invoice: purchase.invoiceNumber,
          PaymentMode: purchase.paymentMode,
          Total: numberValue(purchase.totalAmount),
          Discount: numberValue(purchase.discount),
          Net: numberValue(purchase.netAmount),
          Paid: numberValue(purchase.amountPaid),
          Balance: numberValue(purchase.balanceAmount)
        }))
      },
      {
        name: 'Low Stock',
        rows: report.lowStockProducts.map((product) => ({
          Product: product.productName,
          Category: product.category || '',
          Unit: product.unit,
          CurrentStock: numberValue(product.currentStock),
          AlertQty: numberValue(product.lowStockAlertQty),
          InventoryValue: numberValue(product.currentStock) * numberValue(product.purchasePrice)
        }))
      }
    ], `kirana-report-${filters.startDate}-to-${filters.endDate}`)
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title="Kirana Reports" eyebrow="Kirana module">
        <p className="muted">Kirana reports are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Kirana Reports" eyebrow="Kirana module" actions={<button className="primary" onClick={exportReport}>Export Excel</button>}>
      <section className="toolbar-panel">
        <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
        <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
        <strong>{report.salesCount} sales</strong>
      </section>

      <SummaryGrid items={[
        ['Net Sales', formatCurrency(report.netSales)],
        ['Purchases', formatCurrency(report.netPurchases)],
        ['Store Expenses', formatCurrency(report.storeExpenses)],
        ['Est. Net Profit', formatCurrency(report.estimatedNetProfit)],
        ['Gross Margin', formatCurrency(report.grossProfit)],
        ['Inventory Value', formatCurrency(report.inventoryValue)],
        ['Customer Credit', formatCurrency(report.customerCredit)],
        ['Supplier Dues', formatCurrency(report.supplierDues)]
      ]} />

      <section className="report-grid">
        <article className="report-panel">
          <h2>Sales by Payment Mode</h2>
          {report.paymentModeData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={report.paymentModeData} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                  {report.paymentModeData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No sales in selected date range.</p>}
        </article>

        <article className="report-panel">
          <h2>Daily Sales vs Purchases</h2>
          {report.dailyData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={report.dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `₹${value}`} width={58} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="sales" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" fill="#c2410c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No daily report data yet.</p>}
        </article>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Low Stock Product</th>
              <th>Category</th>
              <th>Unit</th>
              <th className="numeric">Current Stock</th>
              <th className="numeric">Alert Qty</th>
              <th className="numeric">Inventory Value</th>
            </tr>
          </thead>
          <tbody>
            {report.lowStockProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.productName}</td>
                <td>{product.category || '-'}</td>
                <td>{product.unit}</td>
                <td className="numeric"><span className="stock-low">{product.currentStock}</span></td>
                <td className="numeric">{product.lowStockAlertQty}</td>
                <td className="numeric">{formatCurrency(Number(product.currentStock || 0) * Number(product.purchasePrice || 0))}</td>
              </tr>
            ))}
            {!loading && report.lowStockProducts.length === 0 && <tr><td colSpan="6" className="empty-state">No low stock products.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading reports...</p>}
    </Shell>
  )
}

const buildReport = ({ sales, purchases, products, customers, suppliers, expenses, filters }) => {
  const inRange = (date) => (!filters.startDate || date >= filters.startDate) && (!filters.endDate || date <= filters.endDate)
  const filteredSales = sales.filter((sale) => inRange(sale.saleDate))
  const filteredPurchases = purchases.filter((purchase) => inRange(purchase.purchaseDate))
  const filteredExpenses = expenses.filter((expense) => inRange(expense.expenseDate))

  const netSales = sum(filteredSales, 'netAmount')
  const netPurchases = sum(filteredPurchases, 'netAmount')
  const storeExpenses = sum(filteredExpenses, 'amount')
  const inventoryValue = products.reduce((total, product) => total + Number(product.currentStock || 0) * Number(product.purchasePrice || 0), 0)
  const customerCredit = sum(customers, 'currentCredit')
  const supplierDues = sum(suppliers, 'currentDue')
  const grossProfit = filteredSales.reduce((total, sale) => {
    return total + (sale.items || []).reduce((itemTotal, item) => {
      const product = products.find((entry) => String(entry.id) === String(item.productId))
      return itemTotal + Number(item.quantity || 0) * (Number(item.sellingPrice || 0) - Number(product?.purchasePrice || 0))
    }, 0)
  }, 0)

  const paymentModes = new Map()
  filteredSales.forEach((sale) => paymentModes.set(sale.paymentMode, (paymentModes.get(sale.paymentMode) || 0) + Number(sale.netAmount || 0)))

  const daily = new Map()
  filteredSales.forEach((sale) => {
    const day = sale.saleDate
    daily.set(day, { day, sales: (daily.get(day)?.sales || 0) + Number(sale.netAmount || 0), purchases: daily.get(day)?.purchases || 0 })
  })
  filteredPurchases.forEach((purchase) => {
    const day = purchase.purchaseDate
    daily.set(day, { day, sales: daily.get(day)?.sales || 0, purchases: (daily.get(day)?.purchases || 0) + Number(purchase.netAmount || 0) })
  })

  return {
    netSales,
    netPurchases,
    storeExpenses,
    inventoryValue,
    customerCredit,
    supplierDues,
    grossProfit,
    estimatedNetProfit: grossProfit - storeExpenses,
    salesCount: filteredSales.length,
    paymentModeData: [...paymentModes.entries()].map(([name, amount]) => ({ name, amount })),
    dailyData: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)).map((entry) => ({ ...entry, day: entry.day.slice(5) })),
    lowStockProducts: products.filter((product) => Number(product.lowStockAlertQty || 0) > 0 && Number(product.currentStock || 0) <= Number(product.lowStockAlertQty || 0))
    ,
    filteredSales,
    filteredPurchases
  }
}

const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0)
const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 7)}-01`
