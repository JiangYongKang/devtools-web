import { encode as punyEncode, decode as punyDecode } from './punycode.js'
import { ERROR_CODES, createError } from './errors.js'
import {
  PUNYCODE_PREFIX,
  MAX_LABEL_LENGTH,
  MAX_DOMAIN_LENGTH,
  BIDI_CONTROL_CHARS,
  INVISIBLE_CHARS,
  XN_CASE_OPTIONS,
} from './constants.js'

const PUNYCODE_PREFIX_REGEX = /^xn--/i

function isAscii(codePoint) {
  return codePoint < 0x80
}

function hasNonAscii(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 0x80) return true
  }
  return false
}

function isAceLabel(label) {
  return PUNYCODE_PREFIX_REGEX.test(label)
}

function isAsciiLabel(label) {
  return !hasNonAscii(label)
}

function stripUrlPrefix(input) {
  if (!input) return input
  
  let result = String(input).trim()
  
  const protocolMatch = result.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)
  if (protocolMatch) {
    result = result.slice(protocolMatch[0].length)
  }
  
  const slashIndex = result.search(/[/?#]/)
  if (slashIndex >= 0) {
    result = result.slice(0, slashIndex)
  }
  
  const atIndex = result.lastIndexOf('@')
  if (atIndex >= 0) {
    result = result.slice(atIndex + 1)
  }
  
  const lastColonIndex = result.lastIndexOf(':')
  const firstBracketIndex = result.indexOf('[')
  const lastBracketIndex = result.indexOf(']')
  
  if (lastColonIndex >= 0) {
    if (firstBracketIndex === -1 || lastColonIndex > lastBracketIndex) {
      result = result.slice(0, lastColonIndex)
    }
  }
  
  return result
}

function toAsciiLabel(label, xnCaseOption = XN_CASE_OPTIONS.LOWER) {
  if (!label) return label
  
  const lowerLabel = label.toLowerCase()
  
  if (!hasNonAscii(lowerLabel)) {
    return lowerLabel
  }
  
  try {
    const encoded = punyEncode(lowerLabel)
    const prefix = xnCaseOption === XN_CASE_OPTIONS.UPPER ? 'XN--' : PUNYCODE_PREFIX
    return prefix + encoded
  } catch (e) {
    throw createError(ERROR_CODES.PUNYCODE_ENCODE_ERROR, e.message)
  }
}

function toUnicodeLabel(label) {
  if (!label) return label
  
  const lowerLabel = label.toLowerCase()
  
  if (!isAceLabel(lowerLabel)) {
    return lowerLabel
  }
  
  try {
    const encoded = lowerLabel.slice(4)
    return punyDecode(encoded)
  } catch (e) {
    throw createError(ERROR_CODES.PUNYCODE_DECODE_ERROR, e.message)
  }
}

function getCodePointList(str) {
  const codePoints = []
  for (let i = 0; i < str.length; i++) {
    const cp = str.codePointAt(i)
    codePoints.push(cp)
    if (cp > 0xFFFF) i++
  }
  return codePoints
}

function formatCodePoint(cp, useHex = true, useUPrefix = true) {
  if (useHex) {
    const hex = cp.toString(16).toUpperCase()
    const padded = hex.padStart(4, '0')
    return useUPrefix ? `U+${padded}` : `0x${padded}`
  }
  return String(cp)
}

function detectBidiControlChars(codePoints) {
  const bidiChars = new Set(BIDI_CONTROL_CHARS)
  const found = []
  
  for (let i = 0; i < codePoints.length; i++) {
    const cp = codePoints[i]
    if (bidiChars.has(cp)) {
      found.push({
        index: i,
        codePoint: cp,
        codePointHex: formatCodePoint(cp),
      })
    }
  }
  
  return found
}

function detectInvisibleChars(codePoints) {
  const invisChars = new Set(INVISIBLE_CHARS)
  const found = []
  
  for (let i = 0; i < codePoints.length; i++) {
    const cp = codePoints[i]
    if (invisChars.has(cp)) {
      found.push({
        index: i,
        codePoint: cp,
        codePointHex: formatCodePoint(cp),
      })
    }
  }
  
  return found
}

function getScriptForCodePoint(cp) {
  if (cp >= 0x4E00 && cp <= 0x9FFF) return 'Han'
  if (cp >= 0x3400 && cp <= 0x4DBF) return 'Han'
  if (cp >= 0x20000 && cp <= 0x2A6DF) return 'Han'
  
  if (cp >= 0x0600 && cp <= 0x06FF) return 'Arabic'
  if (cp >= 0x0750 && cp <= 0x077F) return 'Arabic'
  
  if (cp >= 0x0590 && cp <= 0x05FF) return 'Hebrew'
  
  if (cp >= 0x3040 && cp <= 0x309F) return 'Hiragana'
  if (cp >= 0x30A0 && cp <= 0x30FF) return 'Katakana'
  
  if (cp >= 0xAC00 && cp <= 0xD7AF) return 'Hangul'
  
  if (cp >= 0x0400 && cp <= 0x04FF) return 'Cyrillic'
  if (cp >= 0x0500 && cp <= 0x052F) return 'Cyrillic'
  
  if (cp >= 0x0370 && cp <= 0x03FF) return 'Greek'
  if (cp >= 0x1F00 && cp <= 0x1FFF) return 'Greek'
  
  if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A)) return 'Latin'
  
  if (cp >= 0x00C0 && cp <= 0x00D6) return 'Latin'
  if (cp >= 0x00D8 && cp <= 0x00F6) return 'Latin'
  if (cp >= 0x00F8 && cp <= 0x024F) return 'Latin'
  
  if (cp >= 0x30 && cp <= 0x39) return 'Digit'
  
  return 'Other'
}

