import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'
import { drawToken, generateTokenPdf, tokenPages } from '../../utils/festivalTokens'
import './FestivalTokens.css'

const TokenPreview = ({ token, society, event, label }) => {
  const ref = useRef(null)
  useEffect(() => { drawToken(ref.current, token, society, event, label) }, [token, society, event, label])
  return <canvas ref={ref} role="img" aria-label={`${token.kids ? 'Kids' : 'Adults'} token ${token.number}`} />
}

export const FestivalTokens = () => {
  const { festivalEventId } = useParams()
  const { currentAccount } = useAuthStore()
  const [society, setSociety] = useState(currentAccount?.societyName || currentAccount?.accountName || '')
  const [event, setEvent] = useState('')
  const [label, setLabel] = useState('TOKEN')
  const [start, setStart] = useState('1')
  const [kidsEnd, setKidsEnd] = useState('50')
  const [end, setEnd] = useState('200')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(Boolean(festivalEventId))
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    let active = true
    if (festivalEventId) festivalEventAPI.getFestival(festivalEventId)
      .then(({ data }) => { if (active) setEvent(data.festivalName || '') })
      .catch(() => { if (active) setLoadError('Unable to load the festival. Reopen this page to try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [festivalEventId])
  let pages = []; let error = ''
  try { pages = tokenPages(Number(start), Number(kidsEnd), Number(end)) } catch (e) { error = e.message }
  if ([start, kidsEnd, end].some(value => !value.trim())) error = 'Enter all three token numbers.'
  if (!society.trim() || !label.trim()) error = 'Enter a society name and token label.'
  const currentPage = Math.min(page, Math.max(0, pages.length - 1))
  const settings = { society, event, label }
  const download = async () => {
    setBusy(true)
    try {
      await document.fonts?.ready
      const blob = await generateTokenPdf(pages, settings)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `festival-tokens-${start}-${end}.pdf`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      toast.success('Token PDF is ready')
    } catch { toast.error('Unable to generate the PDF. Please try again.') }
    finally { setBusy(false) }
  }
  if (currentAccount?.accountType !== 'SOCIETY') return <Shell title="Festival Tokens"><p>Token generation is available for society accounts.</p></Shell>
  return <Shell title="Festival Tokens" eyebrow="Society module">
    <Link to="/society/festivals">Back to festivals</Link>
    <p>Create numbered society tokens with a celebration design and clear kids and adults labels. Print at actual size and cut along the dotted guides.</p>
    <div className="festival-token-layout">
      <section className="festival-token-controls">
        <h2>Design your tokens</h2>
        <label>Society name<input maxLength={80} value={society} onChange={e => setSociety(e.target.value)} /></label>
        <label>Festival / event<input maxLength={60} value={event} onChange={e => setEvent(e.target.value)} /></label>
        <label>Ribbon label<input maxLength={24} value={label} onChange={e => setLabel(e.target.value)} /></label>
        <label>First token<input type="number" min="1" max="10000" step="1" value={start} onChange={e => { setStart(e.target.value); setPage(0) }} /></label>
        <label>Last kids token<input type="number" min={Number(start) - 1} max={end} step="1" value={kidsEnd} onChange={e => setKidsEnd(e.target.value)} /></label>
        <label>Last token<input type="number" min={start} max="10000" step="1" value={end} onChange={e => { setEnd(e.target.value); setPage(0) }} /></label>
        <small>To create only adults tokens, set the last kids token to one less than the first token.</small>
        {error ? <p role="alert" className="festival-token-error">{error}</p> : <div className="festival-token-summary" aria-live="polite">
          <span>Kids: {Number(kidsEnd) >= Number(start) ? `${start}-${kidsEnd}` : 'None'} ({Math.max(0, Number(kidsEnd) - Number(start) + 1)})</span>
          <span>Adults: {Number(kidsEnd) < Number(end) ? `${Number(kidsEnd) + 1}-${end}` : 'None'} ({Number(end) - Number(kidsEnd)})</span>
          <strong>{Number(end) - Number(start) + 1} tokens · {pages.length} A4 pages</strong>
        </div>}
        {loadError && <p role="alert">{loadError}</p>}
        <button type="button" disabled={Boolean(error) || busy || loading || Boolean(loadError)} onClick={download}>{busy ? 'Generating PDF...' : loading ? 'Loading festival...' : 'Download A4 PDF'}</button>
        <small>4 columns × 4 rows · 16 tokens per full page. The final page contains the remaining tokens.</small>
      </section>
      <section className="festival-token-preview">
        <div className="festival-token-pager">
          <button type="button" disabled={currentPage === 0 || busy} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <span aria-live="polite">Page {pages.length ? currentPage + 1 : 0} / {pages.length}</span>
          <button type="button" disabled={currentPage >= pages.length - 1 || busy} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
        <div className="festival-token-sheet" aria-label="A4 token preview">
          {!error && pages[currentPage]?.map(token => <div className="festival-token-cell" key={token.number}><TokenPreview token={token} {...settings} /></div>)}
        </div>
      </section>
    </div>
  </Shell>
}
