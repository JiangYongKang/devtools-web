import {
    DEFAULT_RETRY_DELAY_SECONDS,
    DEFAULT_RETRY_MAX_DELAY_SECONDS,
    DOMAINS,
    ERROR_CODES,
    MAX_CAUSE_CHAIN_DEPTH,
    MAX_MAPPING_TABLE_SIZE,
    SEVERITY
} from './constants.js'
import { getDefaultMappings } from './defaultMappings.js'
import { getCurrentEnvironment, getEnvironmentOverrides } from './environmentOverrides.js'
import { truncateString } from './errors.js'

function getMappingKey(match) {
  const domain = match.domain || ''
  const httpStatus = match.httpStatus !== null && match.httpStatus !== undefined
    ? String(match.httpStatus)
    : 'null'
  const businessCode = match.businessCode !== null && match.businessCode !== undefined
    ? match.businessCode
    : 'null'
  return `${domain}:${httpStatus}:${businessCode}`
}

function getMatchScore(match) {
  let score = 0
  if (match.domain) score += 4
  if (match.businessCode !== null && match.businessCode !== undefined) score += 2
  if (match.httpStatus !== null && match.httpStatus !== undefined) score += 1
  return score
}

function mergeMappings(...mappingLists) {
  const merged = new Map()

  for (let i = 0; i < mappingLists.length; i++) {
    const list = mappingLists[i]
    if (!Array.isArray(list)) continue

    for (const mapping of list) {
      if (!mapping || !mapping.match || !mapping.template) continue

      const key = getMappingKey(mapping.match)
      const score = getMatchScore(mapping.match)

      const existing = merged.get(key)
      if (!existing || i > existing.priority || (i === existing.priority && score > existing.score)) {
        merged.set(key, {
          ...mapping,
          score,
          priority: i,
        })
      }
    }
  }

  const result = Array.from(merged.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.priority - a.priority
    })
    .slice(0, MAX_MAPPING_TABLE_SIZE)

  return result
}

function matchInput(match, input) {
  if (match.domain && match.domain !== input.domain) {
    return false
  }

  if (match.httpStatus !== null && match.httpStatus !== undefined) {
    if (input.httpStatus === null || input.httpStatus === undefined) {
      return false
    }
    if (match.httpStatus !== input.httpStatus) {
      return false
    }
  }

  if (match.businessCode !== null && match.businessCode !== undefined) {
    if (input.businessCode === null || input.businessCode === undefined) {
      return false
    }
    if (match.businessCode !== input.businessCode) {
      return false
    }
  }

  return true
}

function findMatchingMapping(mergedMappings, input) {
  for (const mapping of mergedMappings) {
    if (matchInput(mapping.match, input)) {
      return mapping
    }
  }

  return null
}

function getLocalizedValue(obj, locale, fallbackLocale = 'en') {
  if (!obj || typeof obj !== 'object') {
    return null
  }

  if (locale && obj[locale]) {
    return obj[locale]
  }

  if (fallbackLocale && obj[fallbackLocale]) {
    return obj[fallbackLocale]
  }

  return null
}

function createUnknownBusinessMapping(originalBusinessCode, locale) {
  const errorCode = ERROR_CODES.UNKNOWN_BUSINESS
  return {
    match: { domain: DOMAINS.UNKNOWN, httpStatus: null, businessCode: originalBusinessCode },
    template: {
      errorCode,
      userTitle: {
        zh: '未知业务错误',
        en: 'Unknown Business Error',
      },
      userDetail: {
        zh: `遇到未知的业务错误码：${originalBusinessCode}。请联系技术支持并提供此错误码。`,
        en: `Encountered unknown business code: ${originalBusinessCode}. Please contact technical support with this code.`,
      },
      recoveryHints: {
        zh: ['记录原始业务码', '联系技术支持', '检查 API 文档'],
        en: ['Record the original business code', 'Contact technical support', 'Check API documentation'],
      },
      severity: SEVERITY.WARNING,
      retryable: false,
      suggestedRetryDelaySeconds: DEFAULT_RETRY_DELAY_SECONDS,
    },
  }
}

