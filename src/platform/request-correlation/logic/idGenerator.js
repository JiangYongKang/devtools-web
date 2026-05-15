import {
  ID_MODES,
  TRACE_VERSION,
} from './constants.js'
import {
  createError,
} from './errors.js'

const HEX_CHARS = '0123456789abcdef'

function hasCryptoRandomUUID() {
  try {
    return typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
  } catch {
    return false
  }
}

function hasCryptoGetRandomValues() {
  try {
    return typeof crypto !== 'undefined' &&
      typeof crypto.getRandomValues === 'function' &&
      typeof Uint8Array !== 'undefined'
  } catch {
    return false
  }
}

function generateRandomHex(length) {
  let result = ''

  if (hasCryptoGetRandomValues()) {
    const array = new Uint8Array(Math.ceil(length / 2))
    crypto.getRandomValues(array)
    for (let i = 0; i < array.length; i++) {
      result += HEX_CHARS[array[i] >>> 4]
      result += HEX_CHARS[array[i] & 0x0f]
    }
    return result.slice(0, length)
  }

  for (let i = 0; i < length; i++) {
    result += HEX_CHARS[Math.floor(Math.random() * 16)]
  }
  return result
}

function generateUUIDv4() {
  if (hasCryptoRandomUUID()) {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (hasCryptoGetRandomValues()) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function generate32BitHex() {
  return generateRandomHex(32)
}

function generateRequestId(mode = ID_MODES.UUID_V4) {
  if (mode === ID_MODES.HEX_32) {
    return generate32BitHex()
  }
  return generateUUIDv4()
}

function isValidUUIDv4(id) {
  if (typeof id !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

function isValid32Hex(id) {
  if (typeof id !== 'string') return false
  return /^[0-9a-f]{32}$/i.test(id)
}

function isValidRequestId(id) {
  return isValidUUIDv4(id) || isValid32Hex(id)
}

function normalizeRequestId(id) {
  if (typeof id !== 'string') {
    throw createError('INVALID_ID_FORMAT', 'Request ID 必须是字符串', { input: typeof id })
  }

  const trimmed = id.trim()

  if (isValidUUIDv4(trimmed)) {
    return trimmed.toLowerCase()
  }

  if (isValid32Hex(trimmed)) {
    return trimmed.toLowerCase()
  }

  const hexOnly = trimmed.replace(/[^0-9a-f]/gi, '').toLowerCase()

  if (hexOnly.length >= 32) {
    return hexOnly.slice(0, 32)
  }

  const padded = hexOnly.padEnd(32, '0')
  return padded
}

function generateTraceId() {
  return generateRandomHex(32)
}

function generateSpanId() {
  return generateRandomHex(16)
}

function isValidTraceId(id) {
  if (typeof id !== 'string') return false
  return /^[0-9a-f]{32}$/i.test(id)
}

function isValidSpanId(id) {
  if (typeof id !== 'string') return false
  return /^[0-9a-f]{16}$/i.test(id)
}

function parseTraceParent(traceParent) {
  if (typeof traceParent !== 'string') {
    return null
  }

  const parts = traceParent.trim().split('-')

  if (parts.length !== 4) {
    return null
  }

  const [version, traceId, parentSpanId, traceFlags] = parts

  if (!/^[0-9a-f]{2}$/i.test(version)) return null
  if (!isValidTraceId(traceId)) return null
  if (!isValidSpanId(parentSpanId)) return null
  if (!/^[0-9a-f]{2}$/i.test(traceFlags)) return null

  return {
    version: version.toLowerCase(),
    traceId: traceId.toLowerCase(),
    parentSpanId: parentSpanId.toLowerCase(),
    traceFlags: traceFlags.toLowerCase(),
    sampled: traceFlags.toLowerCase() === '01',
  }
}

function formatTraceParent({ traceId, spanId, traceFlags = '01', version = TRACE_VERSION }) {
  return `${version}-${traceId}-${spanId}-${traceFlags}`
}

function deriveSpanId(parentSpanId, salt = '') {
  if (!isValidSpanId(parentSpanId)) {
    throw createError('INVALID_ID_FORMAT', '父 span ID 格式无效', { parentSpanId })
  }

  let hash = 0
  const input = parentSpanId + salt + String(Date.now())

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  const derivedHex = Math.abs(hash).toString(16).padStart(16, '0').slice(-16)

  if (derivedHex === parentSpanId) {
    return generateSpanId()
  }

  return derivedHex
}

function detectSpanIdCollision(spanId, existingSpanIds = new Set()) {
  return existingSpanIds.has(spanId)
}

export {
  generateUUIDv4,
  generate32BitHex,
  generateRequestId,
  isValidUUIDv4,
  isValid32Hex,
  isValidRequestId,
  normalizeRequestId,
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  parseTraceParent,
  formatTraceParent,
  deriveSpanId,
  detectSpanIdCollision,
  hasCryptoRandomUUID,
  hasCryptoGetRandomValues,
}
