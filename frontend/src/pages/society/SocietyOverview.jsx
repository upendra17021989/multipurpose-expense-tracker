import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { expenseAPI, societyFlatAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import './SocietyOverview.css'

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const SocietyOverview = () => {
  const account = useAuthStore((state) => state.currentAccount)
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [data, setData] = useState({ expenses: [], flats: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState('all')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [limit, setLimit] = useState(5)
  const canWrite = account?.role !== 'MEMBER'

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([expenseAPI.getExpenses(), societyFlatAPI.getFlats()])
      .then(([expenses, flats]) => {
        if (active) setData({ expenses: expenses.data || [], flats: flats.data || [] })
      })
      .catch(() => { if (active) setError('Unable to load the society overview. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [account?.id, revision])

  useEffect(() => { setLimit(5); setExpanded(null) }, [month, view, category, search])
  const monthly = useMemo(() => data.expenses.filter((item) => item.expenseDate?.startsWith(month)), [data.expenses, month])
  const total = monthly.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const festival = monthly.filter((item) => item.expenseType === 'FESTIVAL').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const pending = data.expenses.filter((item) => item.status === 'SUBMITTED')
  const categories = Object.entries(monthly.reduce((result, item) => {
    const name = item.categoryName || 'Uncategorized'
    result[name] = (result[name] || 0) + Number(item.amount || 0)
    return result
  }, {})).sort((a, b) => b[1] - a[1])
  const rows = (view === 'pending' ? pending : monthly).filter((item) =>
    (view !== 'festival' || item.expenseType === 'FESTIVAL') &&
    (!category || (item.categoryName || 'Uncategorized') === category) &&
    (!search || [item.description, item.categoryName, item.vendorName].some((value) => value?.toLowerCase().includes(search.toLowerCase())))
  ).sort((a, b) => String(b.expenseDate).localeCompare(String(a.expenseDate)))
  const selectView = (next) => { setView(next); setCategory(''); setSearch('') }
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return <div className="society-overview">
    <section className="society-welcome">
      <div><span className="society-kicker">YOUR SOCIETY AT A GLANCE</span><h2>A clearer view of your community’s finances.</h2><p>Track expenses, review what needs attention, and keep society work moving.</p></div>
      <div className="society-toolbar"><label>Reporting month<input aria-label="Reporting month" type="month" value={month} onChange={(event) => { if (event.target.value) { setMonth(event.target.value); setCategory('') } }} /></label><button type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>{loading ? 'Loading…' : 'Refresh'}</button></div>
    </section>
    {error ? <section className="society-notice" role="alert">{error} <button onClick={() => setRevision((value) => value + 1)}>Retry</button></section> : loading ? <section className="society-panel" role="status">Loading your society’s expenses and flats…</section> : <>
      <section className="society-metrics" aria-label="Society summary">
        <button className={view === 'all' ? 'selected' : ''} onClick={() => selectView('all')}><span>Monthly expenses <b>↗</b></span><strong>{formatCurrency(total)}</strong><small>{monthly.length} records · {monthLabel}</small></button>
        <button className={view === 'festival' ? 'selected' : ''} onClick={() => selectView('festival')}><span>Festival expenses <b>↗</b></span><strong>{formatCurrency(festival)}</strong><small>Included in this month’s total</small></button>
        <button className={view === 'pending' ? 'selected' : ''} onClick={() => selectView('pending')}><span>Pending approvals <b>↗</b></span><strong>{pending.length}<em> awaiting review</em></strong><small>Across all months · View queue</small></button>
        <Link to="/society/flats"><span>Society flats <b>↗</b></span><strong>{data.flats.length}</strong><small>Open your flat directory</small></Link>
      </section>
      <div className="society-workspace">
        <div className="society-primary">
          <section className="society-panel">
            <div className="society-panel-heading"><div><h2>Expense activity</h2><p>{view === 'pending' ? 'Submitted expenses across all months' : monthLabel + ' · All expense statuses included'}</p></div><Link to="/expenses">View all expenses →</Link></div>
            <div className="society-filters"><div className="society-tabs" aria-label="Expense view">{[['all', 'This month'], ['festival', 'Festival'], ['pending', 'Pending']].map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => selectView(key)}>{label}</button>)}</div><input aria-label="Search expenses" placeholder="Search vendor, category, description…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            {category && <button className="society-filter-chip" onClick={() => setCategory('')}>{category} · Clear ×</button>}
            <div className="society-expense-list">
              {rows.slice(0, limit).map((item) => <article key={item.id}>
                <button className="society-expense-row" aria-expanded={expanded === item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}><span className="society-expense-icon" aria-hidden="true">₹</span><span className="society-expense-name"><strong>{item.description || item.categoryName || 'Expense'}</strong><small>{formatDate(item.expenseDate)} · {item.vendorName || item.categoryName || 'Uncategorized'}</small></span><span className="society-expense-value"><strong>{formatCurrency(item.amount)}</strong><small>{item.status?.toLowerCase().replaceAll('_', ' ') || 'Unknown status'}</small></span><span aria-hidden="true">{expanded === item.id ? '−' : '+'}</span></button>
                {expanded === item.id && <div className="society-expense-detail"><span>Category: <strong>{item.categoryName || 'Uncategorized'}</strong></span><span>Payment: <strong>{item.paymentMode || 'Not recorded'}</strong></span><span>Vendor: <strong>{item.vendorName || 'Not recorded'}</strong></span><Link to="/expenses">{canWrite ? 'Manage expenses →' : 'View expenses →'}</Link></div>}
              </article>)}
              {!rows.length && <div className="society-empty"><span aria-hidden="true">☷</span><h3>{search || category ? 'No matching expenses' : view === 'pending' ? 'No approvals waiting' : 'No expenses for this view'}</h3><p>{search || category ? 'Try another search or clear the category filter.' : 'Choose another month or record an expense to see activity here.'}</p>{canWrite && !search && !category && view !== 'pending' && <Link className="button-link" to="/expenses/new">+ Add expense</Link>}</div>}
            </div>
            {!!rows.length && <div className="society-list-footer"><small>Showing {Math.min(limit, rows.length)} of {rows.length} expenses</small>{rows.length > limit && <button onClick={() => setLimit((value) => value + 5)}>Show more</button>}</div>}
          </section>
          <section className="society-panel"><div className="society-panel-heading"><div><h2>Where the money goes</h2><p>{monthLabel} · Select a category to explore its expenses</p></div><Link to="/categories">Categories →</Link></div><div className="society-category-list">{categories.map(([name, amount]) => <button key={name} aria-pressed={category === name} onClick={() => { setCategory(category === name ? '' : name); setView('all'); setSearch('') }}><span>{name}<strong>{formatCurrency(amount)}</strong></span><span className="society-bar"><i style={{ width: `${total > 0 ? Math.max(0, Math.min(100, amount / total * 100)) : 0}%` }} /></span></button>)}</div>{!categories.length && <p className="society-empty-copy">Your category breakdown will appear when expenses are recorded for this month.</p>}</section>
        </div>
        <aside className="society-secondary">
          <section className="society-panel society-actions"><div className="society-panel-heading"><div><h2>Quick actions</h2><p>Everyday society work, one click away.</p></div></div>{(canWrite ? [['+', 'Add expense', 'Record a payment or bill', '/expenses/new']] : []).concat([['₹', 'Annual finance', 'Collections and yearly accounts', '/society/annual-finance'], ['↗', 'Festival collections', 'Demands, payments and receipts', '/society/festival-collections'], ['◇', 'Festivals', 'Plan and manage society events', '/society/festivals'], ['⌂', 'Member directory', 'Find your community members', '/society/member-directory']]).map(([icon, title, description, to]) => <Link key={to} to={to}><span className="society-action-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">→</span></Link>)}</section>
          <section className="society-attention"><span className="society-kicker">NEEDS ATTENTION</span><h2>{pending.length ? `${pending.length} expenses to review` : 'Your approval queue is clear'}</h2><p>{pending.length ? `${formatCurrency(pending.reduce((sum, item) => sum + Number(item.amount || 0), 0))} in submitted expenses across all months.` : 'Submitted expenses will appear here so you can keep track of the next review.'}</p><button onClick={() => selectView('pending')}>View approval queue →</button></section>
        </aside>
      </div>
    </>}
  </div>
}
