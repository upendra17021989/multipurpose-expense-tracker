import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sharedExpenseAPI } from '../../api/endpoints'
import { useI18n } from '../../i18n'
import { formatCurrency } from '../../utils/format'
import { Shell } from '../DashboardRouter'

export const SharedExpenseFriends = () => {
  const { tx } = useI18n()
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
    <Shell title="Friends" eyebrow="Shared expenses" actions={<Link className="button-link" to="/personal/shared-expenses">{tx('Groups')}</Link>}>
      <section className="shared-friends-hero">
        <div>
          <span>{tx('Shared network')}</span>
          <h2>{friends.length} {tx(friends.length === 1 ? 'registered friend' : 'registered friends')} {tx('across')} {stats.sharedGroups} {tx('shared group links')}</h2>
          <p>{tx('Track who is settled, who owes, and who gets money back across accepted invitations.')}</p>
        </div>
        <div className="shared-group-pulse">
          <article><span>{tx('Gets back')}</span><strong>{stats.gets}</strong></article>
          <article><span>{tx('Owes')}</span><strong>{stats.owes}</strong></article>
          <article><span>{tx('Settled')}</span><strong>{Math.max(friends.length - stats.gets - stats.owes, 0)}</strong></article>
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
            <b>{friend.balance > 0 ? `${tx('Gets')} ${formatCurrency(friend.balance)}` : friend.balance < 0 ? `${tx('Owes')} ${formatCurrency(-friend.balance)}` : tx('Settled')}</b>
            <small>{friend.sharedGroups} {tx(friend.sharedGroups === 1 ? 'shared group' : 'shared groups')}</small>
          </article>
        ))}
      </section>

      <section className="report-panel">
        <h2>{tx('Registered friends')}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{tx('Name')}</th><th>{tx('Contact')}</th><th>{tx('Shared groups')}</th><th>{tx('Net across shared groups')}</th></tr>
            </thead>
            <tbody>
              {friends.map((friend) => (
                <tr key={friend.userId}>
                  <td>{friend.name}</td>
                  <td>{friend.email || friend.mobile || '-'}</td>
                  <td>{friend.sharedGroups}</td>
                  <td className="numeric">{friend.balance > 0 ? `${tx('Gets')} ${formatCurrency(friend.balance)}` : friend.balance < 0 ? `${tx('Owes')} ${formatCurrency(-friend.balance)}` : tx('Settled')}</td>
                </tr>
              ))}
              {!loading && !friends.length && <tr><td colSpan="4" className="empty-state">{tx('Accepted group invitations will appear here.')}</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="muted">{tx('Loading friends...')}</p>}
      </section>
    </Shell>
  )
}
