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
  const transactionId = findValueAfterLabel(lines, TRANSACTION_ID_LABEL, isTransactionId)
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

  const paidToAmount = findAmountInSection(lines, /\bpaid\s+to\b/i, /\b(?:banking\s+name|payment\s+details|message|transaction\s+id)\b/i)
  if (paidToAmount) return paidToAmount

  return findLikelyAmount(lines)
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
  for (const line of lines) {
    const amount = firstAmountInLine(line)
    if (amount) return amount
  }
  return ''
}

const firstAmountInLine = (line) => {
  const matches = String(line || '').matchAll(/(^|[^A-Z0-9-])((?:[0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{1,7})(?:\.\d{1,2})?)\b/gi)
  for (const match of matches) {
    const value = match[2].replace(/,/g, '')
    const numeric = Number(value)
    if (numeric > 0 && numeric <= 100000 && !/^[0-9]{10,}$/.test(value)) {
      return value
    }
  }
  return ''
}

const firstToken = (value) => cleanId(String(value || '').match(/[A-Z0-9][A-Z0-9-]{9,35}/i)?.[0] || '')

const cleanId = (value) => String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()
const isTransactionId = (value) => /^[A-Z][A-Z0-9]{12,28}$/i.test(cleanId(value))
const isUtr = (value) => /^[0-9]{10,18}$/.test(cleanId(value))


