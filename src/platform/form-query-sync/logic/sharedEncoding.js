import { BOOLEAN_FALSE_STRINGS, BOOLEAN_TRUE_STRINGS, SCHEMA_TYPES } from './constants.js'
import { WARNING_CODES, createWarning } from './errors.js'
import { isValidKey } from './schema.js'

function safeDecodeURIComponent(encoded) {
  try {
    const normalized = encoded.replace(/\+/g, '%20')
    return { success: true, value: decodeURIComponent(normalized) }
  } catch (e) {
    return { success: false, error: e }
  }
}

function parseBooleanString(str) {
  const lower = str.toLowerCase().trim()
  if (BOOLEAN_TRUE_STRINGS.includes(lower)) return { success: true, value: true }
  if (BOOLEAN_FALSE_STRINGS.includes(lower)) return { success: true, value: false }
  return { success: false }
}

function parseNumberString(str) {
  const trimmed = str.trim()
  if (trimmed === '') return { success: false }
  const num = Number(trimmed)
  if (Number.isNaN(num)) return { success: false }
  return { success: true, value: num }
}

function parseDateString(str, format = 'YYYY-MM-DD') {
  if (!str) return { success: false }
  
  const trimmed = str.trim()
  
  try {
    const date = new Date(trimmed)
    if (isNaN(date.getTime())) return { success: false }
    return { success: true, value: date }
  } catch (e) {
    return { success: false }
  }
}

function serializeDate(date, format = 'YYYY-MM-DD') {
  if (!date) return undefined
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return undefined
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

function flattenObject(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    if (!isValidKey(key)) continue

    const fullKey = prefix ? `${prefix}[${key}]` : key

    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      result[fullKey] = value
    } else if (typeof value === 'object' && value !== null && 
               !(value instanceof Date) && 
               !(value instanceof File) && 
               !(value instanceof Blob)) {
      flattenObject(value, fullKey, result)
    } else {
      result[fullKey] = value
    }
  }
  return result
}

function parseBracketKey(key) {
  const parts = []
  let current = ''
  let i = 0
  
  while (i < key.length) {
    if (key[i] === '[') {
      if (current) {
        parts.push(current)
        current = ''
      }
      i++
      while (i < key.length && key[i] !== ']') {
        current += key[i]
        i++
      }
      if (current) {
        parts.push(current)
        current = ''
      }
      i++
    } else {
      current += key[i]
      i++
    }
  }
  
  if (current) {
    parts.push(current)
  }
  
  return parts
}

function unflattenObject(flat, warnings = []) {
  const result = {}

  for (const [fullKey, value] of Object.entries(flat)) {
    const parts = parseBracketKey(fullKey)

    if (!parts.every(isValidKey)) {
      warnings.push(createWarning(WARNING_CODES.INVALID_KEY_FORMAT, fullKey))
      continue
    }

    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in current)) {
        current[part] = {}
      }
      if (typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part])) {
        warnings.push(createWarning(WARNING_CODES.INVALID_PARAM, fullKey, value, `路径冲突: ${fullKey}`))
        current = null
        break
      }
      current = current[part]
    }

    if (current !== null) {
      const lastPart = parts[parts.length - 1]
      current[lastPart] = value
    }
  }

  return result
}

function flattenSchema(schema, warnings = [], prefix = '', result = {}) {
  if (!schema || schema.type !== SCHEMA_TYPES.OBJECT) return result

  for (const [key, fieldSchema] of Object.entries(schema.fields || {})) {
    const fullKey = prefix ? `${prefix}[${key}]` : key

    if (fieldSchema.type === SCHEMA_TYPES.OBJECT) {
      flattenSchema(fieldSchema, warnings, fullKey, result)
    } else {
      result[fullKey] = fieldSchema
    }
  }

  return result
}

function getSchemaForPath(schema, pathParts) {
  let current = schema

  for (const part of pathParts) {
    if (!current || current.type !== SCHEMA_TYPES.OBJECT || !current.fields) {
      return undefined
    }
    current = current.fields[part]
  }

  return current
}

function serializeValue(value, schema, field, warnings = []) {
  if (value === null || value === undefined) return undefined

  if (value instanceof File) {
    warnings.push(createWarning(WARNING_CODES.INVALID_PARAM, field, '[File]'))
    return undefined
  }
  if (value instanceof Blob) {
    warnings.push(createWarning(WARNING_CODES.INVALID_PARAM, field, '[Blob]'))
    return undefined
  }

  const schemaType = schema?.type

  switch (schemaType) {
    case SCHEMA_TYPES.BOOLEAN:
      return value ? 'true' : 'false'
    case SCHEMA_TYPES.NUMBER:
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value)
      }
      if (typeof value === 'string') {
        const parsed = parseNumberString(value)
        if (parsed.success) return String(parsed.value)
      }
      warnings.push(createWarning(WARNING_CODES.INVALID_NUMBER, field, value))
      return undefined
    case SCHEMA_TYPES.ENUM:
      if (schema?.values?.includes(value)) {
        return String(value)
      }
      warnings.push(createWarning(WARNING_CODES.INVALID_ENUM_VALUE, field, value))
      return undefined
    case SCHEMA_TYPES.DATE:
      return serializeDate(value, schema?.format)
    case SCHEMA_TYPES.STRING:
    default:
      if (schema?.serialize) {
        return schema.serialize(value)
      }
      return String(value)
  }
}

