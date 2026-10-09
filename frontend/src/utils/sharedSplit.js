export const calculateEqualShares = (total, participantIds, counts = {}) => {
  const cents = Math.round(Number(total || 0) * 100)
  const units = participantIds.map((id) => Number(counts[id] ?? 1))
  if (!participantIds.length || !Number.isSafeInteger(cents) || cents < 0 ||
    units.some((count) => !Number.isInteger(count) || count < 1 || count > 2147483647)) return {}
  const totalUnits = units.reduce((sum, count) => sum + count, 0)
  const amounts = units.map((count) => Number(BigInt(cents) * BigInt(count) / BigInt(totalUnits)))
  let remainder = cents - amounts.reduce((sum, amount) => sum + amount, 0)
  return Object.fromEntries(participantIds.map((id, index) => {
    const amount = amounts[index] + (remainder-- > 0 ? 1 : 0)
    return [id, amount / 100]
  }))
}
