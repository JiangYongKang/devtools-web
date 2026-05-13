import {
  CASE_STYLES,
  ACRONYM_STRATEGIES,
  NUMBER_ATTACH_STRATEGIES,
  ILLEGAL_CHAR_MODES,
  COMPRESSION_STRATEGIES,
  UNICODE_MODES,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'

const ASCII_LETTER = /[a-zA-Z]/
const ASCII_UPPER = /[A-Z]/
const ASCII_LOWER = /[a-z]/
const DIGIT = /[0-9]/
const UNICODE_LETTER = /\p{L}/u
const SEPARATORS = /[_\-.]/

function isLetter(char, unicodeMode) {
  if (unicodeMode === UNICODE_MODES.ALLOW_UNICODE) {
    return UNICODE_LETTER.test(char)
  }
  return ASCII_LETTER.test(char)
}

function isUpper(char, unicodeMode) {
  if (unicodeMode === UNICODE_MODES.ALLOW_UNICODE) {
    return char === char.toUpperCase() && UNICODE_LETTER.test(char)
  }
  return ASCII_UPPER.test(char)
}

function isLower(char, unicodeMode) {
  if (unicodeMode === UNICODE_MODES.ALLOW_UNICODE) {
    return char === char.toLowerCase() && UNICODE_LETTER.test(char)
  }
  return ASCII_LOWER.test(char)
}

function isDigit(char) {
  return DIGIT.test(char)
}

function isSeparator(char) {
  return SEPARATORS.test(char)
}

function compressSeparatorString(input, compression) {
  if (!input || compression === COMPRESSION_STRATEGIES.NONE) {
    return input
  }

  let result = input

  if (
    compression === COMPRESSION_STRATEGIES.COMPRESS_LEADING ||
    compression === COMPRESSION_STRATEGIES.COMPRESS_ALL
  ) {
    result = result.replace(/^[_\-.]+/, '')
    result = result.replace(/[_\-.]+$/, '')
  }

  if (
    compression === COMPRESSION_STRATEGIES.COMPRESS_CONSECUTIVE ||
    compression === COMPRESSION_STRATEGIES.COMPRESS_ALL
  ) {
    result = result.replace(/([_\-.])\1+/g, '$1')
  }

  return result
}

function stripPrefixSuffix(input, prefix = '', suffix = '') {
  if (!input) return input
  let result = input

  if (prefix && result.startsWith(prefix)) {
    result = result.slice(prefix.length)
  }

  if (suffix && result.endsWith(suffix)) {
    result = result.slice(0, -suffix.length)
  }

  return result
}

function extractNamespaceSegment(input, namespaceDelimiter = '.') {
  if (!input || !namespaceDelimiter) {
    return { extracted: input, namespace: null }
  }

  const segments = input.split(namespaceDelimiter)
  if (segments.length === 1) {
    return { extracted: input, namespace: null }
  }

  const lastName = segments[segments.length - 1]
  const namespace = segments.slice(0, -1).join(namespaceDelimiter)

  return { extracted: lastName, namespace }
}

function tokenizeIdentifier(input, options = {}) {
  const {
    acronymStrategy = ACRONYM_STRATEGIES.FIRST_LETTER_ACRONYM,
    numberAttachStrategy = NUMBER_ATTACH_STRATEGIES.ATTACH_PREVIOUS,
    unicodeMode = UNICODE_MODES.ASCII_ONLY,
  } = options

  const tokens = []
  const reasons = []
  let i = 0
  const len = input.length

  while (i < len) {
    const char = input[i]

    if (isSeparator(char)) {
      reasons.push({ index: i, char, reason: '分隔符跳过', type: 'separator' })
      i++
      continue
    }

    if (isDigit(char)) {
      let digits = char
      let digitStart = i
      i++

      while (i < len && isDigit(input[i])) {
        digits += input[i]
        i++
      }

      if (numberAttachStrategy === NUMBER_ATTACH_STRATEGIES.ATTACH_PREVIOUS && tokens.length > 0) {
        const prevToken = tokens[tokens.length - 1]
        prevToken.value += digits
        reasons.push({ index: digitStart, token: digits, reason: '数字附着前段', type: 'number-attach-prev' })
        continue
      }

      if (numberAttachStrategy === NUMBER_ATTACH_STRATEGIES.ATTACH_NEXT) {
        if (i < len && isLetter(input[i], unicodeMode)) {
          let letters = ''
          while (i < len && isLetter(input[i], unicodeMode) && !isUpper(input[i], unicodeMode)) {
            letters += input[i]
            i++
          }
          if (letters === '' && i < len && isUpper(input[i], unicodeMode)) {
            letters = input[i]
            i++
          }
          const combinedToken = digits + letters
          tokens.push({ value: combinedToken, type: 'alphanumeric' })
          reasons.push({ index: digitStart, token: combinedToken, reason: '数字附着后段', type: 'number-attach-next' })
          continue
        }
      }

      tokens.push({ value: digits, type: 'number' })
      reasons.push({ index: digitStart, token: digits, reason: '数字段', type: 'number' })
      continue
    }

    if (isLetter(char, unicodeMode)) {
      let tokenStart = i
      let tokenValue

      if (isUpper(char, unicodeMode)) {
        let uppercaseRun = char
        i++

        while (i < len && isUpper(input[i], unicodeMode)) {
          uppercaseRun += input[i]
          i++
        }

        if (uppercaseRun.length === 1) {
          tokenValue = uppercaseRun
          while (i < len && isLower(input[i], unicodeMode)) {
            tokenValue += input[i]
            i++
          }
          tokens.push({ value: tokenValue, type: 'word' })
          reasons.push({ index: tokenStart, token: tokenValue, reason: '大写字母开头的词段', type: 'camel-case-word' })
        } else {
          const remainingAfter = i < len && isLower(input[i], unicodeMode)

          if (acronymStrategy === ACRONYM_STRATEGIES.ALL_UPPERCASE_BLOCK) {
            if (remainingAfter) {
              const acronymPart = uppercaseRun.slice(0, -1)
              tokens.push({ value: acronymPart, type: 'acronym' })
              reasons.push({ index: tokenStart, token: acronymPart, reason: '全大写块（前 N-1 个）', type: 'acronym-block' })
              i = tokenStart + acronymPart.length
            } else {
              tokens.push({ value: uppercaseRun, type: 'acronym' })
              reasons.push({ index: tokenStart, token: uppercaseRun, reason: '全大写块', type: 'acronym-block' })
            }
          } else if (acronymStrategy === ACRONYM_STRATEGIES.FIRST_LETTER_ACRONYM) {
            if (remainingAfter || i === len) {
              tokens.push({ value: uppercaseRun[0], type: 'word' })
              reasons.push({ index: tokenStart, token: uppercaseRun[0], reason: '首字母缩略词拆分（首字）', type: 'acronym-first' })
              const rest = uppercaseRun.slice(1)
              for (let j = 0; j < rest.length; j++) {
                tokens.push({ value: rest[j], type: 'word' })
                reasons.push({ index: tokenStart + 1 + j, token: rest[j], reason: '首字母缩略词拆分', type: 'acronym-split' })
              }
            } else {
              tokens.push({ value: uppercaseRun, type: 'acronym' })
              reasons.push({ index: tokenStart, token: uppercaseRun, reason: '全大写块（后续非小写）', type: 'acronym-block' })
            }
          } else if (acronymStrategy === ACRONYM_STRATEGIES.APPLE_STYLE) {
            if (uppercaseRun.length === 2 && remainingAfter) {
              tokens.push({ value: uppercaseRun[0], type: 'word' })
              reasons.push({ index: tokenStart, token: uppercaseRun[0], reason: 'Apple 风格：双大写第一个', type: 'apple-style' })
              i = tokenStart + 1
            } else if (remainingAfter) {
              const acronymPart = uppercaseRun.slice(0, -1)
              tokens.push({ value: acronymPart, type: 'acronym' })
              reasons.push({ index: tokenStart, token: acronymPart, reason: 'Apple 风格：连续大写（前 N-1）', type: 'apple-style' })
              i = tokenStart + acronymPart.length
            } else {
              tokens.push({ value: uppercaseRun, type: 'acronym' })
              reasons.push({ index: tokenStart, token: uppercaseRun, reason: 'Apple 风格：全大写块', type: 'apple-style' })
            }
          }
        }
      } else {
        tokenValue = char
        i++
        while (i < len && isLower(input[i], unicodeMode)) {
          tokenValue += input[i]
          i++
        }
        tokens.push({ value: tokenValue, type: 'word' })
        reasons.push({ index: tokenStart, token: tokenValue, reason: '小写字母词段', type: 'lowercase-word' })
      }
      continue
    }

    reasons.push({ index: i, char, reason: '非法字符跳过/保留', type: 'illegal' })
    i++
  }

  return { tokens, reasons }
}

function joinTokensForCase(tokens, targetCase) {
  const normalizedTokens = tokens.map(t => t.value.toLowerCase())

  switch (targetCase) {
    case CASE_STYLES.CAMEL_CASE: {
      if (normalizedTokens.length === 0) return ''
      return normalizedTokens[0] + normalizedTokens.slice(1).map(
        t => t.charAt(0).toUpperCase() + t.slice(1)
      ).join('')
    }
    case CASE_STYLES.PASCAL_CASE: {
      return normalizedTokens.map(
        t => t.charAt(0).toUpperCase() + t.slice(1)
      ).join('')
    }
    case CASE_STYLES.SNAKE_CASE: {
      return normalizedTokens.join('_')
    }
    case CASE_STYLES.SCREAMING_SNAKE: {
      return normalizedTokens.map(t => t.toUpperCase()).join('_')
    }
    case CASE_STYLES.KEBAB_CASE: {
      return normalizedTokens.join('-')
    }
    case CASE_STYLES.TRAIN_CASE: {
      return normalizedTokens.map(
        t => t.charAt(0).toUpperCase() + t.slice(1)
      ).join('-')
    }
    default:
      return normalizedTokens.join('')
  }
}

function validateInputForStrictMode(input, unicodeMode) {
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (!isLetter(char, unicodeMode) && !isDigit(char) && !isSeparator(char)) {
      return {
        valid: false,
        error: createError(ERROR_CODES.INVALID_CHAR, null, {
          position: i,
          char,
        }),
      }
    }
  }
  return { valid: true }
}

