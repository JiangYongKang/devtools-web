import {
  ERROR_CODES,
  createError,
  isRadixValid,
} from './errors.js'

const MAX_SAFE_VALUE_LENGTH = 15
const MAX_BATCH_SIZE = 1000
const MAX_BATCH_PRODUCT = 100000

function isCharValid(char, radix) {
  const lowerChar = char.toLowerCase()
  const code = lowerChar.charCodeAt(0)
  if (code >= 48 && code <= 57) {
    const digit = code - 48
    return digit < radix
  }
  if (code >= 97 && code <= 122) {
    const digit = 10 + (code - 97)
    return digit < radix
  }
  return false
}

function charToDigit(char) {
  const lowerChar = char.toLowerCase()
  const code = lowerChar.charCodeAt(0)
  if (code >= 48 && code <= 57) {
    return code - 48
  }
  if (code >= 97 && code <= 122) {
    return 10 + (code - 97)
  }
  return -1
}

function digitToChar(digit, upperCase = false) {
  if (digit < 10) {
    return String(digit)
  }
  const char = String.fromCharCode(87 + digit)
  return upperCase ? char.toUpperCase() : char
}

function parseInput(value, sourceRadix, options = {}) {
  const {
    allowNegative = true,
    allowLeadingZeros = false,
  } = options

  if (value === null || value === undefined) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }

  const str = String(value).trim()

  if (str === '') {
    return { error: createError(ERROR_CODES.EMPTY_VALUE) }
  }

  let isNegative = false
  let numericStr = str

  if (str.startsWith('-') || str.startsWith('+')) {
    if (str.startsWith('-')) {
      isNegative = true
      if (!allowNegative) {
        return { error: createError(ERROR_CODES.NEGATIVE_NOT_ALLOWED) }
      }
    }
    numericStr = str.slice(1)
  }

  if (numericStr === '') {
    return { error: createError(ERROR_CODES.EMPTY_VALUE) }
  }

  for (const char of numericStr) {
    if (!isCharValid(char, sourceRadix)) {
      return { error: createError(ERROR_CODES.INVALID_CHAR) }
    }
  }

  if (!allowLeadingZeros && numericStr.length > 1 && numericStr.startsWith('0')) {
    return { error: createError(ERROR_CODES.LEADING_ZEROS_NOT_ALLOWED) }
  }

  if (numericStr.length > MAX_SAFE_VALUE_LENGTH) {
    return { error: createError(ERROR_CODES.VALUE_TOO_LONG) }
  }

  let numericValue = BigInt(0)
  const radixBig = BigInt(sourceRadix)

  for (const char of numericStr) {
    const digit = BigInt(charToDigit(char))
    numericValue = numericValue * radixBig + digit
  }

  if (isNegative) {
    numericValue = -numericValue
  }

  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
  const minSafe = BigInt(Number.MIN_SAFE_INTEGER)
  const overflow = numericValue > maxSafe || numericValue < minSafe

  return {
    isNegative,
    numericStr,
    numericValue,
    overflow,
  }
}

function formatOutput(numericValue, targetRadix, options = {}) {
  const {
    outputMinLength = 0,
    outputUpperCase = false,
    separator = '',
  } = options

  const isNegative = numericValue < BigInt(0)
  const absValue = isNegative ? -numericValue : numericValue

  if (absValue === BigInt(0)) {
    let result = '0'
    if (outputMinLength > 1) {
      result = result.padStart(outputMinLength, '0')
    }
    return result
  }

  const radixBig = BigInt(targetRadix)
  const digits = []
  let value = absValue

  while (value > BigInt(0)) {
    const remainder = value % radixBig
    digits.push(digitToChar(Number(remainder), outputUpperCase))
    value = value / radixBig
  }

  digits.reverse()

  let result = digits.join('')

  if (outputMinLength > 0 && result.length < outputMinLength) {
    result = result.padStart(outputMinLength, '0')
  }

  if (separator && result.length > 0) {
    const parts = []
    for (let i = result.length; i > 0; i -= 4) {
      const start = Math.max(0, i - 4)
      parts.unshift(result.slice(start, i))
    }
    result = parts.join(separator)
  }

  if (isNegative) {
    result = '-' + result
  }

  return result
}

function buildParams(params) {
  return {
    value: params.value ?? '',
    sourceRadix: Number(params.sourceRadix) || 10,
    targetRadix: Number(params.targetRadix) || 16,
    allowNegative: params.allowNegative !== false,
    allowLeadingZeros: params.allowLeadingZeros === true,
    separator: params.separator || '',
    outputMinLength: Number(params.outputMinLength) || 0,
    outputUpperCase: params.outputUpperCase === true,
  }
}

function convertSingle(params) {
  const originalValue = params.value == null ? 'null' : String(params.value)

  if (params.value == null) {
    return {
      originalValue,
      sourceRadix: Number(params.sourceRadix) || 10,
      targetRadix: Number(params.targetRadix) || 16,
      convertedValue: null,
      isNegative: false,
      numericValue: null,
      ...createError(ERROR_CODES.NULL_INPUT),
    }
  }

  const {
    value,
    sourceRadix,
    targetRadix,
    allowNegative,
    allowLeadingZeros,
    separator,
    outputMinLength,
    outputUpperCase,
  } = buildParams(params)

  if (!isRadixValid(sourceRadix) || !isRadixValid(targetRadix)) {
    return {
      originalValue,
      sourceRadix,
      targetRadix,
      convertedValue: null,
      isNegative: false,
      numericValue: null,
      ...createError(ERROR_CODES.INVALID_RADIX),
    }
  }

  const parsed = parseInput(value, sourceRadix, {
    allowNegative,
    allowLeadingZeros,
  })

  if (parsed.error) {
    return {
      originalValue,
      sourceRadix,
      targetRadix,
      convertedValue: null,
      isNegative: false,
      numericValue: null,
      ...parsed.error,
    }
  }

  const convertedValue = formatOutput(parsed.numericValue, targetRadix, {
    outputMinLength,
    outputUpperCase,
    separator,
  })

  return {
    originalValue,
    sourceRadix,
    targetRadix,
    convertedValue,
    isNegative: parsed.isNegative,
    numericValue: parsed.overflow ? null : Number(parsed.numericValue),
    errorCode: null,
    errorMessage: null,
  }
}

function aggregateBatchResults(items) {
  const totalCount = items.length
  let successCount = 0
  let failureCount = 0

  const processedItems = items.map((item, index) => {
    const result = convertSingle(item)
    const success = result.errorCode === null
    if (success) {
      successCount++
    } else {
      failureCount++
    }
    return {
      index,
      success,
      result,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    }
  })

  return {
    allSuccess: failureCount === 0,
    totalCount,
    successCount,
    failureCount,
    items: processedItems,
  }
}

function validateBatchInput(inputList) {
  if (!Array.isArray(inputList)) {
    return { valid: false, error: createError(ERROR_CODES.BATCH_TOO_LARGE) }
  }

  if (inputList.length > MAX_BATCH_SIZE) {
    return {
      valid: false,
      error: createError(ERROR_CODES.BATCH_TOO_LARGE),
    }
  }

  return { valid: true }
}

export {
  MAX_SAFE_VALUE_LENGTH,
  MAX_BATCH_SIZE,
  MAX_BATCH_PRODUCT,
  buildParams,
  convertSingle,
  aggregateBatchResults,
  validateBatchInput,
  parseInput,
  formatOutput,
  isCharValid,
  charToDigit,
  digitToChar,
}
