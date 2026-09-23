import { contributionKindLabel, collectionTypeLabel } from './festivalContributionLabels'

// Both exports consume these sections so their rows and totals stay identical.
export const buildFestivalPaidReport = (collections, expenses, otherCollections = []) => {
  const groups = new Map()
  collections.filter(row => ['PARTIAL', 'PAID', 'EXCESS'].includes(row.paymentStatus) && Number(row.collectedAmount) > 0)
    .forEach(row => {
      const block = row.blockName || 'Unassigned'
      if (!groups.has(block)) groups.set(block, [])
      groups.get(block).push(row)
    })
  const blocks = [...groups].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  const total = rows => Math.round(rows.reduce((sum, row) => sum + Number(row.Amount || 0), 0) * 100) / 100
  const isMonetary = row => (row.contributionKind || 'MONETARY') === 'MONETARY'
  const otherIncome = total(otherCollections.filter(isMonetary).map(row => ({ Amount: row.amount })))
  const summaryRows = blocks.map(([block, rows]) => ({
    Block: block, 'Contributing flats': rows.length,
    Amount: total(rows.map(row => ({ Amount: row.collectedAmount })))
  }))
  const sections = [{
    name: 'Income - block summary', title: 'Income — All blocks summary',
    rows: [...summaryRows,
      { Block: 'Total block collections', 'Contributing flats': summaryRows.reduce((sum, row) => sum + row['Contributing flats'], 0), Amount: total(summaryRows) },
      { Block: 'Other monetary collections', 'Contributing flats': '', Amount: otherIncome },
      { Block: 'Total collection', 'Contributing flats': '', Amount: total([...summaryRows, { Amount: otherIncome }]) }
    ]
  }]
  const usedSheetNames = new Set(['income expense summary', 'income - block summary', 'income - other collections', 'items and services', 'special mentions', 'expense - paid only'])
  blocks.forEach(([block, rows]) => {
    const base = `Block ${block}`.replace(/[\\/*?:[\]\x00-\x1f]/g, '-').replace(/'+$/g, '').trim()
    let name = base.slice(0, 31).replace(/'+$/g, '')
    let suffix = 2
    while (usedSheetNames.has(name.toLowerCase())) {
      const marker = ` (${suffix++})`
      name = `${base.slice(0, 31 - marker.length)}${marker}`
    }
    usedSheetNames.add(name.toLowerCase())
    const flatRows = [...rows]
      .sort((a, b) => String(a.flatNumber || '').localeCompare(String(b.flatNumber || ''), undefined, { numeric: true }))
      .map(row => ({ Block: block, Flat: row.flatNumber || '', Owner: row.ownerName || '', Amount: Number(row.collectedAmount) }))
    sections.push({ name, title: `Income — ${block} flat-wise collection`, rows: [
      ...flatRows, { Block: `${block} total collection`, Flat: '', Owner: '', Amount: total(flatRows) }
    ] })
  })
  const otherRows = otherCollections.filter(isMonetary)
    .sort((a, b) => String(a.paymentDate || '').localeCompare(String(b.paymentDate || '')))
    .map(row => ({
      Date: row.paymentDate || '',
      Contributor: row.anonymous ? 'Anonymous' : row.contributorName || '',
      Kind: contributionKindLabel(row.contributionKind), Source: collectionTypeLabel(row.sourceType),
      Description: row.description || '',
      Payment: [row.paymentMode, row.transactionReference].filter(Boolean).join(' / '),
      'Collected by': row.collectedBy || '',
      Amount: Number(row.amount || 0)
    }))
  sections.push({ name: 'Income - other collections', title: 'Income — Other monetary collections', rows: [
    ...otherRows,
    { Date: '', Contributor: 'Total other monetary collections', Kind: '', Source: '', Description: '', Payment: '', 'Collected by': '', Amount: otherIncome }
  ] })
  const nonMonetaryRows = otherCollections.filter(row => !isMonetary(row) && !row.specialMention).map(row => ({
    Date: row.paymentDate || '', Contributor: row.anonymous ? 'Anonymous' : row.contributorName || '',
    Kind: contributionKindLabel(row.contributionKind), Source: collectionTypeLabel(row.sourceType),
    Contribution: row.itemName || '', Quantity: row.quantity || '', Description: row.description || '',
    'Estimated value (INR)': row.amount == null ? '' : Number(row.amount)
  }))
  if (nonMonetaryRows.length) sections.push({ name: 'Items and services', title: 'Other collections — Items and services', rows: nonMonetaryRows })
  const specialMentions = otherCollections.filter(row => row.specialMention).map(row => ({
    Contributor: row.anonymous ? 'Anonymous' : row.contributorName || '',
    Kind: contributionKindLabel(row.contributionKind), Source: collectionTypeLabel(row.sourceType),
    Contribution: isMonetary(row) ? 'Monetary gift — included in other monetary collections' : row.itemName || '',
    Quantity: isMonetary(row) ? '' : row.quantity || '',
    Mention: row.description || ''
  }))
  sections.push({ name: 'Special mentions', title: 'Special mentions', rows: specialMentions.length ? specialMentions : [{ Message: 'No special mentions recorded.' }] })
  const paidExpenses = expenses.filter(row => row.status === 'PAID')
    .sort((a, b) => String(a.expenseDate || '').localeCompare(String(b.expenseDate || '')))
    .map(row => ({
      Date: row.expenseDate || '', Description: row.description || row.categoryName || '',
      'Line items': (row.items || []).map(item => `${item.itemName} (Qty ${item.quantity || 1})`).join('; '),
      Vendor: row.vendorName || '', Mode: row.paymentMode || '',
      Reference: row.utr || row.chequeNumber || row.transactionId || '', Amount: Number(row.amount || 0)
    }))
  sections.push({ name: 'Expense - paid only', title: 'Expense — All paid expenses', rows: [
    ...paidExpenses, { Date: '', Description: 'Total paid expenses', 'Line items': '', Vendor: '', Mode: '', Reference: '', Amount: total(paidExpenses) }
  ] })
  const totalIncome = total([...summaryRows, { Amount: otherIncome }])
  const totalExpenses = total(paidExpenses)
  sections.unshift({ name: 'Income expense summary', title: 'Income / expense summary', rows: [
    { Summary: 'Block collections received', Amount: total(summaryRows) },
    { Summary: 'Other monetary collections', Amount: otherIncome },
    { Summary: 'Total income', Amount: totalIncome },
    { Summary: 'Total paid expenses', Amount: totalExpenses },
    { Summary: 'Balance (income less paid expenses)', Amount: total([{ Amount: totalIncome }, { Amount: -totalExpenses }]) }
  ] })
  return sections
}

export const loadFestivalPaidReport = async (festivalEventId, collectionAPI, expenseAPI) => {
  const [first, expenses, otherCollections] = await Promise.all([
    collectionAPI.getCollections(festivalEventId, { page: 0, size: 100 }),
    expenseAPI.getFestivalExpenses(festivalEventId),
    collectionAPI.getOtherCollections(festivalEventId)
  ])
  const collections = [...(first.data.content || [])]
  for (let page = 1; page < first.data.totalPages; page += 1) {
    const response = await collectionAPI.getCollections(festivalEventId, { page, size: 100 })
    collections.push(...(response.data.content || []))
  }
  return buildFestivalPaidReport(collections, expenses.data || [], otherCollections.data || [])
}
