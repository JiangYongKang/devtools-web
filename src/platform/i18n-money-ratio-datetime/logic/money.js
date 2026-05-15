import {
  ERROR_CODES,
  WARNING_CODES,
  CURRENCY_MINOR_UNITS,
  CURRENCY_SYMBOLS,
  COMMON_CURRENCIES,
  ROUNDING_MODES,
} from './constants.js'
import { createError, createSuccess, createWarning } from './errors.js'

function parseMoney(input, options = {}) {
  const {
    currency = null,
    minimumFractionDigits = null,
    roundingMode = ROUNDING_MODES.HALF_UP,
    rejectScientificNotation = true,
  } = options

  const warnings = []

  if (typeof input !== 'string' && typeof input !== 'number') {
    return createError(ERROR_CODES.INVALID_INPUT, '输入必须为字符串或数字')
  }

  let str = String(input).trim()

  if (rejectScientificNotation && /[eE]/.test(str)) {
    return createError(ERROR_CODES.SCIENTIFIC_NOTATION_REJECTED, '不支持科学计数法')
  }

  let detectedCurrency = currency

  for (const [symbol, curr] of Object.entries(CURRENCY_SYMBOLS)) {
    if (str.includes(symbol)) {
      if (!detectedCurrency) {
        detectedCurrency = curr
        warnings.push(createWarning(WARNING_CODES.CURRENCY_GUESSED, '', { symbol, currency: curr }))
      }
      str = str.replace(new RegExp('\\' + symbol, 'g'), '').trim()
      break
    }
  }

  if (!detectedCurrency) {
    for (const curr of COMMON_CURRENCIES) {
      if (str.includes(curr)) {
        detectedCurrency = curr
        str = str.replace(curr, '').trim()
        break
      }
    }
  }

  let isNegative = false
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true
    str = str.slice(1, -1).trim()
    warnings.push(createWarning(WARNING_CODES.NEGATIVE_BRACKET_NOTATION))
  } else if (str.startsWith('-')) {
    isNegative = true
    str = str.slice(1).trim()
  }

  if (/(,|\.)/g.test(str)) {
    warnings.push(createWarning(WARNING_CODES.THOUSAND_SEPARATOR_DETECTED))
  }

  const hasComma = str.includes(',')
  const hasDot = str.includes('.')

  let normalizedStr = str

  if (hasComma && hasDot) {
    const commaIndex = str.lastIndexOf(',')
    const dotIndex = str.lastIndexOf('.')

    if (commaIndex > dotIndex) {
      normalizedStr = str.replace(/\./g, '').replace(',', '.')
    } else {
      normalizedStr = str.replace(/,/g, '')
    }
  } else if (hasComma) {
    const parts = str.split(',')
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      normalizedStr = str.replace(/,/g, '')
    } else {
      normalizedStr = str.replace(',', '.')
    }
  }

  normalizedStr = normalizedStr.replace(/\s/g, '')

  const value = parseFloat(normalizedStr)

  if (isNaN(value)) {
    return createError(ERROR_CODES.PARSING_FAILED, '无法解析为有效数字')
  }

  const finalValue = isNegative ? -value : value

  const minorUnits = getMinorUnits(detectedCurrency, minimumFractionDigits)
  const valueMinorUnits = roundToMinorUnits(finalValue, minorUnits, roundingMode)

  return createSuccess({
    value: finalValue,
    valueMinorUnits,
    currency: detectedCurrency,
    minorUnits,
    rounded: Math.abs(finalValue * Math.pow(10, minorUnits)) !== valueMinorUnits,
  }, warnings)
}

function getMinorUnits(currency, override = null) {
  if (override !== null) return override
  if (currency && CURRENCY_MINOR_UNITS[currency] !== undefined) {
    return CURRENCY_MINOR_UNITS[currency]
  }
  return 2
}

function roundToMinorUnits(value, minorUnits, mode) {
  const multiplier = Math.pow(10, minorUnits)
  const scaled = value * multiplier

  if (mode === ROUNDING_MODES.BANKERS) {
    const intPart = Math.floor(scaled)
    const fracPart = scaled - intPart

    if (fracPart > 0.5) {
      return Math.round(scaled)
    } else if (fracPart < 0.5) {
      return intPart
    } else {
      return intPart % 2 === 0 ? intPart : intPart + 1
    }
  }

  return Math.round(scaled)
}

function formatMoney(value, options = {}) {
  const {
    currency = 'USD',
    locale = 'en-US',
    minimumFractionDigits = null,
    maximumFractionDigits = null,
  } = options

  const minorUnits = getMinorUnits(currency, minimumFractionDigits)

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: maximumFractionDigits !== null ? maximumFractionDigits : minorUnits,
  })

  return formatter.format(value)
}

function validateCurrency(currency) {
  if (!currency) return false
  if (CURRENCY_MINOR_UNITS[currency] !== undefined) return true

  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency })
    return true
  } catch {
    return false
  }
}

export {
  parseMoney,
  formatMoney,
  getMinorUnits,
  roundToMinorUnits,
  validateCurrency,
}
