import { HISTORY_MODES, STORAGE_KEYS, URL_LIMITS } from './constants.js'
import { WARNING_CODES, createWarning } from './errors.js'
import { zod, getDefaults, SCHEMA_TYPES } from './schema.js'
import {
  stateToQueryParams,
  queryParamsToState,
  queryParamsToString,
  stringToQueryParams,
  truncateQueryString,
  flattenObject,
  unflattenObject,
} from './encoding.js'
import {
  compressStateToQueryParams,
  compressStateToQueryString,
  getMinimalShareUrl,
  getFullShareUrl,
  deepEqual,
} from './compression.js'

function debounce(fn, delay) {
  let timerId = null
  return (...args) => {
    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => fn(...args), delay)
  }
}

function mergeDefaults(state, defaults) {
  if (!defaults) return state || {}
  if (!state) return { ...defaults }

  const result = {}

  const allKeys = new Set([...Object.keys(defaults), ...Object.keys(state || {})])

  for (const key of allKeys) {
    const stateVal = state?.[key]
    const defaultVal = defaults[key]

    if (stateVal === undefined || stateVal === null) {
      if (defaultVal !== undefined) {
        result[key] = defaultVal
      }
      continue
    }

    if (typeof stateVal === 'object' && stateVal !== null && !Array.isArray(stateVal) &&
        typeof defaultVal === 'object' && defaultVal !== null && !Array.isArray(defaultVal)) {
      result[key] = mergeDefaults(stateVal, defaultVal)
    } else {
      result[key] = stateVal
    }
  }

  return result
}

function serializeState(state, schema, options = {}) {
  const { truncate = true, maxLength = URL_LIMITS.MAX_QUERY_STRING_LENGTH } = options
  const warnings = []

  let params = stateToQueryParams(state, schema, warnings)
  let queryString = queryParamsToString(params, { encode: true, sortKeys: true })

  let truncated = false
  if (truncate && queryString.length > maxLength) {
    const result = truncateQueryString(queryString, maxLength)
    queryString = result.truncated
    truncated = result.cut
    if (truncated) {
      warnings.push(createWarning(WARNING_CODES.URL_LENGTH_EXCEEDED, null, queryString.length, `URL 查询串被截断，超过 ${maxLength} 字符限制`))
    }
  }

  return {
    queryString,
    params,
    warnings,
    truncated,
  }
}

function deserializeState(queryStringOrParams, schema, options = {}) {
  const { mergeWithDefaults = true } = options
  const warnings = []

  let params
  if (typeof queryStringOrParams === 'string') {
    params = stringToQueryParams(queryStringOrParams)
  } else {
    params = queryStringOrParams || {}
  }

  const state = queryParamsToState(params, schema, warnings)

  const merged = mergeWithDefaults
    ? mergeDefaults(state, getDefaults(schema))
    : state

  return {
    state: merged,
    rawParams: params,
    warnings,
  }
}

function validateState(state, schema) {
  const warnings = []
  const isValid = true

  return {
    isValid,
    warnings,
  }
}

function saveToSessionStorage(storage, state, key = STORAGE_KEYS.LAST_SUCCESSFUL_STATE) {
  try {
    if (!storage) {
      return { success: false }
    }
    storage.setItem(key, JSON.stringify(state))
    return { success: true }
  } catch {
    return { success: false }
  }
}

function loadFromSessionStorage(storage, key = STORAGE_KEYS.LAST_SUCCESSFUL_STATE) {
  try {
    if (!storage) {
      return { success: false, state: null }
    }
    const raw = storage.getItem(key)
    if (!raw) {
      return { success: false, state: null }
    }
    const state = JSON.parse(raw)
    return { success: true, state }
  } catch {
    return { success: false, state: null }
  }
}

