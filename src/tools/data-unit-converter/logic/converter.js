import {
  ERROR_CODES,
  createError,
} from './errors.js'
import {
  CATEGORIES,
  ALL_UNITS,
  UNIT_MAP,
  TIME_UNITS,
  CATEGORY_CONVERSION_MAP,
  DEFAULT_BASE,
  DEFAULT_DECIMALS,
  DEFAULT_ROUNDING_MODE,
  MAX_BATCH_SIZE,
  getUnitByCode,
} from './constants.js'
import {
  roundWithMode,
  formatNumber,
  checkValueBounds,
} from './formatter.js'

function getUnitFactor(unitOrCode) {
  if (!unitOrCode) return 0

  const unit = typeof unitOrCode === 'string' ? getUnitByCode(unitOrCode) : unitOrCode

  if (!unit) return 0

  if (unit.category === CATEGORIES.TIME) {
    return unit.factor || 1
  }

  if (unit.base && unit.exponent) {
    return Math.pow(unit.base, unit.exponent)
  }

  return 1
}

function normalizeToBase(value, sourceUnit) {
  const unit = typeof sourceUnit === 'string' ? getUnitByCode(sourceUnit) : sourceUnit

  if (!unit) {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '源单位无效') }
  }

  if (!Number.isFinite(value)) {
    return { error: createError(ERROR_CODES.NOT_FINITE) }
  }

  const factor = getUnitFactor(unit)

  return {
    value: value * factor,
    category: unit.category,
    unit: unit,
  }
}

function convertFromBase(baseValue, targetUnit) {
  const factor = getUnitFactor(targetUnit)
  return baseValue / factor
}

function getCategoryConversionFactor(sourceCategory, targetCategory) {
  if (sourceCategory === targetCategory) {
    return 1
  }

  const conversions = CATEGORY_CONVERSION_MAP[sourceCategory]
  if (conversions && conversions[targetCategory]) {
    return conversions[targetCategory].factor
  }

  return null
}

function convertValue(value, sourceUnit, targetUnit, options = {}) {
  const {
    base = DEFAULT_BASE,
    allowNegative = true,
  } = options

  if (value == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) {
      return { error: createError(ERROR_CODES.INVALID_NUMBER) }
    }
    value = parsed
  }

  if (!Number.isFinite(value)) {
    return { error: createError(ERROR_CODES.NOT_FINITE) }
  }

  if (!allowNegative && value < 0) {
    return { error: createError(ERROR_CODES.NEGATIVE_NOT_ALLOWED) }
  }

  const bounds = checkValueBounds(value)
  if (!bounds.valid) {
    return bounds.error
  }

  const source = typeof sourceUnit === 'string' ? getUnitByCode(sourceUnit) : sourceUnit
  const target = typeof targetUnit === 'string' ? getUnitByCode(targetUnit) : targetUnit

  if (!source) {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '源单位无效') }
  }

  if (!target) {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '目标单位无效') }
  }

  const sourceCategory = source.category
  const targetCategory = target.category

  const categoryFactor = getCategoryConversionFactor(sourceCategory, targetCategory)
  if (categoryFactor === null) {
    return {
      error: createError(
      ERROR_CODES.INCOMPATIBLE_CATEGORIES,
      `无法在 ${source.name} 和 ${target.name} 之间转换`
    ),
    }
  }

  const normalized = normalizeToBase(value, source)
  if (normalized.error) {
    return normalized
  }

  const baseValue = normalized.value
  const convertedBaseValue = baseValue * categoryFactor
  const convertedValue = convertFromBase(convertedBaseValue, target)

  const convertedBounds = checkValueBounds(convertedValue)
  if (!convertedBounds.valid) {
    return convertedBounds.error
  }

  return {
    value: convertedValue,
    sourceUnit: source,
    targetUnit: target,
    sourceValue: value,
  }
}

function buildDefaultFormatOptions(options = {}) {
  return {
    roundingMode: options.roundingMode || DEFAULT_ROUNDING_MODE,
    decimals: options.decimals != null ? options.decimals : DEFAULT_DECIMALS,
    useScientific: options.useScientific || false,
    useGrouping: options.useGrouping != null ? options.useGrouping : true,
    locale: options.locale || 'en-US',
  }
}

function formatConversionResult(conversionResult, options = {}) {
  if (conversionResult.error) {
    return conversionResult
  }

  const formatOptions = buildDefaultFormatOptions(options)
  const formatted = formatNumber(conversionResult.value, formatOptions)

  if (formatted.error) {
    return formatted
  }

  const sourceFormatted = formatNumber(conversionResult.sourceValue, formatOptions)

  return {
    ...conversionResult,
    formatted: formatted.formatted,
    formattedValue: formatted.formatted,
    roundedValue: formatted.roundedValue,
    formattedSourceValue: sourceFormatted.formatted,
    displayValue: `${formatted.formatted} ${conversionResult.targetUnit.symbol}`,
  }
}

