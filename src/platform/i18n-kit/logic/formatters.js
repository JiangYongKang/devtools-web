import { normalizeLocale } from './core.js'

const HAS_INTL = typeof Intl !== 'undefined'

export function supportsIntl() {
  return HAS_INTL
}

export function formatDate(date, locale, options = {}) {
  const normalizedLocale = normalizeLocale(locale)
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) {
    return String(date)
  }
  if (!supportsIntl() || !Intl.DateTimeFormat) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  try {
    const formatter = new Intl.DateTimeFormat(normalizedLocale || undefined, options)
    return formatter.format(d)
  } catch {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
}

export function formatNumber(num, locale, options = {}) {
  const normalizedLocale = normalizeLocale(locale)
  const n = typeof num === 'number' ? num : Number(num)
  if (isNaN(n)) {
    return String(num)
  }
  if (!supportsIntl() || !Intl.NumberFormat) {
    return String(n)
  }
  try {
    const formatter = new Intl.NumberFormat(normalizedLocale || undefined, options)
    return formatter.format(n)
  } catch {
    return String(n)
  }
}

export function formatCurrency(num, locale, currency = 'USD') {
  return formatNumber(num, locale, { style: 'currency', currency })
}

export function formatPercent(num, locale) {
  return formatNumber(num, locale, { style: 'percent' })
}