function createRouteSync(options = {}) {
  const {
    schema,
    location,
    navigate,
    storage,
    debounceMs = 300,
    historyMode = HISTORY_MODES.PUSH,
    onHydrated,
  } = options

  let currentState = getDefaults(schema)
  let version = 0
  let lastPushedVersion = -1
  let pushCount = 0
  let replaceCount = 0

  function getLocation() {
    return location
  }

  function getNavigate() {
    return navigate
  }

  function hasHistorySupport() {
    return !!(getLocation() && getNavigate())
  }

  function readFromUrl() {
    if (!hasHistorySupport()) {
      return { state: getDefaults(schema), warnings: [] }
    }

    const loc = getLocation()
    const search = loc?.search || ''
    return deserializeState(search, schema)
  }

  function writeToUrl(state, mode = historyMode) {
    const { queryString, warnings } = serializeState(state, schema)

    if (!hasHistorySupport()) {
      warnings.push(createWarning(WARNING_CODES.HISTORY_API_UNAVAILABLE))
      return { success: false, queryString, warnings }
    }

    const nav = getNavigate()

    if (mode === HISTORY_MODES.PUSH) {
      pushCount++
    } else {
      replaceCount++
    }

    nav({ search: queryString ? `?${queryString}` : '' }, { replace: mode === HISTORY_MODES.REPLACE })

    lastPushedVersion = version

    return { success: true, queryString, warnings }
  }

  const debouncedWriteToUrl = debounce((state, mode) => {
    writeToUrl(state, mode)
  }, debounceMs)

  function setState(newState, options = {}) {
    const { write = true, immediate = false, mode } = options

    if (deepEqual(newState, currentState)) {
      return { changed: false, state: currentState }
    }

    currentState = newState
    version++

    if (write) {
      if (immediate) {
        writeToUrl(newState, mode || historyMode)
      } else {
        debouncedWriteToUrl(newState, mode || historyMode)
      }
    }

    return { changed: true, state: newState }
  }

  function getState() {
    return currentState
  }

  function getVersion() {
    return version
  }

  function getStatistics() {
    return {
      pushCount,
      replaceCount,
      version,
    }
  }

  function hydrate() {
    const result = readFromUrl()
    const { state, warnings } = result

    const validation = validateState(state, schema)
    const allWarnings = [...warnings, ...validation.warnings]

    if (validation.isValid) {
      currentState = state
      version++

      saveToSessionStorage(storage, state)

      if (onHydrated) {
        onHydrated(state, { hydrated: true, fromUrl: true, warnings: allWarnings })
      }

      return { success: true, state, warnings: allWarnings }
    }

    const fallback = loadFromSessionStorage(storage)
    if (fallback.success && fallback.state) {
      currentState = fallback.state
      version++

      if (onHydrated) {
        onHydrated(fallback.state, { hydrated: true, fromUrl: false, warnings: allWarnings, usedFallback: true })
      }

      return { success: true, state: fallback.state, warnings: allWarnings, usedFallback: true }
    }

    currentState = getDefaults(schema)
    version++

    if (onHydrated) {
      onHydrated(currentState, { hydrated: true, fromUrl: false, warnings: allWarnings, empty: true })
    }

    return { success: false, state: currentState, warnings: allWarnings, empty: true }
  }

  function generateShareUrls(currentLocation = getLocation()) {
    const warnings = []
    return {
      full: getFullShareUrl(currentLocation, currentState, schema, warnings),
      minimal: getMinimalShareUrl(currentLocation, currentState, schema, warnings),
      warnings,
    }
  }

  return {
    setState,
    getState,
    getVersion,
    getStatistics,
    hydrate,
    readFromUrl,
    writeToUrl,
    generateShareUrls,
    hasHistorySupport,
    serializeState,
    deserializeState,
  }
}

const EXAMPLES = {
  valid: {
    name: '合法查询串',
    queryString: 'name=test&active=true&count=42&tags=a&tags=b&config.theme=dark',
  },
  partialInvalid: {
    name: '部分非法查询串',
    queryString: 'name=test&active=maybe&count=notanumber&tags=a&unknown=field&config.theme=dark',
  },
  malicious: {
    name: '恶意超长查询串',
    queryString: 'name=' + 'a'.repeat(2000) + '&count=42',
  },
}

export {
  HISTORY_MODES,
  STORAGE_KEYS,
  URL_LIMITS,
  WARNING_CODES,
  SCHEMA_TYPES,
  zod,
  getDefaults,
  deepEqual,
  debounce,
  flattenObject,
  unflattenObject,
  serializeState,
  deserializeState,
  validateState,
  saveToSessionStorage,
  loadFromSessionStorage,
  compressStateToQueryParams,
  compressStateToQueryString,
  getMinimalShareUrl,
  getFullShareUrl,
  createRouteSync,
  EXAMPLES,
}
