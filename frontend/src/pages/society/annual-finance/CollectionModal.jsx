import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { societyAnnualCollectionAPI } from '../../../api/endpoints'

const blank = (financialYear) => ({ financialYear, collectionType: 'MAINTENANCE', flatId: '', sourceName: '', paymentDate: new Date().toISOString().slice(0, 10), amount: '', paymentMode: 'UPI', referenceNumber: '', remarks: '' })

export const CollectionModal = ({ open, financialYear, flats, collection, onClose, onSaved }) => {
  const [form, setForm] = useState(blank(financialYear))
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setForm(collection ? { financialYear: collection.financialYear, collectionType: collection.collectionType, flatId: collection.flatId || '', sourceName: collection.sourceName || '', paymentDate: collection.paymentDate, amount: collection.amount, paymentMode: collection.paymentMode, referenceNumber: collection.referenceNumber || '', remarks: collection.remarks || '' } : blank(financialYear)) }, [open, financialYear, collection])
  if (!open) return null
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { const payload={ ...form, flatId: form.flatId ? Number(form.flatId) : null, amount: Number(form.amount) }; collection ? await societyAnnualCollectionAPI.update(collection.id,payload) : await societyAnnualCollectionAPI.create(payload); toast.success(collection?'Collection updated':'Collection recorded'); onSaved(); onClose() } catch (error) { toast.error(error.response?.data?.message || 'Unable to save collection') } finally { setSaving(false) } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && onClose()}><section className="expense-modal annual-finance-modal" role="dialog" aria-modal="true" aria-labelledby="collection-modal-title" onMouseDown={(e)=>e.stopPropagation()}>
    <div className="expense-modal-header"><div><h2 id="collection-modal-title">Record Collection</h2><p className="muted">Financial year {financialYear}</p></div><button type="button" className="modal-close" onClick={onClose} disabled={saving}>×</button></div>
    <form onSubmit={submit}><div className="expense-modal-form">
      <label>Collection type<select value={form.collectionType} onChange={(e)=>setForm({...form,collectionType:e.target.value,flatId:'',sourceName:''})}><option value="MAINTENANCE">Maintenance</option><option value="ADVERTISEMENT">Advertisement</option><option value="SPONSORSHIP">Sponsorship</option><option value="OTHER">Other</option></select></label>
      {form.collectionType==='MAINTENANCE'&&<label>Flat<select required value={form.flatId} onChange={(e)=>{const flat=flats.find(x=>String(x.id)===e.target.value);setForm({...form,flatId:e.target.value,sourceName:flat?`${flat.blockName}-${flat.flatNumber} / ${flat.ownerName}`:''})}}><option value="">Select flat</option>{flats.map(x=><option key={x.id} value={x.id}>{x.blockName}-{x.flatNumber} — {x.ownerName}</option>)}</select></label>}
      <label>Payer / source<input required value={form.sourceName} onChange={(e)=>setForm({...form,sourceName:e.target.value})}/></label>
      <label>Payment date<input required type="date" value={form.paymentDate} onChange={(e)=>setForm({...form,paymentDate:e.target.value})}/></label>
      <label>Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})}/></label>
      <label>Payment mode<select value={form.paymentMode} onChange={(e)=>setForm({...form,paymentMode:e.target.value})}>{['CASH','BANK','UPI','CARD','NEFT','CHEQUE'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Reference number<input value={form.referenceNumber} onChange={(e)=>setForm({...form,referenceNumber:e.target.value})}/></label>
      <label>Remarks<input value={form.remarks} onChange={(e)=>setForm({...form,remarks:e.target.value})}/></label>
    </div><div className="expense-modal-actions"><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving...':'Record Collection'}</button></div></form>
  </section></div>
}
