import { ERROR_CODES, createError } from './errors.js'
import {
  isInBMP,
  parseInputWithEscapes,
  codePointToUtf16Units,
  codePointToUtf8Bytes,
  formatCodePoint,
  bytesToHexString,
  codeUnitsToHexString,
  isValidCodePoint,
} from './parser.js'
import {
  calculateStatistics,
} from './statistics.js'
import {
  getUnicodeProperties,
  loadUnicodeProperties,
} from './unicodeData.js'

const MAX_INPUT_LENGTH = 10000
const LARGE_INPUT_THRESHOLD = 1000

function normalizeParams(params) {
  return {
    sourceText: params.sourceText ?? '',
    searchQuery: params.searchQuery ?? '',
    iterationIndex: params.iterationIndex ?? 0,
    preferHexBytes: params.preferHexBytes !== false,
  }
}

function buildScalar(codePoint, index, preferHexBytes) {
  const properties = getUnicodeProperties(codePoint)
  const utf8Bytes = codePointToUtf8Bytes(codePoint)
  const utf16Units = codePointToUtf16Units(codePoint)
  
  return {
    index,
    codePoint,
    codePointHex: formatCodePoint(codePoint),
    glyph: properties.glyph,
    glyphVisible: properties.glyph && properties.glyph.length > 0,
    name: properties.name,
    category: properties.category,
    block: properties.block,
    bidiClass: properties.bidiClass,
    combiningClass: properties.combiningClass,
    isInBMP: isInBMP(codePoint),
    isSurrogate: properties.category === 'Cs',
    utf8Bytes,
    utf8Hex: preferHexBytes ? bytesToHexString(utf8Bytes, true) : utf8Bytes.join(', '),
    utf8ByteCount: utf8Bytes.length,
    utf16Units,
    utf16Hex: preferHexBytes ? codeUnitsToHexString(utf16Units, true) : utf16Units.join(', '),
    utf16UnitCount: utf16Units.length,
    isPropertiesLoaded: properties.isLoaded,
  }
}

function findMatches(scalars, searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') {
    return { matches: [], matchCount: 0 }
  }
  
  const query = searchQuery.trim().toLowerCase()
  const originalQuery = searchQuery.trim()
  
  const exactGlyphMatches = []
  const partialMatches = []
  
  scalars.forEach((scalar, index) => {
    if (scalar.glyph && scalar.glyph === originalQuery) {
      exactGlyphMatches.push(index)
      return
    }
    
    let isPartialMatch = false
    
    if (scalar.codePointHex.toLowerCase().includes(query)) {
      isPartialMatch = true
    }
    
    if (String(scalar.codePoint).includes(query)) {
      isPartialMatch = true
    }
    
    if (scalar.name && scalar.name.toLowerCase().includes(query)) {
      isPartialMatch = true
    }
    
    if (scalar.block && scalar.block.toLowerCase().includes(query)) {
      isPartialMatch = true
    }
    
    if (scalar.category && scalar.category.toLowerCase().includes(query)) {
      isPartialMatch = true
    }
    
    if (isPartialMatch) {
      partialMatches.push(index)
    }
  })
  
  const matches = exactGlyphMatches.length > 0 ? exactGlyphMatches : partialMatches
  
  return {
    matches,
    matchCount: matches.length,
    isExactMatch: exactGlyphMatches.length > 0,
  }
}

function processText(params) {
  if (params.sourceText == null) {
    return {
      scalars: [],
      statistics: null,
      hydrationWarnings: [],
      errorCode: ERROR_CODES.NULL_INPUT,
      errorMessage: createError(ERROR_CODES.NULL_INPUT).errorMessage,
      matches: [],
      matchCount: 0,
    }
  }
  
  const normalized = normalizeParams(params)
  const { sourceText, searchQuery, preferHexBytes } = normalized
  
  const sourceStr = String(sourceText)
  
  if (sourceStr.length === 0) {
    return {
      scalars: [],
      statistics: null,
      hydrationWarnings: [],
      errorCode: null,
      errorMessage: null,
      matches: [],
      matchCount: 0,
    }
  }
  
  if (sourceStr.length > MAX_INPUT_LENGTH) {
    return {
      scalars: [],
      statistics: null,
      hydrationWarnings: [`输入过长，已截断到 ${MAX_INPUT_LENGTH} 个字符`],
      errorCode: null,
      errorMessage: null,
    }
  }
  
  const parseResult = parseInputWithEscapes(sourceStr)
  
  if (parseResult.error) {
    return {
      scalars: [],
      statistics: null,
      hydrationWarnings: parseResult.warnings || [],
      errorCode: parseResult.error.errorCode,
      errorMessage: parseResult.error.errorMessage,
    }
  }
  
  const { codePoints, warnings } = parseResult
  
  const scalars = codePoints.map((codePoint, index) => {
    return buildScalar(codePoint, index, preferHexBytes)
  })
  
  const statistics = calculateStatistics(scalars, codePoints)
  
  const { matches, matchCount } = findMatches(scalars, searchQuery)
  
  const hydrationWarnings = [...(warnings || [])]
  if (scalars.some(s => !s.isPropertiesLoaded)) {
    hydrationWarnings.push('部分字符属性信息未完全加载，使用推断数据')
  }
  
  return {
    scalars,
    statistics,
    hydrationWarnings,
    errorCode: null,
    errorMessage: null,
    matches,
    matchCount,
    codePointCount: codePoints.length,
    isLargeInput: codePoints.length > LARGE_INPUT_THRESHOLD,
  }
}

function parseSingleCodePoint(input) {
  if (input == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }
  
  const str = String(input).trim()
  
  if (str.startsWith('U+') || str.startsWith('u+')) {
    const hexStr = str.slice(2)
    if (/^[0-9A-Fa-f]{1,8}$/.test(hexStr)) {
      const codePoint = parseInt(hexStr, 16)
      if (!isValidCodePoint(codePoint)) {
        return { error: createError(ERROR_CODES.OUT_OF_RANGE_CODE_POINT) }
      }
      return { codePoint }
    }
  }
  
  if (str.startsWith('0x') || str.startsWith('0X')) {
    const hexStr = str.slice(2)
    if (/^[0-9A-Fa-f]+$/.test(hexStr)) {
      const codePoint = parseInt(hexStr, 16)
      if (!isValidCodePoint(codePoint)) {
        return { error: createError(ERROR_CODES.OUT_OF_RANGE_CODE_POINT) }
      }
      return { codePoint }
    }
  }
  
  if (/^[0-9]+$/.test(str)) {
    const codePoint = parseInt(str, 10)
    if (!isValidCodePoint(codePoint)) {
      return { error: createError(ERROR_CODES.OUT_OF_RANGE_CODE_POINT) }
    }
    return { codePoint }
  }
  
  if (str.length > 0) {
    const firstChar = str[0]
    const codePoint = firstChar.codePointAt(0)
    if (codePoint !== undefined) {
      return { codePoint }
    }
  }
  
  return { error: createError(ERROR_CODES.INVALID_ESCAPE, '无法解析码点') }
}

export {
  MAX_INPUT_LENGTH,
  LARGE_INPUT_THRESHOLD,
  normalizeParams,
  buildScalar,
  findMatches,
  processText,
  parseSingleCodePoint,
}
