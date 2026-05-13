const SCHEMA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ENUM: 'enum',
  ARRAY: 'array',
  OBJECT: 'object',
}

function z() {
  function string(options = {}) {
    const { default: defaultValue = undefined } = options
    return {
      type: SCHEMA_TYPES.STRING,
      default: defaultValue,
    }
  }

  function number(options = {}) {
    const { default: defaultValue = undefined } = options
    return {
      type: SCHEMA_TYPES.NUMBER,
      default: defaultValue,
    }
  }

  function boolean(options = {}) {
    const { default: defaultValue = undefined } = options
    return {
      type: SCHEMA_TYPES.BOOLEAN,
      default: defaultValue,
    }
  }

  function en(values, options = {}) {
    const { default: defaultValue = undefined } = options
    return {
      type: SCHEMA_TYPES.ENUM,
      values,
      default: defaultValue,
    }
  }

  function array(itemSchema, options = {}) {
    const { default: defaultValue = undefined } = options
    return {
      type: SCHEMA_TYPES.ARRAY,
      items: itemSchema,
      default: defaultValue,
    }
  }

  function object(fields, options = {}) {
    const { default: defaultValue = undefined, allowUnknown = false } = options
    return {
      type: SCHEMA_TYPES.OBJECT,
      fields,
      default: defaultValue,
      allowUnknown,
    }
  }

  return {
    string,
    number,
    boolean,
    enum: en,
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

export {
  SCHEMA_TYPES,
  zod,
  getDefaults,
  isObjectSchema,
  isValidKey,
}
