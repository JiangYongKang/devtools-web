import {
    BIDI_CONTROL_CHARS,
    EXAMPLE_DOMAINS,
    IDNA_MODES,
    IDNA_MODE_LABELS,
    INVISIBLE_CHARS,
    MAX_DOMAIN_LENGTH,
    MAX_INPUT_LINES,
    MAX_LABEL_LENGTH,
    MIXED_SCRIPT_RULES,
    OUTPUT_MODES,
    OUTPUT_MODE_LABELS,
    PUNYCODE_PREFIX,
    STORAGE_KEY,
    THROTTLE_DELAY_MS,
    XN_CASE_OPTIONS,
    XN_CASE_OPTION_LABELS,
} from './constants.js'
import {
    analyzeLabel,
    compareWithBrowserUrl,
    computeDiff,
    convertDomain,
    detectBidiControlChars,
    detectInvisibleChars,
    detectMixedScript,
    formatCodePoint,
    getCodePointList,
    getScriptForCodePoint,
    hasNonAscii,
    isAceLabel,
    isAscii,
    isAsciiLabel,
    stripUrlPrefix,
    toAsciiLabel,
    toUnicodeLabel,
    validateDomainFormat,
} from './converter.js'
import { ERROR_CODES, ERROR_MESSAGES, createError, getErrorMessage } from './errors.js'
import { decode as punyDecode, encode as punyEncode } from './punycode.js'

function normalizeOptions(options = {}) {
  return {
    outputMode: options.outputMode || OUTPUT_MODES.AUTO,
    xnCaseOption: options.xnCaseOption || XN_CASE_OPTIONS.LOWER,
    idnaMode: options.idnaMode || IDNA_MODES.NONE,
    caseFold: options.caseFold !== false,
    stripUrlPrefix: options.stripUrlPrefix !== false,
    showCodepoints: options.showCodepoints !== false,
    showHexCodepoints: options.showHexCodepoints !== false,
    showUPrefix: options.showUPrefix !== false,
    showULabel: options.showULabel !== false,
    showALabel: options.showALabel !== false,
  }
}

function processSingleDomain(input, options = {}) {
  const normalizedOptions = normalizeOptions(options)
  
  let domain = input
  if (normalizedOptions.stripUrlPrefix) {
    domain = stripUrlPrefix(domain)
  }
  
  const result = convertDomain(domain, normalizedOptions)
  result.browserComparison = compareWithBrowserUrl(domain)
  result.diff = computeDiff(result.original, result.output)
  
  return result
}

function processBatch(input, options = {}) {
  const normalizedOptions = normalizeOptions(options)
  const lines = input.split('\n')
  const results = []
  let successCount = 0
  let errorCount = 0
  const truncated = lines.length > MAX_INPUT_LINES
  
  const processCount = Math.min(lines.length, MAX_INPUT_LINES)
  
  for (let i = 0; i < processCount; i++) {
    const rawLine = lines[i]
    const trimmedLine = rawLine.trim()
    
    if (trimmedLine.length === 0) {
      results.push({
        index: i,
        original: rawLine,
        input: '',
        output: '',
        uLabel: '',
        aLabel: '',
        labels: [],
        errors: [],
        warnings: [],
        isValid: true,
        isEmpty: true,
      })
      continue
    }
    
    const result = processSingleDomain(rawLine, normalizedOptions)
    result.index = i
    result.isEmpty = false
    results.push(result)
    
    if (result.isValid) {
      successCount++
    } else {
      errorCount++
    }
  }
  
  return {
    results,
    successCount,
    errorCount,
    totalCount: processCount,
    truncated,
    truncatedCount: truncated ? lines.length - MAX_INPUT_LINES : 0,
  }
}

function exportToTsv(batchResult) {
  if (!batchResult || !batchResult.results) return ''
  
  const headers = [
    '#',
    '原始输入',
    'U-label',
    'A-label',
    '输出',
    '错误码',
    '错误信息',
    '标签数',
    '是否有效',
  ]
  
  const rows = [headers.join('\t')]
  
  for (const item of batchResult.results) {
    const errorCode = item.errors && item.errors.length > 0 
      ? item.errors[0].errorCode 
      : ''
    const errorMessage = item.errors && item.errors.length > 0 
      ? item.errors[0].errorMessage 
      : ''
    
    const row = [
      String(item.index + 1),
      item.original || '',
      item.uLabel || '',
      item.aLabel || '',
      item.output || '',
      errorCode,
      errorMessage,
      String(item.labels ? item.labels.length : 0),
      item.isValid ? '是' : '否',
    ]
    
    rows.push(row.join('\t'))
  }
  
  return rows.join('\n')
}

