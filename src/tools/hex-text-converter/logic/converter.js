import {
  ERROR_CODES,
  createError,
  isHexChar,
} from './errors.js'

const MAX_INPUT_SIZE = 1024 * 1024

const SEPARATOR_PATTERNS = {
  none: '',
  space: ' ',
  colon: ':',
}

function normalizeSeparator(separator) {
  if (separator == null) return ''
  if (typeof separator !== 'string') return ''
  if (separator === '' || separator === 'none') return ''
  if (separator === ' ' || separator === 'space') return ' '
  if (separator === ':' || separator === 'colon') return ':'
  return separator
}

function sanitizeHexInput(input, separator = '') {
  let clean = input
  if (separator === ' ') {
    clean = clean.replace(/[ \t\n\r]+/g, '')
  } else if (separator === ':') {
    clean = clean.replace(/[:]+/g, '')
  }
  clean = clean.trim()
  return clean
}

function findInvalidHexChars(input, separator = '') {
  const clean = sanitizeHexInput(input, separator)
  const invalid = []
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (!isHexChar(char)) {
      invalid.push({
        char,
        position: i,
        displayPosition: i + 1,
      })
    }
  }
  return invalid
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0, j = 0; i < hex.length; i += 2, j++) {
    bytes[j] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes, separator = '', upperCase = false) {
  const hexChars = []
  for (let i = 0; i < bytes.length; i++) {
    let hex = bytes[i].toString(16).padStart(2, '0')
    if (upperCase) {
      hex = hex.toUpperCase()
    }
    hexChars.push(hex)
  }
  
  const sep = normalizeSeparator(separator)
  if (sep === '') {
    return hexChars.join('')
  }
  
  const result = []
  for (let i = 0; i < hexChars.length; i++) {
    if (i > 0) {
      result.push(sep)
    }
    result.push(hexChars[i])
  }
  return result.join('')
}

function bytesToUtf8(bytes, mode = 'strict') {
  if (mode === 'replace') {
    try {
      return new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(bytes)
    } catch (e) {
      return ''
    }
  }
  
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch (e) {
    return null
  }
}

function bytesToLatin1(bytes) {
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i])
  }
  return result
}

function textToBytes(text, encoding = 'utf-8') {
  if (encoding === 'latin1') {
    const bytes = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i) & 0xFF
    }
    return bytes
  }
  
  return new TextEncoder().encode(text)
}

function validateHexInput(input, separator = '') {
  if (input == null) {
    return { valid: false, ...createError(ERROR_CODES.NULL_INPUT) }
  }
  
  const clean = sanitizeHexInput(input, separator)
  
  if (clean === '') {
    return { valid: false, ...createError(ERROR_CODES.EMPTY_VALUE) }
  }
  
  if (clean.length > MAX_INPUT_SIZE) {
    return { valid: false, ...createError(ERROR_CODES.INPUT_TOO_LARGE) }
  }
  
  const invalidChars = findInvalidHexChars(input, separator)
  if (invalidChars.length > 0) {
    return {
      valid: false,
      ...createError(
        ERROR_CODES.INVALID_HEX_CHAR,
        `在位置 ${invalidChars[0].displayPosition} 发现非法字符 '${invalidChars[0].char}'`,
        { invalidChars }
      ),
    }
  }
  
  if (clean.length % 2 !== 0) {
    return {
      valid: false,
      ...createError(ERROR_CODES.ODD_LENGTH, `十六进制串长度为 ${clean.length}（奇数）`),
    }
  }
  
  return { valid: true, clean }
}

function validateTextInput(input) {
  if (input == null) {
    return { valid: false, ...createError(ERROR_CODES.NULL_INPUT) }
  }
  
  const str = String(input)
  
  if (new Blob([str]).size > MAX_INPUT_SIZE) {
    return { valid: false, ...createError(ERROR_CODES.INPUT_TOO_LARGE) }
  }
  
  return { valid: true }
}

function hexToText(params) {
  const {
    hex,
    separator = '',
    utf8Mode = 'strict',
    showLatin1 = false,
  } = params
  
  const validation = validateHexInput(hex, separator)
  if (!validation.valid) {
    return {
      success: false,
      text: null,
      bytes: null,
      latin1View: null,
      byteCount: 0,
      hexLength: 0,
      ...validation,
    }
  }
  
  const cleanHex = validation.clean
  const bytes = hexToBytes(cleanHex)
  
  let text = null
  let utf8Error = null
  
  if (utf8Mode === 'replace') {
    text = bytesToUtf8(bytes, 'replace')
  } else {
    text = bytesToUtf8(bytes, 'strict')
    if (text === null) {
      utf8Error = createError(ERROR_CODES.INVALID_UTF8)
      text = bytesToUtf8(bytes, 'replace')
    }
  }
  
  let latin1View = null
  if (showLatin1) {
    latin1View = bytesToLatin1(bytes)
  }
  
  return {
    success: true,
    text,
    bytes,
    latin1View,
    byteCount: bytes.length,
    hexLength: cleanHex.length,
    errorCode: utf8Error ? utf8Error.errorCode : null,
    errorMessage: utf8Error ? utf8Error.errorMessage : null,
    hadUtf8Error: !!utf8Error,
  }
}

function textToHex(params) {
  const {
    text,
    separator = '',
    upperCase = false,
    encoding = 'utf-8',
  } = params
  
  const validation = validateTextInput(text)
  if (!validation.valid) {
    return {
      success: false,
      hex: null,
      bytes: null,
      byteCount: 0,
      charCount: 0,
      ...validation,
    }
  }
  
  const str = String(text || '')
  const bytes = textToBytes(str, encoding)
  const hex = bytesToHex(bytes, separator, upperCase)
  
  return {
    success: true,
    hex,
    bytes,
    byteCount: bytes.length,
    charCount: str.length,
    errorCode: null,
    errorMessage: null,
  }
}

function getHexStats(hex, separator = '') {
  const clean = sanitizeHexInput(hex, separator)
  const invalidChars = findInvalidHexChars(hex, separator)
  return {
    rawLength: hex.length,
    cleanLength: clean.length,
    byteCount: clean.length / 2,
    invalidCharCount: invalidChars.length,
    hasInvalidChars: invalidChars.length > 0,
    isOddLength: clean.length % 2 !== 0,
  }
}

function getTextStats(text) {
  if (text == null) {
    return { charCount: 0, byteCount: 0 }
  }
  const str = String(text)
  const bytes = new TextEncoder().encode(str)
  return {
    charCount: str.length,
    byteCount: bytes.length,
  }
}

export {
  MAX_INPUT_SIZE,
  SEPARATOR_PATTERNS,
  normalizeSeparator,
  sanitizeHexInput,
  findInvalidHexChars,
  hexToBytes,
  bytesToHex,
  bytesToUtf8,
  bytesToLatin1,
  textToBytes,
  validateHexInput,
  validateTextInput,
  hexToText,
  textToHex,
  getHexStats,
  getTextStats,
}
