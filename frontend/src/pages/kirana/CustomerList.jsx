import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { kiranaCustomerAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const CustomerList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadCustomers = () => {
    if (currentAccount?.accountType !== 'KIRANA_STORE') {
      setLoading(false)
      return
    }
    setLoading(true)
    kiranaCustomerAPI.getCustomers()
      .then((response) => setCustomers(Array.isArray(response.data) ? response.data : []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load customers'))
      .finally(() => setLoading(false))
  }

  useEffect(loadCustomers, [currentAccount?.accountType])

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((customer) => !query || [customer.customerName, customer.mobile, customer.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)))
  }, [customers, search])

  const totalCredit = customers.reduce((sum, customer) => sum + Number(customer.currentCredit || 0), 0)

  const remove = async (customerId) => {
    if (!window.confirm('Delete this customer?')) return
    try {
      await kiranaCustomerAPI.deleteCustomer(customerId)
      toast.success('Customer deleted')
      loadCustomers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  if (currentAccount?.accountType !== 'KIRANA_STORE') {
    return (
      <Shell title="Customers" eyebrow="Kirana module">
        <p className="muted">Customers are available for kirana store accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell title="Customers" eyebrow="Kirana module" actions={<Link className="button-link" to="/kirana/customers/new">Add Customer</Link>}>
      <SummaryGrid items={[
        ['Customers', customers.length],
        ['Total Udhaar', formatCurrency(totalCredit)],
        ['With Credit', customers.filter((customer) => Number(customer.currentCredit || 0) > 0).length],
        ['Shown', visibleCustomers.length]
      ]} />

      <section className="toolbar-panel">
        <input placeholder="Search customer, mobile, email" value={search} onChange={(event) => setSearch(event.target.value)} />
        <strong>{visibleCustomers.length} shown</strong>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Address</th>
              <th className="numeric">Opening</th>
              <th className="numeric">Current Credit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.customerName}</td>
                <td>{customer.mobile}</td>
                <td>{customer.email || '-'}</td>
                <td>{customer.address || '-'}</td>
                <td className="numeric">{formatCurrency(customer.openingCredit)}</td>
                <td className="numeric">{formatCurrency(customer.currentCredit)}</td>
                <td className="table-actions">
                  <button onClick={() => navigate(`/kirana/customers/${customer.id}/edit`)}>Edit</button>
                  <button className="danger" onClick={() => remove(customer.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && visibleCustomers.length === 0 && <tr><td colSpan="7" className="empty-state">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading customers...</p>}
    </Shell>
  )
}
