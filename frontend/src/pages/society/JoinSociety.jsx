import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Shell } from '../DashboardRouter'
import { societyMembershipAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'

export const JoinSociety = () => {
  const accounts = useAuthStore((state) => state.accounts)
  const [societies, setSocieties] = useState([])
  const [societyId, setSocietyId] = useState('')
  const [blockName, setBlockName] = useState('')
  const [flatNumber, setFlatNumber] = useState('')
  const [relation, setRelation] = useState('Resident')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const joinedSocietyIds = useMemo(
    () => new Set(accounts.filter((account) => account.accountType === 'SOCIETY').map((account) => account.id)),
    [accounts]
  )
  const availableSocieties = societies.filter((society) => !joinedSocietyIds.has(society.id))

  useEffect(() => {
    societyMembershipAPI.listSocieties()
      .then((response) => setSocieties(response.data || []))
      .catch(() => toast.error('Unable to load societies'))
      .finally(() => setLoading(false))
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await societyMembershipAPI.requestToJoin({
        societyId: Number(societyId),
        blockName: blockName.trim(),
        flatNumber: flatNumber.trim(),
        relation
      })
      toast.success('Request sent to the society admins for approval.')
      setSocietyId('')
      setBlockName('')
      setFlatNumber('')
      setRelation('Resident')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send membership request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell title="Join another society" eyebrow="Society membership">
      <form className="form-panel narrow" onSubmit={submit}>
        <p className="muted">Select another society and enter your flat details. Its administrators must approve your request before it appears in your account switcher.</p>
        <label htmlFor="join-society">Society</label>
        <select id="join-society" value={societyId} onChange={(event) => setSocietyId(event.target.value)} required disabled={loading || submitting}>
          <option value="">{loading ? 'Loading societies...' : 'Select a society'}</option>
          {availableSocieties.map((society) => (
            <option key={society.id} value={society.id}>
              {society.name}{society.address ? ` - ${society.address}` : ''}
            </option>
          ))}
        </select>
        <label htmlFor="join-block">Block</label>
        <input id="join-block" value={blockName} onChange={(event) => setBlockName(event.target.value)} placeholder="e.g. A" required disabled={submitting} />
        <label htmlFor="join-flat">Flat number</label>
        <input id="join-flat" value={flatNumber} onChange={(event) => setFlatNumber(event.target.value)} placeholder="e.g. 302" required disabled={submitting} />
        <label htmlFor="join-relation">Relation</label>
        <select id="join-relation" value={relation} onChange={(event) => setRelation(event.target.value)} required disabled={submitting}>
          <option value="Resident">Resident</option>
          <option value="Owner">Owner</option>
          <option value="Tenant">Tenant</option>
          <option value="Family member">Family member</option>
          <option value="Committee member">Committee member</option>
        </select>
        {!loading && !availableSocieties.length && <p className="muted">There are no other societies available.</p>}
        <div className="form-actions">
          <button className="primary" type="submit" disabled={!societyId || !blockName.trim() || !flatNumber.trim() || !relation || submitting}>
            {submitting ? 'Sending request...' : 'Request to join'}
          </button>
        </div>
      </form>
    </Shell>
  )
}
