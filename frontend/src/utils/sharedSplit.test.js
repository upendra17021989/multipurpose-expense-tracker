import { describe, expect, it } from 'vitest'
import { calculateEqualShares } from './sharedSplit'

describe('equal expense shares', () => {
  it('defaults every participant to one share and distributes remaining cents', () => {
    expect(calculateEqualShares(100, [1, 2, 3])).toEqual({ 1: 33.34, 2: 33.33, 3: 33.33 })
  })
  it('allocates twice the amount to a participant with two shares', () => {
    expect(calculateEqualShares(120, [1, 2, 3], { 2: 2 })).toEqual({ 1: 30, 2: 60, 3: 30 })
  })
  it('keeps rounded weighted amounts equal to the expense total', () => {
    expect(calculateEqualShares(10, [1, 2, 3], { 2: 2 })).toEqual({ 1: 2.5, 2: 5, 3: 2.5 })
    expect(calculateEqualShares(0.05, [1, 2, 3], { 2: 2 })).toEqual({ 1: 0.02, 2: 0.02, 3: 0.01 })
  })
  it('excludes deselected participants and rejects invalid counts', () => {
    expect(calculateEqualShares(100, [1], { 2: 2 })).toEqual({ 1: 100 })
    for (const count of ['', 0, -1, 1.5]) expect(calculateEqualShares(100, [1], { 1: count })).toEqual({})
    expect(calculateEqualShares(100, [])).toEqual({})
  })
})
