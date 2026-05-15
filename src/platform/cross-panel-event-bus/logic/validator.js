function createValidationError(message, path = []) {
  const error = new Error(message)
  error.name = 'ValidationError'
  error.path = path
  return error
}

function string() {
  return {
    parse(value) {
      if (typeof value !== 'string') {
        throw createValidationError('Expected string')
      }
      return value
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function number() {
  return {
    parse(value) {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw createValidationError('Expected number')
      }
      return value
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function boolean() {
  return {
    parse(value) {
      if (typeof value !== 'boolean') {
        throw createValidationError('Expected boolean')
      }
      return value
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function object(schema) {
  return {
    parse(value) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw createValidationError('Expected object')
      }

      const result = {}
      for (const key in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, key)) {
          try {
            result[key] = schema[key].parse(value[key])
          } catch (e) {
            e.path = [key, ...(e.path || [])]
            throw e
          }
        }
      }
      return result
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function array(itemSchema) {
  return {
    parse(value) {
      if (!Array.isArray(value)) {
        throw createValidationError('Expected array')
      }
      return value.map((item, index) => {
        try {
          return itemSchema.parse(item)
        } catch (e) {
          e.path = [index, ...(e.path || [])]
          throw e
        }
      })
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function optional(schema) {
  return {
    parse(value) {
      if (value === undefined) {
        return undefined
      }
      return schema.parse(value)
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function nullable(schema) {
  return {
    parse(value) {
      if (value === null) {
        return null
      }
      return schema.parse(value)
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function literal(expected) {
  return {
    parse(value) {
      if (value !== expected) {
        throw createValidationError(`Expected literal ${JSON.stringify(expected)}`)
      }
      return value
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function union(schemas) {
  return {
    parse(value) {
      for (const schema of schemas) {
        const result = schema.safeParse(value)
        if (result.success) {
          return result.data
        }
      }
      throw createValidationError('No matching union type')
    },
    safeParse(value) {
      try {
        return { success: true, data: this.parse(value) }
      } catch (e) {
        return { success: false, error: e }
      }
    },
  }
}

function any() {
  return {
    parse(value) {
      return value
    },
    safeParse(value) {
      return { success: true, data: value }
    },
  }
}

const v = {
  string,
  number,
  boolean,
  object,
  array,
  optional,
  nullable,
  literal,
  union,
  any,
}

export {
  v,
  createValidationError,
}