function hasAlphanumeric(input, unicodeMode) {
  for (let i = 0; i < input.length; i++) {
    if (isLetter(input[i], unicodeMode) || isDigit(input[i])) {
      return true
    }
  }
  return false
}

function normalizeInput(input, targetCase) {
  const preserveMap = {}
  let index = 0

  let preserved = input.replace(/[^a-zA-Z0-9_\-.]/g, (match) => {
    const placeholder = `\x00${index}\x00`
    preserveMap[placeholder] = match
    index++
    return placeholder
  })

  const tokenizeResult = tokenizeIdentifier(preserved, {
    unicodeMode: UNICODE_MODES.ASCII_ONLY,
    acronymStrategy: ACRONYM_STRATEGIES.FIRST_LETTER_ACRONYM,
    numberAttachStrategy: NUMBER_ATTACH_STRATEGIES.ATTACH_PREVIOUS,
  })

  let base = joinTokensForCase(tokenizeResult.tokens, targetCase)

  for (const [placeholder, original] of Object.entries(preserveMap)) {
    if (base.includes(placeholder)) {
      base = base.replace(placeholder, original)
    }
  }

  return base
}

function roundTripCheck(original, options = {}) {
  const {
    targetCase = CASE_STYLES.CAMEL_CASE,
    tokenizeOptions = {},
  } = options

  const firstPass = convertSingle(original, {
    ...tokenizeOptions,
    targetCase,
    illegalCharMode: ILLEGAL_CHAR_MODES.PRESERVE,
  })

  if (!firstPass.success) {
    return { success: false, error: firstPass.error }
  }

  const secondPass = convertSingle(firstPass.result, {
    ...tokenizeOptions,
    targetCase: CASE_STYLES.CAMEL_CASE,
    illegalCharMode: ILLEGAL_CHAR_MODES.PRESERVE,
  })

  if (!secondPass.success) {
    return { success: false, error: secondPass.error }
  }

  const normalizedOriginal = normalizeInput(original, CASE_STYLES.CAMEL_CASE)

  return {
    success: true,
    consistent: normalizedOriginal === secondPass.result,
    original: original,
    firstPass: firstPass.result,
    secondPass: secondPass.result,
    normalizedOriginal: normalizedOriginal,
  }
}

