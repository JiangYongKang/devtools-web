import {
  normalizeParams,
  validateLanguage,
  validateTimezone,
  parseCronExpression,
} from './parser'
import { buildFieldDescriptions, buildFullDescription } from './description'
import { calculateNextTriggers, formatTriggerTime } from './trigger'
import { getErrorMessage } from './errors'

function interpretCron(params = {}) {
  const originalExpression = params?.expression

  const normalized = normalizeParams(params)

  const languageError = validateLanguage(normalized.language)
  if (languageError) {
    return {
      success: false,
      error: {
        code: languageError.code,
        message: getErrorMessage(languageError.code, normalized.language),
      },
      result: null,
    }
  }

  const timezoneError = validateTimezone(normalized.timezoneId)
  if (timezoneError) {
    return {
      success: false,
      error: {
        code: timezoneError.code,
        message: getErrorMessage(timezoneError.code, normalized.language),
      },
      result: null,
    }
  }

  const expressionToParse = originalExpression === null ? null : normalized.expression
  const parseResult = parseCronExpression(expressionToParse)
  if (parseResult.error) {
    return {
      success: false,
      error: {
        code: parseResult.error.code,
        message: getErrorMessage(
          parseResult.error.code,
          normalized.language,
          parseResult.error.fieldName,
        ),
      },
      result: null,
    }
  }

  const parsed = parseResult.parsed
  const fieldDescriptions = buildFieldDescriptions(parsed, normalized.language)

  const result = {
    originalExpression: normalized.expression,
    fieldCount: parsed.fieldCount,
    description: buildFullDescription(parsed, normalized.language),
    ...fieldDescriptions,
    nextTriggerTimes: [],
  }

  if (normalized.includeNextTriggers) {
    const triggerCount = Math.max(1, Math.min(20, normalized.nextTriggerCount || 5))
    const triggers = calculateNextTriggers(parsed, normalized.timezoneId, triggerCount)
    result.nextTriggerTimes = triggers.map((t) =>
      formatTriggerTime(t, normalized.timezoneId, normalized.language),
    )
  }

  return {
    success: true,
    error: null,
    result,
  }
}

export { interpretCron }
