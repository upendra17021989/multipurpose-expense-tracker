import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sharedExpenseAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

export const SharedExpenseGroups = () => {
  const { currentAccount } = useAuthStore()
  const [groups, setGroups] = useState([])
  const [invitations, setInvitations] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const load = () =>
    Promise.all([
      sharedExpenseAPI.getGroups(),
      sharedExpenseAPI.getInvitations()
    ])
      .then(([g, i]) => {
        setGroups(g.data || [])
        setInvitations(i.data || [])
      })
      .catch((e) =>
        toast.error(
          e.response?.data?.message || 'Unable to load shared expenses'
        )
      )
      .finally(() => setLoading(false))
  useEffect(() => {
    load()
  }, [])
  const create = async (event) => {
    event.preventDefault()
    if (!name.trim()) return
    try {
      await sharedExpenseAPI.createGroup({ name: name.trim() })
      setName('')
      load()
      toast.success('Group created')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to create group')
    }
  }
  const respond = async (id, accept) => {
    try {
      await (accept
        ? sharedExpenseAPI.acceptInvitation(id)
        : sharedExpenseAPI.declineInvitation(id))
      toast.success(accept ? 'Invitation accepted' : 'Invitation declined')
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to respond')
    }
  }
  const scrollToSection = (label) => {
    const heading = [...document.querySelectorAll('.page-shell h2')].find(
      (node) => node.textContent.trim() === label
    )
    heading?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const activeGroups = groups.filter((group) => group.active)
  const archivedGroups = groups.filter((group) => !group.active)
  const restore = async (group) => {
    if (!window.confirm(`Restore ${group.name}?`)) return
    try {
      await sharedExpenseAPI.updateGroup(group.id, {
        name: group.name,
        active: true
      })
      toast.success('Group restored')
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to restore group')
    }
  }
  if (currentAccount?.accountType !== 'INDIVIDUAL')
    return (
      <Shell title="Shared Expenses">
        <p className="muted">Available for personal accounts only.</p>
      </Shell>
    )
  return (
    <Shell title="Shared Expenses" eyebrow="Personal module">
      <nav
        className="shared-expense-submenu"
        aria-label="Shared expenses navigation"
      >
        <button
          className="active"
          type="button"
          onClick={() => scrollToSection('Your groups')}
        >
          Groups
        </button>
        <Link to="/personal/friends">Friends</Link>
        {!!invitations.length && (
          <button type="button" onClick={() => scrollToSection('Invitations')}>
            Invitations <span>{invitations.length}</span>
          </button>
        )}
      </nav>
      {!!invitations.length && (
        <section className="report-panel">
          <h2>Invitations</h2>
          {invitations.map((item) => (
            <div className="toolbar-panel" key={item.id}>
              <span>
                <strong>{item.invitedBy}</strong> invited you to{' '}
                {item.groupName}
              </span>
              <button
                className="primary"
                onClick={() => respond(item.id, true)}
              >
                Accept
              </button>
              <button onClick={() => respond(item.id, false)}>Decline</button>
            </div>
          ))}
        </section>
      )}
      <section className="form-panel">
        <h2>Create group</h2>
        <form className="inline-form" onSubmit={create}>
          <input
            placeholder="Trip, Home, Friends..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength="150"
            required
          />
          <button className="primary">Create</button>
        </form>
      </section>
      <section className="report-panel groups-panel">
        <div className="groups-panel-header">
          <div>
            <h2>Your groups</h2>
            <p>Open a group to manage members, expenses, and settlements.</p>
          </div>
          <span className="group-count">{activeGroups.length}</span>
        </div>
        <div className="action-grid group-card-grid">
          {activeGroups.map((g) => (
            <Link
              className="action-card group-card"
              key={g.id}
              to={`/personal/shared-expenses/${g.id}`}
            >
              <span className="group-card-icon" aria-hidden="true">
                {g.name.charAt(0).toUpperCase()}
              </span>
              <span className="group-card-copy">
                <strong>{g.name}</strong>
                <small>
                  {g.members.length} member{g.members.length === 1 ? '' : 's'}
                </small>
              </span>
              <span className="group-card-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>
          ))}
        </div>
        {!loading && !activeGroups.length && (
          <div className="groups-empty">
            <span aria-hidden="true">+</span>
            <strong>No active groups</strong>
            <p>Create a new group above or restore one below.</p>
          </div>
        )}
        {loading && (
          <div className="groups-loading">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </section>
      {!!archivedGroups.length && (
        <section className="report-panel archived-groups-panel">
          <div className="groups-panel-header">
            <div>
              <h2>Archived groups</h2>
              <p>Restore a group to make it active again.</p>
            </div>
            <span className="group-count muted-count">
              {archivedGroups.length}
            </span>
          </div>
          <div className="archived-group-list">
            {archivedGroups.map((group) => (
              <div className="archived-group-row" key={group.id}>
                <div>
                  <strong>{group.name}</strong>
                  <small>
                    {group.members.length} member
                    {group.members.length === 1 ? '' : 's'}
                  </small>
                </div>
                <button type="button" onClick={() => restore(group)}>
                  Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </Shell>
  )
}
