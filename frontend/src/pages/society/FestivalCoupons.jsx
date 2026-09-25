import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { festivalCouponAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/format'
import './FestivalCollectionList.css'

export const FestivalCoupons = ({ festivalId, festival }) => {
  const admin = useAuthStore((s) => s.currentAccount?.role === 'ADMIN')
  const [data, setData] = useState({ flats: [] })
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState({ couponName: 'Festival Coupon', defaultCouponCount: 1, validOn: '', couponsPerPage: 6 })
  const [filter, setFilter] = useState('ALL')
  const [tab, setTab] = useState('coupons')
  const [busy, setBusy] = useState(false)
  const load = async () => {
    try {
      const [dashboard, issued] = await Promise.all([festivalCouponAPI.dashboard(festivalId), festivalCouponAPI.list(festivalId)])
      const result = dashboard.data
      setData(result)
      setCoupons(issued.data || [])
      if (result.settings) setForm({ couponName: result.settings.couponName, defaultCouponCount: result.settings.defaultCouponCount, validOn: result.settings.validOn, couponsPerPage: result.settings.couponsPerPage || 6 })
      else if (festival?.startDate) setForm((current) => ({ ...current, validOn: current.validOn || festival.startDate }))
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load coupons') }
  }
  useEffect(() => { load() }, [festivalId, festival?.startDate])
  const save = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      await festivalCouponAPI.saveSettings(festivalId, { ...form, defaultCouponCount: Number(form.defaultCouponCount), couponsPerPage: Number(form.couponsPerPage) })
      toast.success('Coupon settings saved'); await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to save settings') } finally { setBusy(false) }
  }
  const override = async (row, value) => {
    try { await festivalCouponAPI.saveOverride(festivalId, row.collectionId, value === '' ? null : Number(value)); await load() }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update count') }
  }
  const generate = async () => {
    if (!window.confirm('Generate missing coupons for eligible flats? Existing coupons remain unchanged.')) return
    setBusy(true)
    try {
      const result = (await festivalCouponAPI.generate(festivalId)).data
      toast.success(`Generated ${result.createdCoupons}; ${result.existingCoupons} already existed`); await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to generate coupons') } finally { setBusy(false) }
  }
  const download = async () => {
    try {
      const blob = (await festivalCouponAPI.downloadPdf(festivalId)).data
      const url = URL.createObjectURL(blob); const link = document.createElement('a')
      link.href = url; link.download = `festival-coupons-${festivalId}.pdf`; link.click(); URL.revokeObjectURL(url)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to download coupons') }
  }
  const cancel = async (coupon) => {
    if (!window.confirm(`Cancel coupon ${coupon.couponNumber}?`)) return
    try { await festivalCouponAPI.cancel(festivalId, coupon.id); toast.success('Coupon cancelled'); await load() }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to cancel coupon') }
  }
  const rows = data.flats.filter((row) => filter === 'ALL' ||
    filter === 'ELIGIBLE' && row.eligible || filter === 'INELIGIBLE' && !row.eligible ||
    filter === 'GENERATED' && row.generatedCount || filter === 'DISCREPANCY' && row.discrepancy)
  return <section className={'festival-coupons-section'}>
    <div className={'collection-records-heading'}><div><h2>Festival coupons</h2><p>Paid and excess flats qualify; issued coupons remain auditable.</p></div>{tab === 'coupons' && data.generatedCoupons > 0 && <button className={'primary'} onClick={download}>Download coupons PDF</button>}</div>
    <nav className={'coupon-tabs'} aria-label={'Festival coupon views'}>
      <button type={'button'} aria-pressed={tab === 'coupons'} onClick={() => setTab('coupons')}>Coupons</button>
      <button type={'button'} aria-pressed={tab === 'register'} onClick={() => setTab('register')}>Register <span>{coupons.length}</span></button>
    </nav>
    {tab === 'coupons' && <>
    {admin && <form className={'inline-form collection-demand-form'} onSubmit={save}>
      <label>Coupon name<input required value={form.couponName} onChange={(event) => setForm({ ...form, couponName: event.target.value })} /></label>
      <label>Default count<input type={'number'} min={1} max={100} required value={form.defaultCouponCount} onChange={(event) => setForm({ ...form, defaultCouponCount: event.target.value })} /></label>
      <label>Valid on<input type={'date'} required value={form.validOn} onChange={(event) => setForm({ ...form, validOn: event.target.value })} /></label>
      <label>Coupons per page<input type={'number'} min={1} max={28} required value={form.couponsPerPage} onChange={(event) => setForm({ ...form, couponsPerPage: event.target.value })} /></label>
      <button disabled={busy}>Save</button><button type={'button'} className={'primary'} disabled={busy || !data.settings || !data.eligibleFlats} onClick={generate}>Generate missing coupons</button>
    </form>}
    <div className={'coupon-summary-grid'}>{[['Eligible', data.eligibleFlats], ['Ineligible', data.ineligibleFlats], ['Configured', data.configuredCoupons], ['Generated', data.generatedCoupons], ['Needs review', data.discrepancyFlats]].map(([key, value]) => <div key={key}><span>{key}</span><strong>{value || 0}</strong></div>)}</div>
    <div className={'toolbar-panel'}><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value={'ALL'}>All flats</option><option value={'ELIGIBLE'}>Eligible</option><option value={'INELIGIBLE'}>Ineligible</option><option value={'GENERATED'}>Generated</option><option value={'DISCREPANCY'}>Needs review</option></select><strong>{rows.length} flat(s)</strong></div>
    <div className={'table-wrap'}><table className={'festival-coupons-table'}><thead><tr><th>Flat</th><th>Owner</th><th>Demand</th><th>Paid</th><th>Eligible</th><th>Count</th><th>Issued</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.collectionId} className={row.discrepancy ? 'coupon-discrepancy' : ''}>
        <td>{row.blockName}-{row.flatNumber}</td><td>{row.ownerName}</td>
        <td>{formatCurrency(row.expectedAmount)}</td><td>{formatCurrency(row.collectedAmount)}</td>
        <td>{row.eligible ? 'Yes' : 'No'}</td>
        <td>{admin ? <input type={'number'} min={0} max={100} defaultValue={row.couponCountOverride ?? ''} placeholder={String(data.settings?.defaultCouponCount || 0)} onBlur={(event) => override(row, event.target.value)} /> : row.effectiveCouponCount}</td>
        <td>{row.generatedCount}{row.discrepancy && <small className={'coupon-warning'}> Review</small>}</td>
      </tr>)}
      {!rows.length && <tr><td colSpan={7} className={'empty-state'}>No flats match this filter.</td></tr>}
    </tbody></table></div>
    </>}
    {tab === 'register' && <section className={'issued-coupons'}>
      <div className={'collection-records-heading'}><div><h3>Issued coupon register</h3><p>Review active, used, and cancelled coupon numbers.</p></div>{coupons.length > 0 && <button onClick={download}>Download coupons PDF</button>}</div>
      <div className={'table-wrap'}><table><thead><tr><th>Coupon</th><th>Flat</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {coupons.map((coupon) => <tr key={coupon.id}><td>{coupon.couponNumber}</td><td>{coupon.blockName}-{coupon.flatNumber}</td><td>{coupon.status}</td><td>{admin && coupon.status === 'ACTIVE' ? <button className={'danger'} onClick={() => cancel(coupon)}>Cancel</button> : '-'}</td></tr>)}
        {!coupons.length && <tr><td colSpan={4} className={'empty-state'}>No coupons have been generated yet. Open the Coupons tab to configure and generate them.</td></tr>}
      </tbody></table></div>
    </section>}
  </section>
}
