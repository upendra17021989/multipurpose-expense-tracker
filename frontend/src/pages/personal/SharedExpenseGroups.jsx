import { useEffect, useRef, useState } from 'react'
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
  const [activeView, setActiveView] = useState('groups')
  const actionRef = useRef(false)
  const [action, setAction] = useState(null)
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
    if (actionRef.current) return
    actionRef.current = true
    setAction('create')
    try {
      await sharedExpenseAPI.createGroup({ name: name.trim() })
      setName('')
      load()
      toast.success('Group created')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to create group')
    } finally {
      actionRef.current = false
      setAction(null)
    }
  }
  const respond = async (id, accept) => {
    if (actionRef.current) return
    actionRef.current = true
    setAction(`${accept ? 'accept' : 'decline'}-${id}`)
    try {
      await (accept
        ? sharedExpenseAPI.acceptInvitation(id)
        : sharedExpenseAPI.declineInvitation(id))
      toast.success(accept ? 'Invitation accepted' : 'Invitation declined')
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to respond')
    } finally {
      actionRef.current = false
      setAction(null)
    }
  }
  const activeGroups = groups.filter((group) => group.active)
  const archivedGroups = groups.filter((group) => !group.active)
  const memberCount = activeGroups.reduce((total, group) => total + (group.members?.length || 0), 0)
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
      <section className="shared-groups-hero">
        <div>
          <span>Split bills without losing the thread</span>
          <h2>Groups, friends, invitations, and archives in one place.</h2>
          <p>Create a group for trips, rent, household costs, events, or recurring shared spending.</p>
        </div>
        <form className="shared-groups-quick-create" onSubmit={create}>
          <label htmlFor="quick-group-name">New group</label>
          <div>
            <input
              id="quick-group-name"
              placeholder="Trip, Home, Friends..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength="150"
              required
            />
            <button className="primary" disabled={action !== null}>
              {action === 'create' ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </section>

      <section className="shared-groups-stats" aria-label="Shared expenses overview">
        <article><span>Active groups</span><strong>{activeGroups.length}</strong></article>
        <article><span>People involved</span><strong>{memberCount}</strong></article>
        <article><span>Invitations</span><strong>{invitations.length}</strong></article>
        <article><span>Archived</span><strong>{archivedGroups.length}</strong></article>
      </section>

      <nav
        className="shared-expense-submenu"
        aria-label="Shared expenses navigation"
      >
        <button
          className={activeView === 'groups' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('groups')}
        >
          Groups
        </button>
        <button
          className={activeView === 'create' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('create')}
        >
          Create Group
        </button>
        <Link to="/personal/friends">Friends</Link>
        <button
          className={activeView === 'invitations' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('invitations')}
        >
          Invitations
          {!!invitations.length && <span>{invitations.length}</span>}
        </button>
        <button
          className={activeView === 'archived' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('archived')}
        >
          Archived
          {!!archivedGroups.length && <span>{archivedGroups.length}</span>}
        </button>
      </nav>
      {activeView === 'invitations' && (
        <section className="report-panel shared-invitation-panel">
          <div className="groups-panel-header">
            <div>
              <h2>Invitations</h2>
              <p>Join groups shared with your registered account.</p>
            </div>
            <span className="group-count">{invitations.length}</span>
          </div>
          {invitations.map((item) => (
            <div className="shared-invitation-card" key={item.id}>
              <span aria-hidden="true">{item.groupName?.charAt(0)?.toUpperCase() || 'G'}</span>
              <div>
                <strong>{item.groupName}</strong>
                <small>{item.invitedBy} invited you</small>
              </div>
              <div className="table-actions">
                <button
                  className="primary"
                  disabled={action !== null}
                  onClick={() => respond(item.id, true)}
                >
                  {action === `accept-${item.id}` ? 'Accepting...' : 'Accept'}
                </button>
                <button disabled={action !== null} onClick={() => respond(item.id, false)}>
                  {action === `decline-${item.id}` ? 'Declining...' : 'Decline'}
                </button>
              </div>
            </div>
          ))}
          {!invitations.length && (
            <p className="empty-state">No pending invitations.</p>
          )}
        </section>
      )}
      {activeView === 'create' && (
        <section className="form-panel shared-create-panel">
          <h2>Create group</h2>
          <p className="muted">Use this for travel plans, flatmates, event collections, subscriptions, or any shared running balance.</p>
          <form className="inline-form" onSubmit={create}>
            <input
              placeholder="Trip, Home, Friends..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength="150"
              required
            />
            <button className="primary" disabled={action !== null}>
              {action === 'create' ? 'Creating...' : 'Create'}
            </button>
          </form>
        </section>
      )}
      {activeView === 'groups' && (
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
                  <em>Open balances, expenses, settlements</em>
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
      )}
      {activeView === 'archived' && (
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
                <div className="archived-group-actions">
                  <button type="button" onClick={() => restore(group)}>
                    Restore
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      if (!window.confirm(`Delete ${group.name}? This removes the group history permanently.`)) return
                      try {
                        await sharedExpenseAPI.deleteGroup(group.id)
                        toast.success('Group deleted')
                        load()
                      } catch (e) {
                        toast.error(e.response?.data?.message || 'Unable to delete group')
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

          </div>
          {!archivedGroups.length && (
            <p className="empty-state">No archived groups.</p>
          )}
        </section>
      )}
    </Shell>
  )
}
