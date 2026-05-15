import {
  ERROR_CODES,
  MAX_KEY_LENGTH,
  PLACEHOLDER_PATTERN,
  SCRIPT_PATTERN,
} from './constants.js'
import { createError } from './errors.js'

function detectCircularReferences(obj, path = [], seen = new Map()) {
  if (obj === null || obj === undefined) {
    return null
  }
  if (typeof obj !== 'object') {
    return null
  }
  const pathStr = path.join('.')
  if (seen.has(obj)) {
    return {
      current: pathStr,
      original: seen.get(obj),
    }
  }
  seen.set(obj, pathStr)
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = detectCircularReferences(obj[i], [...path, String(i)], seen)
      if (result) {
        return result
      }
    }
  } else {
    for (const key of Object.keys(obj)) {
      const result = detectCircularReferences(obj[key], [...path, key], seen)
      if (result) {
        return result
      }
    }
  }
  return null
}

export function validateNoCircularReferences(data) {
  const circular = detectCircularReferences(data)
  if (circular) {
    return {
      valid: false,
      error: createError(
        ERROR_CODES.CIRCULAR_REFERENCE,
        `${circular.current} → ${circular.original}`
      ),
    }
  }
  return { valid: true }
}

export function validateNoEmptyKeys(data, path = []) {
  if (data === null || data === undefined) {
    return { valid: true }
  }
  if (typeof data !== 'object') {
    return { valid: true }
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const result = validateNoEmptyKeys(data[i], [...path, String(i)])
      if (!result.valid) {
        return result
      }
    }
    return { valid: true }
  }
  for (const key of Object.keys(data)) {
    const normalized = key.trim()
    if (normalized.length === 0) {
      return {
        valid: false,
        error: createError(
          ERROR_CODES.EMPTY_KEY,
          `在 ${path.length > 0 ? path.join('.') + '.' : ''}${key}`
        ),
      }
    }
    if (key.length > MAX_KEY_LENGTH) {
      return {
        valid: false,
        error: createError(
          ERROR_CODES.KEY_TOO_LONG,
          `${path.length > 0 ? path.join('.') + '.' : ''}${key.substring(0, 30)}...`
        ),
      }
    }
    const result = validateNoEmptyKeys(data[key], [...path, key])
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}

export function validateNoScriptTags(data, path = []) {
  if (data === null || data === undefined) {
    return { valid: true }
  }
  if (typeof data === 'string') {
    if (SCRIPT_PATTERN.test(data)) {
      return {
        valid: false,
        error: createError(
          ERROR_CODES.SCRIPT_TAG_DETECTED,
          `${path.length > 0 ? path.join('.') : '(root)'}: "${data.substring(0, 50)}..."`
        ),
      }
    }
    return { valid: true }
  }
  if (typeof data !== 'object') {
    return { valid: true }
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const result = validateNoScriptTags(data[i], [...path, String(i)])
      if (!result.valid) {
        return result
      }
    }
    return { valid: true }
  }
  for (const key of Object.keys(data)) {
    const result = validateNoScriptTags(data[key], [...path, key])
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}

function getUsedParams(template) {
  if (typeof template !== 'string') {
    return new Set()
  }
  const result = new Set()
  const pattern = new RegExp(PLACEHOLDER_PATTERN.source, 'g')
  let match
  while ((match = pattern.exec(template)) !== null) {
    result.add(match[1])
  }
  return result
}

export function collectAllPlaceholders(data, path = [], result = {}) {
  if (data === null || data === undefined) {
    return result
  }
  if (typeof data === 'string') {
    const params = getUsedParams(data)
    if (params.size > 0) {
      result[path.join('.')] = [...params]
    }
    return result
  }
  if (typeof data !== 'object') {
    return result
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      collectAllPlaceholders(data[i], [...path, String(i)], result)
    }
    return result
  }
  for (const key of Object.keys(data)) {
    collectAllPlaceholders(data[key], [...path, key], result)
  }
  return result
}

export function validateAllStrings(data) {
  if (data === null || data === undefined) {
    return { valid: true }
  }
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return { valid: true }
  }
  if (typeof data !== 'object') {
    return { valid: true }
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const result = validateAllStrings(data[i])
      if (!result.valid) {
        return result
      }
    }
    return { valid: true }
  }
  for (const key of Object.keys(data)) {
    const value = data[key]
    if (key === '__meta__' || key === 'version' || key === 'checksum' || key === 'namespace') {
      continue
    }
    const result = validateAllStrings(value)
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}

export function validateTranslationSchema(bundle) {
  if (bundle === null || bundle === undefined || typeof bundle !== 'object') {
    return {
      valid: false,
      error: createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '语言包必须是对象'),
    }
  }
  if (Array.isArray(bundle)) {
    return {
      valid: false,
      error: createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '语言包不能是数组'),
    }
  }
  let result
  result = validateNoCircularReferences(bundle)
  if (!result.valid) {
    return result
  }
  result = validateNoEmptyKeys(bundle)
  if (!result.valid) {
    return result
  }
  result = validateNoScriptTags(bundle)
  if (!result.valid) {
    return result
  }
  result = validateAllStrings(bundle)
  if (!result.valid) {
    return result
  }
  return { valid: true }
}

export function simpleChecksum(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort())
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

export function validateChecksum(bundle, expectedChecksum) {
  if (!expectedChecksum) {
    return { valid: true }
  }
  const actual = simpleChecksum(bundle)
  if (actual !== expectedChecksum) {
    return {
      valid: false,
      error: createError(
        ERROR_CODES.CHECKSUM_MISMATCH,
        `期望 ${expectedChecksum}, 实际 ${actual}`
      ),
    }
  }
  return { valid: true }
}

export function validateVersion(existingVersion, incomingVersion) {
  if (!incomingVersion) {
    return { valid: true }
  }
  if (existingVersion && incomingVersion && incomingVersion < existingVersion) {
    return {
      valid: false,
      error: createError(
        ERROR_CODES.VERSION_CONFLICT,
        `版本冲突: 已加载 ${existingVersion}, 收到 ${incomingVersion}`
      ),
    }
  }
  return { valid: true }
}

export function validatePatch(existingMeta, patchBundle, options = {}) {
  const { requireChecksum = false, requireVersion = false } = options
  const schemaResult = validateTranslationSchema(patchBundle)
  if (!schemaResult.valid) {
    return schemaResult
  }
  const patchMeta = patchBundle.__meta__ || {}
  const expectedChecksum = patchMeta.checksum || patchBundle.checksum
  const incomingVersion = patchMeta.version || patchBundle.version
  if (requireChecksum && !expectedChecksum) {
    return {
      valid: false,
      error: createError(ERROR_CODES.CHECKSUM_MISMATCH, '热补丁需要校验和'),
    }
  }
  if (expectedChecksum) {
    const checkResult = validateChecksum(
      { ...patchBundle, __meta__: undefined, checksum: undefined, version: undefined },
      expectedChecksum
    )
    if (!checkResult.valid) {
      return checkResult
    }
  }
  if (requireVersion && !incomingVersion) {
    return {
      valid: false,
      error: createError(ERROR_CODES.VERSION_CONFLICT, '热补丁需要版本号'),
    }
  }
  const existingVersion = existingMeta && existingMeta.version
  if (existingVersion && incomingVersion) {
    const versionResult = validateVersion(existingVersion, incomingVersion)
    if (!versionResult.valid) {
      return versionResult
    }
  }
  return { valid: true, newVersion: incomingVersion || existingVersion }
}
