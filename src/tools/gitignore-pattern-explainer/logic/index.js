import {
  ERROR_CODES,
  MAX_PATTERNS,
  MAX_PATTERN_LENGTH,
  PATTERN_SUBSET_DECLARATION,
} from './constants.js'
import { validateInput } from './errors.js'
import { parseInput } from './parser.js'
import { generateAllExplanations } from './explanation.js'
import { matchPatterns, DEFAULT_TEST_PATHS } from './matcher.js'

function buildNormalizedParams(params = {}) {
  return {
    rawText: params.rawText ?? '',
    maxPatterns: params.maxPatterns ?? MAX_PATTERNS,
    maxPatternLength: params.maxPatternLength ?? MAX_PATTERN_LENGTH,
    testPaths: params.testPaths ?? DEFAULT_TEST_PATHS,
    enableMatching: params.enableMatching !== false,
  }
}

function buildErrorResult(errorCode, errorMessage = null) {
  return {
    rawText: null,
    parsedPatterns: [],
    explanations: [],
    summary: null,
    matchingResults: [],
    errorCode,
    errorMessage,
  }
}

function processGitignorePatterns(params = {}) {
  if (params?.rawText === null || params?.rawText === undefined) {
    return buildErrorResult(
      ERROR_CODES.NULL_INPUT,
      '输入值为 null 或 undefined',
    )
  }

  const normalized = buildNormalizedParams(params)
  const { rawText, maxPatterns, maxPatternLength, testPaths, enableMatching } = normalized

  const validation = validateInput(rawText, maxPatterns, maxPatternLength)
  if (!validation.valid) {
    return buildErrorResult(validation.errorCode, validation.errorMessage)
  }

  const parsedPatterns = parseInput(rawText)
  const explanationResult = generateAllExplanations(parsedPatterns)

  let matchingResults = []
  if (enableMatching && testPaths && testPaths.length > 0) {
    for (const testPath of testPaths) {
      matchingResults.push(matchPatterns(parsedPatterns, testPath))
    }
  }

  return {
    rawText,
    parsedPatterns,
    explanations: explanationResult.explanations,
    summary: explanationResult.summary,
    matchingResults,
    subsetDeclaration: PATTERN_SUBSET_DECLARATION,
    errorCode: null,
    errorMessage: null,
  }
}

export {
  buildNormalizedParams,
  buildErrorResult,
  processGitignorePatterns,
  DEFAULT_TEST_PATHS,
}
