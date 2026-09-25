import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { festivalEventAPI } from '../../api/endpoints'
import { Shell } from '../DashboardRouter'
import { FestivalCoupons } from './FestivalCoupons'

export const FestivalCouponPage = () => {
  const [params, setParams] = useSearchParams()
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)
  const selectedId = params.get('festivalId') || ''
  const selected = festivals.find((festival) => String(festival.id) === selectedId)

  useEffect(() => {
    festivalEventAPI.getFestivals()
      .then(({ data }) => {
        const rows = data || []
        setFestivals(rows)
        if (!params.get('festivalId') && rows.length) setParams({ festivalId: String(rows[0].id) }, { replace: true })
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load festivals'))
      .finally(() => setLoading(false))
  }, [])

  return <Shell title={'Festival Coupons'} eyebrow={'Society module'}>
    <div className={'festival-coupon-page'}>
      <section className={'toolbar-panel'}>
        <label>Select festival
          <select value={selectedId} onChange={(event) => setParams(event.target.value ? { festivalId: event.target.value } : {})}>
            <option value={''}>Select a festival</option>
            {festivals.map((festival) => <option key={festival.id} value={festival.id}>{festival.festivalName} ({festival.year})</option>)}
          </select>
        </label>
        {selected && <strong>{selected.festivalName} � {selected.startDate} to {selected.endDate}</strong>}
      </section>
      {loading ? <p role={'status'}>Loading festivals...</p>
        : selected ? <FestivalCoupons festivalId={selected.id} festival={selected} />
          : <p className={'empty-state'}>Create a festival first, then return here to configure and generate coupons.</p>}
    </div>
  </Shell>
}