function detectMixedScript(label) {
  const codePoints = getCodePointList(label)
  const scripts = new Set()
  const scriptDetails = []
  
  for (let i = 0; i < codePoints.length; i++) {
    const cp = codePoints[i]
    const script = getScriptForCodePoint(cp)
    
    if (script !== 'Other' && script !== 'Digit') {
      if (!scripts.has(script)) {
        scripts.add(script)
        scriptDetails.push({
          script,
          sampleChar: String.fromCodePoint(cp),
          codePoint: cp,
          codePointHex: formatCodePoint(cp),
        })
      }
    }
  }
  
  const isMixed = scripts.size > 1
  const warnings = []
  
  if (isMixed) {
    warnings.push({
      type: 'MIXED_SCRIPT',
      message: `标签包含多脚本字符：${Array.from(scripts).join(', ')}`,
      scripts: scriptDetails,
    })
  }
  
  return {
    isMixed,
    scripts: scriptDetails,
    warnings,
  }
}

function validateDomainFormat(domain) {
  const errors = []
  const labels = domain.split('.')
  
  if (domain.startsWith('.')) {
    errors.push(createError(ERROR_CODES.LEADING_DOT))
  }
  
  if (domain.endsWith('.') && domain.length > 1) {
    errors.push(createError(ERROR_CODES.TRAILING_DOT))
  }
  
  if (domain.includes('..')) {
    errors.push(createError(ERROR_CODES.CONSECUTIVE_DOTS))
  }
  
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    
    if (label.length === 0 && i !== labels.length - 1) {
      errors.push(createError(ERROR_CODES.EMPTY_LABEL, `第 ${i + 1} 个标签为空`))
      continue
    }
    
    if (label.length > MAX_LABEL_LENGTH) {
      errors.push(createError(ERROR_CODES.LABEL_TOO_LONG, `第 ${i + 1} 个标签长度 ${label.length} > 63`))
    }
    
    if (label.startsWith('-')) {
      errors.push(createError(ERROR_CODES.HYPHEN_AT_EDGE, `第 ${i + 1} 个标签以连字符开头`))
    }
    
    if (label.endsWith('-')) {
      errors.push(createError(ERROR_CODES.HYPHEN_AT_EDGE, `第 ${i + 1} 个标签以连字符结尾`))
    }
    
    if (/^-+$/.test(label)) {
      errors.push(createError(ERROR_CODES.ALL_HYPHENS, `第 ${i + 1} 个标签全部为连字符`))
    }
    
    for (let j = 0; j < label.length; j++) {
      const cp = label.charCodeAt(j)
      if (cp < 0x20) {
        errors.push(createError(ERROR_CODES.INVALID_CHAR, `第 ${i + 1} 个标签包含控制字符 (0x${cp.toString(16)})`))
      }
      
      if (cp >= 0x20 && cp < 0x80) {
        const isLetter = (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)
        const isDigit = cp >= 48 && cp <= 57
        const isHyphen = cp === 45
        
        if (!isLetter && !isDigit && !isHyphen) {
          errors.push(createError(ERROR_CODES.INVALID_CHAR, `第 ${i + 1} 个标签包含非法字符 "${String.fromCharCode(cp)}" (0x${cp.toString(16)})`))
        }
      }
    }
  }
  
  const asciiDomain = domain.replace(/[\u0080-\uFFFF]/g, 'a')
  if (asciiDomain.length > MAX_DOMAIN_LENGTH) {
    errors.push(createError(ERROR_CODES.DOMAIN_TOO_LONG, `域名总长度 ${asciiDomain.length} > 253`))
  }
  
  return errors
}

function analyzeLabel(label, index) {
  const codePoints = getCodePointList(label)
  const bidiChars = detectBidiControlChars(codePoints)
  const invisibleChars = detectInvisibleChars(codePoints)
  const mixedScript = detectMixedScript(label)
  
  const hasNonAsciiChars = codePoints.some(cp => cp >= 0x80)
  const isAce = isAceLabel(label)
  
  const warnings = []
  if (bidiChars.length > 0) {
    warnings.push({
      type: 'BIDI_CONTROL',
      message: `检测到 ${bidiChars.length} 个 Bidi 控制字符`,
      chars: bidiChars,
    })
  }
  if (invisibleChars.length > 0) {
    warnings.push({
      type: 'INVISIBLE',
      message: `检测到 ${invisibleChars.length} 个不可见字符`,
      chars: invisibleChars,
    })
  }
  warnings.push(...mixedScript.warnings)
  
  return {
    index,
    original: label,
    codePoints,
    codePointList: codePoints.map(cp => ({
      codePoint: cp,
      hex: formatCodePoint(cp),
      decimal: cp,
      isNonAscii: cp >= 0x80,
      isInvisible: INVISIBLE_CHARS.includes(cp),
      isBidiControl: BIDI_CONTROL_CHARS.includes(cp),
    })),
    isAscii: !hasNonAsciiChars,
    isAce,
    bidiChars,
    invisibleChars,
    mixedScript: mixedScript.isMixed,
    scripts: mixedScript.scripts,
    warnings,
  }
}

