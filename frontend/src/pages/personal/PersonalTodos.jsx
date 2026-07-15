import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { personalTodoAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../utils/format'
import { Shell, SummaryGrid } from '../DashboardRouter'

const emptyForm = { title: '', notes: '', dueDate: '', priority: 'MEDIUM' }

export const PersonalTodos = () => {
  const currentAccount = useAuthStore((state) => state.currentAccount)
  const [todos, setTodos] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('OPEN')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    personalTodoAPI.list().then((response) => setTodos(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load to-do list'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCount = todos.filter((todo) => !todo.completed).length
  const completedCount = todos.length - openCount
  const overdueCount = todos.filter((todo) => !todo.completed && todo.dueDate && todo.dueDate < today()).length
  const visible = useMemo(() => todos.filter((todo) => filter === 'ALL' || (filter === 'DONE' ? todo.completed : !todo.completed)), [todos, filter])

  const reset = () => { setForm(emptyForm); setEditingId(null) }
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    const payload = { ...form, title: form.title.trim(), notes: form.notes.trim() || null, dueDate: form.dueDate || null }
    try {
      if (editingId) await personalTodoAPI.update(editingId, payload)
      else await personalTodoAPI.create(payload)
      toast.success(editingId ? 'Task updated' : 'Task added')
      reset(); load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save task')
    } finally { setSaving(false) }
  }

  const edit = (todo) => {
    setEditingId(todo.id)
    setForm({ title: todo.title, notes: todo.notes || '', dueDate: todo.dueDate || '', priority: todo.priority || 'MEDIUM' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggle = async (todo) => {
    try {
      const response = await personalTodoAPI.setCompleted(todo.id, !todo.completed)
      setTodos((current) => current.map((item) => item.id === todo.id ? response.data : item))
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to update task') }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await personalTodoAPI.delete(id)
      setTodos((current) => current.filter((todo) => todo.id !== id))
      if (editingId === id) reset()
      toast.success('Task deleted')
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to delete task') }
  }

  if (currentAccount?.accountType !== 'INDIVIDUAL') return <Shell title="To-do List" eyebrow="Personal"><p className="muted">To-do list is available only for Individual accounts.</p></Shell>

  return <Shell title="To-do List" eyebrow="Personal module">
    <SummaryGrid items={[[ 'Open', openCount ], [ 'Completed', completedCount ], [ 'Overdue', overdueCount ]]} />
    <form className="form-panel personal-todo-form" onSubmit={submit}>
      <div className="personal-panel-heading"><div><h2>{editingId ? 'Edit task' : 'Add a task'}</h2><p>Keep personal reminders connected to this workspace.</p></div></div>
      <div className="form-grid">
        <label>Task<input maxLength="160" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What needs to be done?" /></label>
        <label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
        <label className="document-wide">Notes<textarea maxLength="1000" rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional details" /></label>
      </div>
      <div className="form-actions"><button className="primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update task' : 'Add task'}</button>{editingId && <button type="button" onClick={reset}>Cancel</button>}</div>
    </form>

    <div className="toolbar-panel personal-todo-toolbar">
      <div>{[['OPEN', 'Open'], ['DONE', 'Completed'], ['ALL', 'All']].map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
      <strong>{visible.length} shown</strong>
    </div>

    <section className="personal-todo-list">
      {visible.map((todo) => <article className={`personal-todo-item ${todo.completed ? 'completed' : ''}`} key={todo.id}>
        <button className="personal-todo-check" type="button" aria-label={todo.completed ? 'Reopen task' : 'Complete task'} onClick={() => toggle(todo)}>{todo.completed ? '✓' : ''}</button>
        <div className="personal-todo-copy"><div><strong>{todo.title}</strong><span className={`personal-todo-priority ${todo.priority.toLowerCase()}`}>{todo.priority}</span></div>{todo.notes && <p>{todo.notes}</p>}<small className={!todo.completed && todo.dueDate && todo.dueDate < today() ? 'overdue' : ''}>{todo.dueDate ? `Due ${formatDate(todo.dueDate)}` : 'No due date'}</small></div>
        <div className="table-actions"><button type="button" onClick={() => edit(todo)}>Edit</button><button type="button" className="danger" onClick={() => remove(todo.id)}>Delete</button></div>
      </article>)}
      {!loading && visible.length === 0 && <p className="empty-state">{filter === 'OPEN' ? 'No open tasks. You are all caught up.' : 'No tasks in this view.'}</p>}
      {loading && <p className="muted">Loading tasks…</p>}
    </section>
  </Shell>
}

const today = () => new Date().toISOString().slice(0, 10)
