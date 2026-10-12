import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chatAPI } from '../api/chat'
import { Shell } from './DashboardRouter'

export const DocumentAssistant = ({ onBack, onClose, aiConfigured }) => {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setResult(null)
    chatAPI.documents(query, page, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) { setResult(data); setError('') }
    }).catch(() => { if (!controller.signal.aborted) setError('Unable to load documents.') })
    return () => controller.abort()
  }, [query, page])
  return <Shell title="Document assistant" eyebrow="Private documents">
    <div className="assistant-navigation">
      <button type="button" onClick={onBack}>← Site assistant</button>
      {onClose && <button type="button" onClick={onClose}>Close assistant</button>}
    </div>
    <p>Choose a document you own or that has been shared with you. Its owner must enable indexing first.</p>
    <Link to="/personal/documents">Upload and manage documents</Link>
    <label>Find documents<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setSelected(null) }} /></label>
    {error && <p role="alert">{error}</p>}
    {!result ? <p role="status">Loading documents...</p> : <>
      <label>Document<select value={selected?.id || ''} onChange={(event) => setSelected(result.content.find((item) => String(item.id) === event.target.value) || null)}>
        <option value="">Select a document</option>
        {result.content.map((item) => <option key={item.id} value={item.id}>{item.title}{item.sharedWithMe ? ' (shared)' : ''}</option>)}
      </select></label>
      {!result.content.length && <p>No matching documents.</p>}
      <button type="button" disabled={page === 0} onClick={() => { setPage(page - 1); setSelected(null) }}>Previous</button>
      <button type="button" disabled={result.last} onClick={() => { setPage(page + 1); setSelected(null) }}>Next</button>
    </>}
    {selected && <DocumentSession key={selected.id} document={selected} aiConfigured={aiConfigured} />}
  </Shell>
}

const DocumentSession = ({ document, aiConfigured }) => {
  const [status, setStatus] = useState(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const controller = useRef(null)
  useEffect(() => {
    controller.current = new AbortController()
    return () => controller.current.abort()
  }, [])
  useEffect(() => {
    const polling = new AbortController()
    let timer
    const load = async () => {
      try {
        const { data } = await chatAPI.documentStatus(document.id, polling.signal)
        if (polling.signal.aborted) return
        setStatus(data)
        if (data.status !== 'READY') setAnswer(null)
        timer = setTimeout(load, ['QUEUED', 'PROCESSING'].includes(data.status) ? 5000 : 15000)
      } catch { if (!polling.signal.aborted) { setStatus(null); setAnswer(null); setError('Unable to check document indexing status or access.') } }
    }
    load()
    return () => { polling.abort(); clearTimeout(timer) }
  }, [document.id, refresh])
  const action = async (operation) => {
    if (busy) return
    const signal = controller.current.signal
    setBusy(true); setError(''); setAnswer(null)
    try {
      await operation(signal)
      if (!signal.aborted) setRefresh((value) => value + 1)
    } catch (failure) {
      if (!signal.aborted) { setAnswer(null); setError(failure.response?.data?.message || 'Document request failed. Please retry.') }
    } finally { if (!signal.aborted) setBusy(false) }
  }
  const supported = ['application/pdf', 'text/plain', 'text/markdown'].includes(document.contentType)
  return <section className="assistant-chat" aria-label="Private document question">
    <h2>{document.title}</h2>
    <p role="status">Indexing: {status?.status || 'Checking...'}</p>
    {status?.error && <p>{status.error}</p>}
    {!supported && <p>Only PDF, TXT and Markdown documents can be indexed. Images and scanned PDFs need OCR, which is not available yet.</p>}
    {!document.sharedWithMe && supported && <>
      <label><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} />
        Allow extracted document text to be sent to the AI provider for indexing and answers. People with document access can ask questions while indexing is enabled.</label>
      <button type="button" disabled={!consent || busy || !aiConfigured || ['QUEUED', 'PROCESSING'].includes(status?.status)}
        onClick={() => action((signal) => chatAPI.enableDocument(document.id, signal))}>Enable indexing / retry</button>
      {status && status.status !== 'NOT_INDEXED' && <button type="button" disabled={busy}
        onClick={() => action(async (signal) => { await chatAPI.disableDocument(document.id, signal); if (!signal.aborted) { setAnswer(null); setConsent(false); setStatus({ status: 'NOT_INDEXED' }) } })}>Disable and delete index</button>}
    </>}
    {!aiConfigured && <p>AI is unavailable. Existing ready indexes can return matching excerpts.</p>}
    <form onSubmit={(event) => {
      event.preventDefault()
      if (!question.trim() || status?.status !== 'READY') return
      setAnswer(null)
      action(async (signal) => { const { data } = await chatAPI.askDocument(document.id, question.trim(), signal); if (!signal.aborted) setAnswer(data) })
    }}>
      <label>Your document question<textarea maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} required disabled={busy} /></label>
      <button type="submit" disabled={busy || status?.status !== 'READY'}>{busy ? 'Working...' : 'Ask document'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {answer && <div className="assistant-answer">
      <p>{answer.mode === 'DOCUMENT_AI' ? 'AI document answer' : answer.mode === 'DOCUMENT_FALLBACK' ? 'Document excerpts · AI unavailable' : 'No matching evidence'}</p>
      <p className="assistant-answer-text">{answer.answer}</p>
      <nav aria-label="Document sources">{answer.sources?.map((source, index) => <p key={source.id}>[{index + 1}] {source.title}</p>)}</nav>
    </div>}
  </section>
}
