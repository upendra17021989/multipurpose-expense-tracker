import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { societyFlatAPI } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { Shell, SummaryGrid } from '../DashboardRouter'

export const FlatList = () => {
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [flats, setFlats] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadFlats = () => {
    setLoading(true)
    societyFlatAPI.getFlats()
      .then((response) => setFlats(response.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load flats'))
      .finally(() => setLoading(false))
  }

  useEffect(loadFlats, [])

  const visibleFlats = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return flats
    return flats.filter((flat) => [flat.blockName, flat.flatNumber, flat.ownerName, flat.mobile, flat.email, flat.residentType]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)))
  }, [flats, search])

  const summary = useMemo(() => {
    const blocks = new Set(flats.map((flat) => flat.blockName).filter(Boolean))
    const owners = flats.filter((flat) => flat.residentType === 'OWNER').length
    const tenants = flats.filter((flat) => flat.residentType === 'TENANT').length
    return { blocks: blocks.size, owners, tenants }
  }, [flats])

  const remove = async (flatId) => {
    if (!window.confirm('Delete this flat?')) return
    try {
      await societyFlatAPI.deleteFlat(flatId)
      toast.success('Flat deleted')
      loadFlats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  if (currentAccount?.accountType !== 'SOCIETY') {
    return (
      <Shell title="Flat Master" eyebrow="Society module">
        <p className="muted">Flat master is available for society accounts.</p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Flat Master"
      eyebrow="Society module"
      actions={<Link className="button-link" to="/society/flats/new">Add Flat</Link>}
    >
      <SummaryGrid items={[
        ['Total Flats', flats.length],
        ['Blocks', summary.blocks],
        ['Owner Occupied', summary.owners],
        ['Tenant Occupied', summary.tenants]
      ]} />

      <section className="toolbar-panel flat-toolbar">
        <input placeholder="Search block, flat, owner, mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
        <strong>{visibleFlats.length} shown</strong>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Block</th>
              <th>Flat</th>
              <th>Owner</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Resident</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleFlats.map((flat) => (
              <tr key={flat.id}>
                <td>{flat.blockName}</td>
                <td>{flat.flatNumber}</td>
                <td>{flat.ownerName}</td>
                <td>{flat.mobile || '-'}</td>
                <td>{flat.email || '-'}</td>
                <td>{flat.residentType}</td>
                <td>{flat.active ? 'Active' : 'Inactive'}</td>
                <td className="table-actions">
                  <button onClick={() => navigate(`/society/flats/${flat.id}/edit`)}>Edit</button>
                  <button className="danger" onClick={() => remove(flat.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && visibleFlats.length === 0 && <tr><td colSpan="8" className="empty-state">No flats found.</td></tr>}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading flats...</p>}
    </Shell>
  )
}
