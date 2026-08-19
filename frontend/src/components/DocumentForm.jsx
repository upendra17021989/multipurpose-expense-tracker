import { useEffect, useState } from 'react'

export const DOCUMENT_CATEGORIES = [
  ['INSURANCE_POLICY', 'Insurance Policy'], ['TAX_DOCUMENT', 'Tax Document'],
  ['BANK_DOCUMENT', 'Bank Document'], ['INVESTMENT', 'Investment'],
  ['LOAN_EMI', 'Loan / EMI'], ['IDENTITY_KYC', 'Identity / KYC'],
  ['PROPERTY', 'Property'], ['WARRANTY_INVOICE', 'Warranty / Invoice'],
  ['EMPLOYMENT_INCOME', 'Employment / Income'], ['OTHER', 'Other']
]

const emptyForm = { title: '', category: 'INSURANCE_POLICY', issuer: '', documentNumber: '', issueDate: '', expiryDate: '', tags: '', notes: '' }
const MAX_FILE_SIZE = 1024 * 1024
const FILE_SIZE_ERROR = 'This file exceeds the 1 MB upload limit. Please choose a file that is 1 MB or smaller.'

export const DocumentForm = ({ document, onSubmit, onCancel, saving }) => {
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(document ? {
      title: document.title || '', category: document.category || 'OTHER', issuer: document.issuer || '',
      documentNumber: document.documentNumber || '', issueDate: document.issueDate || '', expiryDate: document.expiryDate || '',
      tags: document.tags || '', notes: document.notes || ''
    } : emptyForm)
    setFile(null); setError('')
  }, [document])

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const changeFile = (event) => {
    const selectedFile = event.target.files?.[0] || null
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setError(FILE_SIZE_ERROR)
      event.target.value = ''
      return
    }
    setFile(selectedFile)
    setError('')
  }
  const submit = (event) => {
    event.preventDefault()
    if (!document && !file) return setError('Choose a PDF or image to upload.')
    if (file && file.size > MAX_FILE_SIZE) return setError(FILE_SIZE_ERROR)
    if (form.issueDate && form.expiryDate && form.expiryDate < form.issueDate) return setError('Expiry date cannot be before issue date.')
    setError(''); onSubmit(form, file)
  }

  return (
    <form className="form-panel document-form" onSubmit={submit}>
      <div className="section-heading-row"><h3>{document ? 'Edit document' : 'Add document'}</h3><button type="button" onClick={onCancel}>Close</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-grid two">
        <label>Title<input name="title" maxLength="150" value={form.title} onChange={change} required /></label>
        <label>Category<select name="category" value={form.category} onChange={change}>{DOCUMENT_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {!document && <label className="document-file-field">File (maximum 1 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.jfif,.png" onChange={changeFile} required /></label>}
        <label>Issuer / provider<input name="issuer" maxLength="150" value={form.issuer} onChange={change} /></label>
        <label>Policy / account / reference number<input name="documentNumber" maxLength="150" value={form.documentNumber} onChange={change} /></label>
        <label>Issue date<input type="date" name="issueDate" value={form.issueDate} onChange={change} /></label>
        <label>Expiry date<input type="date" name="expiryDate" min={form.issueDate || undefined} value={form.expiryDate} onChange={change} /></label>
        <label className="document-wide">Tags<input name="tags" maxLength="500" placeholder="insurance, health, family" value={form.tags} onChange={change} /></label>
        <label className="document-wide">Notes<textarea name="notes" maxLength="1000" rows="3" value={form.notes} onChange={change} /></label>
      </div>
      <div className="form-actions"><button type="button" onClick={onCancel}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : document ? 'Save changes' : 'Upload document'}</button></div>
    </form>
  )
}
