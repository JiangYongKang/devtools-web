import { SCHEMA_TYPES } from './constants.js'

function z() {
  function string(options = {}) {
    const {
      default: defaultValue = undefined,
      required = false,
      queryKeys = [],
      serialize = null,
      parse = null,
    } = options
    return {
      type: SCHEMA_TYPES.STRING,
      default: defaultValue,
      required,
      queryKeys,
      serialize,
      parse,
    }
  }

  function number(options = {}) {
    const {
      default: defaultValue = undefined,
      required = false,
      queryKeys = [],
    } = options
    return {
      type: SCHEMA_TYPES.NUMBER,
      default: defaultValue,
      required,
      queryKeys,
    }
  }

  function boolean(options = {}) {
    const {
      default: defaultValue = undefined,
      required = false,
      queryKeys = [],
    } = options
    return {
      type: SCHEMA_TYPES.BOOLEAN,
      default: defaultValue,
      required,
      queryKeys,
    }
  }

  function en(values, options = {}) {
    const {
      default: defaultValue = undefined,
      required = false,
      queryKeys = [],
    } = options
    return {
      type: SCHEMA_TYPES.ENUM,
      values,
      default: defaultValue,
      required,
      queryKeys,
    }
  }

  function date(options = {}) {
    const {
      default: defaultValue = undefined,
      required = false,
      queryKeys = [],
      format = 'YYYY-MM-DD',
    } = options
    return {
      type: SCHEMA_TYPES.DATE,
      default: defaultValue,
      required,
      queryKeys,
      format,
    }
  }

  function array(itemSchema, options = {}) {
    const {
      default: defaultValue = undefined,
      required = false,
      queryKeys = [],
    } = options
    return {
      type: SCHEMA_TYPES.ARRAY,
      items: itemSchema,
      default: defaultValue,
      required,
      queryKeys,
    }
  }

  function object(fields, options = {}) {
    const {
      default: defaultValue = undefined,
      required = false,
      allowUnknown = false,
    } = options
    return {
      type: SCHEMA_TYPES.OBJECT,
      fields,
      default: defaultValue,
      required,
      allowUnknown,
    }
  }

  return {
    string,
    number,
    boolean,
    enum: en,
    date,
    array,
    object,
  }
}

const zod = z()

function getDefaults(schema) {
  if (!schema) return {}
  if (schema.type !== SCHEMA_TYPES.OBJECT) return schema.default

  const defaults = {}
  for (const [key, fieldSchema] of Object.entries(schema.fields || {})) {
    if (fieldSchema.type === SCHEMA_TYPES.OBJECT) {
      defaults[key] = getDefaults(fieldSchema)
    } else if (fieldSchema.default !== undefined) {
      defaults[key] = fieldSchema.default
    }
  }
  return defaults
}

function isObjectSchema(schema) {
  return schema && schema.type === SCHEMA_TYPES.OBJECT
}

function isValidKey(key) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
}

function getAllQueryKeys(schema) {
  const result = {}
  function traverse(s, prefix = '') {
    if (!s) return
    if (s.type === SCHEMA_TYPES.OBJECT) {
      for (const [key, fieldSchema] of Object.entries(s.fields || {})) {
        traverse(fieldSchema, prefix ? `${prefix}[${key}]` : key)
      }
    } else if (s.queryKeys && s.queryKeys.length > 0) {
      const mainKey = prefix || ''
      result[mainKey] = s.queryKeys
      for (const alias of s.queryKeys) {
        result[alias] = [mainKey]
      }
    }
  }
  traverse(schema)
  return result
}

export {
    getAllQueryKeys, getDefaults,
    isObjectSchema,
    isValidKey, SCHEMA_TYPES,
    zod
}

