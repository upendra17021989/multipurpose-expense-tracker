import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'
import { drawToken, generateTokenPdf, tokenPages, TOKEN_LAYOUTS } from '../../utils/festivalTokens'
import './FestivalTokens.css'

const TokenPreview = ({ token, society, event, label, showCategories, darkBackground, darkDesign, showDancers, design }) => {
  const ref = useRef(null)
  useEffect(() => {
    let active = true
    const rendered = document.createElement('canvas')
    drawToken(rendered, token, society, event, label, showCategories, darkBackground, darkDesign, showDancers, design)
      .then(() => {
        if (!active || !ref.current) return
        ref.current.width = rendered.width; ref.current.height = rendered.height
        ref.current.getContext('2d').drawImage(rendered, 0, 0)
      })
      .catch(() => toast.error('Unable to load token artwork. Please reload the page.', { toastId: 'token-artwork' }))
    return () => { active = false }
  }, [token, society, event, label, showCategories, darkBackground, darkDesign, showDancers, design])
  return <canvas ref={ref} role="img" aria-label={`${showCategories ? `${token.kids ? 'Kids' : 'Adults'} ` : ''}token ${token.number}`} />
}

export const FestivalTokens = () => {
  const { festivalEventId } = useParams()
  const { currentAccount } = useAuthStore()
  const [society, setSociety] = useState(currentAccount?.societyName || currentAccount?.accountName || '')
  const [event, setEvent] = useState('')
  const [label, setLabel] = useState('TOKEN')
  const [start, setStart] = useState('1')
  const [kidsEnd, setKidsEnd] = useState('50')
  const [showCategories, setShowCategories] = useState(false)
  const [darkBackground, setDarkBackground] = useState(false)
  const [darkDesign, setDarkDesign] = useState('midnight')
  const [showDancers, setShowDancers] = useState(true)
  const [design, setDesign] = useState('ornate')
  const [end, setEnd] = useState('200')
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(16)
  const layout = TOKEN_LAYOUTS[perPage]
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
  try { pages = tokenPages(Number(start), showCategories ? Number(kidsEnd) : Number(start) - 1, Number(end), perPage) } catch (e) { error = e.message }
  if ([start, end, ...(showCategories ? [kidsEnd] : [])].some(value => !value.trim())) error = 'Enter all token numbers.'
  if (!society.trim() || !label.trim()) error = 'Enter a society name and token label.'
  const currentPage = Math.min(page, Math.max(0, pages.length - 1))
  const settings = { society, event, label, perPage, showCategories, darkBackground, darkDesign, showDancers, design }
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
    <p>Create numbered festival tokens with decorative borders, stars and a ribbon. Choose a light or dark design and optional Garba artwork. Print at actual size and cut along the dotted guides.</p>
    <div className="festival-token-layout">
      <section className="festival-token-controls">
        <h2>Design your tokens</h2>
        <label>Token design<select value={design} disabled={busy} onChange={e => setDesign(e.target.value)}>
          <option value="ornate">Ornate Festival — black, gold and magenta</option>
          <option value="custom">Classic / Midnight — customizable</option>
        </select></label>
        <label>Society name<input maxLength={80} value={society} onChange={e => setSociety(e.target.value)} /></label>
        <label>Festival / event<input maxLength={60} value={event} onChange={e => setEvent(e.target.value)} /></label>
        <label>Ribbon label<input maxLength={24} value={label} onChange={e => setLabel(e.target.value)} /></label>
        {design === 'custom' && <><label className="festival-token-toggle"><input type="checkbox" checked={showDancers} disabled={busy} onChange={e => setShowDancers(e.target.checked)} />Show dancer artwork</label>
        <label className="festival-token-toggle"><input type="checkbox" checked={darkBackground} disabled={busy} onChange={e => setDarkBackground(e.target.checked)} />Dark token background</label>
        {darkBackground && <label>Dark design<select value={darkDesign} disabled={busy} onChange={e => setDarkDesign(e.target.value)}>
          <option value="midnight">Midnight Glow — navy, aqua and ivory</option>
          <option value="classic">Classic — charcoal, gold and magenta</option>
        </select></label>}
        <small>Switch between light and dark token designs. Your selection also applies to the PDF.</small></>}
        <label>Tokens per A4 page<select value={perPage} disabled={busy} onChange={e => { setPerPage(Number(e.target.value)); setPage(0) }}>
          {Object.entries(TOKEN_LAYOUTS).map(([count, grid]) => <option key={count} value={count}>{count} tokens ({grid.columns} columns × {grid.rows} rows)</option>)}
        </select></label>
        <label>First token<input type="number" min="1" max="10000" step="1" value={start} onChange={e => { setStart(e.target.value); setPage(0) }} /></label>
        <label className="festival-token-toggle"><input type="checkbox" checked={showCategories} onChange={e => setShowCategories(e.target.checked)} />Show Adults / Kids on tokens</label>
        {showCategories && <label>Last kids token<input type="number" min={Number(start) - 1} max={end} step="1" value={kidsEnd} onChange={e => setKidsEnd(e.target.value)} /></label>}
        <label>Last token<input type="number" min={start} max="10000" step="1" value={end} onChange={e => { setEnd(e.target.value); setPage(0) }} /></label>
        {showCategories && <small>To create only adults tokens, set the last kids token to one less than the first token.</small>}
        {error ? <p role="alert" className="festival-token-error">{error}</p> : <div className="festival-token-summary" aria-live="polite">
          {showCategories && <><span>Kids: {Number(kidsEnd) >= Number(start) ? `${start}-${kidsEnd}` : 'None'} ({Math.max(0, Number(kidsEnd) - Number(start) + 1)})</span>
          <span>Adults: {Number(kidsEnd) < Number(end) ? `${Number(kidsEnd) + 1}-${end}` : 'None'} ({Number(end) - Number(kidsEnd)})</span></>}
          <strong>{Number(end) - Number(start) + 1} tokens · {pages.length} A4 pages</strong>
        </div>}
        {loadError && <p role="alert">{loadError}</p>}
        <button type="button" disabled={Boolean(error) || busy || loading || Boolean(loadError)} onClick={download}>{busy ? 'Generating PDF...' : loading ? 'Loading festival...' : 'Download A4 PDF'}</button>
        <small>{layout.columns} columns × {layout.rows} rows · {perPage} tokens per full page. The final page contains the remaining tokens.</small>
      </section>
      <section className="festival-token-preview">
        <div className="festival-token-pager">
          <button type="button" disabled={currentPage === 0 || busy} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <span aria-live="polite">Page {pages.length ? currentPage + 1 : 0} / {pages.length}</span>
          <button type="button" disabled={currentPage >= pages.length - 1 || busy} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
        <div className="festival-token-sheet" aria-label="A4 token preview" style={{ '--token-columns': layout.columns, '--token-rows': layout.rows }}>
          {!error && pages[currentPage]?.map(token => <div className="festival-token-cell" key={token.number}><TokenPreview token={token} {...settings} /></div>)}
        </div>
      </section>
    </div>
  </Shell>
}
