import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyVendorAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const VendorList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const canWrite = currentAccount?.role !== 'MEMBER'
  const [vendors, setVendors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const load = () => {
    if (currentAccount?.accountType !== 'SOCIETY') return setLoading(false)
    setLoading(true)
    societyVendorAPI.getVendors().then(({ data }) => setVendors(Array.isArray(data) ? data : [])).catch((error) => toast.error(error.response?.data?.message || 'Unable to load vendors')).finally(() => setLoading(false))
  }
  useEffect(load, [currentAccount?.accountType])
  const visible = useMemo(() => { const q = search.trim().toLowerCase(); return vendors.filter((v) => !q || [v.supplierName, v.mobile, v.email].filter(Boolean).some((x) => String(x).toLowerCase().includes(q))) }, [vendors, search])
  const remove = async (id) => { if (!window.confirm('Delete this vendor?')) return; try { await societyVendorAPI.deleteVendor(id); toast.success('Vendor deleted'); load() } catch (error) { toast.error(error.response?.data?.message || 'Delete failed') } }
  if (currentAccount?.accountType !== 'SOCIETY') return <Shell title="Vendors" eyebrow="Society module"><p className="muted">Vendors are available for society accounts.</p></Shell>
  return <Shell title="Vendors" eyebrow="Society module" actions={canWrite && <Link className="button-link" to="/society/vendors/new">Add Vendor</Link>}>
    <SummaryGrid items={[["Vendors", vendors.length], ["Opening Balance", formatCurrency(vendors.reduce((s, v) => s + Number(v.openingBalance || 0), 0))], ["Shown", visible.length]]} />
    <section className="toolbar-panel"><input placeholder="Search vendor, mobile, email" value={search} onChange={(e) => setSearch(e.target.value)} /><strong>{visible.length} shown</strong></section>
    <div className="table-wrap"><table><thead><tr><th>Vendor</th><th>Mobile</th><th>Email</th><th>Address</th><th className="numeric">Opening Balance</th><th>Actions</th></tr></thead><tbody>
      {visible.map((v) => <tr key={v.id}><td>{v.supplierName}</td><td>{v.mobile}</td><td>{v.email || '-'}</td><td>{v.address || '-'}</td><td className="numeric">{formatCurrency(v.openingBalance)}</td><td className="table-actions">{canWrite ? <><button onClick={() => navigate(`/society/vendors/${v.id}/edit`)}>Edit</button><button className="danger" onClick={() => remove(v.id)}>Delete</button></> : <span className="muted">View only</span>}</td></tr>)}
      {!loading && !visible.length && <tr><td colSpan="6" className="empty-state">No vendors found.</td></tr>}
    </tbody></table></div>{loading && <p className="muted">Loading vendors...</p>}
  </Shell>
}