function convertDomain(domain, options = {}) {
  const {
    outputMode = 'AUTO',
    xnCaseOption = XN_CASE_OPTIONS.LOWER,
    caseFold = true,
  } = options
  
  const result = {
    original: domain,
    input: domain,
    uLabel: null,
    aLabel: null,
    labels: [],
    errors: [],
    warnings: [],
    isValid: true,
  }
  
  const formatErrors = validateDomainFormat(domain)
  if (formatErrors.length > 0) {
    result.errors = formatErrors
    result.isValid = false
  }
  
  const labels = domain.split('.')
  const convertedLabels = []
  let hasError = false
  
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    const labelAnalysis = analyzeLabel(label, i)
    result.labels.push(labelAnalysis)
    result.warnings.push(...labelAnalysis.warnings)
    
    try {
      let uLabel = label
      let aLabel = label
      
      if (caseFold) {
        uLabel = uLabel.toLowerCase()
        aLabel = aLabel.toLowerCase()
      }
      
      if (isAceLabel(label)) {
        uLabel = toUnicodeLabel(label)
        aLabel = toAsciiLabel(uLabel, xnCaseOption)
      } else if (hasNonAscii(label)) {
        aLabel = toAsciiLabel(label, xnCaseOption)
        uLabel = toUnicodeLabel(aLabel)
      } else {
        uLabel = caseFold ? label.toLowerCase() : label
        aLabel = caseFold ? label.toLowerCase() : label
      }
      
      convertedLabels.push({ uLabel, aLabel })
    } catch (e) {
      hasError = true
      result.errors.push(e)
      convertedLabels.push({ uLabel: label, aLabel: label, error: e })
    }
  }
  
  result.uLabel = convertedLabels.map(l => l.uLabel).join('.')
  result.aLabel = convertedLabels.map(l => l.aLabel).join('.')
  
  if (outputMode === 'TO_PUNYCODE') {
    result.output = result.aLabel
  } else if (outputMode === 'TO_UNICODE') {
    result.output = result.uLabel
  } else if (outputMode === 'DECODE_PUNYCODE_ONLY') {
    result.output = result.uLabel
  } else {
    if (hasNonAscii(domain)) {
      result.output = result.aLabel
    } else {
      result.output = result.uLabel
    }
  }
  
  if (outputMode === 'VALIDATE_ONLY') {
    result.output = domain
  }
  
  if (hasError) {
    result.isValid = false
  }
  
  return result
}

function compareWithBrowserUrl(domain) {
  const result = {
    available: false,
    comparable: false,
    browserResult: null,
    difference: null,
    reason: null,
  }
  
  try {
    const hasUrlCtor = typeof URL !== 'undefined'
    
    if (!hasUrlCtor) {
      result.reason = '当前浏览器不支持 URL API'
      return result
    }
    
    result.available = true
    
    try {
      const testUrl = new URL(`http://${domain}`)
      result.browserResult = testUrl.hostname
      result.comparable = true
    } catch (e) {
      result.reason = `URL 构造器解析失败: ${e.message}`
    }
  } catch (e) {
    result.reason = `API 检测异常: ${e.message}`
  }
  
  return result
}

function computeDiff(original, normalized) {
  const diff = []
  const maxLen = Math.max(original.length, normalized.length)
  
  for (let i = 0; i < maxLen; i++) {
    const origChar = i < original.length ? original[i] : null
    const normChar = i < normalized.length ? normalized[i] : null
    
    if (origChar === normChar) {
      diff.push({ type: 'same', original: origChar, normalized: normChar })
    } else if (origChar && !normChar) {
      diff.push({ type: 'removed', original: origChar, normalized: null })
    } else if (!origChar && normChar) {
      diff.push({ type: 'added', original: null, normalized: normChar })
    } else {
      diff.push({ type: 'changed', original: origChar, normalized: normChar })
    }
  }
  
  return diff
}

export {
  stripUrlPrefix,
  toAsciiLabel,
  toUnicodeLabel,
  isAscii,
  hasNonAscii,
  isAceLabel,
  isAsciiLabel,
  getCodePointList,
  formatCodePoint,
  detectBidiControlChars,
  detectInvisibleChars,
  getScriptForCodePoint,
  detectMixedScript,
  validateDomainFormat,
  analyzeLabel,
  convertDomain,
  compareWithBrowserUrl,
  computeDiff,
}
