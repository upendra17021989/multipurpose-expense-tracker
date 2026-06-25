const TRANSACTION_ID_LABEL = /\b(?:transaction\s*(?:id|no|number)|txn\s*(?:id|no|number))\b/i
const UTR_LABEL = /\b(?:utr|upi\s*(?:ref(?:erence)?|transaction)?|ref(?:erence)?\s*(?:no|id|number)?)\b/i
const MONEY_PATTERN = /(?:\u20b9|rs\.?|inr)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i

export const extractUtrFromImage = async (file) => {
  if (!file?.type?.startsWith('image/')) {
    return { text: '', utr: '', transactionId: '', amount: '' }
  }

  const { default: Tesseract } = await import('tesseract.js')
  const result = await Tesseract.recognize(file, 'eng')
  const text = result?.data?.text || ''
  return { text, ...extractPaymentDetails(text) }
}

export const extractPaymentDetails = (text) => {
  const lines = normalizeLines(text)
  const flatText = lines.join(' ')
  const transactionId = findValueAfterLabel(lines, TRANSACTION_ID_LABEL, isTransactionIdCandidate)
    || findTransactionId(flatText)
  const utr = findValueAfterLabel(lines, UTR_LABEL, isUtr)
    || findUtr(flatText)
  const amount = findAmount(lines, flatText)

  return { transactionId, utr, amount }
}

export const extractUtr = (text) => extractPaymentDetails(text).utr

const normalizeLines = (text) => String(text || '')
  .replace(/[|]/g, 'I')
  .split(/\r?\n/)
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

const findValueAfterLabel = (lines, labelPattern, validator) => {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!labelPattern.test(line)) continue

    const sameLineValue = firstToken(line.replace(labelPattern, ''))
    if (sameLineValue && validator(sameLineValue)) return cleanId(sameLineValue)

    for (let nextIndex = index + 1; nextIndex < Math.min(lines.length, index + 4); nextIndex += 1) {
      const candidate = firstToken(lines[nextIndex])
      if (candidate && validator(candidate)) return cleanId(candidate)
    }
  }
  return ''
}

const findTransactionId = (text) => {
  const candidates = String(text || '').match(/\b[A-Z][A-Z0-9]{12,28}\b/gi) || []
  return cleanId(candidates.find(isTransactionId) || '')
}

const findUtr = (text) => {
  const labeled = String(text || '').match(/\butr\s*[:#-]?\s*([0-9]{10,18})\b/i)
  if (labeled?.[1]) return cleanId(labeled[1])

  const candidates = String(text || '').match(/\b[0-9]{12}\b/g) || []
  return cleanId(candidates.find(isUtr) || '')
}

const findAmount = (lines, text) => {
  const match = String(text || '').match(MONEY_PATTERN)
  if (match?.[1]) return match[1].replace(/,/g, '')

  const prominentAmount = findProminentAmount(lines)
  if (prominentAmount) return prominentAmount

  const paidToAmount = findAmountInSection(lines, /\bpaid\s+to\b/i, /\b(?:banking\s+name|payment\s+details|message|transaction\s+id)\b/i)
  if (paidToAmount) return paidToAmount

  return findLikelyAmount(lines)
}

const findProminentAmount = (lines) => {
  const detailStartIndex = lines.findIndex((line) => /\b(?:completed|bank|upi\s+transaction|transaction\s+id|debited|credited)\b/i.test(line))
  const searchLines = detailStartIndex > 0 ? lines.slice(0, detailStartIndex) : lines.slice(0, 8)
  const candidates = searchLines.flatMap((line) => amountCandidatesInLine(line))
  return candidates.sort((a, b) => b.score - a.score || b.numeric - a.numeric)[0]?.value || ''
}

const findAmountInSection = (lines, startPattern, endPattern) => {
  const startIndex = lines.findIndex((line) => startPattern.test(line))
  if (startIndex < 0) return ''

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (endPattern.test(lines[index])) return ''
    const amount = firstAmountInLine(lines[index])
    if (amount) return amount
  }
  return ''
}

const findLikelyAmount = (lines) => {
  const candidates = []
  for (const line of lines) {
    candidates.push(...amountCandidatesInLine(line))
  }
  return candidates.sort((a, b) => b.score - a.score || b.numeric - a.numeric)[0]?.value || ''
}

const firstAmountInLine = (line) => {
  return amountCandidatesInLine(line)[0]?.value || ''
}

const amountCandidatesInLine = (line) => {
  const source = String(line || '')
  const spacedAmount = spacedOcrAmountCandidate(source)
  if (spacedAmount) return [spacedAmount]

  const matches = source.matchAll(/(^|[^A-Z0-9-])((?:[0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{1,7})(?:\.\d{1,2})?)\b/gi)
  const candidates = []
  for (const match of matches) {
    const rawValue = match[2]
    const value = rawValue.replace(/,/g, '')
    const numeric = Number(value)
    const valueIndex = match.index + match[1].length
    if (numeric > 0 && numeric <= 100000 && !/^[0-9]{10,}$/.test(value) && !isNonAmountCandidate(source, rawValue, valueIndex)) {
      candidates.push({
        value,
        numeric,
        score: amountCandidateScore(source, rawValue, numeric)
      })
    }
  }
  return candidates.sort((a, b) => b.score - a.score || b.numeric - a.numeric)
}

const spacedOcrAmountCandidate = (line) => {
  const value = String(line || '').trim()
  if (!/^[0-9\s(),.]+$/.test(value) || !/\d\s+\d/.test(value)) return null

  let digits = value.replace(/\D/g, '')
  if (digits.length === 5 && digits[1] === '9') {
    digits = `${digits[0]}${digits.slice(2)}`
  }

  const numeric = Number(digits)
  if (numeric <= 0 || numeric > 100000 || digits.length < 3) return null

  return {
    value: digits,
    numeric,
    score: 90
  }
}

const isNonAmountCandidate = (line, rawValue, valueIndex) => {
  const before = line.slice(Math.max(0, valueIndex - 16), valueIndex)
  const after = line.slice(valueIndex + rawValue.length, valueIndex + rawValue.length + 16)
  const wideBefore = line.slice(Math.max(0, valueIndex - 40), valueIndex)
  const normalizedValue = rawValue.replace(/,/g, '')
  const context = `${before}${rawValue}${after}`

  return /^\d{10,}$/.test(normalizedValue)
    || (normalizedValue.length <= 4 && /\b(?:bank|account|a\/c|from|debited)\b/i.test(wideBefore) && !rawValue.includes(','))
    || /^\s*:/.test(after)
    || /:\s*$/.test(before)
    || /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(context)
    || /\b(?:utr|transaction|txn|account|bank|from|to:|upi)\b/i.test(context) && normalizedValue.length >= 4
}

const amountCandidateScore = (line, rawValue, numeric) => {
  let score = numeric >= 100 ? 20 : 0
  if (rawValue.includes(',')) score += 40
  if (/(?:\u20b9|rs\.?|inr)/i.test(line)) score += 30
  if (/\b(?:paid|pay|amount|debited)\b/i.test(line)) score += 10
  return score
}

const firstToken = (value) => cleanId(String(value || '').match(/[A-Z0-9][A-Z0-9-]{9,35}/i)?.[0] || '')

const cleanId = (value) => String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()
const isTransactionIdCandidate = (value) => isTransactionId(value) || isUtr(value)
const isTransactionId = (value) => /^[A-Z][A-Z0-9]{12,28}$/i.test(cleanId(value))
const isUtr = (value) => /^[0-9]{10,18}$/.test(cleanId(value))


