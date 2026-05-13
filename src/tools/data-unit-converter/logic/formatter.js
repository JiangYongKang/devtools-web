import {
  ERROR_CODES,
  createError,
  isRoundingModeValid,
  isDecimalsValid,
} from './errors.js'
import {
  MAX_DECIMALS,
  DEFAULT_DECIMALS,
  SCIENTIFIC_THRESHOLD,
  MAX_EXPONENT,
  MAX_VALUE,
  MIN_POSITIVE_VALUE,
} from './constants.js'

const EPSILON = 1e-10

function roundBankers(value, decimals = 0) {
  if (decimals < 0 || decimals > MAX_DECIMALS) {
    decimals = DEFAULT_DECIMALS
  }

  const isNegative = value < 0
  const absValue = Math.abs(value)
  const factor = Math.pow(10, decimals)
  const scaled = absValue * factor

  const floor = Math.floor(scaled)
  const ceil = Math.ceil(scaled)
  const fractional = scaled - floor

  if (fractional < 0.5 - EPSILON) {
    return (isNegative ? -1 : 1) * (floor / factor)
  } else if (fractional > 0.5 + EPSILON) {
    return (isNegative ? -1 : 1) * (ceil / factor)
  } else {
    const isEven = floor % 2 === 0
    return (isNegative ? -1 : 1) * ((isEven ? floor : ceil) / factor)
  }
}

function roundWithMode(value, mode = 'round', decimals = 2) {
  if (!isRoundingModeValid(mode)) {
    return { error: createError(ERROR_CODES.INVALID_ROUNDING_MODE) }
  }

  if (!isDecimalsValid(decimals)) {
    return { error: createError(ERROR_CODES.INVALID_DECIMALS) }
  }

  if (!Number.isFinite(value)) {
    return { error: createError(ERROR_CODES.NOT_FINITE) }
  }

  const factor = Math.pow(10, decimals)

  let rounded
  switch (mode) {
    case 'round':
      rounded = Math.round(value * factor) / factor
      break
    case 'floor':
      rounded = Math.floor(value * factor) / factor
      break
    case 'ceil':
      rounded = Math.ceil(value * factor) / factor
      break
    case 'bankers':
      rounded = roundBankers(value, decimals)
      break
    default:
      rounded = Math.round(value * factor) / factor
  }

  return { value: rounded }
}

function shouldUseScientific(value, threshold = SCIENTIFIC_THRESHOLD) {
  const absValue = Math.abs(value)
  if (absValue === 0) return false
  if (absValue >= threshold) return true
  if (absValue < 1 && absValue > 0) {
    const exponent = Math.floor(Math.log10(absValue))
    return exponent <= -6
  }
  return false
}

function formatScientific(value, decimals = 2) {
  const absValue = Math.abs(value)
  if (absValue === 0) {
    return {
      formatted: '0',
      coefficient: 0,
      exponent: 0,
      isScientific: false,
    }
  }

  const exponent = Math.floor(Math.log10(absValue))

  if (Math.abs(exponent) > MAX_EXPONENT) {
    return { error: createError(ERROR_CODES.EXPONENT_TOO_LARGE) }
  }

  const coefficient = value / Math.pow(10, exponent)
  const roundedCoefficient = roundWithMode(coefficient, 'round', decimals)

  if (roundedCoefficient.error) {
    return roundedCoefficient
  }

  let adjustedCoefficient = roundedCoefficient.value
  let adjustedExponent = exponent

  while (Math.abs(adjustedCoefficient) >= 10) {
    adjustedCoefficient /= 10
    adjustedExponent += 1
  }

  while (Math.abs(adjustedCoefficient) < 1 && adjustedCoefficient !== 0) {
    adjustedCoefficient *= 10
    adjustedExponent -= 1
  }

  const coefficientStr = adjustedCoefficient.toFixed(decimals).replace(/\.?0+$/, '')
  const formatted = `${coefficientStr}e${adjustedExponent}`

  return {
    formatted,
    coefficient: adjustedCoefficient,
    exponent: adjustedExponent,
    isScientific: true,
  }
}

function detectIntlSupport() {
  try {
    const test = new Intl.NumberFormat('en-US', { style: 'decimal' })
    return {
      available: true,
      version: 'Intl.NumberFormat',
    }
  } catch {
    return {
      available: false,
      version: 'fallback',
    }
  }
}

function formatWithIntl(value, locale = 'en-US', options = {}) {
  const intlSupport = detectIntlSupport()

  if (!intlSupport.available) {
    return formatFallback(value, options)
  }

  const {
    decimals = DEFAULT_DECIMALS,
    useGrouping = true,
    minimumFractionDigits = 0,
    maximumFractionDigits = decimals,
  } = options

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
    })

    return {
      formatted: formatter.format(value),
      locale,
      usedIntl: true,
    }
  } catch {
    return formatFallback(value, options)
  }
}

function formatFallback(value, options = {}) {
  const {
    decimals = DEFAULT_DECIMALS,
    useGrouping = true,
  } = options

  const rounded = roundWithMode(value, 'round', decimals)
  if (rounded.error) {
    return rounded
  }

  const roundedValue = rounded.value
  const isNegative = roundedValue < 0
  const absValue = Math.abs(roundedValue)

  const parts = absValue.toString().split('.')
  let integerPart = parts[0]
  const decimalPart = parts[1] || ''

  if (useGrouping) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  let formatted = integerPart
  if (decimalPart.length > 0) {
    formatted += '.' + decimalPart.padEnd(decimals, '0').slice(0, decimals)
  }

  if (isNegative) {
    formatted = '-' + formatted
  }

  return {
    formatted,
    usedIntl: false,
  }
}

function formatNumber(value, options = {}) {
  const {
    roundingMode = 'round',
    decimals = DEFAULT_DECIMALS,
    useScientific = false,
    scientificThreshold = SCIENTIFIC_THRESHOLD,
    useGrouping = true,
    locale = 'en-US',
  } = options

  if (!Number.isFinite(value)) {
    return { error: createError(ERROR_CODES.NOT_FINITE) }
  }

  const rounded = roundWithMode(value, roundingMode, decimals)
  if (rounded.error) {
    return rounded
  }

  const roundedValue = rounded.value
  const useSci = useScientific || shouldUseScientific(roundedValue, scientificThreshold)

  if (useSci) {
    const sciResult = formatScientific(roundedValue, decimals)
    if (sciResult.error) {
      return sciResult
    }
    return {
      formatted: sciResult.formatted,
      roundedValue,
      isScientific: true,
      usedIntl: false,
    }
  }

  const formatResult = formatWithIntl(roundedValue, locale, {
    decimals,
    useGrouping,
  })

  return {
    formatted: formatResult.formatted,
    roundedValue,
    isScientific: false,
    usedIntl: formatResult.usedIntl,
  }
}

function checkValueBounds(value) {
  if (!Number.isFinite(value)) {
    return {
      valid: false,
      error: createError(ERROR_CODES.NOT_FINITE),
    }
  }

  const absValue = Math.abs(value)

  if (absValue > MAX_VALUE) {
    return {
      valid: false,
      error: createError(ERROR_CODES.OVERFLOW),
    }
  }

  if (absValue !== 0 && absValue < MIN_POSITIVE_VALUE) {
    return {
      valid: false,
      error: createError(ERROR_CODES.UNDERFLOW),
    }
  }

  return { valid: true }
}

export {
  roundBankers,
  roundWithMode,
  shouldUseScientific,
  formatScientific,
  detectIntlSupport,
  formatWithIntl,
  formatFallback,
  formatNumber,
  checkValueBounds,
}
