import { describe, expect, test } from 'vitest'
import { v } from '../logic/index.js'

describe('validator - string', () => {
  test('should validate string', () => {
    const schema = v.string()
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.safeParse('hello').success).toBe(true)
  })

  test('should reject non-string', () => {
    const schema = v.string()
    expect(() => schema.parse(123)).toThrow()
    expect(schema.safeParse(123).success).toBe(false)
    expect(schema.safeParse(null).success).toBe(false)
    expect(schema.safeParse(undefined).success).toBe(false)
  })
})

describe('validator - number', () => {
  test('should validate number', () => {
    const schema = v.number()
    expect(schema.parse(42)).toBe(42)
    expect(schema.parse(3.14)).toBe(3.14)
  })

  test('should reject non-number', () => {
    const schema = v.number()
    expect(() => schema.parse('hello')).toThrow()
    expect(() => schema.parse(NaN)).toThrow()
    expect(schema.safeParse('123').success).toBe(false)
  })
})

describe('validator - boolean', () => {
  test('should validate boolean', () => {
    const schema = v.boolean()
    expect(schema.parse(true)).toBe(true)
    expect(schema.parse(false)).toBe(false)
  })

  test('should reject non-boolean', () => {
    const schema = v.boolean()
    expect(() => schema.parse('true')).toThrow()
    expect(() => schema.parse(1)).toThrow()
  })
})

describe('validator - object', () => {
  test('should validate object', () => {
    const schema = v.object({
      name: v.string(),
      age: v.number(),
    })
    
    const result = schema.parse({ name: 'Alice', age: 30 })
    expect(result).toEqual({ name: 'Alice', age: 30 })
  })

  test('should reject invalid object', () => {
    const schema = v.object({
      name: v.string(),
      age: v.number(),
    })
    
    expect(() => schema.parse({ name: 'Alice', age: '30' })).toThrow()
    expect(() => schema.parse(null)).toThrow()
    expect(() => schema.parse([])).toThrow()
  })
})

describe('validator - array', () => {
  test('should validate array', () => {
    const schema = v.array(v.string())
    expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  test('should reject non-array', () => {
    const schema = v.array(v.string())
    expect(() => schema.parse('not array')).toThrow()
    expect(() => schema.parse({})).toThrow()
  })

  test('should reject array with invalid items', () => {
    const schema = v.array(v.number())
    expect(() => schema.parse([1, 2, '3'])).toThrow()
  })
})

describe('validator - optional', () => {
  test('should allow undefined', () => {
    const schema = v.optional(v.string())
    expect(schema.parse(undefined)).toBe(undefined)
    expect(schema.parse('hello')).toBe('hello')
  })
})

describe('validator - nullable', () => {
  test('should allow null', () => {
    const schema = v.nullable(v.string())
    expect(schema.parse(null)).toBe(null)
    expect(schema.parse('hello')).toBe('hello')
  })
})

describe('validator - literal', () => {
  test('should match exact value', () => {
    const schema = v.literal('hello')
    expect(schema.parse('hello')).toBe('hello')
    expect(() => schema.parse('world')).toThrow()
  })
})

describe('validator - union', () => {
  test('should match any of the schemas', () => {
    const schema = v.union([v.string(), v.number()])
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.parse(42)).toBe(42)
    expect(() => schema.parse(true)).toThrow()
  })
})

describe('validator - any', () => {
  test('should accept any value', () => {
    const schema = v.any()
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.parse(42)).toBe(42)
    expect(schema.parse(null)).toBe(null)
    expect(schema.parse({})).toEqual({})
  })
})

describe('validator - safeParse', () => {
  test('should return success result', () => {
    const schema = v.string()
    const result = schema.safeParse('hello')
    expect(result.success).toBe(true)
    expect(result.data).toBe('hello')
  })

  test('should return error result', () => {
    const schema = v.string()
    const result = schema.safeParse(123)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
