import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { personalDocumentAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'

export const MyDocuments = () => {
  const { currentAccount } = useAuthStore()
  const [summary, setSummary] = useState({ total: 0, expiringSoon: 0, expired: 0 })
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentAccount?.accountType !== 'INDIVIDUAL') return setLoading(false)
    setLoading(true)
    Promise.all([personalDocumentAPI.summary(), personalDocumentAPI.list({ page: 0, size: 20 })])
      .then(([summaryResponse, documentsResponse]) => {
        setSummary(summaryResponse.data)
        setDocuments(documentsResponse.data.content || [])
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load your documents'))
      .finally(() => setLoading(false))
  }, [currentAccount?.id, currentAccount?.accountType])

  if (currentAccount?.accountType !== 'INDIVIDUAL') {
    return <Shell title="My Documents" eyebrow="Individual module"><p className="muted">My Documents is available only for individual accounts.</p></Shell>
  }

  return (
    <Shell title="My Documents" eyebrow="Individual module">
      <section className="summary-grid compact">
        <article className="summary-card"><span>Total documents</span><strong>{summary.total}</strong></article>
        <article className="summary-card"><span>Expiring soon</span><strong>{summary.expiringSoon}</strong></article>
        <article className="summary-card"><span>Expired</span><strong>{summary.expired}</strong></article>
      </section>
      <section className="panel">
        <div className="section-heading"><div><h2>Stored documents</h2><p className="muted">Upload and management controls arrive in Phase 4.</p></div></div>
        {loading ? <p className="muted">Loading documents…</p> : documents.length === 0 ? <p className="muted">No documents stored yet.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Issuer</th><th>Expiry date</th></tr></thead>
            <tbody>{documents.map((document) => <tr key={document.id}><td>{document.title}</td><td>{document.category.replaceAll('_', ' ')}</td><td>{document.issuer || '—'}</td><td>{document.expiryDate || 'No expiry'}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </Shell>
  )
}
