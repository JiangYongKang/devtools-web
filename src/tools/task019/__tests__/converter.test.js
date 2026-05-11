import { describe, test, expect, beforeEach, vi } from 'vitest'
import { jsonToYaml, yamlToJson, sortObjectKeys, getIndentString, getQuoteOptions } from '../logic/converter.js'
import { ERROR_CODES, VERSION } from '../logic/index.js'

describe('task019 converter - helper functions', () => {
  describe('sortObjectKeys', () => {
    test('should preserve order when keyOrder is preserve', () => {
      const obj = { z: 1, a: 2, m: 3 }
      const result = sortObjectKeys(obj, 'preserve')
      expect(Object.keys(result)).toEqual(['z', 'a', 'm'])
    })

    test('should sort alphabetically when keyOrder is alphabetical', () => {
      const obj = { z: 1, a: 2, m: 3 }
      const result = sortObjectKeys(obj, 'alphabetical')
      expect(Object.keys(result)).toEqual(['a', 'm', 'z'])
    })

    test('should handle nested objects', () => {
      const obj = {
        z: { b: 1, a: 2 },
        a: 1
      }
      const result = sortObjectKeys(obj, 'alphabetical')
      expect(Object.keys(result)).toEqual(['a', 'z'])
      expect(Object.keys(result.z)).toEqual(['a', 'b'])
    })

    test('should handle arrays', () => {
      const arr = [{ z: 1, a: 2 }, { m: 3 }]
      const result = sortObjectKeys(arr, 'alphabetical')
      expect(Array.isArray(result)).toBe(true)
      expect(Object.keys(result[0])).toEqual(['a', 'z'])
    })

    test('should return non-objects as-is', () => {
      expect(sortObjectKeys(null, 'alphabetical')).toBeNull()
      expect(sortObjectKeys(undefined, 'alphabetical')).toBeUndefined()
      expect(sortObjectKeys(123, 'alphabetical')).toBe(123)
      expect(sortObjectKeys('string', 'alphabetical')).toBe('string')
    })
  })

  describe('getIndentString', () => {
    test('should return tab for tab style', () => {
      expect(getIndentString({ indentStyle: 'tab' })).toBe('\t')
    })

    test('should return spaces for space style', () => {
      expect(getIndentString({ indentStyle: 'space', indentWidth: 2 })).toBe('  ')
      expect(getIndentString({ indentStyle: 'space', indentWidth: 4 })).toBe('    ')
      expect(getIndentString({ indentStyle: 'space', indentWidth: 8 })).toBe('        ')
    })

    test('should use defaults for invalid options', () => {
      expect(getIndentString({})).toBe('  ')
    })
  })

  describe('getQuoteOptions', () => {
    test('should return options for single quotes', () => {
      expect(getQuoteOptions('single')).toEqual({ singleQuote: true, doubleQuote: false })
    })

    test('should return options for double quotes', () => {
      expect(getQuoteOptions('double')).toEqual({ singleQuote: false, doubleQuote: true })
    })

    test('should return options for no quotes', () => {
      expect(getQuoteOptions('none')).toEqual({ singleQuote: false, doubleQuote: false })
    })

    test('should use none for unknown styles', () => {
      expect(getQuoteOptions('unknown')).toEqual({ singleQuote: false, doubleQuote: false })
    })
  })
})

describe('task019 converter - jsonToYaml', () => {
  test('should convert simple JSON to YAML', () => {
    const json = '{"name": "John", "age": 30}'
    const result = jsonToYaml(json)

    expect(result.success).toBe(true)
    expect(result.output).toContain('name:')
    expect(result.output).toContain('John')
    expect(result.output).toContain('age:')
    expect(result.output).toContain('30')
    expect(result.version).toBe(VERSION)
  })

  test('should handle nested JSON', () => {
    const json = '{"user": {"name": "John", "address": {"city": "Beijing"}}}'
    const result = jsonToYaml(json)

    expect(result.success).toBe(true)
    expect(result.output).toContain('user:')
    expect(result.output).toContain('address:')
    expect(result.output).toContain('city:')
  })

  test('should handle arrays', () => {
    const json = '{"items": [1, 2, 3]}'
    const result = jsonToYaml(json)

    expect(result.success).toBe(true)
    expect(result.output).toContain('items:')
  })

  test('should handle null input', () => {
    const result = jsonToYaml(null)
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  test('should handle empty input', () => {
    const result = jsonToYaml('')
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should handle whitespace-only input', () => {
    const result = jsonToYaml('   \n\t  ')
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should handle invalid JSON', () => {
    const result = jsonToYaml('{ invalid json }')
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.PARSE_FAILED)
  })

  test('should include line/column info for JSON parse errors', () => {
    const json = `{
  "key": "value"
  invalid
}`
    const result = jsonToYaml(json)
    expect(result.success).toBe(false)
    expect(result.line).toBeDefined()
  })

  test('should respect indent options', () => {
    const json = '{"a": {"b": 1}}'
    const result2 = jsonToYaml(json, { indentStyle: 'space', indentWidth: 2 })
    const result4 = jsonToYaml(json, { indentStyle: 'space', indentWidth: 4 })

    expect(result2.success).toBe(true)
    expect(result4.success).toBe(true)
    expect(result2.output).not.toBe(result4.output)
  })

  test('should respect keyOrder option', () => {
    const json = '{"z": 1, "a": 2, "m": 3}'
    const preserveResult = jsonToYaml(json, { keyOrder: 'preserve' })
    const alphaResult = jsonToYaml(json, { keyOrder: 'alphabetical' })

    expect(preserveResult.success).toBe(true)
    expect(alphaResult.success).toBe(true)
  })

  test('should enforce maxNestingDepth', () => {
    const deepJson = '{"a": {"b": {"c": {"d": 1}}}}'
    const result = jsonToYaml(deepJson, { maxNestingDepth: 2 })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NESTING_DEPTH_EXCEEDED)
  })

  test('should calculate nesting depth', () => {
    const json = '{"a": {"b": {"c": 1}}}'
    const result = jsonToYaml(json)

    expect(result.success).toBe(true)
    expect(result.nestingDepth).toBeGreaterThan(0)
  })

  test('should calculate processed bytes', () => {
    const json = '{"name": "John"}'
    const result = jsonToYaml(json)

    expect(result.success).toBe(true)
    expect(result.processedBytes).toBeGreaterThan(0)
  })
})

