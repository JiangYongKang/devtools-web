import { ERROR_CODES, WARNING_CODES, RATIO_SYMBOLS } from './constants.js'
import { createError, createSuccess, createWarning } from './errors.js'

function parseRatio(input, options = {}) {
  const {
    fractionApproximationDigits = 10,
  } = options

  const warnings = []

  if (typeof input !== 'string' && typeof input !== 'number') {
    return createError(ERROR_CODES.INVALID_INPUT, '输入必须为字符串或数字')
  }

  let str = String(input).trim()

  let multiplier = 1
  let detectedSymbol = null

  for (const [symbol, factor] of Object.entries(RATIO_SYMBOLS)) {
    if (str.endsWith(symbol) || str.includes(symbol)) {
      multiplier = factor
      detectedSymbol = symbol
      str = str.replace(symbol, '').trim()
      break
    }
  }

  const fractionMatch = str.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/)
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1])
    const denominator = parseFloat(fractionMatch[2])

    if (denominator === 0) {
      return createError(ERROR_CODES.INVALID_RATIO, '分母不能为零')
    }

    const exactValue = numerator / denominator
    const approximatedValue = parseFloat(exactValue.toFixed(fractionApproximationDigits))

    if (Math.abs(exactValue - approximatedValue) > 1e-15) {
      warnings.push(createWarning(WARNING_CODES.FRACTION_APPROXIMATED, '', {
        numerator,
        denominator,
        exactValue,
        approximatedValue,
      }))
    }

    const finalValue = exactValue * multiplier

    return createSuccess({
      value: finalValue,
      type: 'fraction',
      numerator,
      denominator,
      symbol: detectedSymbol,
      display: formatRatio(finalValue, { symbol: detectedSymbol, numerator, denominator }),
    }, warnings)
  }

  const value = parseFloat(str)

  if (isNaN(value)) {
    return createError(ERROR_CODES.PARSING_FAILED, '无法解析为有效数字')
  }

  const finalValue = value * multiplier

  return createSuccess({
    value: finalValue,
    type: detectedSymbol ? 'symbol' : 'decimal',
    symbol: detectedSymbol,
    display: formatRatio(finalValue, { symbol: detectedSymbol }),
  }, warnings)
}

function formatRatio(value, options = {}) {
  const {
    symbol = null,
    locale = 'en-US',
    maximumFractionDigits = 6,
    numerator = null,
    denominator = null,
  } = options

  if (numerator !== null && denominator !== null) {
    if (symbol) {
      return `${numerator}/${denominator}${symbol}`
    }
    return `${numerator}/${denominator}`
  }

  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  })

  if (symbol) {
    const displayValue = value / RATIO_SYMBOLS[symbol]
    return `${formatter.format(displayValue)}${symbol}`
  }

  return formatter.format(value)
}

function ratioToPercentage(value) {
  return value * 100
}

function percentageToRatio(percentage) {
  return percentage / 100
}

function applyRatioToAmount(amountValue, ratioValue) {
  return amountValue * (1 + ratioValue)
}

export {
  parseRatio,
  formatRatio,
  ratioToPercentage,
  percentageToRatio,
  applyRatioToAmount,
}
