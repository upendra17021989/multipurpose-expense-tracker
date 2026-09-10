import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  societyAgencyAPI,
  societyRosterAPI,
  societyStaffAPI
} from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell } from '../DashboardRouter'
import './Roster.css'

const today = new Date().toISOString().slice(0, 10)
export const Roster = () => {
  const canManage = useAuthStore((s) => s.currentAccount?.role === 'ADMIN')
  const [shifts, setShifts] = useState([]),
    [assignments, setAssignments] = useState([]),
    [staff, setStaff] = useState([]),
    [agencies, setAgencies] = useState([])
  const [agency, setAgency] = useState('all'),
    [loading, setLoading] = useState(true)
  const [shift, setShift] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 0
  })
  const [form, setForm] = useState({
    shiftId: '',
    assignee: '',
    postName: '',
    effectiveFrom: today,
    effectiveTo: ''
  })
  const workers = useMemo(
    () =>
      agencies.flatMap((a) =>
        (a.workers || []).map((w) => ({
          ...w,
          agencyName: a.name,
          agencyId: a.id
        }))
      ),
    [agencies]
  )
  const load = () =>
    Promise.all([
      societyRosterAPI.getShifts(),
      societyRosterAPI.getAssignments(),
      societyStaffAPI.getStaff(),
      societyAgencyAPI.list()
    ])
      .then(([s, r, st, a]) => {
        setShifts(s.data || [])
        setAssignments(r.data || [])
        setStaff(st.data || [])
        setAgencies(a.data || [])
      })
      .catch((e) =>
        toast.error(e.response?.data?.message || 'Unable to load roster')
      )
      .finally(() => setLoading(false))
  useEffect(() => {
    load()
  }, [])
  const addShift = async (e) => {
    e.preventDefault()
    try {
      await societyRosterAPI.createShift({
        ...shift,
        graceMinutes: Number(shift.graceMinutes || 0)
      })
      setShift({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        graceMinutes: 0
      })
      toast.success('Shift added')
      load()
    } catch (x) {
      toast.error(x.response?.data?.message || 'Unable to add shift')
    }
  }
  const assign = async (e) => {
    e.preventDefault()
    const [type, id] = form.assignee.split(':')
    try {
      await societyRosterAPI.assign({
        shiftId: Number(form.shiftId),
        staffId: type === 'staff' ? Number(id) : null,
        agencyWorkerId: type === 'worker' ? Number(id) : null,
        postName: form.postName,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null
      })
      setForm({ ...form, assignee: '', postName: '' })
      toast.success('Roster assignment added')
      load()
    } catch (x) {
      toast.error(x.response?.data?.message || 'Unable to assign roster')
    }
  }
  const remove = async (id) => {
    if (!window.confirm('Remove this roster assignment?')) return
    await societyRosterAPI.removeAssignment(id)
    load()
  }

  const agencyFor = (assignment) => {
    if (assignment.assigneeType === 'DIRECT')
      return { key: 'direct', name: 'Direct staff' }
    const worker = workers.find(
      (worker) => String(worker.id) === String(assignment.agencyWorkerId)
    )
    return worker
      ? { key: String(worker.agencyId), name: worker.agencyName }
      : { key: 'other', name: 'Other agency workers' }
  }
  const tabs = Array.from(
    assignments
      .reduce((result, assignment) => {
        const group = agencyFor(assignment)
        const tab = result.get(group.key) || { ...group, count: 0 }
        tab.count += 1
        result.set(group.key, tab)
        return result
      }, new Map())
      .values()
  )
  const activeAgency = tabs.some((tab) => tab.key === agency) ? agency : 'all'
  const visible = assignments.filter(
    (assignment) =>
      activeAgency === 'all' || agencyFor(assignment).key === activeAgency
  )
  return (
    <Shell title="Shifts & Roster" eyebrow="Society workforce">
      <div className="roster-page">
        <section className="roster-summary" aria-label="Roster summary">
          {[
            ['Shifts', shifts.length],
            ['Assignments', assignments.length],
            ['Posts', new Set(assignments.map((x) => x.postName)).size]
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
        {canManage && (
          <div className="roster-editors">
            <details className="roster-editor">
              <summary>Add shift</summary>
              <form className="form-panel" onSubmit={addShift}>
                <div className="form-grid">
                  <label>
                    Name
                    <input
                      required
                      value={shift.name}
                      onChange={(e) =>
                        setShift({ ...shift, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Start
                    <input
                      type="time"
                      required
                      value={shift.startTime}
                      onChange={(e) =>
                        setShift({ ...shift, startTime: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="time"
                      required
                      value={shift.endTime}
                      onChange={(e) =>
                        setShift({ ...shift, endTime: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Grace minutes
                    <input
                      type="number"
                      min="0"
                      value={shift.graceMinutes}
                      onChange={(e) =>
                        setShift({ ...shift, graceMinutes: e.target.value })
                      }
                    />
                  </label>
                </div>
                <button className="primary">Add shift</button>
              </form>
            </details>
            <details className="roster-editor">
              <summary>Assign roster</summary>
              <form className="form-panel" onSubmit={assign}>
                <div className="form-grid">
                  <label>
                    Shift
                    <select
                      required
                      value={form.shiftId}
                      onChange={(e) =>
                        setForm({ ...form, shiftId: e.target.value })
                      }
                    >
                      <option value="">Select shift</option>
                      {shifts.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.startTime} - {x.endTime})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Person
                    <select
                      required
                      value={form.assignee}
                      onChange={(e) =>
                        setForm({ ...form, assignee: e.target.value })
                      }
                    >
                      <option value="">Select person</option>
                      <optgroup label="Direct staff">
                        {staff.map((x) => (
                          <option key={x.id} value={`staff:${x.id}`}>
                            {x.staffName}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Agency workers">
                        {workers.map((x) => (
                          <option key={x.id} value={`worker:${x.id}`}>
                            {x.workerName} - {x.agencyName}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                  <label>
                    Post / location
                    <input
                      required
                      placeholder="Main gate, Block A..."
                      value={form.postName}
                      onChange={(e) =>
                        setForm({ ...form, postName: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    From
                    <input
                      type="date"
                      required
                      value={form.effectiveFrom}
                      onChange={(e) =>
                        setForm({ ...form, effectiveFrom: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Until
                    <input
                      type="date"
                      min={form.effectiveFrom}
                      value={form.effectiveTo}
                      onChange={(e) =>
                        setForm({ ...form, effectiveTo: e.target.value })
                      }
                    />
                  </label>
                </div>
                <button className="primary">Add assignment</button>
              </form>
            </details>
          </div>
        )}
        <div
          className="roster-agency-tabs"
          role="group"
          aria-label="Filter roster by agency"
        >
          {[
            { key: 'all', name: 'All agencies', count: assignments.length },
            ...tabs
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
        <p className="roster-list-count" role="status">
          {loading ? 'Loading roster...' : `${visible.length} assignments`}
        </p>
        <div className="table-wrap roster-table-wrap">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Agency / Type</th>
                <th>Shift</th>
                <th>Post</th>
                <th>Effective dates</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => (
                <tr key={x.id}>
                  <td data-label="Person">
                    <strong>{x.assigneeName}</strong>
                  </td>
                  <td data-label="Agency / Type">{agencyFor(x).name}</td>
                  <td data-label="Shift">{x.shiftName}</td>
                  <td data-label="Post">{x.postName}</td>
                  <td data-label="Effective dates">
                    {x.effectiveFrom} - {x.effectiveTo || 'Ongoing'}
                  </td>
                  {canManage && (
                    <td data-label="Action">
                      <button
                        className="danger"
                        aria-label={`Remove assignment for ${x.assigneeName}`}
                        onClick={() => remove(x.id)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && !visible.length && (
                <tr className="roster-empty">
                  <td colSpan={canManage ? 6 : 5} className="empty-state">
                    No roster assignments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}
