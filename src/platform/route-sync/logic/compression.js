import { stateToQueryParams, queryParamsToString } from './encoding.js'
import { getDefaults } from './schema.js'

function deepEqual(a, b) {
  if (a === b) return true

  if (typeof a !== typeof b) return false

  if (a === null || b === null) return a === b

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (typeof a === 'object') {
    const aKeys = Object.keys(a).sort()
    const bKeys = Object.keys(b).sort()
    if (aKeys.length !== bKeys.length) return false
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }

  return a === b
}

function diffState(state, defaults) {
  if (!state || !defaults) return state || {}

  const result = {}

  for (const [key, value] of Object.entries(state)) {
    if (!(key in defaults)) {
      if (value !== undefined && value !== null) {
        result[key] = value
      }
      continue
    }

    const defaultVal = defaults[key]

    if (value === undefined || value === null) continue

    if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
        typeof defaultVal === 'object' && defaultVal !== null && !Array.isArray(defaultVal)) {
      const nestedDiff = diffState(value, defaultVal)
      if (Object.keys(nestedDiff).length > 0) {
        result[key] = nestedDiff
      }
    } else if (!deepEqual(value, defaultVal)) {
      result[key] = value
    }
  }

  return result
}

function compressStateToQueryParams(state, schema, warnings = []) {
  const defaults = getDefaults(schema)
  const diffed = diffState(state, defaults)
  return stateToQueryParams(diffed, schema, warnings)
}

function compressStateToQueryString(state, schema, warnings = []) {
  const params = compressStateToQueryParams(state, schema, warnings)
  return queryParamsToString(params, { encode: true, sortKeys: true })
}

function getMinimalShareUrl(location, state, schema, warnings = []) {
  const queryString = compressStateToQueryString(state, schema, warnings)

  const origin = location?.origin || ''
  const pathname = location?.pathname || '/'

  const base = `${origin}${pathname}`

  if (queryString && queryString.length > 0) {
    return `${base}?${queryString}`
  }

  return base
}

function getFullShareUrl(location, state, schema, warnings = []) {
  const params = stateToQueryParams(state, schema, warnings)
  const queryString = queryParamsToString(params, { encode: true, sortKeys: true })

  const origin = location?.origin || ''
  const pathname = location?.pathname || '/'

  const base = `${origin}${pathname}`

  if (queryString && queryString.length > 0) {
    return `${base}?${queryString}`
  }

  return base
}

export {
  deepEqual,
  diffState,
  compressStateToQueryParams,
  compressStateToQueryString,
  getMinimalShareUrl,
  getFullShareUrl,
}
