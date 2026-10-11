import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { Shell } from '../DashboardRouter'
import { FestivalCoupons } from './FestivalCoupons'
import { FestivalCouponLoader } from './FestivalCouponLoader'

export const FestivalCouponPage = () => {
  const { festivalEventId } = useParams()
  const [params, setParams] = useSearchParams()
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)
  const selectedId = festivalEventId || params.get('festivalId') || ''
  const selected = festivals.find((festival) => String(festival.id) === selectedId)

  useEffect(() => {
    let active = true
    setLoading(true)
    const request = festivalEventId ? festivalEventAPI.getFestival(festivalEventId) : festivalEventAPI.getFestivals()
    request
      .then(({ data }) => {
        if (!active) return
        const rows = festivalEventId ? [data] : data || []
        setFestivals(rows)
        if (!festivalEventId && !params.get('festivalId') && rows.length) setParams({ festivalId: String(rows[0].id) }, { replace: true })
      })
      .catch((error) => { if (active) toast.error(error.response?.data?.message || 'Unable to load festivals') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [festivalEventId])

  return <Shell title={selected ? `${selected.festivalName} · Festival Coupons` : 'Festival Coupons'} eyebrow={'Society module'}>
    <div className={'festival-coupon-page'}>
      <Link to="/society/festivals">← All festivals</Link>
      {!festivalEventId && <section className={'toolbar-panel'}>
        <label>Select festival
          <select value={selectedId} onChange={(event) => setParams(event.target.value ? { festivalId: event.target.value } : {})}>
            <option value={''}>Select a festival</option>
            {festivals.map((festival) => <option key={festival.id} value={festival.id}>{festival.festivalName} ({festival.year})</option>)}
          </select>
        </label>
        {selected && <strong>{selected.festivalName}  {selected.startDate} to {selected.endDate}</strong>}
      </section>}
      {loading ? <FestivalCouponLoader label="Loading festival..." />
        : selected ? <FestivalCoupons key={selected.id} festivalId={selected.id} festival={selected} />
          : <p className={'empty-state'}>Create a festival first, then return here to configure and generate coupons.</p>}
    </div>
  </Shell>
}
