import { FIELD_DEFINITIONS, DEFAULT_PARAMS } from './constants'
import { ERROR_CODES, SUPPORTED_LANGUAGES, createError } from './errors'

function normalizeParams(params = {}) {
  return {
    expression: params.expression ?? DEFAULT_PARAMS.expression,
    timezoneId: params.timezoneId ?? DEFAULT_PARAMS.timezoneId,
    language: params.language ?? DEFAULT_PARAMS.language,
    expandSteps: params.expandSteps ?? DEFAULT_PARAMS.expandSteps,
    includeNextTriggers: params.includeNextTriggers ?? DEFAULT_PARAMS.includeNextTriggers,
    nextTriggerCount: params.nextTriggerCount ?? DEFAULT_PARAMS.nextTriggerCount,
  }
}

function validateLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return createError(ERROR_CODES.UNSUPPORTED_LANGUAGE)
  }
  return null
}

function validateTimezone(timezoneId) {
  if (!timezoneId) {
    return createError(ERROR_CODES.INVALID_TIMEZONE)
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezoneId })
    return null
  } catch {
    return createError(ERROR_CODES.INVALID_TIMEZONE)
  }
}

function splitExpression(expression) {
  if (expression == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT), fields: null }
  }
  if (typeof expression !== 'string') {
    return { error: createError(ERROR_CODES.NULL_INPUT), fields: null }
  }
  const trimmed = expression.trim()
  if (trimmed === '') {
    return { error: createError(ERROR_CODES.EMPTY_INPUT), fields: null }
  }
  const fields = trimmed.split(/\s+/)
  if (fields.length !== 5 && fields.length !== 6) {
    return { error: createError(ERROR_CODES.INVALID_FIELD_COUNT), fields: null }
  }
  return { error: null, fields }
}

function normalizeValue(value, fieldDef) {
  if (fieldDef.aliases) {
    const lowerValue = value.toLowerCase()
    if (fieldDef.aliases[lowerValue] !== undefined) {
      return fieldDef.aliases[lowerValue]
    }
  }
  const num = parseInt(value, 10)
  if (isNaN(num)) {
    return null
  }
  return num
}

function validateRange(start, end, fieldDef) {
  if (start === null || end === null) return false
  if (start < fieldDef.min || start > fieldDef.max) return false
  if (end < fieldDef.min || end > fieldDef.max) return false
  if (start > end) return false
  return true
}

function expandSingleField(fieldValue, fieldDef) {
  const values = new Set()
  const parts = fieldValue.split(',')

  for (const part of parts) {
    const stepParts = part.split('/')
    const basePart = stepParts[0]
    const step = stepParts.length > 1 ? parseInt(stepParts[1], 10) : 1

    if (isNaN(step) || step <= 0) {
      return { error: createError(ERROR_CODES.INVALID_VALUE, fieldDef.nameZh), values: null }
    }

    if (basePart === '*') {
      for (let i = fieldDef.min; i <= fieldDef.max; i += step) {
        values.add(i)
      }
    } else if (basePart === '?') {
      return { error: null, values: null, isWildcard: true }
    } else if (basePart === 'L') {
      if (fieldDef.position === 3) {
        return { error: null, values: null, special: 'LAST_DAY' }
      }
      return { error: null, values: null, special: 'LAST_WEEKDAY' }
    } else if (basePart.includes('-')) {
      const rangeParts = basePart.split('-')
      if (rangeParts.length !== 2) {
        return { error: createError(ERROR_CODES.INVALID_FIELD, fieldDef.nameZh), values: null }
      }
      const start = normalizeValue(rangeParts[0], fieldDef)
      const end = normalizeValue(rangeParts[1], fieldDef)
      if (!validateRange(start, end, fieldDef)) {
        return { error: createError(ERROR_CODES.INVALID_VALUE, fieldDef.nameZh), values: null }
      }
      for (let i = start; i <= end; i += step) {
        values.add(i)
      }
    } else {
      const num = normalizeValue(basePart, fieldDef)
      if (num === null || num < fieldDef.min || num > fieldDef.max) {
        return { error: createError(ERROR_CODES.INVALID_VALUE, fieldDef.nameZh), values: null }
      }
      values.add(num)
    }
  }

  return {
    error: null,
    values: Array.from(values).sort((a, b) => a - b),
  }
}

function parseCronExpression(expression) {
  const splitResult = splitExpression(expression)
  if (splitResult.error) {
    return { error: splitResult.error, parsed: null }
  }

  const fields = splitResult.fields
  const fieldCount = fields.length
  const hasSeconds = fieldCount === 6

  const parsedFields = {}

  const fieldNames = hasSeconds
    ? ['seconds', 'minutes', 'hours', 'dayOfMonth', 'month', 'dayOfWeek']
    : ['minutes', 'hours', 'dayOfMonth', 'month', 'dayOfWeek']

  for (let i = 0; i < fieldNames.length; i++) {
    const fieldName = fieldNames[i]
    const fieldDef = FIELD_DEFINITIONS[fieldName]
    const fieldValue = fields[i]

    const expandResult = expandSingleField(fieldValue, fieldDef)
    if (expandResult.error) {
      return { error: expandResult.error, parsed: null }
    }

    parsedFields[fieldName] = {
      raw: fieldValue,
      values: expandResult.values,
      isWildcard: expandResult.isWildcard || false,
      special: expandResult.special || null,
    }
  }

  if (parsedFields.dayOfMonth && parsedFields.dayOfWeek) {
    const dayOfMonthIsWildcard = parsedFields.dayOfMonth.raw === '*' || parsedFields.dayOfMonth.raw === '?'
    const dayOfWeekIsWildcard = parsedFields.dayOfWeek.raw === '*' || parsedFields.dayOfWeek.raw === '?'

    if (!dayOfMonthIsWildcard && !dayOfWeekIsWildcard) {
      return {
        error: createError(ERROR_CODES.UNSUPPORTED_COMBINATION),
        parsed: null,
      }
    }
  }

  return {
    error: null,
    parsed: {
      fieldCount,
      hasSeconds,
      ...parsedFields,
    },
  }
}

export {
  normalizeParams,
  validateLanguage,
  validateTimezone,
  splitExpression,
  normalizeValue,
  validateRange,
  expandSingleField,
  parseCronExpression,
}
