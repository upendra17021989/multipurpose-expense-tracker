import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyStaffAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const StaffList = () => {
  const navigate = useNavigate(); const { currentAccount } = useAuthStore(); const [staff, setStaff] = useState([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true)
  const load = () => { if (currentAccount?.accountType !== 'SOCIETY') return setLoading(false); setLoading(true); societyStaffAPI.getStaff().then(({ data }) => setStaff(Array.isArray(data) ? data : [])).catch((e) => toast.error(e.response?.data?.message || 'Unable to load staff')).finally(() => setLoading(false)) }
  useEffect(load, [currentAccount?.accountType])
  const visible = useMemo(() => { const q = search.trim().toLowerCase(); return staff.filter((s) => !q || [s.staffName, s.designation, s.mobile].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))) }, [staff, search])
  const remove = async (id) => { if (!window.confirm('Remove this staff member?')) return; try { await societyStaffAPI.deleteStaff(id); toast.success('Staff member removed'); load() } catch (e) { toast.error(e.response?.data?.message || 'Delete failed') } }
  if (currentAccount?.accountType !== 'SOCIETY') return <Shell title="Staff" eyebrow="Society module"><p className="muted">Staff are available for society accounts.</p></Shell>
  return <Shell title="Society Staff" eyebrow="Society module" actions={<Link className="button-link" to="/society/staff/new">Add Staff</Link>}>
    <SummaryGrid items={[["Active Staff", staff.length], ["Monthly Payroll", formatCurrency(staff.reduce((sum, s) => sum + Number(s.monthlySalary || 0), 0))], ["Shown", visible.length]]} />
    <section className="toolbar-panel"><input placeholder="Search name, designation, mobile" value={search} onChange={(e) => setSearch(e.target.value)} /><strong>{visible.length} shown</strong></section>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Designation</th><th>Mobile</th><th>Joining Date</th><th className="numeric">Monthly Salary</th><th>Actions</th></tr></thead><tbody>
      {visible.map((s) => <tr key={s.id}><td>{s.staffName}</td><td>{s.designation}</td><td>{s.mobile || '-'}</td><td>{s.joiningDate ? formatDate(s.joiningDate) : '-'}</td><td className="numeric">{formatCurrency(s.monthlySalary)}</td><td className="table-actions"><button onClick={() => navigate(`/society/staff/${s.id}/edit`)}>Edit</button><button className="danger" onClick={() => remove(s.id)}>Remove</button></td></tr>)}
      {!loading && !visible.length && <tr><td colSpan="6" className="empty-state">No staff members found.</td></tr>}
    </tbody></table></div>{loading && <p className="muted">Loading staff...</p>}
  </Shell>
}
