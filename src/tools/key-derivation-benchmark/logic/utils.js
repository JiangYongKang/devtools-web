import { createError, ERROR_CODES } from './errors.js'

function generateSalt(byteLength = 16) {
  const salt = new Uint8Array(byteLength)
  crypto.getRandomValues(salt)
  return salt
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex) {
  if (typeof hex !== 'string') {
    return { error: createError(ERROR_CODES.INVALID_HEX) }
  }

  const cleanHex = hex.replace(/\s/g, '').toLowerCase()

  if (cleanHex.length % 2 !== 0) {
    return { error: createError(ERROR_CODES.INVALID_HEX, '十六进制字符串长度必须为偶数') }
  }

  if (!/^[0-9a-f]*$/.test(cleanHex)) {
    return { error: createError(ERROR_CODES.INVALID_HEX, '包含无效的十六进制字符') }
  }

  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16)
  }

  return { bytes }
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(base64) {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return { bytes }
  } catch {
    return { error: createError(ERROR_CODES.INVALID_BASE64) }
  }
}

function stringToBytes(str) {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

function bytesToString(bytes) {
  const decoder = new TextDecoder()
  return decoder.decode(bytes)
}

function isHexString(str) {
  if (typeof str !== 'string') return false
  const clean = str.replace(/\s/g, '')
  return clean.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(clean)
}

function parseSaltInput(input, byteLength = 16) {
  if (input == null || input === '') {
    return { salt: generateSalt(byteLength), isRandom: true }
  }

  if (isHexString(input)) {
    const result = hexToBytes(input)
    if (result.error) {
      return { salt: generateSalt(byteLength), isRandom: true, warning: '无效的十六进制，已生成随机盐值' }
    }
    return { salt: result.bytes, isRandom: false }
  }

  return { salt: stringToBytes(input), isRandom: false }
}

function measureTime(fn) {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  return {
    result,
    durationMs: end - start,
  }
}

async function measureTimeAsync(fn) {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return {
    result,
    durationMs: end - start,
  }
}

function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function benchmark(fn, iterations = 3) {
  const durations = []
  let lastResult = null

  for (let i = 0; i < iterations; i++) {
    const { result, durationMs } = await measureTimeAsync(fn)
    durations.push(durationMs)
    lastResult = result
  }

  return {
    result: lastResult,
    medianMs: median(durations),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    iterations,
    durations,
  }
}

function exportParamsToJson(params, algorithm, saltHex) {
  return JSON.stringify(
    {
      algorithm,
      ...params,
      salt: saltHex,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  )
}

export {
  generateSalt,
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  bytesToString,
  isHexString,
  parseSaltInput,
  measureTime,
  measureTimeAsync,
  median,
  benchmark,
  exportParamsToJson,
}
