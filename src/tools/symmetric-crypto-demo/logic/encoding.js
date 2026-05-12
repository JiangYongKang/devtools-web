import { ERROR_CODES } from './errors.js'

function arrayBufferToBase64(buffer) {
  if (buffer == null) {
    throw new Error(ERROR_CODES.NULL_INPUT)
  }
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  if (base64 == null) {
    throw new Error(ERROR_CODES.NULL_INPUT)
  }
  if (typeof base64 !== 'string') {
    throw new Error(ERROR_CODES.INVALID_BASE64)
  }
  const trimmed = base64.trim()
  if (!trimmed) {
    throw new Error(ERROR_CODES.INVALID_BASE64)
  }
  const clean = trimmed.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/=]*$/.test(clean)) {
    throw new Error(ERROR_CODES.INVALID_BASE64)
  }
  try {
    const binaryString = atob(clean)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  } catch {
    throw new Error(ERROR_CODES.INVALID_BASE64)
  }
}

function isValidBase64(str) {
  if (str == null) return false
  if (typeof str !== 'string') return false
  const trimmed = str.trim()
  if (!trimmed) return false
  const clean = trimmed.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/=]*$/.test(clean)) return false
  if (clean.length % 4 !== 0) return false
  try {
    atob(clean)
    return true
  } catch {
    return false
  }
}

function arrayBufferToHex(buffer) {
  if (buffer == null) {
    throw new Error(ERROR_CODES.NULL_INPUT)
  }
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

function hexToArrayBuffer(hex) {
  if (hex == null) {
    throw new Error(ERROR_CODES.NULL_INPUT)
  }
  if (typeof hex !== 'string') {
    throw new Error(ERROR_CODES.INVALID_HEX)
  }
  const trimmed = hex.trim()
  if (!trimmed) {
    throw new Error(ERROR_CODES.INVALID_HEX)
  }
  const clean = trimmed.replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error(ERROR_CODES.INVALID_HEX)
  }
  if (clean.length % 2 !== 0) {
    throw new Error(ERROR_CODES.INVALID_HEX)
  }
  const len = clean.length / 2
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return bytes.buffer
}

function isValidHex(str) {
  if (str == null) return false
  if (typeof str !== 'string') return false
  const trimmed = str.trim()
  if (!trimmed) return false
  const clean = trimmed.replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]*$/.test(clean)) return false
  return clean.length % 2 === 0
}

function detectFormat(str) {
  if (str == null) return null
  if (typeof str !== 'string') return null
  const trimmed = str.trim()
  if (!trimmed) return null
  if (isValidHex(trimmed)) return 'hex'
  if (isValidBase64(trimmed)) return 'base64'
  return null
}

function encodeArrayBuffer(buffer, format = 'base64') {
  if (format === 'hex') {
    return arrayBufferToHex(buffer)
  }
  return arrayBufferToBase64(buffer)
}

function decodeToArrayBuffer(str, format = 'base64') {
  if (format === 'hex') {
    return hexToArrayBuffer(str)
  }
  return base64ToArrayBuffer(str)
}

export {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isValidBase64,
  arrayBufferToHex,
  hexToArrayBuffer,
  isValidHex,
  detectFormat,
  encodeArrayBuffer,
  decodeToArrayBuffer,
}
