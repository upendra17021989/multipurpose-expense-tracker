import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sharedExpenseAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

export const SharedExpenseGroups = () => {
  const { currentAccount } = useAuthStore()
  const [groups, setGroups] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const load = () => sharedExpenseAPI.getGroups().then(r => setGroups(r.data || [])).catch(e => toast.error(e.response?.data?.message || 'Unable to load groups')).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const create = async (event) => { event.preventDefault(); if (!name.trim()) return; try { await sharedExpenseAPI.createGroup({ name: name.trim() }); setName(''); load(); toast.success('Group created') } catch (e) { toast.error(e.response?.data?.message || 'Unable to create group') } }
  if (currentAccount?.accountType !== 'INDIVIDUAL') return <Shell title="Shared Expenses"><p className="muted">Available for personal accounts only.</p></Shell>
  return <Shell title="Shared Expenses" eyebrow="Personal module">
    <section className="form-panel"><h2>Create group</h2><form className="inline-form" onSubmit={create}><input placeholder="Trip, Home, Friends..." value={name} onChange={e => setName(e.target.value)} maxLength="150" required /><button className="primary">Create</button></form></section>
    <section className="report-panel"><h2>Your groups</h2><div className="action-grid">{groups.map(g => <Link className="action-card" key={g.id} to={`/personal/shared-expenses/${g.id}`}><strong>{g.name}</strong><span>{g.members.length} member{g.members.length === 1 ? '' : 's'}</span></Link>)}</div>{!loading && !groups.length && <p className="empty-state">Create your first shared-expense group.</p>}{loading && <p className="muted">Loading groups...</p>}</section>
  </Shell>
}
