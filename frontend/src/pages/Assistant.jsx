import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chatAPI } from '../api/chat'
import { useAuthStore } from '../store/authStore'
import { Shell } from './DashboardRouter'
import { formatCurrency } from '../utils/format'
import './Assistant.css'

const modeLabels = {
  AI: 'AI answer · site help',
  HELP_SEARCH: 'Help search',
  SEARCH_FALLBACK: 'Help search · AI unavailable',
  NO_EVIDENCE: 'No matching evidence',
  LIVE_DATA: 'Live personal expenses'
}

const currentMonth = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date())
  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`
}

// Remount for every account/token change: old history and in-flight replies cannot enter a new session.
export const Assistant = () => {
  const account = useAuthStore((state) => state.currentAccount)
  const token = useAuthStore((state) => state.token)
  const locked = useAuthStore((state) => state.isAppLocked)
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  if (locked || !authenticated) return null
  return <AssistantSession key={`${account?.id}:${token}`} account={account} />
}

const AssistantSession = ({ account }) => {
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState('')
  const [messages, setMessages] = useState([])
  const [mode, setMode] = useState('HELP')
  const [month, setMonth] = useState(currentMonth)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(null)
  const conversation = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    chatAPI.status(controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setStatus(data) })
      .catch(() => { if (!controller.signal.aborted) setStatusError('Unable to check assistant availability. Reload this page to retry.') })
    return () => { controller.abort(); request.current?.abort() }
  }, [])

  useEffect(() => {
    conversation.current?.scrollTo?.({ top: conversation.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const submit = async (event) => {
    event.preventDefault()
    if (request.current || busy || !status?.enabled || (mode === 'HELP' && !question.trim())) return
    const controller = new AbortController()
    request.current = controller
    const text = mode === 'HELP' ? question.trim() : `Summarize my personal expenses for ${month}`
    setBusy(true)
    setError('')
    try {
      const { data } = await chatAPI.send({ mode, message: mode === 'HELP' ? text : null, month: mode === 'EXPENSE_SUMMARY' ? month : null }, controller.signal)
      if (controller.signal.aborted) return
      // Keep a bounded, display-only history; the server receives only the current request.
      setMessages((items) => [...items.slice(-18), { question: text, ...data }])
      setQuestion('')
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.response?.data?.message || 'Unable to get an answer. Please try again.')
    } finally {
      if (!controller.signal.aborted) { request.current = null; setBusy(false) }
    }
  }

  return (
    <Shell title="Site assistant" eyebrow="Help and personal spending">
      <div className="assistant-layout">
        <aside className="assistant-guide">
          <h2>A little help, right here</h2>
          <p>Ask how to use the site, or choose a month for your personal expense summary.</p>
          <p className="muted">Ask each question with enough detail. Chat history stays in this page and clears when you switch workspaces.</p>
          <div className="assistant-status" role="status">
            {statusError || (!status ? 'Checking availability…' : !status.enabled ? 'The assistant is currently disabled.' : status.aiConfigured ? 'AI help is configured. Answers include source links.' : 'Help search is available. AI answers have not been enabled.')}
          </div>
          <h3>Try a question</h3>
          {['How do I import expenses?', 'Where can I set my monthly budget?', 'How do I switch workspaces?'].map((text) => (
            <button type="button" className="assistant-suggestion" key={text} disabled={busy || !status?.enabled}
              onClick={() => { setMode('HELP'); setQuestion(text) }}>{text}</button>
          ))}
          <p className="muted">Private document search and live society, festival and store totals will be added in later phases.</p>
        </aside>
        <section className="assistant-chat" aria-label="Assistant conversation">
          <div className="assistant-conversation" ref={conversation} role="log" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
            {!messages.length && <div className="assistant-empty"><h2>What would you like to know?</h2><p>Get steps with links to the relevant pages. Expense totals come directly from your personal workspace.</p></div>}
            {messages.map((item, index) => (
              <article className="assistant-exchange" key={index}>
                <p className="assistant-question"><span className="assistant-speaker">You</span>{item.question}</p>
                <div className="assistant-answer">
                  <span className="assistant-speaker">{modeLabels[item.mode] || 'Assistant'}</span>
                  <p className="assistant-answer-text">{item.answer}</p>
                  {item.summary && <div className="assistant-summary">
                    <p>{item.summary.startDate} to {item.summary.endDate}</p>
                    <strong>{formatCurrency(item.summary.total)}</strong>
                    {item.summary.categories.length > 0 && <table><caption>Category totals</caption><thead><tr><th>Category</th><th>Amount</th></tr></thead>
                      <tbody>{item.summary.categories.map((category) => <tr key={category.category}><td>{category.category}</td><td>{formatCurrency(category.amount)}</td></tr>)}</tbody></table>}
                    <p className="muted">{item.summary.scope}</p>
                  </div>}
                  {item.sources?.length > 0 && <nav className="assistant-sources" aria-label="Answer sources">
                    <span>Sources</span>
                    {item.sources.map((source, sourceIndex) => /^\/[a-zA-Z0-9/_-]*$/.test(source.url) &&
                      <Link key={source.id} to={source.url}>[{sourceIndex + 1}] {source.title}</Link>)}
                  </nav>}
                </div>
              </article>
            ))}
            {busy && <p role="status" className="muted">Finding an answer…</p>}
          </div>
          <form className="assistant-composer" onSubmit={submit}>
            <div className="assistant-controls">
              <label>Ask about<select value={mode} onChange={(event) => setMode(event.target.value)} disabled={busy}>
                <option value="HELP">Website help</option>
                {account?.accountType === 'INDIVIDUAL' && <option value="EXPENSE_SUMMARY">Expense summary</option>}
              </select></label>
              {mode === 'EXPENSE_SUMMARY' && <label>Month<input aria-label="Summary month" type="month" min="2000-01" max="2100-12" value={month} onChange={(event) => setMonth(event.target.value)} required disabled={busy} /></label>}
            </div>
            {mode === 'HELP' && <label className="assistant-prompt-label">Your question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000}
              rows={3} placeholder="How do I import expenses?" required disabled={busy} /></label>}
            {error && <p role="alert" className="assistant-error">{error}</p>}
            <div className="assistant-composer-footer"><small>{mode === 'HELP' ? `${question.length}/2000` : 'Calculated from recorded expenses; no financial data is sent to AI.'}</small>
              <button className="primary" type="submit" disabled={busy || !status?.enabled}>{busy ? 'Working…' : mode === 'HELP' ? 'Ask' : 'Get summary'}</button></div>
          </form>
        </section>
      </div>
    </Shell>
  )
}
