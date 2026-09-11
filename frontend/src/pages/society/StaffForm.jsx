import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyStaffAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { useI18n } from '../../i18n'
import { Shell } from '../DashboardRouter'

const initial = { staffName: '', designation: 'Supervisor', employmentType: 'DIRECT', agencyName: '', mobile: '', email: '', address: '', joiningDate: '', monthlySalary: '0' }

export const StaffForm = () => {
  const { tx } = useI18n(), { staffId } = useParams(), navigate = useNavigate(), { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initial), [saving, setSaving] = useState(false), isEdit = Boolean(staffId)
  useEffect(() => { if (!isEdit) return; societyStaffAPI.getStaffMember(staffId).then(({ data }) => setForm({ staffName: data.staffName || '', designation: data.designation || '', mobile: data.mobile || '', email: data.email || '', employmentType: data.employmentType || 'DIRECT', agencyName: data.agencyName || '', address: data.address || '', joiningDate: data.joiningDate || '', monthlySalary: data.monthlySalary || '0' })).catch((e) => toast.error(e.response?.data?.message || tx('Unable to load staff member'))) }, [isEdit, staffId, tx])
  const submit = async (event) => { event.preventDefault(); setSaving(true); const payload = { ...form, monthlySalary: Number(form.monthlySalary || 0), joiningDate: form.joiningDate || null }; try { if (isEdit) await societyStaffAPI.updateStaff(staffId, payload); else await societyStaffAPI.createStaff(payload); toast.success(tx(isEdit ? 'Staff member updated' : 'Staff member added')); navigate('/society/staff') } catch (e) { toast.error(e.response?.data?.message || tx('Unable to save staff member')) } finally { setSaving(false) } }
  if (currentAccount?.accountType !== 'SOCIETY') return <Shell title="Staff" eyebrow="Society module"><p className="muted">{tx('Staff are available for society accounts.')}</p></Shell>
  return <Shell title={isEdit ? 'Edit Staff' : 'Add Staff'} eyebrow="Society module"><form className="form-panel narrow" onSubmit={submit}>
    <div className="form-grid two">
      <label>{tx('Name')}<input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} required /></label>
      <label>{tx('Designation')}<input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required /></label>
      <label>{tx('Employment Type')}<select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value, agencyName: e.target.value === 'AGENCY' ? form.agencyName : '' })}><option value="DIRECT">{tx('Direct')}</option><option value="AGENCY">{tx('Agency')}</option><option value="CONTRACT">{tx('Contract')}</option></select></label>
      {form.employmentType === 'AGENCY' && <label>{tx('Agency Name')}<input value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} required /></label>}
      <label>{tx('Mobile')}<input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></label>
      <label>{tx('Email')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>{tx('Joining Date')}<input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></label>
      <label>{tx('Monthly Salary')}<input type="number" min="0" step="0.01" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} /></label>
    </div>
    <label>{tx('Address')}<textarea rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
    <div className="form-actions"><button type="button" onClick={() => navigate('/society/staff')}>{tx('Cancel')}</button><button className="primary" disabled={saving}>{saving ? tx('Saving...') : tx('Save Staff')}</button></div>
  </form></Shell>
}
