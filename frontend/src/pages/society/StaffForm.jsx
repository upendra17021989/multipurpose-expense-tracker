import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyStaffAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

const initial = { staffName: '', designation: 'Supervisor', mobile: '', email: '', address: '', joiningDate: '', monthlySalary: '0' }

export const StaffForm = () => {
  const { staffId } = useParams(); const navigate = useNavigate(); const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false); const isEdit = Boolean(staffId)
  useEffect(() => { if (!isEdit) return; societyStaffAPI.getStaffMember(staffId).then(({ data }) => setForm({
    staffName: data.staffName || '', designation: data.designation || '', mobile: data.mobile || '', email: data.email || '',
    address: data.address || '', joiningDate: data.joiningDate || '', monthlySalary: data.monthlySalary || '0'
  })).catch((e) => toast.error(e.response?.data?.message || 'Unable to load staff member')) }, [isEdit, staffId])
  const submit = async (event) => { event.preventDefault(); setSaving(true); const payload = { ...form, monthlySalary: Number(form.monthlySalary || 0), joiningDate: form.joiningDate || null }
    try { if (isEdit) await societyStaffAPI.updateStaff(staffId, payload); else await societyStaffAPI.createStaff(payload); toast.success(isEdit ? 'Staff member updated' : 'Staff member added'); navigate('/society/staff') }
    catch (e) { toast.error(e.response?.data?.message || 'Unable to save staff member') } finally { setSaving(false) } }
  if (currentAccount?.accountType !== 'SOCIETY') return <Shell title="Staff" eyebrow="Society module"><p className="muted">Staff are available for society accounts.</p></Shell>
  return <Shell title={isEdit ? 'Edit Staff' : 'Add Staff'} eyebrow="Society module"><form className="form-panel narrow" onSubmit={submit}>
    <div className="form-grid two">
      <label>Name<input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} required /></label>
      <label>Designation<input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required /></label>
      <label>Mobile<input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></label>
      <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Joining Date<input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></label>
      <label>Monthly Salary<input type="number" min="0" step="0.01" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} /></label>
    </div>
    <label>Address<textarea rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
    <div className="form-actions"><button type="button" onClick={() => navigate('/society/staff')}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Staff'}</button></div>
  </form></Shell>
}
