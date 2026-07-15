import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { sportsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell, SummaryGrid } from '../DashboardRouter'

const initialForm = { memberName: '', mobile: '', email: '', role: 'MEMBER' }

export const SportsMembers = () => {
  const { currentAccount } = useAuthStore()
  const isSportsAdmin = ['OWNER', 'ADMIN', 'TREASURER'].includes(currentAccount?.role)
  const [members, setMembers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastPassword, setLastPassword] = useState(null)
  const [bulkLogins, setBulkLogins] = useState([])
  const [membershipRequests, setMembershipRequests] = useState([])

  const loadMembers = () => {
    setLoading(true)
    sportsAPI.getMembers()
      .then((response) => setMembers(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load members'))
      .finally(() => setLoading(false))
  }

  useEffect(loadMembers, [])
  useEffect(() => {
    if (isSportsAdmin) sportsAPI.getMembershipRequests().then((response) => setMembershipRequests(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load join requests'))
  }, [isSportsAdmin])

  const decideMembership = async (id, approve) => {
    try {
      if (approve) await sportsAPI.approveMembership(id)
      else await sportsAPI.rejectMembership(id)
      setMembershipRequests((current) => current.filter((item) => item.id !== id))
      toast.success(approve ? 'Member approved' : 'Join request rejected')
      if (approve) loadMembers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update join request')
    }
  }

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
      let response
      if (editingId) response = await sportsAPI.updateMember(editingId, payload)
      else response = await sportsAPI.createMember(payload)
      setLastPassword(response?.data?.defaultPassword ? { memberName: response.data.memberName, mobile: response.data.mobile, password: response.data.defaultPassword } : null)
      toast.success(editingId ? 'Member updated' : 'Member added')
      reset()
      loadMembers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save member')
    }
  }

  const edit = (member) => {
    setEditingId(member.id)
    setLastPassword(null)
    setForm({ memberName: member.memberName || '', mobile: member.mobile || '', email: member.email || '', role: member.role || '' })
  }


  const generateLogins = async () => {
    if (!window.confirm('Generate login passwords for existing members without users?')) return
    try {
      const response = await sportsAPI.generateMemberLogins()
      const results = response.data || []
      setBulkLogins(results)
      const created = results.filter((item) => item.created).length
      toast.success(`${created} login${created === 1 ? '' : 's'} created`)
      loadMembers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to generate member logins')
    }
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
      {isSportsAdmin && membershipRequests.length > 0 && <section className="report-panel sports-join-requests">
        <div className="sports-join-requests-heading">
          <div><h2>Pending join requests</h2><p className="muted">Review people requesting access to this sports workspace.</p></div>
          <span className="sports-request-count">{membershipRequests.length}</span>
        </div>
        <div className="table-wrap sports-join-requests-table">
          <table>
            <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Actions</th></tr></thead>
            <tbody>{membershipRequests.map((request) => <tr key={request.id}>
              <td data-label="Name"><strong>{request.name}</strong></td>
              <td data-label="Mobile">{request.mobile || '-'}</td>
              <td data-label="Email" className="sports-request-email">{request.email || '-'}</td>
              <td data-label="Actions" className="table-actions sports-request-actions">
                <button className="primary" type="button" onClick={() => decideMembership(request.id, true)}>Approve</button>
                <button className="danger" type="button" onClick={() => decideMembership(request.id, false)}>Reject</button>
              </td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
      {isSportsAdmin && <form className="inline-form" onSubmit={submit}>
        <input placeholder="Member name" value={form.memberName} onChange={(event) => setForm({ ...form, memberName: event.target.value })} required />
        <input placeholder="Mobile" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
          <option value="TREASURER">Treasurer</option>
        </select>
        <button className="primary" type="submit">{editingId ? 'Update' : 'Add'} Member</button>
        {editingId && <button type="button" onClick={reset}>Cancel</button>}
      </form>}
      {isSportsAdmin && <section className="toolbar-panel flat-toolbar"><button type="button" onClick={generateLogins}>Generate Missing Logins</button></section>}
      {isSportsAdmin && lastPassword && <section className="toolbar-panel flat-toolbar"><strong>Default login</strong><span>{lastPassword.memberName} ({lastPassword.mobile})</span><code>{lastPassword.password}</code></section>}
      {isSportsAdmin && bulkLogins.length > 0 && <section className="toolbar-panel flat-toolbar"><strong>Generated logins</strong>{bulkLogins.map((item) => <span key={item.sportsMemberId}>{item.memberName} ({item.mobile}) - {item.defaultPassword ? <code>{item.defaultPassword}</code> : item.message}</span>)}</section>}
      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search member, mobile, role" value={search} onChange={(event) => setSearch(event.target.value)} />
        <strong>{visibleMembers.length} shown</strong>
      </section>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Role</th><th>Status</th>{isSportsAdmin && <th>Actions</th>}</tr></thead>
          <tbody>
            {visibleMembers.map((member) => (
              <tr key={member.id}>
                <td>{member.memberName}</td><td>{member.mobile || '-'}</td><td>{member.email || '-'}</td><td>{member.role || '-'}</td><td>{member.active ? 'Active' : 'Inactive'}</td>
                {isSportsAdmin && <td className="table-actions"><button onClick={() => edit(member)}>Edit</button><button className="danger" onClick={() => remove(member.id)}>Delete</button></td>}
              </tr>
            ))}
            {!loading && visibleMembers.length === 0 && <tr><td colSpan={isSportsAdmin ? 6 : 5} className="empty-state">No members found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading members...</p>}
    </Shell>
  )
}


