import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { feedbackAPI } from '../api/endpoints'
import { formatDate } from '../utils/format'
import { Shell } from './DashboardRouter'

const initialForm = {
  feedbackType: 'SUGGESTION',
  title: '',
  message: '',
  rating: '',
  pageUrl: ''
}

export const UserFeedback = () => {
  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    feedbackAPI.list()
      .then((response) => setItems(response.data || []))
      .catch(() => toast.error('Unable to load feedback history'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setForm((current) => ({ ...current, pageUrl: window.location.href }))
    load()
  }, [])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.message.trim()) {
      toast.error('Feedback details are required')
      return
    }
    setSaving(true)
    try {
      await feedbackAPI.create({
        ...form,
        title: form.title.trim() || null,
        message: form.message.trim(),
        pageUrl: form.pageUrl.trim() || null,
        rating: form.rating ? Number(form.rating) : null
      })
      toast.success('Feedback submitted. Thank you!')
      setForm({ ...initialForm, pageUrl: window.location.href })
      load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to submit feedback')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell title="Feedback" eyebrow="Suggestions">
      <section className="feedback-layout">
        <form className="form-panel feedback-form" onSubmit={submit}>
          <div className="personal-panel-heading">
            <div>
              <h2>Share feedback</h2>
              <p>Send improvement ideas, bugs, or anything that would make the app easier to use.</p>
            </div>
          </div>
          <div className="form-grid two">
            <label>
              Type
              <select value={form.feedbackType} onChange={(event) => update('feedbackType', event.target.value)}>
                <option value="SUGGESTION">Suggestion</option>
                <option value="IMPROVEMENT">Improvement</option>
                <option value="BUG">Bug</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              Rating
              <select value={form.rating} onChange={(event) => update('rating', event.target.value)}>
                <option value="">No rating</option>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Okay</option>
                <option value="2">2 - Difficult</option>
                <option value="1">1 - Frustrating</option>
              </select>
            </label>
            <label className="document-wide">
              Short title
              <input maxLength="160" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Dashboard feels crowded" />
            </label>
            <label className="document-wide">
              Details
              <textarea rows="6" maxLength="2000" required value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="What should we improve? What happened? What did you expect?" />
            </label>
            <label className="document-wide">
              Page URL
              <input maxLength="500" value={form.pageUrl} onChange={(event) => update('pageUrl', event.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit feedback'}</button>
          </div>
        </form>

        <section className="feedback-history panel">
          <div className="personal-panel-heading">
            <div>
              <h2>Recent feedback</h2>
              <p>Your previously submitted suggestions.</p>
            </div>
          </div>
          <div className="feedback-list">
            {items.slice(0, 8).map((item) => (
              <article className="feedback-item" key={item.id}>
                <div>
                  <strong>{item.title || item.feedbackType}</strong>
                  <small>{formatDate(item.createdAt)} - {item.status}</small>
                </div>
                {item.rating && <b>{item.rating}/5</b>}
                <p>{item.message}</p>
                {item.adminRemarks && <p className="feedback-admin-response"><strong>Admin response:</strong> {item.adminRemarks}</p>}
              </article>
            ))}
            {!loading && items.length === 0 && <p className="empty-state">No feedback submitted yet.</p>}
            {loading && <p className="muted">Loading feedback...</p>}
          </div>
        </section>
      </section>
    </Shell>
  )
}


