export const contributionKindLabel = value => ({ MONETARY: 'Money', IN_KIND: 'Item/material', SERVICE: 'Service' }[value || 'MONETARY'] || value)
export const collectionTypeLabel = value => String(value || 'OTHER').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
