import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sharedExpenseAPI } from '../../api/endpoints'
import { formatCurrency } from '../../utils/format'
import { Shell } from '../DashboardRouter'

export const SharedExpenseFriends = () => {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sharedExpenseAPI.getFriends()
      .then((response) => setFriends(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load friends'))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const gets = friends.filter((friend) => Number(friend.balance || 0) > 0).length
    const owes = friends.filter((friend) => Number(friend.balance || 0) < 0).length
    const sharedGroups = friends.reduce((total, friend) => total + Number(friend.sharedGroups || 0), 0)
    return { gets, owes, sharedGroups }
  }, [friends])

  return (
    <Shell title="Friends" eyebrow="Shared expenses" actions={<Link className="button-link" to="/personal/shared-expenses">Groups</Link>}>
      <section className="shared-friends-hero">
        <div>
          <span>Shared network</span>
          <h2>{friends.length} registered friend{friends.length === 1 ? '' : 's'} across {stats.sharedGroups} shared group links</h2>
          <p>Track who is settled, who owes, and who gets money back across accepted invitations.</p>
        </div>
        <div className="shared-group-pulse">
          <article><span>Gets back</span><strong>{stats.gets}</strong></article>
          <article><span>Owes</span><strong>{stats.owes}</strong></article>
          <article><span>Settled</span><strong>{Math.max(friends.length - stats.gets - stats.owes, 0)}</strong></article>
        </div>
      </section>

      <section className="shared-friend-grid">
        {friends.map((friend) => (
          <article className="shared-friend-card" key={friend.userId}>
            <span>{friend.name?.charAt(0)?.toUpperCase() || 'F'}</span>
            <div>
              <strong>{friend.name}</strong>
              <small>{friend.email || friend.mobile || '-'}</small>
            </div>
            <b>{friend.balance > 0 ? `Gets ${formatCurrency(friend.balance)}` : friend.balance < 0 ? `Owes ${formatCurrency(-friend.balance)}` : 'Settled'}</b>
            <small>{friend.sharedGroups} shared group{friend.sharedGroups === 1 ? '' : 's'}</small>
          </article>
        ))}
      </section>

      <section className="report-panel">
        <h2>Registered friends</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Contact</th><th>Shared groups</th><th>Net across shared groups</th></tr>
            </thead>
            <tbody>
              {friends.map((friend) => (
                <tr key={friend.userId}>
                  <td>{friend.name}</td>
                  <td>{friend.email || friend.mobile || '-'}</td>
                  <td>{friend.sharedGroups}</td>
                  <td className="numeric">{friend.balance > 0 ? `Gets ${formatCurrency(friend.balance)}` : friend.balance < 0 ? `Owes ${formatCurrency(-friend.balance)}` : 'Settled'}</td>
                </tr>
              ))}
              {!loading && !friends.length && <tr><td colSpan="4" className="empty-state">Accepted group invitations will appear here.</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="muted">Loading friends...</p>}
      </section>
    </Shell>
  )
}
