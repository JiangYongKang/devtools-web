import {
  MAX_PATCH_FETCH_TIMEOUT_MS,
  MAX_MAPPING_TABLE_SIZE,
  ERROR_CODES,
  SEVERITY,
  DEFAULT_LOCALES,
  DOMAINS,
} from './constants.js'
import { createError } from './errors.js'

const PATCH_SCHEMA = {
  type: 'object',
  required: ['overrides'],
  properties: {
    overrides: {
      type: 'array',
      items: {
        type: 'object',
        required: ['match', 'template'],
        properties: {
          match: {
            type: 'object',
            required: ['domain'],
            properties: {
              domain: { type: 'string' },
              httpStatus: { type: ['number', 'null'] },
              businessCode: { type: ['string', 'null'] },
            },
          },
          template: {
            type: 'object',
            required: ['errorCode', 'userTitle', 'userDetail', 'recoveryHints', 'severity'],
            properties: {
              errorCode: { type: 'string' },
              userTitle: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
              userDetail: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
              recoveryHints: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              severity: {
                type: 'string',
                enum: Object.values(SEVERITY),
              },
              retryable: { type: 'boolean' },
              suggestedRetryDelaySeconds: { type: 'number' },
            },
          },
        },
      },
    },
  },
}

function validatePatchSchema(patchData) {
  if (!patchData || typeof patchData !== 'object') {
    return false
  }

  if (!Array.isArray(patchData.overrides)) {
    return false
  }

  if (patchData.overrides.length > MAX_MAPPING_TABLE_SIZE) {
    return false
  }

  for (const override of patchData.overrides) {
    if (!override || typeof override !== 'object') {
      return false
    }

    if (!override.match || typeof override.match !== 'object') {
      return false
    }

    if (typeof override.match.domain !== 'string') {
      return false
    }

    if (override.match.httpStatus !== null && override.match.httpStatus !== undefined &&
        typeof override.match.httpStatus !== 'number') {
      return false
    }

    if (override.match.businessCode !== null && override.match.businessCode !== undefined &&
        typeof override.match.businessCode !== 'string') {
      return false
    }

    if (!override.template || typeof override.template !== 'object') {
      return false
    }

    if (typeof override.template.errorCode !== 'string') {
      return false
    }

    if (!override.template.userTitle || typeof override.template.userTitle !== 'object') {
      return false
    }

    if (!override.template.userDetail || typeof override.template.userDetail !== 'object') {
      return false
    }

    if (!override.template.recoveryHints || typeof override.template.recoveryHints !== 'object') {
      return false
    }

    if (typeof override.template.severity !== 'string') {
      return false
    }

    if (override.template.retryable !== undefined && typeof override.template.retryable !== 'boolean') {
      return false
    }

    if (override.template.suggestedRetryDelaySeconds !== undefined &&
        typeof override.template.suggestedRetryDelaySeconds !== 'number') {
      return false
    }
  }

  return true
}

function normalizePatch(patchData) {
  if (!patchData || !Array.isArray(patchData.overrides)) {
    return { overrides: [] }
  }

  const normalizedOverrides = patchData.overrides.map((override) => ({
    match: {
      domain: override.match.domain,
      httpStatus: override.match.httpStatus !== undefined ? override.match.httpStatus : null,
      businessCode: override.match.businessCode !== undefined ? override.match.businessCode : null,
    },
    template: {
      errorCode: override.template.errorCode,
      userTitle: override.template.userTitle,
      userDetail: override.template.userDetail,
      recoveryHints: override.template.recoveryHints,
      severity: override.template.severity,
      retryable: override.template.retryable !== undefined ? override.template.retryable : false,
      suggestedRetryDelaySeconds: override.template.suggestedRetryDelaySeconds !== undefined
        ? override.template.suggestedRetryDelaySeconds
        : 1,
    },
  }))

  return { overrides: normalizedOverrides }
}

async function fetchRemotePatch(url, options = {}) {
  const {
    timeoutMs = MAX_PATCH_FETCH_TIMEOUT_MS,
    fetchFn = typeof fetch !== 'undefined' ? fetch : null,
  } = options

  if (!url || !fetchFn) {
    return {
      overrides: [],
      source: 'skipped',
      error: null,
      diagnostics: [{
        source: 'skipped',
        reason: !url ? 'No patch URL provided' : 'No fetch function available',
        timestamp: Date.now(),
      }],
    }
  }

  let controller = null
  let timerId = null

  try {
    controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const signal = controller ? controller.signal : undefined

    timerId = setTimeout(() => {
      if (controller) {
        controller.abort()
      }
    }, timeoutMs)

    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    })

    clearTimeout(timerId)
    timerId = null

    if (!response.ok) {
      return {
        overrides: [],
        source: 'skipped',
        error: null,
        diagnostics: [{
          source: 'skipped',
          reason: `HTTP error: ${response.status} ${response.statusText}`,
          timestamp: Date.now(),
        }],
      }
    }

    const patchData = await response.json()

    if (!validatePatchSchema(patchData)) {
      return {
        overrides: [],
        source: 'invalid',
        error: createError(ERROR_CODES.INVALID_PATCH, 'Remote patch schema validation failed'),
        diagnostics: [{
          source: 'invalid',
          reason: 'Schema validation failed',
          timestamp: Date.now(),
        }],
      }
    }

    const normalized = normalizePatch(patchData)

    return {
      overrides: normalized.overrides,
      source: 'remote',
      error: null,
      diagnostics: [{
        source: 'remote',
        reason: 'Patch loaded successfully',
        count: normalized.overrides.length,
        timestamp: Date.now(),
      }],
    }
  } catch (error) {
    if (timerId) {
      clearTimeout(timerId)
    }

    return {
      overrides: [],
      source: 'skipped',
      error: null,
      diagnostics: [{
        source: 'skipped',
        reason: error?.message || 'Unknown error during patch fetch',
        timestamp: Date.now(),
      }],
    }
  }
}

function getDemoPatchData() {
  return {
    overrides: [
      {
        match: {
          domain: DOMAINS.HTTP,
          httpStatus: 429,
          businessCode: null,
        },
        template: {
          errorCode: 'HTTP_429_OVERRIDDEN',
          userTitle: {
            zh: '远程补丁：请求过于频繁',
            en: 'Remote Patch: Too Many Requests',
          },
          userDetail: {
            zh: '远程补丁覆盖：您的请求过于频繁，请等待更长时间。',
            en: 'Remote Patch Override: Your requests are too frequent, please wait longer.',
          },
          recoveryHints: {
            zh: ['等待 10 秒后重试', '降低请求频率'],
            en: ['Wait 10 seconds and retry', 'Reduce request frequency'],
          },
          severity: SEVERITY.WARNING,
          retryable: true,
          suggestedRetryDelaySeconds: 10,
        },
      },
    ],
  }
}

export {
  validatePatchSchema,
  normalizePatch,
  fetchRemotePatch,
  getDemoPatchData,
}