function convertAndFormat(value, sourceUnit, targetUnit, options = {}) {
  const conversion = convertValue(value, sourceUnit, targetUnit, options)
  if (conversion.error) {
    return conversion
  }
  return formatConversionResult(conversion, options)
}

function convertToMultipleUnits(value, sourceUnit, targetUnits, options = {}) {
  const source = typeof sourceUnit === 'string' ? getUnitByCode(sourceUnit) : sourceUnit

  if (!source) {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '源单位无效'), results: [] }
  }

  const results = []
  let allSuccess = true

  for (const targetUnit of targetUnits) {
    const result = convertAndFormat(value, source, targetUnit, options)
    if (result.error) {
      allSuccess = false
      continue
    }
    const targetUnitCode = result.targetUnit.code
    results.push({
      ...result,
      targetUnit: targetUnitCode,
    })
  }

  return {
    allSuccess,
    results,
    error: null,
  }
}

function calculateBandwidthTime(bandwidth, bandwidthUnit, time, timeUnit, outputUnits, options = {}) {
  const bandwidthSource = typeof bandwidthUnit === 'string' ? getUnitByCode(bandwidthUnit) : bandwidthUnit
  const timeSource = typeof timeUnit === 'string' ? getUnitByCode(timeUnit) : timeUnit

  if (!bandwidthSource || bandwidthSource.category !== CATEGORIES.BITRATE) {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '带宽单位无效') }
  }

  if (!timeSource || timeSource.category !== CATEGORIES.TIME) {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '时间单位无效') }
  }

  const timeInSeconds = normalizeToBase(time, timeSource)
  if (timeInSeconds.error) {
    return timeInSeconds
  }

  const bandwidthBps = normalizeToBase(bandwidth, bandwidthSource)
  if (bandwidthBps.error) {
    return bandwidthBps
  }

  const totalBits = bandwidthBps.value * timeInSeconds.value
  const totalBytes = totalBits / 8

  const byteUnits = outputUnits || ['GB', 'GiB', 'MB', 'MiB', 'KB', 'KiB', 'B']

  const formatOptions = buildDefaultFormatOptions(options)

  const results = []
  for (const unitCode of byteUnits) {
    const unit = getUnitByCode(unitCode)
    if (!unit) continue

    const byteValue = totalBytes
    const conversion = convertAndFormat(byteValue, 'B', unit, options)
    results.push({
      targetUnit: unit,
      ...conversion,
    })
  }

  const bitsFormatted = formatNumber(totalBits, formatOptions)
  const bytesFormatted = formatNumber(totalBytes, formatOptions)

  return {
    bandwidth,
    bandwidthUnit: bandwidthSource,
    time,
    timeUnit: timeSource,
    timeInSeconds: timeInSeconds.value,
    bits: totalBits,
    bytes: totalBytes,
    totalBits,
    totalBytes,
    formatted: {
      bits: bitsFormatted.formatted,
      bytes: bytesFormatted.formatted,
    },
    results,
  }
}

function calculateStorageCost(size, unit, pricePerGB, options = {}) {
  const { allowNegative = false } = options

  if (!allowNegative && pricePerGB < 0) {
    return { error: createError(ERROR_CODES.NEGATIVE_NOT_ALLOWED) }
  }

  const unitObj = typeof unit === 'string' ? getUnitByCode(unit) : unit
  if (!unitObj) {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '单位无效') }
  }

  const normalized = normalizeToBase(size, unitObj)
  if (normalized.error) {
    return normalized
  }

  const totalBytes = normalized.value
  const formatOptions = buildDefaultFormatOptions(options)
  const gbValue = totalBytes / (1000 * 1000 * 1000)
  const totalCost = gbValue * pricePerGB

  const formattedTotalCost = formatNumber(totalCost, {
    ...formatOptions,
    decimals: 4,
  })

  const formattedGB = formatNumber(gbValue, formatOptions)

  return {
    totalBytes,
    totalGB: gbValue,
    costPerGB: pricePerGB,
    cost: totalCost,
    totalCost,
    formattedCost: formattedTotalCost.formatted,
    formattedTotalCost: formattedTotalCost.formatted,
    formattedGB: formattedGB.formatted,
  }
}

function aggregateBatchResults(items, options = {}) {
  if (!Array.isArray(items)) {
    return {
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      allSuccessful: true,
      items: [],
    }
  }

  const totalCount = items.length
  let successCount = 0
  let failureCount = 0

  const processedItems = items.map((item, index) => {
    if (item.success !== undefined) {
      if (item.success) {
        successCount++
      } else {
        failureCount++
      }
      return item
    }

    const result = convertAndFormat(
      item.value,
      item.sourceUnit,
      item.targetUnit,
      { ...options, ...item.options }
    )
    const success = !result.error

    if (success) {
      successCount++
    } else {
      failureCount++
    }

    return {
      index,
      lineNumber: index + 1,
      success,
      input: {
        value: item.value,
        sourceUnit: item.sourceUnit,
        targetUnit: item.targetUnit,
      },
      result: success ? result : null,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    }
  })

  const sortedItems = [...processedItems].sort((a, b) => {
    const aLine = a.lineNumber !== undefined ? a.lineNumber : a.index
    const bLine = b.lineNumber !== undefined ? b.lineNumber : b.index
    return aLine - bLine
  })

  return {
    totalCount,
    successCount,
    failureCount,
    allSuccessful: failureCount === 0,
    items: sortedItems,
  }
}

