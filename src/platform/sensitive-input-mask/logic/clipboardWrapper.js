import { MAX_CLIPBOARD_LENGTH, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

function sanitizeSensitiveValue(value, options = {}) {
  const {
    maxLength = MAX_CLIPBOARD_LENGTH,
    trim = false,
  } = options

  if (value === null || value === undefined) {
    return { sanitized: '', wasEmpty: true }
  }

  let sanitized = String(value)

  if (trim) {
    sanitized = sanitized.trim()
  }

  const originalLength = sanitized.length
  const wasTruncated = sanitized.length > maxLength
  if (wasTruncated) {
    sanitized = sanitized.slice(0, maxLength)
  }

  return {
    sanitized,
    originalLength,
    finalLength: sanitized.length,
    wasTruncated,
    maxAllowed: maxLength,
    wasEmpty: sanitized.length === 0,
  }
}

function createClipboardWrapper(options = {}) {
  const {
    maxLength = MAX_CLIPBOARD_LENGTH,
    trim = false,
  } = options

  async function writeText(writeFn, value, userGestureOptions = {}) {
    const sanitizeResult = sanitizeSensitiveValue(value, { maxLength, trim })

    if (sanitizeResult.wasEmpty) {
      return {
        success: false,
        error: createError(ERROR_CODES.VALUE_EMPTY),
        sanitizeResult,
      }
    }

    try {
      const result = await writeFn(sanitizeResult.sanitized, userGestureOptions)
      return {
        ...result,
        sanitizeResult,
      }
    } catch (error) {
      return {
        success: false,
        error,
        sanitizeResult,
      }
    }
  }

  return {
    writeText,
    sanitize: (value) => sanitizeSensitiveValue(value, { maxLength, trim }),
    get maxLength() {
      return maxLength
    },
  }
}

function createUserGestureToken() {
  return {
    timestamp: Date.now(),
    id: `gesture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
}

function isValidUserGestureToken(token, maxAgeMs = 5000) {
  if (!token || typeof token !== 'object') return false
  if (!token.timestamp || !token.id) return false
  const age = Date.now() - token.timestamp
  return age < maxAgeMs
}

function verifyUserGesture(userGestureToken, requireExplicit = true, maxAgeMs = 5000) {
  if (requireExplicit) {
    return isValidUserGestureToken(userGestureToken, maxAgeMs)
  }

  if (isValidUserGestureToken(userGestureToken, maxAgeMs)) {
    return true
  }

  try {
    if (typeof document !== 'undefined' && document.hasFocus()) {
      return true
    }
  } catch {
  }

  return false
}

function createConfirmableClipboard(writeFn, options = {}) {
  const {
    confirmMessage = '确认复制敏感内容到剪贴板？',
    sanitizeOptions = {},
  } = options

  const wrapper = createClipboardWrapper(sanitizeOptions)

  async function writeWithConfirm(value, confirmFn, userGestureOptions = {}) {
    if (typeof confirmFn !== 'function') {
      throw new Error('confirmFn 必须是一个函数')
    }

    const confirmed = await confirmFn(confirmMessage, value)
    if (!confirmed) {
      return {
        success: false,
        cancelled: true,
      }
    }

    return wrapper.writeText(writeFn, value, userGestureOptions)
  }

  return {
    writeWithConfirm,
    sanitize: wrapper.sanitize,
  }
}

export {
  sanitizeSensitiveValue,
  createClipboardWrapper,
  createUserGestureToken,
  isValidUserGestureToken,
  verifyUserGesture,
  createConfirmableClipboard,
}
