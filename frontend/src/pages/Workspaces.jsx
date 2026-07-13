import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { authAPI, societyMembershipAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useI18n } from '../i18n'
import { Shell } from './DashboardRouter'

const workspaceTypes = [
  ['INDIVIDUAL', 'Personal'],
  ['SOCIETY', 'Society'],
  ['SPORTS', 'Sports'],
  ['KIRANA_STORE', 'Kirana store']
]

const defaultForm = {
  accountType: 'INDIVIDUAL',
  accountName: '',
  address: '',
  societyMode: 'CREATE',
  societyId: '',
  societyName: '',
  storeName: ''
}

export const Workspaces = () => {
  const { accounts, currentAccount, setSession } = useAuthStore()
  const { tx } = useI18n()
  const [form, setForm] = useState(defaultForm)
  const [societies, setSocieties] = useState([])
  const [loadingSocieties, setLoadingSocieties] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [switchingId, setSwitchingId] = useState(null)

  const joinedSocietyIds = useMemo(
    () => new Set(accounts.filter((account) => account.accountType === 'SOCIETY').map((account) => account.id)),
    [accounts]
  )
  const availableSocieties = societies.filter((society) => !joinedSocietyIds.has(society.id))

  useEffect(() => {
    if (form.accountType !== 'SOCIETY' || form.societyMode !== 'JOIN') return
    setLoadingSocieties(true)
    societyMembershipAPI.listSocieties()
      .then((response) => setSocieties(response.data || []))
      .catch(() => toast.error('Unable to load societies'))
      .finally(() => setLoadingSocieties(false))
  }, [form.accountType, form.societyMode])

  const update = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const switchWorkspace = async (accountId) => {
    if (!accountId || currentAccount?.id === accountId) return
    setSwitchingId(accountId)
    try {
      const response = await authAPI.switchAccount(accountId)
      const { token, user, accounts, currentAccount } = response.data
      setSession(token, user, accounts, currentAccount)
      toast.success(`Switched to ${currentAccount.accountName}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to switch workspace')
    } finally {
      setSwitchingId(null)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    const payload = {
      accountType: form.accountType,
      accountName: form.accountName,
      address: form.address,
      role: resolveRole(form.accountType, form.societyMode),
      societyId: form.accountType === 'SOCIETY' && form.societyMode === 'JOIN' ? Number(form.societyId) : null,
      createNewSociety: form.accountType === 'SOCIETY' && form.societyMode === 'CREATE',
      societyName: form.accountType === 'SOCIETY' ? form.societyName || form.accountName : '',
      storeName: form.accountType === 'KIRANA_STORE' ? form.storeName || form.accountName : ''
    }

    try {
      const response = await authAPI.addWorkspace(payload)
      const { token, user, accounts, currentAccount } = response.data
      setSession(token, user, accounts, currentAccount)
      toast.success(form.accountType === 'SOCIETY' && form.societyMode === 'JOIN'
        ? 'Request sent to the society admins for approval.'
        : `Workspace added: ${currentAccount.accountName}`)
      setForm(defaultForm)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add workspace')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell title="Workspaces" eyebrow="Account">
      <section className="report-panel">
        <div className="section-heading-row">
          <div>
            <h2>{tx('Your workspaces')}</h2>
            <p className="muted">Switch between the accounts and product areas connected to your login.</p>
          </div>
        </div>
        <div className="workspace-grid">
          {accounts.map((account) => (
            <article className="workspace-card" key={account.id}>
              <span className="workspace-card-symbol" aria-hidden="true">{workspaceInitial(account.accountType)}</span>
              <div>
                <strong>{account.accountName}</strong>
                <small>{workspaceLabel(account.accountType)} - {account.role || 'Member'}</small>
              </div>
              {currentAccount?.id === account.id ? (
                <b>{tx('Current')}</b>
              ) : (
                <button type="button" onClick={() => switchWorkspace(account.id)} disabled={switchingId === account.id}>
                  {switchingId === account.id ? tx('Switching...') : tx('Switch')}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <form className="form-panel" onSubmit={submit}>
        <h2>{tx('Add workspace')}</h2>
        <p className="muted">Create or join another workspace using this same login.</p>
        <div className="form-grid">
          <label>
            {tx('Workspace type')}
            <select name="accountType" value={form.accountType} onChange={update} required>
              {workspaceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          {form.accountType === 'SOCIETY' && (
            <label>
              Society action
              <select name="societyMode" value={form.societyMode} onChange={update}>
                <option value="CREATE">Create society workspace</option>
                <option value="JOIN">Join existing society</option>
              </select>
            </label>
          )}

          {form.accountType === 'SOCIETY' && form.societyMode === 'JOIN' ? (
            <label>
              Society
              <select name="societyId" value={form.societyId} onChange={update} required disabled={loadingSocieties}>
                <option value="">{loadingSocieties ? 'Loading societies...' : 'Select a society'}</option>
                {availableSocieties.map((society) => (
                  <option key={society.id} value={society.id}>{society.name}{society.address ? ` - ${society.address}` : ''}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              {tx('Workspace name')}
              <input name="accountName" value={form.accountName} onChange={update} placeholder={placeholder(form.accountType)} required />
            </label>
          )}

          {form.accountType === 'SOCIETY' && form.societyMode === 'CREATE' && (
            <label>
              Society name
              <input name="societyName" value={form.societyName} onChange={update} placeholder="e.g. Shree Residency Society" />
            </label>
          )}

          {form.accountType === 'KIRANA_STORE' && (
            <label>
              Store name
              <input name="storeName" value={form.storeName} onChange={update} placeholder="e.g. Patel Kirana Store" />
            </label>
          )}
        </div>

        <label>
          Address
          <textarea name="address" value={form.address} onChange={update} rows="3" />
        </label>

        {form.accountType === 'SOCIETY' && form.societyMode === 'JOIN' && !loadingSocieties && !availableSocieties.length && (
          <p className="muted">There are no other societies available to join.</p>
        )}

        <div className="form-actions">
          <button className="primary" type="submit" disabled={submitting || (form.accountType === 'SOCIETY' && form.societyMode === 'JOIN' && !form.societyId)}>
            {submitting ? tx('Adding workspace...') : tx('Add workspace')}
          </button>
        </div>
      </form>
    </Shell>
  )
}

const resolveRole = (accountType, societyMode) => {
  if (accountType === 'SOCIETY') return societyMode === 'JOIN' ? 'MEMBER' : 'ADMIN'
  if (accountType === 'KIRANA_STORE') return 'STORE_OWNER'
  return 'OWNER'
}

const workspaceLabel = (type) => workspaceTypes.find(([value]) => value === type)?.[1] || 'Workspace'
const workspaceInitial = (type) => workspaceLabel(type).slice(0, 1).toUpperCase()

const placeholder = (type) => {
  if (type === 'SOCIETY') return 'e.g. Shree Residency Society'
  if (type === 'KIRANA_STORE') return 'e.g. Patel Kirana Store'
  if (type === 'SPORTS') return 'e.g. Sunday Cricket Club'
  return 'e.g. Personal Expenses'
}