function parseValue(str, schema, field, warnings = []) {
  if (str === null || str === undefined) return undefined

  const schemaType = schema?.type

  switch (schemaType) {
    case SCHEMA_TYPES.BOOLEAN: {
      const parsed = parseBooleanString(str)
      if (parsed.success) return parsed.value
      warnings.push(createWarning(WARNING_CODES.INVALID_BOOLEAN, field, str))
      return undefined
    }
    case SCHEMA_TYPES.NUMBER: {
      const parsed = parseNumberString(str)
      if (parsed.success) return parsed.value
      warnings.push(createWarning(WARNING_CODES.INVALID_NUMBER, field, str))
      return undefined
    }
    case SCHEMA_TYPES.ENUM: {
      if (schema?.values?.includes(str)) return str
      warnings.push(createWarning(WARNING_CODES.INVALID_ENUM_VALUE, field, str))
      return undefined
    }
    case SCHEMA_TYPES.DATE: {
      const parsed = parseDateString(str, schema?.format)
      if (parsed.success) return parsed.value
      warnings.push(createWarning(WARNING_CODES.INVALID_PARAM, field, str))
      return undefined
    }
    case SCHEMA_TYPES.STRING:
    default:
      if (schema?.parse) {
        return schema.parse(str)
      }
      return str
  }
}

function stateToQueryParams(state, schema, warnings = []) {
  if (!state || typeof state !== 'object') return {}

  const flat = flattenObject(state)
  const result = {}

  const flatSchema = flattenSchema(schema, warnings)

  for (const [key, value] of Object.entries(flat)) {
    const fieldSchema = flatSchema[key]

    if (Array.isArray(value)) {
      const encodedArray = value.map((item) => serializeValue(item, fieldSchema?.items, key, warnings))
      const nonEmpty = encodedArray.filter((v) => v !== undefined)
      if (nonEmpty.length > 0) {
        result[key] = nonEmpty
      }
    } else {
      const encoded = serializeValue(value, fieldSchema, key, warnings)
      if (encoded !== undefined) {
        result[key] = encoded
      }
    }
  }

  return result
}

function queryParamsToState(params, schema, warnings = []) {
  const flat = {}

  const flatSchema = flattenSchema(schema, warnings)

  for (const [key, rawValues] of Object.entries(params)) {
    const values = Array.isArray(rawValues) ? rawValues : [rawValues]

    if (values.length === 0) continue

    const decodedValues = []
    let decodeFailed = false

    for (const v of values) {
      const decoded = safeDecodeURIComponent(v)
      if (!decoded.success) {
        warnings.push(createWarning(WARNING_CODES.INVALID_PERCENT_SEQUENCE, key, v))
        decodeFailed = true
        break
      }
      decodedValues.push(decoded.value)
    }

    if (decodeFailed) continue

    const parts = parseBracketKey(key)
    let fieldSchema

    try {
      fieldSchema = getSchemaForPath(schema, parts)
    } catch (e) {
      fieldSchema = undefined
    }

    if (!fieldSchema) {
      warnings.push(createWarning(WARNING_CODES.UNKNOWN_FIELD, key))
      continue
    }

    if (fieldSchema.type === SCHEMA_TYPES.ARRAY) {
      const parsedArray = decodedValues
        .map((v) => parseValue(v, fieldSchema.items, key, warnings))
        .filter((v) => v !== undefined)
      flat[key] = parsedArray
    } else {
      const parsed = parseValue(decodedValues[0], fieldSchema, key, warnings)
      if (parsed !== undefined) {
        flat[key] = parsed
      }
    }
  }

  return unflattenObject(flat, warnings)
}

function queryParamsToString(params, options = {}) {
  const { encode = true, sortKeys = true } = options
  const parts = []

  const keys = sortKeys ? Object.keys(params).sort() : Object.keys(params)

  for (const key of keys) {
    const value = params[key]

    if (value === null || value === undefined) continue

    const values = Array.isArray(value) ? value : [value]

    for (const v of values) {
      if (v === null || v === undefined) continue
      const encodedKey = encode ? encodeURIComponent(key) : key
      const encodedValue = encode ? encodeURIComponent(String(v)) : String(v)
      parts.push(`${encodedKey}=${encodedValue}`)
    }
  }

  return parts.join('&')
}

function stringToQueryParams(str) {
  const params = {}

  if (!str || str.length === 0) return params

  const cleanStr = str.startsWith('?') ? str.slice(1) : str

  for (const part of cleanStr.split('&')) {
    if (part === '') continue

    const eqIndex = part.indexOf('=')
    let key
    let value

    if (eqIndex === -1) {
      key = part
      value = ''
    } else {
      key = part.slice(0, eqIndex)
      value = part.slice(eqIndex + 1)
    }

    const decodedKey = safeDecodeURIComponent(key)
    if (!decodedKey.success) continue

    const actualKey = decodedKey.value

    if (!(actualKey in params)) {
      params[actualKey] = []
    }
    params[actualKey].push(value)
  }

  return params
}

function checkQueryLength(queryString, maxLength) {
  if (!queryString || queryString.length <= maxLength) {
    return { allowed: true, length: queryString.length }
  }
  return { allowed: false, length: queryString.length }
}

export {
    checkQueryLength, flattenObject, flattenSchema,
    getSchemaForPath, parseBooleanString, parseBracketKey, parseDateString, parseNumberString, parseValue, queryParamsToState,
    queryParamsToString, safeDecodeURIComponent, serializeDate, serializeValue, stateToQueryParams, stringToQueryParams, unflattenObject
}

