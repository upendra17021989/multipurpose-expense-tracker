import { useEffect, useRef, useState } from 'react'
import { FestivalCollectionForm } from './FestivalCollectionForm'
import './FestivalPaymentModal.css'

export const FestivalPaymentModal = ({ collection, onClose, onSaved }) => {
  const dialog = useRef(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  return <dialog ref={dialog} className="festival-payment-modal" aria-labelledby="festival-payment-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}>
    <header className="festival-payment-heading">
      <div><h2 id="festival-payment-title">Add Collection Payment</h2><p>{collection.blockName}-{collection.flatNumber} · {collection.ownerName}</p></div>
      <button type="button" aria-label="Close payment" disabled={saving} onClick={onClose}>×</button>
    </header>
    <FestivalCollectionForm key={collection.id} collectionId={collection.id} onClose={onClose} onSaved={onSaved} onSavingChange={setSaving} />
  </dialog>
}
