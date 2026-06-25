import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell, SummaryGrid } from '../DashboardRouter'

const initialForm = { memberName: '', mobile: '', email: '', role: '' }

export const SportsMembers = () => {
  const { currentAccount } = useAuthStore()
  const [members, setMembers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadMembers = () => {
    setLoading(true)
    sportsAPI.getMembers()
      .then((response) => setMembers(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load members'))
      .finally(() => setLoading(false))
  }

  useEffect(loadMembers, [])

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return members
    return members.filter((member) => [member.memberName, member.mobile, member.email, member.role]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)))
  }, [members, search])

  const reset = () => {
    setEditingId(null)
    setForm(initialForm)
  }

  const submit = async (event) => {
    event.preventDefault()
    const payload = {
      memberName: form.memberName.trim(),
      mobile: form.mobile.trim() || null,
      email: form.email.trim() || null,
      role: form.role.trim() || null
    }
    try {
      if (editingId) await sportsAPI.updateMember(editingId, payload)
      else await sportsAPI.createMember(payload)
      toast.success(editingId ? 'Member updated' : 'Member added')
      reset()
      loadMembers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save member')
    }
  }

  const edit = (member) => {
    setEditingId(member.id)
    setForm({ memberName: member.memberName || '', mobile: member.mobile || '', email: member.email || '', role: member.role || '' })
  }

  const remove = async (memberId) => {
    if (!window.confirm('Delete this member?')) return
    try {
      await sportsAPI.deleteMember(memberId)
      toast.success('Member deleted')
      loadMembers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  if (currentAccount?.accountType !== 'SPORTS') {
    return <Shell title="Sports Members" eyebrow="Sports"><p className="muted">Sports members are available for sports accounts.</p></Shell>
  }

  return (
    <Shell title="Sports Members" eyebrow="Sports module">
      <SummaryGrid items={[[ 'Total Members', members.length ], [ 'Shown', visibleMembers.length ]]} />
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Member name" value={form.memberName} onChange={(event) => setForm({ ...form, memberName: event.target.value })} required />
        <input placeholder="Mobile" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input placeholder="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
        <button className="primary" type="submit">{editingId ? 'Update' : 'Add'} Member</button>
        {editingId && <button type="button" onClick={reset}>Cancel</button>}
      </form>
      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search member, mobile, role" value={search} onChange={(event) => setSearch(event.target.value)} />
        <strong>{visibleMembers.length} shown</strong>
      </section>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {visibleMembers.map((member) => (
              <tr key={member.id}>
                <td>{member.memberName}</td><td>{member.mobile || '-'}</td><td>{member.email || '-'}</td><td>{member.role || '-'}</td><td>{member.active ? 'Active' : 'Inactive'}</td>
                <td className="table-actions"><button onClick={() => edit(member)}>Edit</button><button className="danger" onClick={() => remove(member.id)}>Delete</button></td>
              </tr>
            ))}
            {!loading && visibleMembers.length === 0 && <tr><td colSpan="6" className="empty-state">No members found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading members...</p>}
    </Shell>
  )
}