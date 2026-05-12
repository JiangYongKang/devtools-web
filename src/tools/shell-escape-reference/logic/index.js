import { MAX_INPUT_CHARS } from './constants.js'
import {
  escapeForDoubleQuotes,
  escapeForSingleQuotes,
  getBareLineGuidance,
  buildExplainedSpans,
  buildRiskMarkers,
  parseInverse,
  validateInput,
} from './core.js'

function buildNormalizedParams(params = {}) {
  return {
    rawText: params.rawText ?? '',
    shellProfile: params.shellProfile ?? 'POSIX_BASH_LITE',
    primaryQuoteStrategy: params.primaryQuoteStrategy ?? 'double',
    inverseMode: params.inverseMode === true,
    maxInputChars: params.maxInputChars ?? MAX_INPUT_CHARS,
  }
}

function processForwardMode(params) {
  const { rawText, shellProfile, maxInputChars } = params
  
  const validation = validateInput(rawText, maxInputChars)
  if (!validation.valid) {
    return {
      quotedDouble: null,
      quotedSingle: null,
      bareLineGuidance: null,
      explainedSpans: [],
      riskMarkers: null,
      inverseExplanation: null,
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    }
  }
  
  const quotedDouble = escapeForDoubleQuotes(rawText)
  const quotedSingle = escapeForSingleQuotes(rawText)
  const bareLineGuidance = getBareLineGuidance(rawText)
  const explainedSpans = buildExplainedSpans(rawText, shellProfile)
  const riskMarkers = buildRiskMarkers(explainedSpans, rawText)
  
  return {
    quotedDouble,
    quotedSingle,
    bareLineGuidance,
    explainedSpans,
    riskMarkers,
    inverseExplanation: null,
    errorCode: null,
    errorMessage: null,
  }
}

function processInverseMode(params) {
  const { rawText, shellProfile, maxInputChars } = params
  
  const validation = validateInput(rawText, maxInputChars)
  if (!validation.valid) {
    return {
      quotedDouble: null,
      quotedSingle: null,
      bareLineGuidance: null,
      explainedSpans: [],
      riskMarkers: null,
      inverseExplanation: null,
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    }
  }
  
  const inverseExplanation = parseInverse(rawText, shellProfile)
  
  if (inverseExplanation.errorCode) {
    return {
      quotedDouble: null,
      quotedSingle: null,
      bareLineGuidance: null,
      explainedSpans: [],
      riskMarkers: null,
      inverseExplanation,
      errorCode: inverseExplanation.errorCode,
      errorMessage: inverseExplanation.errorMessage,
    }
  }
  
  const explainedSpans = buildExplainedSpans(inverseExplanation.expandedValue, shellProfile)
  const riskMarkers = buildRiskMarkers(explainedSpans, inverseExplanation.expandedValue)
  
  const quotedDouble = escapeForDoubleQuotes(inverseExplanation.expandedValue)
  const quotedSingle = escapeForSingleQuotes(inverseExplanation.expandedValue)
  const bareLineGuidance = getBareLineGuidance(inverseExplanation.expandedValue)
  
  return {
    quotedDouble,
    quotedSingle,
    bareLineGuidance,
    explainedSpans,
    riskMarkers,
    inverseExplanation,
    errorCode: null,
    errorMessage: null,
  }
}

function processShellEscape(params = {}) {
  if (params?.rawText === null || params?.rawText === undefined) {
    return {
      quotedDouble: null,
      quotedSingle: null,
      bareLineGuidance: null,
      explainedSpans: [],
      riskMarkers: null,
      inverseExplanation: null,
      errorCode: 'NULL_INPUT',
      errorMessage: '输入值为 null 或 undefined',
    }
  }
  
  const normalized = buildNormalizedParams(params)
  
  if (normalized.inverseMode) {
    return processInverseMode(normalized)
  }
  
  return processForwardMode(normalized)
}

export {
  buildNormalizedParams,
  processForwardMode,
  processInverseMode,
  processShellEscape,
}
