import { ERROR_CODES, createError } from './errors.js'

const MAX_CODE_POINT = 0x10FFFF
const BMP_MAX = 0xFFFF
const LEAD_SURROGATE_MIN = 0xD800
const LEAD_SURROGATE_MAX = 0xDBFF
const TRAIL_SURROGATE_MIN = 0xDC00
const TRAIL_SURROGATE_MAX = 0xDFFF

function isValidCodePoint(codePoint) {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= MAX_CODE_POINT
}

function isInBMP(codePoint) {
  return codePoint <= BMP_MAX
}

function isSurrogate(codeUnit) {
  return codeUnit >= LEAD_SURROGATE_MIN && codeUnit <= TRAIL_SURROGATE_MAX
}

function isLeadSurrogate(codeUnit) {
  return codeUnit >= LEAD_SURROGATE_MIN && codeUnit <= LEAD_SURROGATE_MAX
}

function isTrailSurrogate(codeUnit) {
  return codeUnit >= TRAIL_SURROGATE_MIN && codeUnit <= TRAIL_SURROGATE_MAX
}

function decodeSurrogatePair(lead, trail) {
  if (!isLeadSurrogate(lead) || !isTrailSurrogate(trail)) {
    return null
  }
  return ((lead - LEAD_SURROGATE_MIN) << 10) + (trail - TRAIL_SURROGATE_MIN) + 0x10000
}

function parseUPlusNotation(input, startIndex) {
  const str = input.slice(startIndex)
  const match = str.match(/^[Uu]\+([0-9A-Fa-f]{1,8})\b/)
  if (!match) {
    return null
  }
  const hexStr = match[1]
  const codePoint = parseInt(hexStr, 16)
  
  if (!isValidCodePoint(codePoint)) {
    return { error: createError(ERROR_CODES.OUT_OF_RANGE_CODE_POINT) }
  }
  
  return {
    codePoint,
    length: match[0].length,
  }
}

function parseUEscape(input, startIndex) {
  if (startIndex + 2 > input.length) {
    return null
  }
  
  if (input[startIndex + 1] === 'u') {
    if (startIndex + 6 > input.length) {
      return { error: createError(ERROR_CODES.INVALID_ESCAPE, '\\u 转义需要 4 位十六进制数字') }
    }
    const hexStr = input.slice(startIndex + 2, startIndex + 6)
    if (!/^[0-9A-Fa-f]{4}$/.test(hexStr)) {
      return { error: createError(ERROR_CODES.INVALID_ESCAPE) }
    }
    const codePoint = parseInt(hexStr, 16)
    return {
      codePoint,
      length: 6,
    }
  }
  
  if (input[startIndex + 1] === 'U') {
    if (startIndex + 10 > input.length) {
      return { error: createError(ERROR_CODES.INVALID_ESCAPE, '\\U 转义需要 8 位十六进制数字') }
    }
    const hexStr = input.slice(startIndex + 2, startIndex + 10)
    if (!/^[0-9A-Fa-f]{8}$/.test(hexStr)) {
      return { error: createError(ERROR_CODES.INVALID_ESCAPE) }
    }
    const codePoint = parseInt(hexStr, 16)
    if (!isValidCodePoint(codePoint)) {
      return { error: createError(ERROR_CODES.OUT_OF_RANGE_CODE_POINT) }
    }
    return {
      codePoint,
      length: 10,
    }
  }
  
  return null
}

function parseEscapeSequence(input, startIndex) {
  if (input[startIndex] !== '\\') {
    return null
  }
  
  const uResult = parseUEscape(input, startIndex)
  if (uResult) {
    return uResult
  }
  
  const simpleEscapes = {
    '0': 0x0000,
    'a': 0x0007,
    'b': 0x0008,
    't': 0x0009,
    'n': 0x000A,
    'v': 0x000B,
    'f': 0x000C,
    'r': 0x000D,
    'e': 0x001B,
    '\\': 0x005C,
    '"': 0x0022,
    "'": 0x0027,
    '?': 0x003F,
  }
  
  const nextChar = input[startIndex + 1]
  if (nextChar in simpleEscapes) {
    return {
      codePoint: simpleEscapes[nextChar],
      length: 2,
    }
  }
  
  if (nextChar === 'x') {
    if (startIndex + 4 > input.length) {
      return { error: createError(ERROR_CODES.INVALID_ESCAPE, '\\x 转义需要 2 位十六进制数字') }
    }
    const hexStr = input.slice(startIndex + 2, startIndex + 4)
    if (!/^[0-9A-Fa-f]{2}$/.test(hexStr)) {
      return { error: createError(ERROR_CODES.INVALID_ESCAPE) }
    }
    return {
      codePoint: parseInt(hexStr, 16),
      length: 4,
    }
  }
  
  if (/[0-7]/.test(nextChar)) {
    const octalMatch = input.slice(startIndex + 1).match(/^[0-7]{1,3}/)
    if (octalMatch) {
      const octalStr = octalMatch[0]
      const codePoint = parseInt(octalStr, 8)
      if (codePoint > 0xFF) {
        return { error: createError(ERROR_CODES.INVALID_ESCAPE, '八进制转义超出范围') }
      }
      return {
        codePoint,
        length: 1 + octalStr.length,
      }
    }
  }
  
  return { error: createError(ERROR_CODES.INVALID_ESCAPE, `未知的转义序列: \\${nextChar}`) }
}

