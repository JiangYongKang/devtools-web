import { MAX_LINE_COUNT, MAX_LINE_LENGTH, EXAMPLES } from './constants.js'
import { ERROR_CODES, ERROR_MESSAGES, getErrorMessage, createError } from './errors.js'
import {
  isValidKey,
  joinContinuationLines,
  stripComment,
  stripQuotes,
  checkQuotesClosed,
  parseEnvContent,
  formatAsSortedKeyList,
  formatAsTSV,
} from './parser.js'

function processEnvContent(content, options = {}) {
  return parseEnvContent(content, options)
}

export {
  MAX_LINE_COUNT,
  MAX_LINE_LENGTH,
  EXAMPLES,
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isValidKey,
  joinContinuationLines,
  stripComment,
  stripQuotes,
  checkQuotesClosed,
  parseEnvContent,
  formatAsSortedKeyList,
  formatAsTSV,
  processEnvContent,
}
