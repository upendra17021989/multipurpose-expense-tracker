// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { buildFestivalPaidReport, loadFestivalPaidReport } from './festivalPaidReport'

describe('paid festival report', () => {
  it('includes partial, paid and excess income and paid expenses, with matching totals', () => {
    const collections = [
      { blockName: 'B2', flatNumber: '10', paymentStatus: 'PAID', collectedAmount: '100.10' },
      { blockName: 'B2', flatNumber: '2', paymentStatus: 'EXCESS', collectedAmount: '120.20' },
      { blockName: 'B1', flatNumber: '1', paymentStatus: 'PARTIAL', expectedAmount: 100, collectedAmount: 50, pendingAmount: 50 },
      ...['PENDING', 'REFUNDED'].map(paymentStatus => ({ blockName: 'B1', paymentStatus, collectedAmount: 50 }))
    ]
    const sections = buildFestivalPaidReport(collections, [
      { status: 'PAID', amount: '30.10', description: 'Flowers' },
      { status: 'PENDING', amount: 90 }, { status: 'APPROVED', amount: 80 }
    ])
    expect(sections).toHaveLength(7)
    expect(sections[0].name).toBe('Income expense summary')
    expect(sections[0].rows).toEqual([
      { Summary: 'Block collections received', Amount: 270.3 },
      { Summary: 'Other monetary collections', Amount: 0 },
      { Summary: 'Total income', Amount: 270.3 },
      { Summary: 'Total paid expenses', Amount: 30.1 },
      { Summary: 'Balance (income less paid expenses)', Amount: 240.2 }
    ])
    expect(sections[1].rows).toEqual([
      { Block: 'B1', 'Contributing flats': 1, Amount: 50 },
      { Block: 'B2', 'Contributing flats': 2, Amount: 220.3 },
      { Block: 'Total block collections', 'Contributing flats': 3, Amount: 270.3 },
      { Block: 'Other monetary collections', 'Contributing flats': '', Amount: 0 },
      { Block: 'Total collection', 'Contributing flats': '', Amount: 270.3 }
    ])
    expect(sections[2].name).toBe('Block B1')
    expect(sections[2].rows.map(row => row.Flat)).toEqual(['1', ''])
    expect(sections[2].rows[0].Amount).toBe(50)
    expect(sections[2].rows.at(-1)).toMatchObject({ Block: 'B1 total collection', Amount: 50 })
    expect(sections[3].name).toBe('Block B2')
    expect(sections[3].rows.map(row => row.Flat)).toEqual(['2', '10', ''])
    expect(sections[3].rows.at(-1)).toMatchObject({ Block: 'B2 total collection', Amount: 220.3 })
    expect(sections[6].rows).toHaveLength(2)
    expect(sections[6].rows.at(-1).Amount).toBe(30.1)
  })

  it('loads all collection pages and festival-specific expenses before building the report', async () => {
    const collectionAPI = { getOtherCollections: vi.fn().mockResolvedValue({ data: [{ amount: 25 }] }), getCollections: vi.fn()
      .mockResolvedValueOnce({ data: { totalPages: 2, content: [{ blockName: 'A', paymentStatus: 'PAID', collectedAmount: 100 }] } })
      .mockResolvedValueOnce({ data: { content: [{ blockName: 'B', paymentStatus: 'PAID', collectedAmount: 200 }] } }) }
    const expenseAPI = { getFestivalExpenses: vi.fn().mockResolvedValue({ data: [{ status: 'PAID', amount: 40 }] }) }
    const sections = await loadFestivalPaidReport('7', collectionAPI, expenseAPI)
    expect(collectionAPI.getCollections).toHaveBeenLastCalledWith('7', { page: 1, size: 100 })
    expect(expenseAPI.getFestivalExpenses).toHaveBeenCalledWith('7')
    expect(collectionAPI.getOtherCollections).toHaveBeenCalledWith('7')
    expect(sections[1].rows.at(-1).Amount).toBe(325)
  })

  it('fails the export if a later page cannot be loaded', async () => {
    const collectionAPI = { getOtherCollections: vi.fn().mockResolvedValue({ data: [] }), getCollections: vi.fn()
      .mockResolvedValueOnce({ data: { totalPages: 2, content: [] } })
      .mockRejectedValueOnce(new Error('Network error')) }
    const expenseAPI = { getFestivalExpenses: vi.fn().mockResolvedValue({ data: [] }) }
    await expect(loadFestivalPaidReport('7', collectionAPI, expenseAPI)).rejects.toThrow('Network error')
  })

  it('provides zero totals for an event without paid records', () => {
    const sections = buildFestivalPaidReport([], [])
    sections.filter(section => section.name !== 'Special mentions').forEach(section => {
      expect(section.rows.at(-1).Amount).toBe(0)
    })
    expect(sections.find(section => section.name === 'Special mentions').rows).toEqual([{ Message: 'No special mentions recorded.' }])
  })

  it('adds monetary contributions once and separates special mentions and in-kind values', () => {
    const sections = buildFestivalPaidReport([
      { paymentStatus: 'PARTIAL', collectedAmount: 100, blockName: 'A' }
    ], [], [
      { contributorName: 'Donor', contributionKind: 'MONETARY', amount: '20.10', specialMention: true, description: 'Thanks for supporting the event' },
      { contributorName: 'Legacy donor', amount: '10.20' },
      { contributorName: 'Private name', anonymous: true, contributionKind: 'IN_KIND', amount: 500, itemName: 'Flowers', quantity: '5 boxes', specialMention: true },
      { contributorName: 'Volunteer', contributionKind: 'SERVICE', description: 'Decoration' }
    ])
    expect(sections[1].rows.at(-1).Amount).toBe(130.3)
    expect(sections[2].rows.at(-1).Amount).toBe(100)
    const other = sections.find(section => section.name === 'Income - other collections')
    expect(other.rows).toHaveLength(3)
    expect(other.rows[0].Kind).toBe('Money')
    expect(other.rows[0]).not.toHaveProperty('Estimated value (INR)')
    expect(other.rows.at(-1).Amount).toBe(30.3)
    const nonMonetary = sections.find(section => section.name === 'Items and services')
    expect(nonMonetary.rows.map(row => row.Kind)).toEqual(['Service'])
    expect(nonMonetary.rows.some(row => row.Contribution === 'Flowers')).toBe(false)
    expect(nonMonetary.rows[0]).not.toHaveProperty('Amount')
    const mentions = sections.find(section => section.name === 'Special mentions')
    expect(mentions.rows).toHaveLength(2)
    expect(mentions.rows.every(row => !('Amount' in row) && !('Estimated value (INR)' in row))).toBe(true)
    expect(mentions.rows[0]).toMatchObject({ Contributor: 'Donor', Kind: 'Money', Contribution: 'Monetary gift — included in other monetary collections', Mention: 'Thanks for supporting the event' })
    expect(mentions.rows[1]).toMatchObject({ Contributor: 'Anonymous', Kind: 'Item/material', Contribution: 'Flowers', Quantity: '5 boxes' })
    expect(JSON.stringify(sections)).not.toContain('Private name')
    expect(sections[0].rows.find(row => row.Summary === 'Total income').Amount).toBe(130.3)
  })

  it('shows a deficit when paid expenses exceed monetary income', () => {
    const sections = buildFestivalPaidReport([], [{ status: 'PAID', amount: 50 }, { status: 'PENDING', amount: 100 }], [
      { contributionKind: 'MONETARY', amount: 20 },
      { contributionKind: 'IN_KIND', amount: 500, specialMention: true, itemName: 'Flowers' }
    ])
    expect(sections[0].rows.at(-1).Amount).toBe(-30)
    expect(sections.some(section => section.name === 'Items and services')).toBe(false)
    expect(sections.find(section => section.name === 'Special mentions').rows[0].Contribution).toBe('Flowers')
  })

  it('fails the export if other collections cannot be loaded', async () => {
    const collectionAPI = {
      getCollections: vi.fn().mockResolvedValue({ data: { content: [], totalPages: 1 } }),
      getOtherCollections: vi.fn().mockRejectedValue(new Error('Other collections unavailable'))
    }
    const expenseAPI = { getFestivalExpenses: vi.fn().mockResolvedValue({ data: [] }) }
    await expect(loadFestivalPaidReport('7', collectionAPI, expenseAPI)).rejects.toThrow('Other collections unavailable')
  })

  it('uses valid unique Excel sheet names while retaining full block labels', () => {
    const names = ['A/B', 'A:B', 'a-b', 'A'.repeat(40), `${'A'.repeat(40)}B`]
    const sections = buildFestivalPaidReport(names.map(blockName => ({ blockName, paymentStatus: 'PAID', collectedAmount: 10 })), [])
    expect(new Set(sections.map(section => section.name.toLowerCase())).size).toBe(sections.length)
    sections.forEach(section => {
      expect(section.name.length).toBeLessThanOrEqual(31)
      expect(section.name).not.toMatch(/[\\/*?:[\]]/)
    })
    names.forEach(block => {
      const section = sections.find(item => item.title === `Income — ${block} flat-wise collection`)
      expect(section.rows.at(-1)).toMatchObject({ Block: `${block} total collection`, Amount: 10 })
    })
  })
})