function convertSingle(input, options = {}) {
  const {
    targetCase = CASE_STYLES.CAMEL_CASE,
    acronymStrategy = ACRONYM_STRATEGIES.FIRST_LETTER_ACRONYM,
    numberAttachStrategy = NUMBER_ATTACH_STRATEGIES.ATTACH_PREVIOUS,
    illegalCharMode = ILLEGAL_CHAR_MODES.PRESERVE,
    compression = COMPRESSION_STRATEGIES.COMPRESS_ALL,
    unicodeMode = UNICODE_MODES.ASCII_ONLY,
    prefix = '',
    suffix = '',
    namespaceDelimiter = '',
  } = options

  if (input === null || input === undefined) {
    return { success: false, error: createError(ERROR_CODES.EMPTY) }
  }

  const trimmed = String(input).trim()

  if (trimmed === '') {
    return { success: false, error: createError(ERROR_CODES.EMPTY) }
  }

  if (!hasAlphanumeric(trimmed, unicodeMode)) {
    return { success: false, error: createError(ERROR_CODES.NO_ALPHANUMERIC) }
  }

  if (illegalCharMode === ILLEGAL_CHAR_MODES.REJECT) {
    const validation = validateInputForStrictMode(trimmed, unicodeMode)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
  }

  const stripped = stripPrefixSuffix(trimmed, prefix, suffix)
  const { extracted, namespace } = extractNamespaceSegment(stripped, namespaceDelimiter)
  const compressed = compressSeparatorString(extracted, compression)

  const illegalChars = []
  let nonSeparatorNonAlnum = ''
  for (let i = 0; i < compressed.length; i++) {
    const char = compressed[i]
    if (!isLetter(char, unicodeMode) && !isDigit(char) && !isSeparator(char)) {
      illegalChars.push({ index: i, char })
      nonSeparatorNonAlnum += char
    }
  }

  if (illegalChars.length > 0 && illegalCharMode === ILLEGAL_CHAR_MODES.REJECT) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_CHAR, null, {
        illegalChars,
      }),
    }
  }

  const { tokens, reasons } = tokenizeIdentifier(compressed, {
    acronymStrategy,
    numberAttachStrategy,
    unicodeMode,
  })

  if (tokens.length === 0) {
    return { success: false, error: createError(ERROR_CODES.NO_ALPHANUMERIC) }
  }

  let result = joinTokensForCase(tokens, targetCase)

  if (namespace) {
    result = namespace + namespaceDelimiter + result
  }

  if (prefix) {
    result = prefix + result
  }
  if (suffix) {
    result = result + suffix
  }

  return {
    success: true,
    result,
    tokens,
    reasons,
    illegalChars: illegalChars.length > 0 ? illegalChars : null,
    nonSeparatorNonAlnum: nonSeparatorNonAlnum || null,
  }
}

