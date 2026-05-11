import { parseDocument, stringify, parseAllDocuments } from 'yaml'
import {
  ERROR_CODES,
  getErrorMessage,
  getByteSize,
  normalizeOptions,
  createSuccessResult,
  createErrorResult,
  calculateNestingDepth,
  validateMaxNestingDepth,
  extractLineColumnFromYamlError,
  extractLineColumnFromJsonError,
  classifyYamlError,
  validateInput,
} from './index.js'

function sortObjectKeys(obj, order) {
  if (order === 'preserve' || !obj || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item, order))
  }

  const sorted = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key], order)
  }
  return sorted
}

function getIndentString(options) {
  const normalized = normalizeOptions(options)
  if (normalized.indentStyle === 'tab') {
    return '\t'
  }
  return ' '.repeat(normalized.indentWidth)
}

function getQuoteOptions(quoteStyle) {
  switch (quoteStyle) {
    case 'single':
      return { singleQuote: true, doubleQuote: false }
    case 'double':
      return { singleQuote: false, doubleQuote: true }
    default:
      return { singleQuote: false, doubleQuote: false }
  }
}

function jsonToYaml(input, options = {}) {
  const validationError = validateInput(input, 'jsonToYaml')
  if (validationError) {
    return validationError
  }

  const normalizedOptions = normalizeOptions(options)

  let parsed
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    const location = extractLineColumnFromJsonError(error, input)
    return createErrorResult(
      ERROR_CODES.PARSE_FAILED,
      error.message || getErrorMessage(ERROR_CODES.PARSE_FAILED),
      location.line,
      location.column,
      location.jsonPath
    )
  }

  if (!validateMaxNestingDepth(parsed, normalizedOptions.maxNestingDepth)) {
    return createErrorResult(ERROR_CODES.NESTING_DEPTH_EXCEEDED)
  }

  const sortedParsed = sortObjectKeys(parsed, normalizedOptions.keyOrder)

  try {
    const quoteOpts = getQuoteOptions(normalizedOptions.quoteStyle)
    const indent = getIndentString(normalizedOptions)
    const indentSize = normalizedOptions.indentStyle === 'tab' ? 1 : normalizedOptions.indentWidth

    const output = stringify(sortedParsed, {
      indent: indentSize,
      indentSeq: true,
      simpleKeys: normalizedOptions.inlineStyle === 'min',
      lineWidth: normalizedOptions.inlineStyle === 'max' ? 0 : 80,
      defaultKeyType: 'PLAIN',
      defaultStringType: quoteOpts.singleQuote ? 'QUOTE_SINGLE' : quoteOpts.doubleQuote ? 'QUOTE_DOUBLE' : 'PLAIN',
    })

    const processedBytes = getByteSize(output)
    const nestingDepth = calculateNestingDepth(parsed)

    return createSuccessResult(output, processedBytes, nestingDepth)
  } catch (error) {
    return createErrorResult(
      ERROR_CODES.PARSE_FAILED,
      error.message || getErrorMessage(ERROR_CODES.PARSE_FAILED)
    )
  }
}

function yamlToJson(input, options = {}) {
  const validationError = validateInput(input, 'yamlToJson')
  if (validationError) {
    return validationError
  }

  const normalizedOptions = normalizeOptions(options)

  let parsed
  try {
    const documents = parseAllDocuments(input)
    if (documents.length > 1) {
      return createErrorResult(ERROR_CODES.UNSUPPORTED_MULTIDOC)
    }

    const doc = documents[0]
    if (!doc) {
      return createErrorResult(
        ERROR_CODES.PARSE_FAILED,
        'YAML 解析失败'
      )
    }

    if (doc.errors && doc.errors.length > 0) {
      const firstError = doc.errors[0]
      const location = extractLineColumnFromYamlError(firstError)
      const classified = classifyYamlError(firstError)

      return createErrorResult(
        classified.code,
        firstError.message || getErrorMessage(classified.code),
        location.line,
        location.column,
        classified.jsonPath
      )
    }

    parsed = doc.toJS()
  } catch (error) {
    const location = extractLineColumnFromYamlError(error)
    const classified = classifyYamlError(error)

    return createErrorResult(
      classified.code,
      error.message || getErrorMessage(classified.code),
      location.line,
      location.column,
      classified.jsonPath
    )
  }

  if (!validateMaxNestingDepth(parsed, normalizedOptions.maxNestingDepth)) {
    return createErrorResult(ERROR_CODES.NESTING_DEPTH_EXCEEDED)
  }

  const sortedParsed = sortObjectKeys(parsed, normalizedOptions.keyOrder)

  try {
    const indent = getIndentString(normalizedOptions)
    const output = JSON.stringify(sortedParsed, null, indent)

    const processedBytes = getByteSize(output)
    const nestingDepth = calculateNestingDepth(parsed)

    return createSuccessResult(output, processedBytes, nestingDepth)
  } catch (error) {
    return createErrorResult(
      ERROR_CODES.PARSE_FAILED,
      error.message || getErrorMessage(ERROR_CODES.PARSE_FAILED)
    )
  }
}

export {
  jsonToYaml,
  yamlToJson,
  sortObjectKeys,
  getIndentString,
  getQuoteOptions,
}
