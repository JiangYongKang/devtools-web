import { describe, test, expect } from 'vitest'
import {
  validateJSON,
  formatJSONContent,
  minifyJSONContent,
  generateDiagnosticReport,
  offsetToLineColumn,
  getErrorContext,
  calculateDepth,
} from '../logic/index.js'
import {
  ERROR_CODES,
  MAX_SAFE_INPUT_SIZE,
  MAX_NESTING_DEPTH,
} from '../logic/errors.js'

describe('json-syntax-check logic', () => {
  describe('validateJSON - 合法解析', () => {
    test('should validate a simple object', () => {
      const result = validateJSON('{"name": "张三", "age": 28}')
      expect(result.valid).toBe(true)
      expect(result.errorCode).toBeNull()
      expect(result.result.parsed).toEqual({ name: '张三', age: 28 })
    })

    test('should validate an array of objects', () => {
      const json = `[
        {"id": 1, "name": "张三"},
        {"id": 2, "name": "李四"}
      ]`
      const result = validateJSON(json)
      expect(result.valid).toBe(true)
      expect(result.result.parsed).toEqual([
        { id: 1, name: '张三' },
        { id: 2, name: '李四' },
      ])
    })

    test('should validate primitive values', () => {
      expect(validateJSON('"hello"').valid).toBe(true)
      expect(validateJSON('123').valid).toBe(true)
      expect(validateJSON('true').valid).toBe(true)
      expect(validateJSON('false').valid).toBe(true)
      expect(validateJSON('null').valid).toBe(true)
    })

    test('should return characterCount in result', () => {
      const json = '{"a": 1}'
      const result = validateJSON(json)
      expect(result.result.characterCount).toBe(json.length)
    })
  })

  describe('validateJSON - 语法错误定位', () => {
    test('should detect trailing comma error', () => {
      const json = `{
        "name": "张三",
        "age": 28,
      }`
      const result = validateJSON(json)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SYNTAX_ERROR)
      expect(result.error).toBeDefined()
      expect(result.error.details.position).toBeDefined()
      expect(result.error.details.position.line).toBeGreaterThan(0)
    })

    test('should detect missing quote error', () => {
      const json = `{
        "name": 张三,
        "age": 28
      }`
      const result = validateJSON(json)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SYNTAX_ERROR)
      expect(result.error.details.position).toBeDefined()
    })

    test('should detect single quote error', () => {
      const json = `{'name': '张三'}`
      const result = validateJSON(json)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SYNTAX_ERROR)
    })

    test('should detect unterminated string error', () => {
      const json = `{"name": "张三}`
      const result = validateJSON(json)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SYNTAX_ERROR)
    })

    test('should detect invalid number with leading zero', () => {
      const json = '{"count": 0123}'
      const result = validateJSON(json)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SYNTAX_ERROR)
    })

    test('should provide error context', () => {
      const json = `{
        "name": "张三"
        "age": 28
      }`
      const result = validateJSON(json)
      expect(result.valid).toBe(false)
      expect(result.error.details.context).toBeDefined()
      expect(Array.isArray(result.error.details.context)).toBe(true)
    })

    test('should provide line, column, and offset in position', () => {
      const json = '{"a": 1,}'
      const result = validateJSON(json)
      expect(result.error.details.position).toMatchObject({
        line: expect.any(Number),
        column: expect.any(Number),
        offset: expect.any(Number),
      })
    })
  })

  describe('validateJSON - 空输入与长度/深度超限', () => {
    test('should return EMPTY_INPUT for empty string', () => {
      expect(validateJSON('').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(validateJSON('   ').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(validateJSON('\t\n\r').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(validateJSON(null).errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(validateJSON(undefined).errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return INPUT_TOO_LARGE for oversized input', () => {
      const largeText = 'x'.repeat(MAX_SAFE_INPUT_SIZE + 1)
      const result = validateJSON(largeText)
      expect(result.errorCode).toBe(ERROR_CODES.INPUT_TOO_LARGE)
    })

    test('should accept input at exactly MAX_SAFE_INPUT_SIZE', () => {
      const json = '"' + 'x'.repeat(MAX_SAFE_INPUT_SIZE - 2) + '"'
      const result = validateJSON(json)
      expect(result.errorCode).not.toBe(ERROR_CODES.INPUT_TOO_LARGE)
    })

    test('should return DEPTH_TOO_DEEP for deeply nested structure', () => {
      let deepJson = '{"a": '
      for (let i = 0; i < MAX_NESTING_DEPTH + 1; i++) {
        deepJson += '{"b": '
      }
      deepJson += '1'
      for (let i = 0; i < MAX_NESTING_DEPTH + 1; i++) {
        deepJson += '}'
      }
      deepJson += '}'
      
      const result = validateJSON(deepJson)
      expect(result.errorCode).toBe(ERROR_CODES.DEPTH_TOO_DEEP)
    })

    test('should accept structure at exactly MAX_NESTING_DEPTH', () => {
      let deepJson = '{"a": '
      for (let i = 0; i < 50; i++) {
        deepJson += '{"b": '
      }
      deepJson += '1'
      for (let i = 0; i < 50; i++) {
        deepJson += '}'
      }
      deepJson += '}'
      
      const result = validateJSON(deepJson)
      expect(result.valid).toBe(true)
    })
  })

  describe('calculateDepth', () => {
    test('should calculate depth for simple values', () => {
      expect(calculateDepth(null)).toBe(0)
      expect(calculateDepth(123)).toBe(0)
      expect(calculateDepth('hello')).toBe(0)
      expect(calculateDepth(true)).toBe(0)
    })

    test('should calculate depth for simple object', () => {
      expect(calculateDepth({})).toBe(1)
      expect(calculateDepth({ a: 1 })).toBe(1)
    })

    test('should calculate depth for simple array', () => {
      expect(calculateDepth([])).toBe(1)
      expect(calculateDepth([1, 2, 3])).toBe(1)
    })

    test('should calculate depth for nested structure', () => {
      const obj = {
        a: {
          b: {
            c: 1
          }
        }
      }
      expect(calculateDepth(obj)).toBe(3)
    })

    test('should calculate depth for mixed array and object', () => {
      const arr = [
        { a: [1, 2, { b: 3 }] }
      ]
      expect(calculateDepth(arr)).toBe(4)
    })
  })

  describe('offsetToLineColumn', () => {
    test('should convert offset to line and column', () => {
      const text = 'line1\nline2\nline3'
      expect(offsetToLineColumn(text, 0)).toEqual({ line: 1, column: 1, offset: 0 })
      expect(offsetToLineColumn(text, 6)).toEqual({ line: 2, column: 1, offset: 6 })
      expect(offsetToLineColumn(text, 12)).toEqual({ line: 3, column: 1, offset: 12 })
    })

    test('should handle CRLF line endings', () => {
      const text = 'line1\r\nline2'
      expect(offsetToLineColumn(text, 7)).toEqual({ line: 2, column: 1, offset: 7 })
    })

    test('should clamp offset to bounds', () => {
      const text = 'hello'
      expect(offsetToLineColumn(text, -1).offset).toBe(0)
      expect(offsetToLineColumn(text, 100).offset).toBe(5)
    })
  })

  describe('getErrorContext', () => {
    test('should return context lines around error', () => {
      const text = 'l1\nl2\nl3\nl4\nl5'
      const context = getErrorContext(text, 6, 2)
      expect(context.length).toBeGreaterThan(0)
      expect(context.some(l => l.isErrorLine)).toBe(true)
    })
  })

  describe('formatJSONContent and minifyJSONContent', () => {
    test('should format valid JSON', () => {
      const json = '{"a":1,"b":2}'
      const result = formatJSONContent(json)
      expect(result.error).toBeNull()
      expect(result.formatted).toBe(JSON.stringify({ a: 1, b: 2 }, null, 2))
    })

    test('should minify valid JSON', () => {
      const json = '{\n  "a": 1,\n  "b": 2\n}'
      const result = minifyJSONContent(json)
      expect(result.error).toBeNull()
      expect(result.minified).toBe('{"a":1,"b":2}')
    })

    test('should return error for invalid JSON', () => {
      const result = formatJSONContent('{invalid}')
      expect(result.error).toBeDefined()
      expect(result.formatted).toBeNull()
    })
  })

  describe('generateDiagnosticReport', () => {
    test('should generate report for valid result', () => {
      const result = validateJSON('{"a": 1}')
      const report = generateDiagnosticReport(result)
      expect(report).toContain('JSON 语法校验诊断报告')
      expect(report).toContain('合法')
    })

    test('should generate report for invalid result', () => {
      const result = validateJSON('{invalid}')
      const report = generateDiagnosticReport(result)
      expect(report).toContain('非法')
      expect(report).toContain(result.errorCode)
    })
  })
})
