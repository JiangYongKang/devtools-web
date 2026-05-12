import { TOKENIZATION_PROFILES, NEWLINE_MODES, NORMALIZE_FLAGS } from './constants.js'

const BOM = '\uFEFF'

function utf8ByteLength(str) {
  let len = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      len += 1
    } else if (code < 0x800) {
      len += 2
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = str.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        const codePoint = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        if (codePoint < 0x10000) {
          len += 3
        } else if (codePoint < 0x200000) {
          len += 4
        }
        i++
      } else {
        len += 3
      }
    } else {
      len += 3
    }
  }
  return len
}

function hasBOM(str) {
  return str.length > 0 && str[0] === BOM
}

function stripBOM(str) {
  if (hasBOM(str)) {
    return str.slice(1)
  }
  return str
}

function countCodePoints(str) {
  return Array.from(str).length
}

function countUtf16Units(str) {
  return str.length
}

function countGraphemes(str) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
    let count = 0
    for (const _ of segmenter.segment(str)) {
      count++
    }
    return count
  }
  return fallbackCountGraphemes(str)
}

function fallbackCountGraphemes(str) {
  let count = 0
  const codepoints = Array.from(str)
  for (let i = 0; i < codepoints.length; i++) {
    const cp = codepoints[i].codePointAt(0)
    if (isCombiningMark(cp) || isVariationSelector(cp) || isRegionalIndicator(cp) || isEmojiModifier(cp)) {
      continue
    }
    count++
  }
  return Math.max(count, str.length === 0 ? 0 : 1)
}

function isCombiningMark(cp) {
  return (cp >= 0x0300 && cp <= 0x036F) ||
         (cp >= 0x1AB0 && cp <= 0x1AFF) ||
         (cp >= 0x1DC0 && cp <= 0x1DFF) ||
         (cp >= 0x20D0 && cp <= 0x20FF) ||
         (cp >= 0xFE20 && cp <= 0xFE2F)
}

function isVariationSelector(cp) {
  return (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF)
}

function isRegionalIndicator(cp) {
  return cp >= 0x1F1E6 && cp <= 0x1F1FF
}

function isEmojiModifier(cp) {
  return cp >= 0x1F3FB && cp <= 0x1F3FF
}

function countLines(str, newlineMode = NEWLINE_MODES.AUTO) {
  if (str.length === 0) return { lineCount: 0, nonEmptyLines: 0 }
  let count = 1
  let nonEmpty = 0
  let isLineEmpty = true
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '\n') {
      count++
      if (!isLineEmpty) nonEmpty++
      isLineEmpty = true
    } else if (char === '\r') {
      if (newlineMode === NEWLINE_MODES.LF) continue
      count++
      if (str[i + 1] === '\n') i++
      if (!isLineEmpty) nonEmpty++
      isLineEmpty = true
    } else {
      if (!/^\s$/.test(char)) isLineEmpty = false
    }
  }
  if (!isLineEmpty) nonEmpty++
  return { lineCount: count, nonEmptyLines: nonEmpty }
}

function countTokens(str, profile = TOKENIZATION_PROFILES.WHITESPACE) {
  if (!str || str.length === 0) return 0
  switch (profile) {
    case TOKENIZATION_PROFILES.WHITESPACE:
      return str.trim().split(/\s+/).filter(t => t.length > 0).length
    case TOKENIZATION_PROFILES.ENGLISH:
      return str.match(/[A-Za-z0-9]+/g)?.length || 0
    case TOKENIZATION_PROFILES.CHINESE: {
      const chineseChars = (str.match(/[\u4e00-\u9fa5]/g) || []).length
      const otherWords = (str.match(/[A-Za-z0-9]+/g) || []).length
      return chineseChars + otherWords
    }
    case TOKENIZATION_PROFILES.MIXED: {
      const chineseChars = (str.match(/[\u4e00-\u9fa5]/g) || []).length
      const otherTokens = (str.match(/\S+/g) || []).filter(t => !/^[\u4e00-\u9fa5]+$/.test(t)).length
      return chineseChars + otherTokens
    }
    case TOKENIZATION_PROFILES.NONE:
    default:
      return 0
  }
}

function normalizeText(str, flags = {}) {
  let result = str
  if (flags[NORMALIZE_FLAGS.STRIP_CONTROL]) {
    const controlCharRegex = new RegExp('[\x00-\x08\x0E-\x1F\x7F]', 'g')
    result = result.replace(controlCharRegex, '')
  }
  if (flags[NORMALIZE_FLAGS.NORMALIZE_NFC]) {
    result = result.normalize('NFC')
  } else if (flags[NORMALIZE_FLAGS.NORMALIZE_NFD]) {
    result = result.normalize('NFD')
  }
  if (flags[NORMALIZE_FLAGS.TRIM]) {
    result = result.trim()
  }
  if (flags[NORMALIZE_FLAGS.TO_LOWER]) {
    result = result.toLowerCase()
  }
  if (flags[NORMALIZE_FLAGS.TO_UPPER]) {
    result = result.toUpperCase()
  }
  if (flags[NORMALIZE_FLAGS.COLLAPSE_SPACES]) {
    result = result.replace(/\s+/g, ' ').trim()
  }
  return result
}

function utf16IndexToCodePointIndex(str, utf16Index) {
  let codePointIdx = 0
  let utf16Idx = 0
  while (utf16Idx < utf16Index && utf16Idx < str.length) {
    const code = str.charCodeAt(utf16Idx)
    if (code >= 0xd800 && code <= 0xdbff && utf16Idx + 1 < str.length) {
      const next = str.charCodeAt(utf16Idx + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        utf16Idx += 2
        codePointIdx++
        continue
      }
    }
    utf16Idx++
    codePointIdx++
  }
  return codePointIdx
}

function utf16RangeToColumnRow(str, startUtf16, endUtf16) {
  const result = {
    start: { row: 1, column: 1 },
    end: { row: 1, column: 1 },
  }
  if (!str) return result
  let row = 1
  let col = 1
  for (let i = 0; i < str.length && i < endUtf16; i++) {
    if (i === startUtf16) {
      result.start = { row, column: col }
    }
    if (str[i] === '\n') {
      row++
      col = 1
    } else if (str[i] === '\r') {
      if (str[i + 1] === '\n') i++
      row++
      col = 1
    } else {
      col++
    }
  }
  result.end = { row, column: col }
  if (startUtf16 === str.length) {
    result.start = { row, column: col }
  }
  if (endUtf16 === str.length) {
    result.end = { row, column: col }
  }
  return result
}

export {
  utf8ByteLength,
  hasBOM,
  stripBOM,
  countCodePoints,
  countUtf16Units,
  countGraphemes,
  fallbackCountGraphemes,
  countLines,
  countTokens,
  normalizeText,
  utf16IndexToCodePointIndex,
  utf16RangeToColumnRow,
  BOM,
}