function parseClipboardInput(input) {
  if (!input) return { mode: 'raw', values: [''] }

  const trimmed = input.trim()

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return {
        mode: 'json',
        values: parsed.map(v => String(v)),
      }
    }
    return { mode: 'raw', values: [String(parsed)] }
  } catch {
    const commaPattern = /^\s*([^\n,]+(?:\s*,\s*[^\n,]+)+)\s*$/
    if (commaPattern.test(trimmed) && !trimmed.includes('\n')) {
      const values = trimmed.split(/\s*,\s*/).filter(v => v.length > 0)
      if (values.length > 0) {
        return { mode: 'comma', values }
      }
    }

    return {
      mode: 'raw',
      values: trimmed.split('\n'),
    }
  }
}

function convertBatch(inputs, options = {}) {
  const results = []
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < inputs.length; i++) {
    const original = inputs[i]
    const result = convertSingle(original, options)

    results.push({
      index: i,
      original,
      ...result,
    })

    if (result.success) {
      successCount++
    } else {
      errorCount++
    }
  }

  return {
    results,
    successCount,
    errorCount,
    totalCount: inputs.length,
  }
}

export {
  tokenizeIdentifier,
  convertSingle,
  convertBatch,
  roundTripCheck,
  parseClipboardInput,
  isLetter,
  isUpper,
  isLower,
  isDigit,
  isSeparator,
  compressSeparatorString,
  stripPrefixSuffix,
  extractNamespaceSegment,
  joinTokensForCase,
}