function extractCauseChain(error, maxDepth = MAX_CAUSE_CHAIN_DEPTH) {
  const chain = []
  const seen = new Set()
  let current = error
  let depth = 0

  while (current && depth < maxDepth) {
    if (seen.has(current)) {
      chain.push({
        message: '[Circular reference detected, chain truncated]',
        name: 'CircularReference',
        circular: true,
      })
      break
    }

    seen.add(current)

    const causeInfo = {
      message: truncateString(current.message || String(current)),
      name: current.name || 'Error',
    }

    if (current.errorCode) {
      causeInfo.errorCode = current.errorCode
    }

    if (current.code) {
      causeInfo.code = current.code
    }

    chain.push(causeInfo)

    if (current.cause) {
      current = current.cause
      depth++
    } else if (current.originalError) {
      current = current.originalError
      depth++
    } else {
      break
    }
  }

  return chain
}

function parseRetryAfter(headers) {
  if (!headers || typeof headers !== 'object') {
    return null
  }

  let headerValue = null

  if (typeof headers.get === 'function') {
    headerValue = headers.get('retry-after')
  } else if (headers['retry-after']) {
    headerValue = headers['retry-after']
  } else if (headers['Retry-After']) {
    headerValue = headers['Retry-After']
  }

  if (!headerValue) {
    return null
  }

  headerValue = String(headerValue).trim()

  const secondsMatch = headerValue.match(/^\d+$/)
  if (secondsMatch) {
    const seconds = parseInt(headerValue, 10)
    if (!isNaN(seconds) && seconds >= 0) {
      return Math.min(seconds, DEFAULT_RETRY_MAX_DELAY_SECONDS)
    }
  }

  try {
    const date = new Date(headerValue)
    if (!isNaN(date.getTime())) {
      const now = Date.now()
      const diffMs = date.getTime() - now
      const diffSeconds = Math.ceil(diffMs / 1000)
      if (diffSeconds > 0) {
        return Math.min(diffSeconds, DEFAULT_RETRY_MAX_DELAY_SECONDS)
      }
    }
  } catch (e) {
  }

  return null
}

function buildMergedMappings(options = {}) {
  const {
    defaultMappings = getDefaultMappings(),
    environment = getCurrentEnvironment(),
    environmentOverrides = getEnvironmentOverrides(environment),
    remoteOverrides = [],
  } = options

  return mergeMappings(
    defaultMappings,
    environmentOverrides,
    remoteOverrides
  )
}

function getTextForLocale(textObj, locale, fallbackLocale = 'en', errorCode = '') {
  let result = getLocalizedValue(textObj, locale, fallbackLocale)
  
  if (result === null || result === undefined) {
    result = errorCode
  }

  return result
}

function mapError(input, options = {}) {
  const {
    mergedMappings = buildMergedMappings(),
    locale = 'en',
    fallbackLocale = 'en',
    cause = null,
  } = options

  const inputWithDefaults = {
    domain: input.domain || DOMAINS.UNKNOWN,
    httpStatus: input.httpStatus !== undefined ? input.httpStatus : null,
    businessCode: input.businessCode !== undefined ? input.businessCode : null,
  }

  let matchingMapping = findMatchingMapping(mergedMappings, inputWithDefaults)

  if (!matchingMapping && inputWithDefaults.businessCode) {
    matchingMapping = createUnknownBusinessMapping(inputWithDefaults.businessCode, locale)
  }

  if (!matchingMapping) {
    matchingMapping = createUnknownBusinessMapping('UNKNOWN', locale)
  }

  const template = matchingMapping.template

  const causeChain = cause ? extractCauseChain(cause) : []

  const userTitle = getTextForLocale(template.userTitle, locale, fallbackLocale, template.errorCode)
  const userDetail = getTextForLocale(template.userDetail, locale, fallbackLocale, template.errorCode)
  
  let recoveryHints = getLocalizedValue(template.recoveryHints, locale, fallbackLocale)
  if (!recoveryHints || !Array.isArray(recoveryHints)) {
    recoveryHints = []
  }

  const result = {
    userTitle,
    userDetail,
    recoveryHints: [...recoveryHints],
    errorCode: template.errorCode,
    severity: template.severity,
    retryable: template.retryable || false,
    suggestedRetryDelaySeconds: template.suggestedRetryDelaySeconds || DEFAULT_RETRY_DELAY_SECONDS,
    causeChain,
    originalInput: { ...inputWithDefaults },
  }

  return result
}

export {
    buildMergedMappings, createUnknownBusinessMapping,
    extractCauseChain, findMatchingMapping,
    getLocalizedValue, getMappingKey,
    getMatchScore, getTextForLocale,
    mapError, matchInput, mergeMappings, parseRetryAfter
}

