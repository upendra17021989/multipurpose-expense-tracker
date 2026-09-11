import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { societyStaffAPI, authAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { useI18n } from '../../i18n'
import { Shell } from '../DashboardRouter'

export const StaffInvitation = () => {
  const { tx } = useI18n(), [params] = useSearchParams(), navigate = useNavigate(), setSession = useAuthStore((state) => state.setSession)
  const [code, setCode] = useState(params.get('code') || ''), [busy, setBusy] = useState(false)
  const accept = async (event) => { event.preventDefault(); setBusy(true); try { const accepted = await societyStaffAPI.acceptInvitation(code.trim()); const response = await authAPI.switchAccount(accepted.data.accountId); const { token, user, accounts, currentAccount } = response.data; setSession(token, user, accounts, currentAccount); toast.success(tx('Staff workspace access activated.')); navigate('/home') } catch (e) { toast.error(e.response?.data?.message || tx('Unable to accept invitation')) } finally { setBusy(false) } }
  return <Shell title="Accept staff invitation" eyebrow="Society workspace"><form className="form-panel narrow" onSubmit={accept}><label>{tx('Invitation code')}<input value={code} onChange={(e) => setCode(e.target.value)} required /></label><button className="primary" disabled={busy}>{busy ? tx('Accepting...') : tx('Accept invitation')}</button></form></Shell>
}