describe('task019 converter - yamlToJson', () => {
  test('should convert simple YAML to JSON', () => {
    const yaml = `name: John
age: 30`
    const result = yamlToJson(yaml)

    expect(result.success).toBe(true)
    const parsed = JSON.parse(result.output)
    expect(parsed.name).toBe('John')
    expect(parsed.age).toBe(30)
    expect(result.version).toBe(VERSION)
  })

  test('should handle nested YAML', () => {
    const yaml = `user:
  name: John
  address:
    city: Beijing`
    const result = yamlToJson(yaml)

    expect(result.success).toBe(true)
    const parsed = JSON.parse(result.output)
    expect(parsed.user.name).toBe('John')
    expect(parsed.user.address.city).toBe('Beijing')
  })

  test('should handle arrays', () => {
    const yaml = `items:
  - 1
  - 2
  - 3`
    const result = yamlToJson(yaml)

    expect(result.success).toBe(true)
    const parsed = JSON.parse(result.output)
    expect(Array.isArray(parsed.items)).toBe(true)
    expect(parsed.items).toHaveLength(3)
  })

  test('should handle null input', () => {
    const result = yamlToJson(null)
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  test('should handle empty input', () => {
    const result = yamlToJson('')
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should handle whitespace-only input', () => {
    const result = yamlToJson('   \n\t  ')
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should handle invalid YAML', () => {
    const yaml = `key: value
  invalid:
  - indentation
    wrong`
    const result = yamlToJson(yaml)
    expect(result.success).toBe(false)
  })

  test('should reject multi-document YAML', () => {
    const yaml = `---
doc1: value
---
doc2: value`
    const result = yamlToJson(yaml)
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.UNSUPPORTED_MULTIDOC)
  })

  test('should respect indent options for output', () => {
    const yaml = `a: 1
b: 2`
    const result2 = yamlToJson(yaml, { indentStyle: 'space', indentWidth: 2 })
    const result4 = yamlToJson(yaml, { indentStyle: 'space', indentWidth: 4 })

    expect(result2.success).toBe(true)
    expect(result4.success).toBe(true)
  })

  test('should respect keyOrder option', () => {
    const yaml = `z: 1
a: 2
m: 3`
    const preserveResult = yamlToJson(yaml, { keyOrder: 'preserve' })
    const alphaResult = yamlToJson(yaml, { keyOrder: 'alphabetical' })

    expect(preserveResult.success).toBe(true)
    expect(alphaResult.success).toBe(true)
  })

  test('should enforce maxNestingDepth', () => {
    const yaml = `a:
  b:
    c:
      d: 1`
    const result = yamlToJson(yaml, { maxNestingDepth: 2 })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.NESTING_DEPTH_EXCEEDED)
  })

  test('should calculate nesting depth', () => {
    const yaml = `a:
  b:
    c: 1`
    const result = yamlToJson(yaml)

    expect(result.success).toBe(true)
    expect(result.nestingDepth).toBeGreaterThan(0)
  })

  test('should calculate processed bytes', () => {
    const yaml = `name: John`
    const result = yamlToJson(yaml)

    expect(result.success).toBe(true)
    expect(result.processedBytes).toBeGreaterThan(0)
  })
})

describe('task019 converter - integration', () => {
  test('should convert JSON -> YAML -> JSON and get equivalent data', () => {
    const originalJson = {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
      tags: ['developer', 'designer'],
      address: {
        city: 'Beijing',
        country: 'China'
      }
    }

    const jsonString = JSON.stringify(originalJson)
    const yamlResult = jsonToYaml(jsonString)
    expect(yamlResult.success).toBe(true)

    const jsonResult = yamlToJson(yamlResult.output)
    expect(jsonResult.success).toBe(true)

    const parsedBack = JSON.parse(jsonResult.output)
    expect(parsedBack).toEqual(originalJson)
  })

  test('should convert YAML -> JSON -> YAML and get equivalent data', () => {
    const yaml = `name: John Doe
age: 30
email: john@example.com
tags:
  - developer
  - designer
address:
  city: Beijing
  country: China`

    const jsonResult = yamlToJson(yaml)
    expect(jsonResult.success).toBe(true)

    const yamlResult = jsonToYaml(jsonResult.output)
    expect(yamlResult.success).toBe(true)

    const finalJsonResult = yamlToJson(yamlResult.output)
    expect(finalJsonResult.success).toBe(true)

    const originalParsed = JSON.parse(jsonResult.output)
    const finalParsed = JSON.parse(finalJsonResult.output)
    expect(finalParsed).toEqual(originalParsed)
  })
})