function exportToTSV(batchResult, options = {}) {
  const { headers = null, includeErrors = false } = options
  const rows = []

  if (headers) {
    rows.push(headers)
  } else {
    const defaultHeaders = ['Line', 'Input', 'Source Value', 'Source Unit', 'Target Unit', 'Result Value', 'Result Unit', 'Status']
    if (includeErrors) {
      defaultHeaders.push('Error Code', 'Error Message')
    }
    rows.push(defaultHeaders)
  }

  const items = batchResult.items || batchResult
  if (!Array.isArray(items)) {
    return ''
  }

  items.forEach((item, index) => {
    const originalInput = item.originalInput || item.rawLine || item.rawInput || `${item.sourceValue || item.input?.value} ${item.sourceUnit || item.input?.sourceUnit}`
    const sourceValue = item.sourceValue !== undefined ? item.sourceValue : (item.input?.value || '')
    const sourceUnit = item.sourceUnit || item.input?.sourceUnit || ''
    const targetUnit = item.result?.targetUnit?.code || item.targetUnit || item.input?.targetUnit || ''
    const resultValue = item.result?.value !== undefined ? item.result.value : ''
    const resultUnit = item.result?.targetUnit?.code || targetUnit
    const status = item.success ? 'Success' : 'Failed'

    const row = [
      String(item.lineNumber || index + 1),
      originalInput,
      String(sourceValue),
      sourceUnit,
      targetUnit,
      String(resultValue),
      resultUnit,
      status,
    ]

    if (includeErrors) {
      row.push(item.error?.errorCode || '')
      row.push(item.error?.errorMessage || '')
    }

    rows.push(row)
  })

  return rows.map((row) => row.join('\t')).join('\n')
}

function buildConversionFormula(sourceValue, sourceUnit, targetUnit, resultValue) {
  const source = typeof sourceUnit === 'string' ? getUnitByCode(sourceUnit) : sourceUnit
  const target = typeof targetUnit === 'string' ? getUnitByCode(targetUnit) : targetUnit

  if (!source || !target) {
    return ''
  }

  let actualResult = resultValue

  if (actualResult === undefined) {
    const conversion = convertValue(sourceValue, source, target)
    if (!conversion.error) {
      actualResult = conversion.value
    }
  }

  const sourceBase = source.base || 1
  const sourceExponent = source.exponent || 0
  const targetBase = target.base || 1
  const targetExponent = target.exponent || 0
  const categoryFactor = getCategoryConversionFactor(source.category, target.category) || 1

  const sourceFactorDisplay = sourceExponent > 0 ? `${sourceBase}^${sourceExponent}` : '1'
  const targetFactorDisplay = targetExponent > 0 ? `${targetBase}^${targetExponent}` : '1'

  const sourceFactor = getUnitFactor(source)
  const targetFactor = getUnitFactor(target)

  const parts = []
  parts.push(`Conversion: ${sourceValue} ${source.code} → ${target.code}`)
  parts.push(`Formula: ${sourceValue} × ${sourceFactor} × ${categoryFactor} / ${targetFactor}`)
  parts.push(`Base information: ${source.code} = ${sourceBase}^${sourceExponent}, ${target.code} = ${targetBase}^${targetExponent}`)
  parts.push(`Substituted values: ${sourceValue} (${source.code}) × ${sourceFactor} = ${sourceValue * sourceFactor}`)
  parts.push(`Result: ${actualResult} ${target.code}`)

  return parts.join('\n')
}

function getCompatibleUnits(unitCode) {
  const unit = typeof unitCode === 'string' ? getUnitByCode(unitCode) : unitCode

  if (!unit) {
    return []
  }

  const category = unit.category
  const compatibleCategories = [category]

  if (category === CATEGORIES.BYTE || category === CATEGORIES.BIT) {
    if (category === CATEGORIES.BYTE) {
      compatibleCategories.push(CATEGORIES.BIT)
    } else {
      compatibleCategories.push(CATEGORIES.BYTE)
    }
  }

  return ALL_UNITS.filter((u) => compatibleCategories.includes(u.category))
}

export {
  getUnitFactor,
  normalizeToBase,
  convertFromBase,
  getCategoryConversionFactor,
  convertValue,
  buildDefaultFormatOptions,
  formatConversionResult,
  convertAndFormat,
  convertToMultipleUnits,
  calculateBandwidthTime,
  calculateStorageCost,
  aggregateBatchResults,
  exportToTSV,
  buildConversionFormula,
  getCompatibleUnits,
}