function extractCodePointsFromString(input) {
  if (input == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }
  
  const str = String(input)
  const codePoints = []
  const warnings = []
  let i = 0
  
  while (i < str.length) {
    const codeUnit = str.charCodeAt(i)
    
    if (isLeadSurrogate(codeUnit)) {
      if (i + 1 < str.length) {
        const trail = str.charCodeAt(i + 1)
        if (isTrailSurrogate(trail)) {
          const codePoint = decodeSurrogatePair(codeUnit, trail)
          codePoints.push(codePoint)
          i += 2
          continue
        }
      }
      warnings.push(`孤立的高代理项: U+${codeUnit.toString(16).toUpperCase().padStart(4, '0')}`)
      codePoints.push(codeUnit)
      i += 1
      continue
    }
    
    if (isTrailSurrogate(codeUnit)) {
      warnings.push(`孤立的低代理项: U+${codeUnit.toString(16).toUpperCase().padStart(4, '0')}`)
    }
    
    codePoints.push(codeUnit)
    i += 1
  }
  
  return {
    codePoints,
    warnings,
  }
}

function parseInputWithEscapes(input) {
  if (input == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }
  
  const str = String(input)
  const codePoints = []
  const warnings = []
  const parsedSegments = []
  let i = 0
  
  while (i < str.length) {
    const uPlusResult = parseUPlusNotation(str, i)
    if (uPlusResult) {
      if (uPlusResult.error) {
        return { error: uPlusResult.error }
      }
      codePoints.push(uPlusResult.codePoint)
      parsedSegments.push({ type: 'uplus', value: str.slice(i, i + uPlusResult.length), codePoint: uPlusResult.codePoint })
      i += uPlusResult.length
      continue
    }
    
    if (str[i] === '\\') {
      const escapeResult = parseEscapeSequence(str, i)
      if (escapeResult) {
        if (escapeResult.error) {
          return { error: escapeResult.error }
        }
        codePoints.push(escapeResult.codePoint)
        parsedSegments.push({ type: 'escape', value: str.slice(i, i + escapeResult.length), codePoint: escapeResult.codePoint })
        i += escapeResult.length
        continue
      }
    }
    
    const char = str[i]
    const codeUnit = char.charCodeAt(0)
    
    if (isLeadSurrogate(codeUnit)) {
      if (i + 1 < str.length) {
        const trail = str.charCodeAt(i + 1)
        if (isTrailSurrogate(trail)) {
          const codePoint = decodeSurrogatePair(codeUnit, trail)
          codePoints.push(codePoint)
          parsedSegments.push({ type: 'emoji', value: str.slice(i, i + 2), codePoint })
          i += 2
          continue
        }
      }
      warnings.push(`孤立的高代理项: U+${codeUnit.toString(16).toUpperCase().padStart(4, '0')}`)
    }
    
    codePoints.push(codeUnit)
    parsedSegments.push({ type: 'char', value: char, codePoint: codeUnit })
    i += 1
  }
  
  return {
    codePoints,
    warnings,
    parsedSegments,
  }
}

function codePointToUtf16Units(codePoint) {
  if (codePoint <= BMP_MAX) {
    return [codePoint]
  }
  const lead = LEAD_SURROGATE_MIN + ((codePoint - 0x10000) >> 10)
  const trail = TRAIL_SURROGATE_MIN + ((codePoint - 0x10000) & 0x3FF)
  return [lead, trail]
}

function codePointToUtf8Bytes(codePoint) {
  if (codePoint <= 0x7F) {
    return [codePoint]
  }
  if (codePoint <= 0x7FF) {
    return [
      0xC0 | (codePoint >> 6),
      0x80 | (codePoint & 0x3F),
    ]
  }
  if (codePoint <= 0xFFFF) {
    return [
      0xE0 | (codePoint >> 12),
      0x80 | ((codePoint >> 6) & 0x3F),
      0x80 | (codePoint & 0x3F),
    ]
  }
  return [
    0xF0 | (codePoint >> 18),
    0x80 | ((codePoint >> 12) & 0x3F),
    0x80 | ((codePoint >> 6) & 0x3F),
    0x80 | (codePoint & 0x3F),
  ]
}

function formatCodePoint(codePoint) {
  return 'U+' + codePoint.toString(16).toUpperCase().padStart(codePoint > 0xFFFF ? 5 : 4, '0')
}

function bytesToHexString(bytes, uppercase = true) {
  return bytes.map(b => {
    const hex = b.toString(16)
    return (uppercase ? hex.toUpperCase() : hex).padStart(2, '0')
  }).join(' ')
}

function codeUnitsToHexString(units, uppercase = true) {
  return units.map(u => {
    const hex = u.toString(16)
    return (uppercase ? hex.toUpperCase() : hex).padStart(4, '0')
  }).join(' ')
}

export {
  MAX_CODE_POINT,
  BMP_MAX,
  LEAD_SURROGATE_MIN,
  LEAD_SURROGATE_MAX,
  TRAIL_SURROGATE_MIN,
  TRAIL_SURROGATE_MAX,
  isValidCodePoint,
  isInBMP,
  isSurrogate,
  isLeadSurrogate,
  isTrailSurrogate,
  decodeSurrogatePair,
  parseUPlusNotation,
  parseUEscape,
  parseEscapeSequence,
  extractCodePointsFromString,
  parseInputWithEscapes,
  codePointToUtf16Units,
  codePointToUtf8Bytes,
  formatCodePoint,
  bytesToHexString,
  codeUnitsToHexString,
}
