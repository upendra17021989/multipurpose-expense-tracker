import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  societyAgencyAPI,
  societyAttendanceAPI,
  societyAttendanceWorkflowAPI
} from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'
const today = new Date().toISOString().slice(0, 10),
  statuses = [
    'PRESENT',
    'ABSENT',
    'LATE',
    'HALF_DAY',
    'ON_LEAVE',
    'WEEKLY_OFF',
    'HOLIDAY',
    'NOT_SCHEDULED'
  ]
const attendanceForStatus = (row, status) => {
  const working = ['PRESENT', 'LATE', 'HALF_DAY'].includes(status)
  return {
    ...row,
    status,
    checkIn: working ? row.checkIn || row.scheduledStart || '' : '',
    checkOut: working ? row.checkOut || row.scheduledEnd || '' : ''
  }
}
export const Attendance = () => {
  const isAdmin = useAuthStore((s) => s.currentAccount?.role === 'ADMIN')
  const [date, setDate] = useState(today),
    [rows, setRows] = useState([]),
    [agencies, setAgencies] = useState([]),
    [shortages, setShortages] = useState([]),
    [sheet, setSheet] = useState({ status: 'DRAFT' }),
    [corrections, setCorrections] = useState([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [importMethod, setImportMethod] = useState('QR'),
    [agency, setAgency] = useState('all'),
    [expandedRows, setExpandedRows] = useState(() => new Set())
  const load = () => {
    setLoading(true)
    Promise.all([
      societyAttendanceAPI.getDay(date),
      societyAgencyAPI.list(),
      societyAttendanceAPI.getShortages(date),
      societyAttendanceWorkflowAPI.status(date),
      isAdmin
        ? societyAttendanceWorkflowAPI.pendingCorrections()
        : Promise.resolve({ data: [] })
    ])
      .then(([r, a, s, h, c]) => {
        setRows(r.data || [])
        setAgencies(a.data || [])
        setShortages(s.data || [])
        setSheet(h.data || { status: 'DRAFT' })
        setCorrections(c.data || [])
      })
      .catch((e) =>
        toast.error(e.response?.data?.message || 'Unable to load attendance')
      )
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
  }, [date, isAdmin])
  const update = (id, key, value) =>
      setRows((v) =>
        v.map((x) => (x.rosterAssignmentId === id ? { ...x, [key]: value } : x))
      ),
    updateStatus = (row, status) => setRows((current) => current.map((item) => item.rosterAssignmentId !== row.rosterAssignmentId ? item : attendanceForStatus(item, status))),
    updateTime = (row, key, value) => setRows((current) => current.map((item) => item.rosterAssignmentId !== row.rosterAssignmentId ? item : { ...item, [key]: value, status: value && ['NOT_SCHEDULED','ABSENT','ON_LEAVE','WEEKLY_OFF','HOLIDAY'].includes(item.status) ? 'PRESENT' : item.status, checkIn: key === 'checkOut' && value && !item.checkIn ? item.scheduledStart || '' : (key === 'checkIn' ? value : item.checkIn), checkOut: key === 'checkIn' && value && !item.checkOut ? item.scheduledEnd || '' : (key === 'checkOut' ? value : item.checkOut) })),
    replacements = (row) =>
      (agencies.find((a) => a.id === row.agencyId)?.workers || []).filter(
        (w) => w.workerName !== row.assigneeName
      )
  const save = async () => {
    setSaving(true)
    try {
      const entries = rows.map((x) => ({
        rosterAssignmentId: x.rosterAssignmentId,
        status: x.status,
        checkIn: x.checkIn || null,
        checkOut: x.checkOut || null,
        replacementAgencyWorkerId: x.replacementAgencyWorkerId
          ? Number(x.replacementAgencyWorkerId)
          : null,
        notes: x.notes || null
      }))
      const r = await societyAttendanceAPI.saveBulk(date, entries)
      setRows(r.data || [])
      toast.success('Attendance saved')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to save')
    } finally {
      setSaving(false)
    }
  }
  const submit = async () => {
      try {
        setSheet((await societyAttendanceWorkflowAPI.submit(date)).data)
        toast.success('Attendance submitted')
      } catch (e) {
        toast.error(e.response?.data?.message || 'Unable to submit')
      }
    },
    lock = async () => {
      try {
        setSheet((await societyAttendanceWorkflowAPI.lock(date)).data)
        toast.success('Sheet locked')
      } catch (e) {
        toast.error(e.response?.data?.message || 'Unable to lock')
      }
    }
  const correction = async (r) => {
      const requestedStatus = window.prompt('Correct status:', r.status),
        reason = requestedStatus && window.prompt('Reason for correction:')
      if (!reason) return
      try {
        await societyAttendanceWorkflowAPI.requestCorrection(r.id, {
          requestedStatus: requestedStatus.toUpperCase(),
          requestedCheckIn: r.checkIn || null,
          requestedCheckOut: r.checkOut || null,
          reason
        })
        toast.success('Correction requested')
      } catch (e) {
        toast.error(e.response?.data?.message || 'Unable to request correction')
      }
    },
    approve = async (id) => {
      await societyAttendanceWorkflowAPI.approveCorrection(id)
      toast.success('Correction approved')
      load()
    }
  const counts = useMemo(
      () =>
        Object.fromEntries(
          statuses.map((s) => [s, rows.filter((x) => x.status === s).length])
        ),
      [rows]
    ),
    draft = sheet.status === 'DRAFT'
  const importEvidence = async (file) => { if (!file) return; try { const { data } = await societyAttendanceAPI.importEvidence(importMethod,file); toast.success(`${data.imported} attendance rows imported`); load() } catch(e){ toast.error(e.response?.data?.message || 'Unable to import attendance') } }
  const agencyKey = (row) =>
    row.agencyId == null ? 'direct' : String(row.agencyId)
  const agencyTabs = Array.from(
    rows
      .reduce((tabs, row) => {
        const key = agencyKey(row)
        const tab = tabs.get(key) || {
          key,
          name: row.agencyName || 'Direct staff',
          count: 0
        }
        tab.count += 1
        tabs.set(key, tab)
        return tabs
      }, new Map())
      .values()
  )
  const activeAgency = agencyTabs.some((tab) => tab.key === agency)
    ? agency
    : 'all'
  const visibleRows =
    activeAgency === 'all'
      ? rows
      : rows.filter((row) => agencyKey(row) === activeAgency)
  const markVisible = (status) =>
    setRows((current) =>
      current.map((row) =>
        activeAgency === 'all' || agencyKey(row) === activeAgency
          ? attendanceForStatus(row, status)
          : row
      )
    )
  return (
    <Shell
      title="Today's Attendance"
      eyebrow={`Attendance - ${sheet.status}`}
      actions={
        <div className="table-actions attendance-sheet-actions">
          {draft ? (
            <>
              <button
                className="primary"
                disabled={saving || !rows.length}
                onClick={save}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button disabled={!rows.some((x) => x.id)} onClick={submit}>
                Submit
              </button>
            </>
          ) : isAdmin && sheet.status === 'SUBMITTED' ? (
            <button className="primary" onClick={lock}>
              Lock sheet
            </button>
          ) : (
            <strong>{sheet.status}</strong>
          )}
        </div>
      }
    >
      <div className="attendance-page">
        <section className="attendance-summary" aria-label="Whole day summary">
          {[
            ['Expected', rows.length],
            ['Present', counts.PRESENT || 0],
            ['Absent', counts.ABSENT || 0],
            [
              'Shortage',
              shortages.reduce((n, x) => n + Number(x.shortage || 0), 0)
            ]
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
        {isAdmin && corrections.length > 0 && (
          <details className="attendance-details">
            <summary>Pending corrections ({corrections.length})</summary>
            {corrections.map((c) => (
              <div className="toolbar-panel" key={c.id}>
                <span>
                  <strong>{c.workerName}</strong>: {c.originalStatus}{' to '}
                  {c.requestedStatus}
                  <br />
                  <small>{c.reason}</small>
                </span>
                <button onClick={() => approve(c.id)}>Approve</button>
              </div>
            ))}
          </details>
        )}
        {shortages.length > 0 && (
          <details className="attendance-details">
            <summary>Agency staffing details</summary>
            {shortages.map((x) => (
              <p key={x.agencyId}>
                {x.agencyName}: required {x.required}, present {x.present},
                replacements {x.replacements},{' '}
                <strong>shortage {x.shortage}</strong>
              </p>
            ))}
          </details>
        )}
        <section className="toolbar-panel attendance-toolbar">
          <label>
            Attendance date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {isAdmin && <label>Evidence import<select value={importMethod} onChange={e=>setImportMethod(e.target.value)}><option value="QR">QR</option><option value="BIOMETRIC_IMPORT">Biometric</option></select><input type="file" accept=".csv,text/csv" onChange={e=>importEvidence(e.target.files?.[0])}/></label>}
        </section>
        <div
          className="attendance-agency-tabs"
          role="group"
          aria-label="Filter attendance by agency"
        >
          {[
            { key: 'all', name: 'All agencies', count: rows.length },
            ...agencyTabs
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              aria-pressed={activeAgency === tab.key}
              onClick={() => setAgency(tab.key)}
            >
              {tab.name} <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="attendance-list-heading">
          <span>
            {visibleRows.length} workers
            {activeAgency !== 'all'
              ? ' in this agency'
              : ' across all agencies'}
          </span>
          {draft && (
            <div className="table-actions">
              <button onClick={() => markVisible('PRESENT')}>
                Mark shown present
              </button>
              <button onClick={() => markVisible('ABSENT')}>
                Mark shown absent
              </button>
            </div>
          )}
        </div>
        <div className="table-wrap attendance-table-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Agency</th>
                <th>Shift / Post</th>
                <th>Status</th>
                <th>Replacement</th>
                <th>In</th>
                <th>Out</th>
                <th>Notes</th>
                {!draft && <th>Correction</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((x) => (
                <tr key={x.rosterAssignmentId} className={expandedRows.has(x.rosterAssignmentId) ? 'attendance-row-expanded' : ''}>
                  <td><div className="attendance-person-cell"><span><strong>{x.assigneeName}</strong><small className="attendance-person-shift">{x.shiftName} · {x.postName} · {x.scheduledStart || '--:--'}–{x.scheduledEnd || '--:--'}</small></span><button type="button" className="attendance-row-toggle" aria-expanded={expandedRows.has(x.rosterAssignmentId)} aria-label={`${expandedRows.has(x.rosterAssignmentId) ? 'Collapse' : 'Expand'} ${x.assigneeName}`} onClick={() => setExpandedRows((current) => { const next = new Set(current); if (next.has(x.rosterAssignmentId)) next.delete(x.rosterAssignmentId); else next.add(x.rosterAssignmentId); return next })}>{expandedRows.has(x.rosterAssignmentId) ? '−' : '+'}</button></div></td>
                  <td>{x.agencyName || 'Direct'}</td>
                  <td>
                    {x.shiftName}
                    <br />
                    <small>{x.postName}</small>
                  </td>
                  <td>
                    <select
                      aria-label={`Status for ${x.assigneeName}`}
                      disabled={!draft}
                      value={x.status}
                      onChange={(e) =>
                        updateStatus(x, e.target.value)
                      }
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {draft && x.agencyId && x.status === 'ABSENT' ? (
                      <select
                        aria-label={`Replacement for ${x.assigneeName}`}
                        value={x.replacementAgencyWorkerId || ''}
                        onChange={(e) =>
                          update(
                            x.rosterAssignmentId,
                            'replacementAgencyWorkerId',
                            e.target.value
                          )
                        }
                      >
                        <option value="">None</option>
                        {replacements(x).map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.workerName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      x.replacementWorkerName || '-'
                    )}
                  </td>
                  <td>
                    <input
                      disabled={!draft}
                      type="time"
                      value={x.checkIn || ''}
                      aria-label={`Check in for ${x.assigneeName}`}
                      onChange={(e) =>
                        updateTime(x, 'checkIn', e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      disabled={!draft}
                      type="time"
                      value={x.checkOut || ''}
                      aria-label={`Check out for ${x.assigneeName}`}
                      onChange={(e) =>
                        updateTime(x, 'checkOut', e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      disabled={!draft}
                      value={x.notes || ''}
                      aria-label={`Notes for ${x.assigneeName}`}
                      onChange={(e) =>
                        update(x.rosterAssignmentId, 'notes', e.target.value)
                      }
                    />
                  </td>
                  {!draft && (
                    <td>
                      <button disabled={!x.id} onClick={() => correction(x)}>
                        Request
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && !visibleRows.length && (
                <tr>
                  <td colSpan="9" className="empty-state">
                    No roster assignments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && <p role="status">Loading...</p>}
      </div>
    </Shell>
  )
}
