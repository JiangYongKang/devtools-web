import {
  ERROR_CODES,
  MAX_PAYLOAD_DEPTH,
  MAX_PAYLOAD_KEYS,
  SCRIPT_KEY_PATTERNS,
  SENSITIVE_KEY_PATTERN,
} from './constants.js'
import { createError } from './errors.js'

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item))
  }

  const cloned = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

function getObjectDepth(obj, depth = 0, visited = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return depth
  }

  if (visited.has(obj)) {
    return depth
  }
  visited.add(obj)

  if (Array.isArray(obj)) {
    let maxDepth = depth
    for (const item of obj) {
      const itemDepth = getObjectDepth(item, depth + 1, visited)
      maxDepth = Math.max(maxDepth, itemDepth)
    }
    return maxDepth
  }

  let maxDepth = depth
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const itemDepth = getObjectDepth(obj[key], depth + 1, visited)
      maxDepth = Math.max(maxDepth, itemDepth)
    }
  }
  return maxDepth
}

function countKeys(obj, count = 0, visited = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return count
  }

  if (visited.has(obj)) {
    return count
  }
  visited.add(obj)

  if (Array.isArray(obj)) {
    let total = count
    for (const item of obj) {
      total = countKeys(item, total, visited)
    }
    return total
  }

  const keys = Object.keys(obj)
  let total = count + keys.length

  for (const key of keys) {
    total = countKeys(obj[key], total, visited)
  }

  return total
}

function hasCircularReference(obj, path = [], visited = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return null
  }

  if (visited.has(obj)) {
    return {
      path: [...path],
      existingPath: visited.get(obj),
    }
  }

  visited.set(obj, [...path])

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = hasCircularReference(obj[i], [...path, i], visited)
      if (result) {
        return result
      }
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const result = hasCircularReference(obj[key], [...path, key], visited)
        if (result) {
          return result
        }
      }
    }
  }

  return null
}

function hasScriptField(obj, path = [], visited = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return null
  }

  if (visited.has(obj)) {
    return null
  }
  visited.add(obj)

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = hasScriptField(obj[i], [...path, i], visited)
      if (result) {
        return result
      }
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        for (const pattern of SCRIPT_KEY_PATTERNS) {
          if (pattern.test(key)) {
            return {
              key,
              path: [...path, key],
            }
          }
        }
        const result = hasScriptField(obj[key], [...path, key], visited)
        if (result) {
          return result
        }
      }
    }
  }

  return null
}

function validatePayload(payload, maxDepth = MAX_PAYLOAD_DEPTH, maxKeys = MAX_PAYLOAD_KEYS) {
  if (payload === undefined || payload === null) {
    return { valid: true }
  }

  if (typeof payload !== 'object') {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_CONFIG, 'Payload must be an object'),
    }
  }

  const scriptField = hasScriptField(payload)
  if (scriptField) {
    return {
      valid: false,
      error: createError(ERROR_CODES.SCRIPT_FIELD_DETECTED, `Script field detected at path: ${scriptField.path.join('.')}`, {
        key: scriptField.key,
        path: scriptField.path,
      }),
    }
  }

  const circular = hasCircularReference(payload)
  if (circular) {
    return {
      valid: false,
      error: createError(ERROR_CODES.CIRCULAR_REF, 'Circular reference detected', {
        path: circular.path,
        existingPath: circular.existingPath,
      }),
    }
  }

  const depth = getObjectDepth(payload)
  if (depth > maxDepth) {
    return {
      valid: false,
      error: createError(ERROR_CODES.PAYLOAD_TOO_DEEP, `Payload depth ${depth} exceeds maximum ${maxDepth}`, {
        depth,
        maxDepth,
      }),
    }
  }

  const keyCount = countKeys(payload)
  if (keyCount > maxKeys) {
    return {
      valid: false,
      error: createError(ERROR_CODES.PAYLOAD_TOO_MANY_KEYS, `Payload has ${keyCount} keys, exceeds maximum ${maxKeys}`, {
        keyCount,
        maxKeys,
      }),
    }
  }

  return { valid: true }
}

function truncatePayload(payload, maxDepth = MAX_PAYLOAD_DEPTH, maxKeys = MAX_PAYLOAD_KEYS) {
  if (payload === null || typeof payload !== 'object') {
    return payload
  }

  const visited = new WeakSet()

  function truncate(obj, currentDepth = 0, currentKeys = 0, keyLimit = maxKeys) {
    if (obj === null || typeof obj !== 'object') {
      return { value: obj, keysUsed: 0 }
    }

    if (visited.has(obj)) {
      return { value: '[CIRCULAR]', keysUsed: 0 }
    }
    visited.add(obj)

    if (currentDepth >= maxDepth) {
      return { value: '[TRUNCATED]', keysUsed: 0 }
    }

    if (Array.isArray(obj)) {
      const result = []
      let keysUsed = 0
      for (let i = 0; i < obj.length; i++) {
        if (keysUsed >= keyLimit) {
          result.push('[TRUNCATED]')
          break
        }
        const { value, keysUsed: used } = truncate(obj[i], currentDepth + 1, keysUsed, keyLimit)
        keysUsed += used
        result.push(value)
      }
      return { value: result, keysUsed }
    }

    const result = {}
    let keysUsed = 0
    const keys = Object.keys(obj)

    for (const key of keys) {
      if (keysUsed >= keyLimit) {
        result['...'] = '[TRUNCATED]'
        break
      }

      const { value, keysUsed: used } = truncate(obj[key], currentDepth + 1, keysUsed + 1, keyLimit)
      keysUsed += used + 1
      result[key] = value
    }

    return { value: result, keysUsed }
  }

  return truncate(payload).value
}

function redactSensitiveData(obj, pattern = SENSITIVE_KEY_PATTERN, path = []) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) =>
      redactSensitiveData(item, pattern, [...path, index])
    )
  }

  const result = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const currentPath = [...path, key]
      const value = obj[key]

      if (pattern.test(key)) {
        result[key] = '[REDACTED]'
      } else if (value !== null && typeof value === 'object') {
        result[key] = redactSensitiveData(value, pattern, currentPath)
      } else {
        result[key] = value
      }
    }
  }
  return result
}

function compareVersions(a, b) {
  if (a === undefined || a === null) return -1
  if (b === undefined || b === null) return 1

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  const aStr = String(a)
  const bStr = String(b)

  if (aStr === bStr) return 0
  return aStr > bStr ? 1 : -1
}

function isExpired(expiresAt) {
  if (!expiresAt) return false

  const now = Date.now()
  return now > expiresAt
}

export {
  deepClone,
  getObjectDepth,
  countKeys,
  hasCircularReference,
  hasScriptField,
  validatePayload,
  truncatePayload,
  redactSensitiveData,
  compareVersions,
  isExpired,
}
