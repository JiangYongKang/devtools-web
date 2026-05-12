import {
  parseUserAgent,
  highlightSearchResults,
  escapeHtml,
} from './parser'
import {
  computeDiffFields,
  groupDiffFieldsByCategory,
  getCategoryLabel,
} from './diff'
import {
  EXAMPLE_UAS,
  EXAMPLE_LABELS,
} from './constants'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_SAFE_INPUT_LENGTH,
  createError,
  getErrorMessage,
} from './errors'

function interpretUserAgent(params = {}) {
  const {
    uaString,
    comparisonPairEnabled = false,
    secondUaString,
    searchToken = '',
  } = params

  const result = {
    success: true,
    error: null,
    comparisonError: null,
    result: {
      normalizedTable: [],
      summaryLine: '',
      jsonExportString: '',
      diffFields: [],
      errorCode: null,
      secondResult: undefined,
    },
  }

  const firstUa = uaString === undefined ? '' : uaString
  const secondUa = secondUaString === undefined ? '' : secondUaString

  const parse1 = parseUserAgent(firstUa)

  if (!parse1.success) {
    result.success = false
    result.error = parse1.error
    result.result.errorCode = parse1.error?.code
    return result
  }

  if (parse1.result) {
    result.result.original = parse1.result.original
    result.result.normalizedTable = highlightSearchResults(
      parse1.result.normalizedTable,
      searchToken
    )
    result.result.summaryLine = parse1.result.summaryLine
    result.result.jsonExportString = parse1.result.jsonExportString
  }

  if (parse1.error) {
    result.error = parse1.error
    result.result.errorCode = parse1.error.code
  }

  if (comparisonPairEnabled) {
    const parse2 = parseUserAgent(secondUa)

    if (parse2.result) {
      result.result.secondResult = {
        ...parse2.result,
        normalizedTable: highlightSearchResults(
          parse2.result.normalizedTable,
          searchToken
        ),
      }

      if (parse1.result && parse2.result) {
        result.result.diffFields = computeDiffFields(
          parse1.result,
          parse2.result
        )
      }
    }

    if (parse2.error && parse2.error.code !== ERROR_CODES.EMPTY_INPUT) {
      result.comparisonError = parse2.error
    }
  }

  return result
}

export {
  interpretUserAgent,
  parseUserAgent,
  highlightSearchResults,
  computeDiffFields,
  groupDiffFieldsByCategory,
  getCategoryLabel,
  escapeHtml,
  EXAMPLE_UAS,
  EXAMPLE_LABELS,
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_SAFE_INPUT_LENGTH,
  createError,
  getErrorMessage,
}
