import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { attachmentAPI, expenseAPI, expenseCategoryAPI, festivalEventAPI, societyStaffAPI, societyVendorAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { extractUtrFromImage } from '../utils/utrOcr'
import { Shell } from './DashboardRouter'

const initialForm = {
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: '',
  expenseType: '',
  festivalEventId: '',
  description: '',
  amount: '',
  paymentMode: 'CASH',
  transactionId: '',
  utr: '',
  chequeNumber: '',
  vendorName: '',
  remarks: '',
  status: 'DRAFT'
}

const expenseTypesByAccount = {
  INDIVIDUAL: ['PERSONAL'],
  SOCIETY: ['SOCIETY_REGULAR', 'FESTIVAL', 'SPORTS'],
  KIRANA_STORE: ['STORE_EXPENSE']
}

const speechRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const formatDate = (date) => date.toISOString().slice(0, 10)

const extractDate = (text) => {
  const today = new Date()
  const normalized = text.toLowerCase()
  if (/\byesterday\b/.test(normalized)) {
    const date = new Date(today)
    date.setDate(today.getDate() - 1)
    return formatDate(date)
  }
  if (/\btomorrow\b/.test(normalized)) {
    const date = new Date(today)
    date.setDate(today.getDate() + 1)
    return formatDate(date)
  }
  if (/\btoday\b/.test(normalized)) return formatDate(today)

  const dateMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (!dateMatch) return ''

  const day = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const year = dateMatch[3] ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : today.getFullYear()
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? '' : formatDate(date)
}

const parseVoiceExpense = (transcript, categories) => {
  const normalized = transcript.toLowerCase()
  const updates = {}

  const amountMatch = normalized.match(/(?:rs\.?|rupees?|inr|amount|expense|spent|paid|of)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/)
  if (amountMatch) updates.amount = amountMatch[1].replace(/,/g, '')

  const date = extractDate(normalized)
  if (date) updates.expenseDate = date

  const paymentAliases = [
    ['UPI', /\b(upi|gpay|google pay|phonepe|paytm)\b/],
    ['CASH', /\bcash\b/],
    ['CARD', /\b(card|credit card|debit card)\b/],
    ['NEFT', /\b(neft|bank transfer|transfer)\b/],
    ['CHEQUE', /\b(cheque|check)\b/],
    ['BANK', /\bbank\b/]
  ]
  const payment = paymentAliases.find(([, pattern]) => pattern.test(normalized))
  if (payment) updates.paymentMode = payment[0]

  const utrMatch = transcript.match(/\b(?:utr|transaction id|transaction|txn|txnid)\s*(?:number|id)?\s*([a-z0-9-]{6,})\b/i)
  if (utrMatch) {
    updates.transactionId = utrMatch[1].toUpperCase()
    if (updates.paymentMode === 'UPI' || updates.paymentMode === 'NEFT') {
      updates.utr = utrMatch[1].toUpperCase()
    }
  }

  const chequeMatch = transcript.match(/\b(?:cheque|check)\s*(?:number|no)?\s*([a-z0-9-]{4,})\b/i)
  if (chequeMatch) updates.chequeNumber = chequeMatch[1].toUpperCase()

  const vendorMatch = transcript.match(/\b(?:paid to|vendor|shop|from|to)\s+([^,.;]+?)(?:\s+(?:for|on|by|via|using|today|yesterday|tomorrow)\b|$)/i)
  if (vendorMatch) updates.vendorName = vendorMatch[1].trim()

  const category = categories.find((item) => {
    const categoryName = (item.categoryName || '').toLowerCase()
    return categoryName && normalized.includes(categoryName)
  })
  if (category) updates.categoryId = String(category.id)

  const descriptionMatch = transcript.match(/\b(?:for|note|description|remark)\s+(.+)$/i)
  if (descriptionMatch) {
    updates.description = descriptionMatch[1]
      .replace(/\b(?:paid by|by|via|using)\s+(cash|upi|gpay|google pay|phonepe|paytm|card|credit card|debit card|bank|bank transfer|neft|cheque|check)\b/ig, '')
      .trim()
  } else if (transcript.trim()) {
    updates.description = transcript.trim()
  }

  return updates
}
export const ExpenseForm = () => {
  const { expenseId } = useParams()
  const navigate = useNavigate()
  const { currentAccount } = useAuthStore()
  const [form, setForm] = useState(initialForm)
  const [categories, setCategories] = useState([])
  const [festivals, setFestivals] = useState([])
  const [vendors, setVendors] = useState([])
  const [staff, setStaff] = useState([])
  const [attachments, setAttachments] = useState([])
  const [receiptFile, setReceiptFile] = useState(null)
  const [ocrStatus, setOcrStatus] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef(null)
  const isEdit = Boolean(expenseId)
  const isApproved = isEdit && form.status === 'APPROVED'
  const showFestivalEvent = currentAccount?.accountType === 'SOCIETY' && (form.expenseType === 'FESTIVAL' || form.expenseType === 'SPORTS')

  const availableTypes = useMemo(() => expenseTypesByAccount[currentAccount?.accountType] || ['PERSONAL'], [currentAccount])
  const canUseVoice = Boolean(speechRecognitionConstructor())

  useEffect(() => {
    expenseCategoryAPI.getCategories().then((response) => setCategories(response.data || []))
  }, [])

  useEffect(() => {
    if (currentAccount?.accountType !== 'SOCIETY') return
    Promise.all([festivalEventAPI.getFestivals(), societyVendorAPI.getVendors(), societyStaffAPI.getStaff()])
      .then(([festivalResponse, vendorResponse, staffResponse]) => {
        setFestivals(festivalResponse.data || [])
        setVendors(vendorResponse.data || [])
        setStaff(staffResponse.data || [])
      })
      .catch(() => toast.error('Unable to load festival events, vendors, or staff'))
  }, [currentAccount])

  useEffect(() => {
    setForm((current) => ({ ...current, expenseType: current.expenseType || availableTypes[0] }))
  }, [availableTypes])

  useEffect(() => {
    if (!isEdit) return
    expenseAPI.getExpense(expenseId)
      .then((response) => {
        const expense = response.data
        if (expense.status === 'APPROVED') {
          toast.error('Cannot update approved expense')
        }
        setForm({
          expenseDate: expense.expenseDate || initialForm.expenseDate,
          categoryId: expense.categoryId || '',
          expenseType: expense.expenseType || availableTypes[0],
          festivalEventId: expense.festivalEventId || '',
          description: expense.description || '',
          amount: expense.amount || '',
          paymentMode: expense.paymentMode || 'CASH',
          transactionId: expense.transactionId || '',
          utr: expense.utr || '',
          chequeNumber: expense.chequeNumber || '',
          vendorName: expense.vendorName || '',
          remarks: expense.remarks || '',
          status: expense.status || 'DRAFT'
        })
      })
      .catch(() => toast.error('Unable to load expense'))
  }, [expenseId, isEdit, availableTypes])

  const loadAttachments = () => {
    if (!isEdit) return
    attachmentAPI.getAttachments('EXPENSE', expenseId)
      .then((response) => setAttachments(response.data || []))
      .catch(() => {})
  }

  useEffect(loadAttachments, [expenseId, isEdit])

  useEffect(() => () => {
    recognitionRef.current?.abort()
  }, [])

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'expenseType' && value !== 'FESTIVAL' && value !== 'SPORTS' ? { festivalEventId: '' } : {})
    }))
  }

  const handleReceiptFile = async (file) => {
    setReceiptFile(file || null)
    setOcrStatus('')
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setOcrStatus('Receipt selected. OCR works for image screenshots only.')
      return
    }

    setOcrStatus('Reading screenshot for UTR...')
    try {
      const { transactionId, utr, amount } = await extractUtrFromImage(file)
      if (transactionId || utr || amount) {
        setForm((current) => ({
          ...current,
          utr: utr || current.utr,
          transactionId: transactionId || utr || current.transactionId,
          amount: amount || current.amount,
          paymentMode: current.paymentMode === 'CASH' ? 'UPI' : current.paymentMode
        }))
        const detected = [
          transactionId ? `Transaction ID: ${transactionId}` : null,
          utr ? `UTR: ${utr}` : null,
          amount ? `Amount: ${amount}` : null
        ].filter(Boolean).join(', ')
        setOcrStatus(`Detected ${detected}`)
      } else {
        setOcrStatus('Could not detect transaction details automatically. Please enter them manually.')
      }
    } catch (error) {
      setOcrStatus('Could not read this screenshot. Please enter UTR manually.')
    }
  }

  const applyVoiceTranscript = (transcript) => {
    const updates = parseVoiceExpense(transcript, categories)
    setVoiceTranscript(transcript)
    if (Object.keys(updates).length === 0) {
      setVoiceStatus('Could not detect expense fields. Please try a little more detail.')
      return
    }
    setForm((current) => ({ ...current, ...updates }))
    setVoiceStatus('Voice details filled. Please review before saving.')
  }

  const startVoiceInput = () => {
    if (isApproved) return
    const Recognition = speechRecognitionConstructor()
    if (!Recognition) {
      setVoiceStatus('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setListening(true)
      setVoiceStatus('Listening...')
    }
    recognition.onerror = () => {
      setListening(false)
      setVoiceStatus('Could not hear clearly. Please try again.')
    }
    recognition.onend = () => setListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      applyVoiceTranscript(transcript)
    }

    recognition.start()
  }

  const stopVoiceInput = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const uploadReceipt = async (targetExpenseId) => {
    if (!receiptFile) return
    await attachmentAPI.uploadAttachment('EXPENSE', targetExpenseId, receiptFile)
  }

  const deleteAttachment = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return
    try {
      await attachmentAPI.deleteAttachment(attachmentId)
      toast.success('Attachment deleted')
      loadAttachments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete attachment')
    }
  }

  const openAttachment = async (attachment) => {
    try {
      const response = await attachmentAPI.downloadAttachment(attachment.id)
      const blob = new Blob([response.data], { type: attachment.fileType || response.data?.type || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to open attachment')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isApproved) {
      toast.error('Cannot update approved expense')
      return
    }
    if (showFestivalEvent && !form.festivalEventId) {
      toast.error('Festival or sports event is required')
      return
    }
    if ((form.paymentMode === 'UPI' || form.paymentMode === 'NEFT') && !form.utr.trim()) {
      toast.error('UTR is required for UPI/NEFT')
      return
    }
    if (form.paymentMode === 'CHEQUE' && !form.chequeNumber.trim()) {
      toast.error('Cheque number is required')
      return
    }

    const payload = {
      ...form,
      categoryId: Number(form.categoryId),
      festivalEventId: showFestivalEvent ? Number(form.festivalEventId) : null,
      amount: Number(form.amount),
      transactionId: form.transactionId || null,
      utr: form.utr || null,
      chequeNumber: form.chequeNumber || null,
      vendorName: form.vendorName || null,
      remarks: form.remarks || null,
      description: form.description || null
    }

    setSaving(true)
    try {
      const response = isEdit
        ? await expenseAPI.updateExpense(expenseId, payload)
        : await expenseAPI.createExpense(payload)
      const savedExpenseId = isEdit ? expenseId : response.data?.id
      await uploadReceipt(savedExpenseId)
      toast.success(receiptFile ? 'Expense and receipt saved' : (isEdit ? 'Expense updated' : 'Expense created'))
      navigate('/expenses')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell title={isEdit ? 'Edit Expense' : 'Add Expense'} eyebrow="Common module">
      {isApproved && (
        <section className="alert-panel error">
          Cannot update approved expense.
        </section>
      )}
      <form className="form-panel" onSubmit={handleSubmit}>
        <section className="alert-panel">
          <div className="table-actions" style={{ justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <strong>Voice fill</strong>
              <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                Try: "Grocery expense 850 rupees paid by UPI yesterday for monthly vegetables".
              </p>
            </div>
            <button
              type="button"
              className={listening ? 'danger' : 'primary'}
              onClick={listening ? stopVoiceInput : startVoiceInput}
              disabled={isApproved || !canUseVoice}
            >
              {listening ? 'Stop Listening' : 'Use Voice'}
            </button>
          </div>
          {!canUseVoice && <p className="muted">Voice input is available in browsers that support Speech Recognition, such as Chrome or Edge.</p>}
          {voiceStatus && <p className="muted">{voiceStatus}</p>}
          {voiceTranscript && <p className="muted">Heard: {voiceTranscript}</p>}
        </section>
        <div className="form-grid">
          <label>
            Date
            <input type="date" value={form.expenseDate} onChange={(event) => update('expenseDate', event.target.value)} required disabled={isApproved} />
          </label>
          <label>
            Category
            <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} required disabled={isApproved}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.categoryName}</option>)}
            </select>
          </label>
          <label>
            Expense Type
            <select value={form.expenseType} onChange={(event) => update('expenseType', event.target.value)} required disabled={isApproved}>
              {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          {showFestivalEvent && (
            <label>
              Festival / Sports Event
              <select value={form.festivalEventId} onChange={(event) => update('festivalEventId', event.target.value)} required disabled={isApproved}>
                <option value="">Select event</option>
                {festivals.map((festival) => (
                  <option key={festival.id} value={festival.id}>{festival.festivalName} ({festival.year})</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Amount
            <input type="number" min="1" step="0.01" value={form.amount} onChange={(event) => update('amount', event.target.value)} required disabled={isApproved} />
          </label>
          <label>
            Payment Mode
            <select value={form.paymentMode} onChange={(event) => update('paymentMode', event.target.value)} required disabled={isApproved}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NEFT">NEFT</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => update('status', event.target.value)} disabled={isApproved}>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </select>
          </label>
          <label>
            {currentAccount?.accountType === 'SOCIETY' ? 'Paid To' : 'Vendor'}
            {currentAccount?.accountType === 'SOCIETY' ? (
              <select value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} disabled={isApproved}>
                <option value="">Select staff or vendor</option>
                {staff.length > 0 && <optgroup label="Society Staff">{staff.map((member) => <option key={`staff-${member.id}`} value={member.staffName}>{member.staffName} — {member.designation}</option>)}</optgroup>}
                {vendors.length > 0 && <optgroup label="Vendors">{vendors.map((vendor) => <option key={`vendor-${vendor.id}`} value={vendor.supplierName}>{vendor.supplierName}</option>)}</optgroup>}
              </select>
            ) : (
              <input value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} disabled={isApproved} />
            )}
          </label>
          <label>
            Transaction ID
            <input value={form.transactionId} onChange={(event) => update('transactionId', event.target.value)} disabled={isApproved} />
          </label>
          <label>
            UTR
            <input value={form.utr} onChange={(event) => update('utr', event.target.value)} disabled={isApproved} />
          </label>
          <label>
            Cheque Number
            <input value={form.chequeNumber} onChange={(event) => update('chequeNumber', event.target.value)} disabled={isApproved} />
          </label>
          <label>
            Receipt / UTR Screenshot
            <input type="file" accept="image/*,.jfif,.pdf" capture="environment" onChange={(event) => handleReceiptFile(event.target.files?.[0])} disabled={isApproved || saving} />
          </label>
        </div>
        {ocrStatus && <p className="muted">{ocrStatus}</p>}
        <label>
          Description
          <textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="3" disabled={isApproved} />
        </label>
        <label>
          Remarks
          <textarea value={form.remarks} onChange={(event) => update('remarks', event.target.value)} rows="3" disabled={isApproved} />
        </label>
        {attachments.length > 0 && (
          <section className="table-wrap" style={{ marginBottom: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Attachment</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((attachment) => (
                  <tr key={attachment.id}>
                    <td>{attachment.fileName}</td>
                    <td>{attachment.fileType}</td>
                    <td className="table-actions">
                      <button type="button" className="primary" onClick={() => openAttachment(attachment)}>Open</button>
                      <button type="button" className="danger" onClick={() => deleteAttachment(attachment.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/expenses')}>Cancel</button>
          <button type="submit" className="primary" disabled={isApproved || saving}>{saving ? 'Saving...' : 'Save Expense'}</button>
        </div>
      </form>
    </Shell>
  )
}




