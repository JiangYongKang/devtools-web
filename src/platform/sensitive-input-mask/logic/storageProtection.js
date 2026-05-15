import { SENSITIVE_KEY_PATTERNS, ERROR_CODES, MAX_STORAGE_LENGTH } from './constants.js'
import { createError } from './errors.js'

function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') {
    return false
  }

  for (const pattern of SENSITIVE_KEY_PATTERNS) {
    if (pattern.test(key)) {
      return true
    }
  }
  return false
}

function getMatchedPattern(key) {
  if (!key || typeof key !== 'string') {
    return null
  }

  for (const pattern of SENSITIVE_KEY_PATTERNS) {
    if (pattern.test(key)) {
      return pattern.toString()
    }
  }
  return null
}

function validateStorageOperation(key, value, options = {}) {
  const {
    checkLength = true,
    maxLength = MAX_STORAGE_LENGTH,
  } = options

  if (isSensitiveKey(key)) {
    return {
      allowed: false,
      error: createError(ERROR_CODES.SENSITIVE_KEY_REJECTED, `键名 "${key}" 匹配敏感模式`),
      matchedPattern: getMatchedPattern(key),
    }
  }

  if (checkLength && value !== undefined && value !== null) {
    const valueStr = String(value)
    if (valueStr.length > maxLength) {
      return {
        allowed: false,
        error: createError(ERROR_CODES.CONTENT_TOO_LARGE, `值长度 ${valueStr.length} 超过上限 ${maxLength}`),
        matchedPattern: null,
      }
    }
  }

  return {
    allowed: true,
    error: null,
    matchedPattern: null,
  }
}

function createProtectedStorage(originalStorage, options = {}) {
  const {
    errorOnReject = true,
    logRejection = true,
    maxLength = MAX_STORAGE_LENGTH,
  } = options

  const logger = logRejection
    ? (msg, key) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`[ProtectedStorage] ${msg}`, key)
        }
      }
    : () => {}

  return {
    getItem(key) {
      return originalStorage.getItem(key)
    },

    setItem(key, value) {
      const validation = validateStorageOperation(key, value, { maxLength })

      if (!validation.allowed) {
        logger('拒绝写入敏感键', key)
        if (errorOnReject) {
          throw validation.error
        }
        return
      }

      return originalStorage.setItem(key, value)
    },

    removeItem(key) {
      return originalStorage.removeItem(key)
    },

    clear() {
      return originalStorage.clear()
    },

    key(index) {
      return originalStorage.key(index)
    },

    get length() {
      return originalStorage.length
    },

    isProtected: true,
  }
}

function redactValueForKey(key, value, placeholder = '[REDACTED]') {
  if (isSensitiveKey(key)) {
    return placeholder
  }
  return value
}

function redactObject(obj, placeholder = '[REDACTED]') {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item, idx) => redactValueForKey(String(idx), item, placeholder))
  }

  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = redactValueForKey(key, value, placeholder)
  }
  return result
}

export {
  isSensitiveKey,
  getMatchedPattern,
  validateStorageOperation,
  createProtectedStorage,
  redactValueForKey,
  redactObject,
}
