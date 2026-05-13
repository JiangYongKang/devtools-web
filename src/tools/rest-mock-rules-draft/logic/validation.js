import {
  ERROR_CODES,
  HTTP_METHODS,
  PATH_MATCH_TYPES,
  VALID_STATUS_CODES,
  PROBABILITY_RANGE,
  MAX_DELAY_MS,
} from './constants.js'
import { createError } from './errors.js'

export function validateJson(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { valid: false, error: createError(ERROR_CODES.INVALID_JSON, 'JSON 文本为空') }
  }
  try {
    const parsed = JSON.parse(text)
    return { valid: true, data: parsed }
  } catch (e) {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_JSON, `JSON 解析失败: ${e.message}`),
    }
  }
}

export function validateRegex(pattern) {
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    return { valid: false, error: createError(ERROR_CODES.INVALID_REGEX, '正则表达式为空') }
  }
  try {
    new RegExp(pattern)
    return { valid: true }
  } catch (e) {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_REGEX, `无效的正则表达式: ${e.message}`),
    }
  }
}

export function validatePath(path, pathMatchType) {
  const errors = []

  if (typeof path !== 'string' || path.trim() === '') {
    errors.push(createError(ERROR_CODES.INVALID_PATH, '路径不能为空'))
  } else if (!path.startsWith('/')) {
    errors.push(createError(ERROR_CODES.INVALID_PATH, '路径必须以 / 开头'))
  }

  if (pathMatchType === PATH_MATCH_TYPES.REGEX && path && path.trim()) {
    const regexValidation = validateRegex(path)
    if (!regexValidation.valid) {
      errors.push(regexValidation.error)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateMethods(methods) {
  const errors = []

  if (!Array.isArray(methods) || methods.length === 0) {
    errors.push(createError(ERROR_CODES.INVALID_METHOD, '至少需要选择一个 HTTP 方法'))
    return { valid: false, errors }
  }

  for (const method of methods) {
    if (typeof method !== 'string' || !HTTP_METHODS.includes(method.toUpperCase())) {
      errors.push(
        createError(ERROR_CODES.INVALID_METHOD, `无效的 HTTP 方法: ${method}`)
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateStatusCode(statusCode) {
  if (
    typeof statusCode !== 'number' ||
    !Number.isInteger(statusCode) ||
    statusCode < VALID_STATUS_CODES.min ||
    statusCode > VALID_STATUS_CODES.max
  ) {
    return {
      valid: false,
      error: createError(
        ERROR_CODES.INVALID_STATUS_CODE,
        `状态码必须是 ${VALID_STATUS_CODES.min}-${VALID_STATUS_CODES.max} 之间的整数`
      ),
    }
  }
  return { valid: true }
}

export function validateDelay(delayMs) {
  if (
    typeof delayMs !== 'number' ||
    !Number.isInteger(delayMs) ||
    delayMs < 0 ||
    delayMs > MAX_DELAY_MS
  ) {
    return {
      valid: false,
      error: createError(
        ERROR_CODES.INVALID_DELAY,
        `延迟必须是 0-${MAX_DELAY_MS}ms 之间的整数`
      ),
    }
  }
  return { valid: true }
}

export function validateProbability(probability) {
  if (
    typeof probability !== 'number' ||
    !Number.isInteger(probability) ||
    probability < PROBABILITY_RANGE.min ||
    probability > PROBABILITY_RANGE.max
  ) {
    return {
      valid: false,
      error: createError(
        ERROR_CODES.INVALID_PROBABILITY,
        `概率必须是 ${PROBABILITY_RANGE.min}-${PROBABILITY_RANGE.max} 之间的整数`
      ),
    }
  }
  return { valid: true }
}

export function validateRule(rule) {
  const errors = []

  const pathValidation = validatePath(rule.path, rule.pathMatchType)
  if (!pathValidation.valid) {
    errors.push(
      ...pathValidation.errors.map((e) =>
        createError(e.code, e.message, { field: 'path', ruleId: rule.id })
      )
    )
  }

  const methodsValidation = validateMethods(rule.methods)
  if (!methodsValidation.valid) {
    errors.push(
      ...methodsValidation.errors.map((e) =>
        createError(e.code, e.message, { field: 'methods', ruleId: rule.id })
      )
    )
  }

  const statusValidation = validateStatusCode(rule.statusCode)
  if (!statusValidation.valid) {
    errors.push(
      createError(statusValidation.error.code, statusValidation.error.message, {
        field: 'statusCode',
        ruleId: rule.id,
      })
    )
  }

  const delayValidation = validateDelay(rule.delayMs)
  if (!delayValidation.valid) {
    errors.push(
      createError(delayValidation.error.code, delayValidation.error.message, {
        field: 'delayMs',
        ruleId: rule.id,
      })
    )
  }

  const probabilityValidation = validateProbability(rule.probability)
  if (!probabilityValidation.valid) {
    errors.push(
      createError(probabilityValidation.error.code, probabilityValidation.error.message, {
        field: 'probability',
        ruleId: rule.id,
      })
    )
  }

  return { valid: errors.length === 0, errors }
}

export function validateRules(rules) {
  const allErrors = []

  if (!Array.isArray(rules)) {
    return {
      valid: false,
      errors: [createError(ERROR_CODES.INVALID_JSON, '规则列表不是有效的数组')],
    }
  }

  for (const rule of rules) {
    const validation = validateRule(rule)
    if (!validation.valid) {
      allErrors.push(...validation.errors)
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors }
}

export function validateDraft(draft) {
  if (!draft || typeof draft !== 'object') {
    return {
      valid: false,
      errors: [createError(ERROR_CODES.INVALID_JSON, '草稿不是有效的对象')],
    }
  }

  return validateRules(draft.rules || [])
}

export function validateJsonBodyPrecheck(body, enabled = true) {
  if (!enabled) {
    return { valid: true, warnings: [] }
  }

  const warnings = []

  if (typeof body === 'string' && body.trim() !== '') {
    try {
      JSON.parse(body)
      return { valid: true, warnings }
    } catch (e) {
      return {
        valid: false,
        error: createError(ERROR_CODES.INVALID_JSON, `响应体 JSON 预检失败: ${e.message}`),
      }
    }
  } else if (typeof body === 'object' && body !== null) {
    try {
      JSON.stringify(body)
      return { valid: true, warnings }
    } catch (e) {
      return {
        valid: false,
        error: createError(ERROR_CODES.INVALID_JSON, `响应体无法序列化为 JSON: ${e.message}`),
      }
    }
  }

  return { valid: true, warnings }
}