function buildShareUrlParams(input, options) {
  const params = new URLSearchParams()
  
  if (input) {
    params.set('input', encodeURIComponent(input))
  }
  
  if (options.outputMode && options.outputMode !== OUTPUT_MODES.AUTO) {
    params.set('mode', options.outputMode)
  }
  
  if (options.xnCaseOption && options.xnCaseOption !== XN_CASE_OPTIONS.LOWER) {
    params.set('xncase', options.xnCaseOption)
  }
  
  if (options.caseFold === false) {
    params.set('casefold', '0')
  }
  
  if (options.stripUrlPrefix === false) {
    params.set('stripurl', '0')
  }
  
  return params.toString()
}

function parseShareUrlParams(searchParams) {
  const params = new URLSearchParams(searchParams)
  const result = {
    input: null,
    options: {},
  }
  
  if (params.has('input')) {
    try {
      result.input = decodeURIComponent(params.get('input'))
    } catch (e) { // eslint-disable-line no-unused-vars
      result.input = params.get('input')
    }
  }
  
  if (params.has('mode')) {
    const mode = params.get('mode')
    if (Object.values(OUTPUT_MODES).includes(mode)) {
      result.options.outputMode = mode
    }
  }
  
  if (params.has('xncase')) {
    const xncase = params.get('xncase')
    if (Object.values(XN_CASE_OPTIONS).includes(xncase)) {
      result.options.xnCaseOption = xncase
    }
  }
  
  if (params.has('casefold')) {
    result.options.caseFold = params.get('casefold') !== '0'
  }
  
  if (params.has('stripurl')) {
    result.options.stripUrlPrefix = params.get('stripurl') !== '0'
  }
  
  return result
}

function detectApiSupport() {
  const support = {
    hasUrl: typeof URL !== 'undefined',
    hasIntl: typeof Intl !== 'undefined',
    hasClipboard: typeof navigator !== 'undefined' && 'clipboard' in navigator,
  }
  
  let idnSupport = 'none'
  
  if (support.hasUrl) {
    try {
      const testDomain = '例子.中国'
      const url = new URL(`http://${testDomain}`)
      if (url.hostname && url.hostname !== testDomain) {
        idnSupport = 'partial'
      }
    } catch (e) { // eslint-disable-line no-unused-vars
      // URL constructor may not support IDN in older browsers, keep idnSupport as 'none'
    }
  }
  
  support.idnSupport = idnSupport
  
  return support
}

export {
    BIDI_CONTROL_CHARS, ERROR_CODES,
    ERROR_MESSAGES, EXAMPLE_DOMAINS, IDNA_MODES,
    IDNA_MODE_LABELS, INVISIBLE_CHARS, MAX_DOMAIN_LENGTH, MAX_INPUT_LINES, MAX_LABEL_LENGTH, MIXED_SCRIPT_RULES, OUTPUT_MODES,
    OUTPUT_MODE_LABELS, PUNYCODE_PREFIX, STORAGE_KEY, THROTTLE_DELAY_MS, XN_CASE_OPTIONS,
    XN_CASE_OPTION_LABELS, analyzeLabel, buildShareUrlParams, compareWithBrowserUrl,
    computeDiff, convertDomain, createError, detectApiSupport, detectBidiControlChars,
    detectInvisibleChars, detectMixedScript, exportToTsv, formatCodePoint, getCodePointList, getErrorMessage, getScriptForCodePoint, hasNonAscii,
    isAceLabel, isAscii,
    isAsciiLabel, normalizeOptions, parseShareUrlParams, processBatch, processSingleDomain, punyDecode, punyEncode, stripUrlPrefix,
    toAsciiLabel,
    toUnicodeLabel, validateDomainFormat
}

