import { useMemo, useState } from 'react'
import { formatCurrency, formatDate } from '../../utils/format'

import { contributionKindLabel, collectionTypeLabel } from '../../utils/festivalContributionLabels'

export const FestivalOtherCollectionTables = ({ rows, canManage, onEdit, onDelete }) => {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const [sort, setSort] = useState({ key: 'paymentDate', direction: -1 })
  const visible = useMemo(() => rows.filter(row => {
    const name = row.anonymous ? 'Anonymous' : row.contributorName
    return (!kind || (row.contributionKind || 'MONETARY') === kind) && [name, row.sourceType, contributionKindLabel(row.contributionKind), row.itemName, row.description, row.transactionReference]
      .some(value => String(value || '').replaceAll('_', ' ').toLowerCase().includes(search.trim().toLowerCase()))
  }).sort((a, b) => sort.direction * (sort.key === 'amount'
    ? Number(a.amount || 0) - Number(b.amount || 0)
    : String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), undefined, { numeric: true }))), [rows, search, kind, sort])
  const sortHeader = (key, label) => <th aria-sort={sort.key === key ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className="festival-sort-button" onClick={() => setSort(current => ({ key, direction: current.key === key ? -current.direction : 1 }))}>
      {label}{sort.key === key ? (sort.direction === 1 ? ' ↑' : ' ↓') : ''}
    </button>
    <span className="festival-other-print-label">{label}</span>
  </th>
  const monetary = visible.filter(row => (row.contributionKind || 'MONETARY') === 'MONETARY')
  const nonMonetary = visible.filter(row => (row.contributionKind || 'MONETARY') !== 'MONETARY')
  const actions = row => canManage && <td className="table-actions no-print">
    <button type="button" onClick={() => onEdit(row)}>Edit</button>
    <button type="button" className="danger" onClick={() => onDelete(row.id)}>Delete</button>
  </td>
  const contributor = row => <>
    {row.anonymous ? 'Anonymous' : row.contributorName || '—'}
    {row.specialMention && <small className="status-pill approved">Special mention</small>}
  </>
  return <div className="festival-other-tables">
    <div className="festival-other-filters no-print">
      <label>Search contributions<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Contributor, kind, item or reference" /></label>
      <label>Kind<select value={kind} onChange={event => setKind(event.target.value)}>
        <option value="">All kinds</option>
        {['MONETARY', 'IN_KIND', 'SERVICE'].map(value => <option key={value} value={value}>{contributionKindLabel(value)}</option>)}
      </select></label>
      <button type="button" onClick={() => { setSearch(''); setKind(''); setSort({ key: 'paymentDate', direction: -1 }) }}>Reset</button>
    </div>
    <h4>Monetary collections</h4>
    <div className="table-wrap"><table>
      <thead><tr>{sortHeader('paymentDate', 'Date')}<th>Kind</th><th>Source</th><th>Contributor</th><th>Description</th><th>Mode</th><th>Reference</th><th>Collected by</th>{sortHeader('amount', 'Amount')}{canManage && <th className="no-print">Actions</th>}</tr></thead>
      <tbody>{monetary.map(row => <tr key={row.id}>
        <td>{formatDate(row.paymentDate)}</td><td>{contributionKindLabel(row.contributionKind)}</td><td>{collectionTypeLabel(row.sourceType)}</td><td>{contributor(row)}</td><td>{row.description || '—'}</td><td>{row.paymentMode || '—'}</td><td>{row.transactionReference || '—'}</td><td>{row.collectedBy || '—'}</td><td className="numeric">{formatCurrency(row.amount)}</td>{actions(row)}
      </tr>)}{!monetary.length && <tr><td colSpan={canManage ? 10 : 9} className="empty-state">No monetary collections match.</td></tr>}</tbody>
      <tfoot><tr><th colSpan={8} scope="row">{search || kind ? 'Total matching monetary collections' : 'Total monetary collections'}</th><td className="numeric">{formatCurrency(monetary.reduce((total, row) => total + Number(row.amount || 0), 0))}</td>{canManage && <td className="no-print" />}</tr></tfoot>
    </table></div>
    <h4>Items and services</h4>
    <div className="table-wrap"><table>
      <thead><tr>{sortHeader('paymentDate', 'Date')}<th>Source</th><th>Contributor</th><th>Kind</th><th>Item / service</th><th>Quantity / period</th><th>Description</th><th>Estimated value</th>{canManage && <th className="no-print">Actions</th>}</tr></thead>
      <tbody>{nonMonetary.map(row => <tr key={row.id}>
        <td>{formatDate(row.paymentDate)}</td><td>{collectionTypeLabel(row.sourceType)}</td><td>{contributor(row)}</td><td>{contributionKindLabel(row.contributionKind)}</td><td>{row.itemName || '—'}</td><td>{row.quantity || '—'}</td><td>{row.description || '—'}</td><td className="numeric">{row.amount == null ? '—' : formatCurrency(row.amount)}</td>{actions(row)}
      </tr>)}{!nonMonetary.length && <tr><td colSpan={canManage ? 9 : 8} className="empty-state">No items or services match.</td></tr>}</tbody>
    </table></div>
  </div>
}
