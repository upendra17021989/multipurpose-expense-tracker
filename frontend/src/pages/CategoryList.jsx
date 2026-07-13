import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { expenseCategoryAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { Shell } from './DashboardRouter'

const categoryDefaults = {
  INDIVIDUAL: ['PERSONAL'],
  SOCIETY: ['SOCIETY_REGULAR', 'FESTIVAL', 'SPORTS'],
  KIRANA_STORE: ['STORE']
}

const defaultCategoryNames = {
  INDIVIDUAL: ['Food', 'Grocery', 'Rent', 'Travel', 'Fuel', 'Shopping', 'Medical', 'Education', 'Bills', 'Entertainment', 'Miscellaneous'],
  SOCIETY: ['Maintenance', 'Security', 'Cleaning', 'Electricity', 'Plumbing', 'Lift', 'Garden', 'Office/Admin', 'Festival', 'Sports', 'Miscellaneous'],
  KIRANA_STORE: ['Shop Rent', 'Electricity', 'Staff Salary', 'Transport', 'Packaging', 'Maintenance', 'Miscellaneous']
}

export const CategoryList = () => {
  const { currentAccount } = useAuthStore()
  const canWrite = currentAccount?.accountType !== 'SOCIETY' || currentAccount?.role !== 'MEMBER'
  const [categories, setCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ categoryName: '', categoryType: '' })
  const [seeding, setSeeding] = useState(false)

  const categoryTypes = useMemo(() => categoryDefaults[currentAccount?.accountType] || ['PERSONAL'], [currentAccount])

  const loadCategories = () => {
    expenseCategoryAPI.getCategories()
      .then((response) => setCategories(response.data || []))
      .catch(() => toast.error('Unable to load categories'))
  }

  useEffect(loadCategories, [])

  useEffect(() => {
    setForm((current) => ({ ...current, categoryType: current.categoryType || categoryTypes[0] }))
  }, [categoryTypes])

  const reset = () => {
    setEditingId(null)
    setForm({ categoryName: '', categoryType: categoryTypes[0] })
  }

  const categoryTypeForName = (name) => {
    if (currentAccount?.accountType === 'SOCIETY' && name === 'Festival') return 'FESTIVAL'
    if (currentAccount?.accountType === 'SOCIETY' && name === 'Sports') return 'SPORTS'
    return categoryTypes[0]
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      categoryName: form.categoryName.trim(),
      categoryType: form.categoryType,
      accountType: currentAccount?.accountType,
      active: true
    }

    try {
      if (editingId) await expenseCategoryAPI.updateCategory(editingId, payload)
      else await expenseCategoryAPI.createCategory(payload)
      toast.success(editingId ? 'Category updated' : 'Category created')
      reset()
      loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save category')
    }
  }

  const seedDefaults = async () => {
    setSeeding(true)
    try {
      const names = defaultCategoryNames[currentAccount?.accountType] || defaultCategoryNames.INDIVIDUAL
      await Promise.all(names.map((name) => expenseCategoryAPI.createCategory({
        categoryName: name,
        categoryType: categoryTypeForName(name),
        accountType: currentAccount?.accountType,
        active: true
      })))
      toast.success('Default categories created')
      loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create default categories')
    } finally {
      setSeeding(false)
    }
  }

  const edit = (category) => {
    setEditingId(category.id)
    setForm({ categoryName: category.categoryName, categoryType: category.categoryType })
  }

  const remove = async (categoryId) => {
    if (!window.confirm('Delete this category?')) return
    try {
      await expenseCategoryAPI.deleteCategory(categoryId)
      toast.success('Category deleted')
      loadCategories()
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  return (
    <Shell title="Expense Categories" eyebrow="Master data">
      {categories.length === 0 && canWrite && (
        <section className="empty-panel">
          <p className="muted">No categories found for this account.</p>
          <button className="primary" onClick={seedDefaults} disabled={seeding}>
            {seeding ? 'Creating...' : 'Create Default Categories'}
          </button>
        </section>
      )}

      {canWrite && <form className="inline-form" onSubmit={handleSubmit}>
        <input placeholder="Category name" value={form.categoryName} onChange={(event) => setForm({ ...form, categoryName: event.target.value })} required />
        <select value={form.categoryType} onChange={(event) => setForm({ ...form, categoryType: event.target.value })}>
          {categoryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <button className="primary" type="submit">{editingId ? 'Update' : 'Add'} Category</button>
        {editingId && <button type="button" onClick={reset}>Cancel</button>}
      </form>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Account Type</th>
              <th>Category Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.categoryName}</td>
                <td>{category.accountType}</td>
                <td>{category.categoryType}</td>
                <td>{category.active ? 'Active' : 'Inactive'}</td>
                <td className="table-actions">
                  {canWrite ? <>
                    <button onClick={() => edit(category)}>Edit</button>
                    <button className="danger" onClick={() => remove(category.id)}>Delete</button>
                  </> : <span className="muted">View only</span>}
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan="5" className="empty-state">No categories found.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  )
}
