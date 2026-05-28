import { describe, expect, test } from 'vitest'
import {
  parse,
  tokenize,
  evaluateNumber,
  evaluateBigInt,
  evaluateDecimal,
  evaluateAllModes,
  checkNumberIssues,
  getNumberBinaryRepresentation,
  ROUNDING_MODES,
} from '../logic/index.js'

describe('表达式解析器', () => {
  describe('Tokenizer', () => {
    test('tokenize 简单表达式', () => {
      const tokens = tokenize('1 + 2')
      expect(tokens.length).toBeGreaterThan(3)
    })

    test('tokenize 十六进制数', () => {
      const tokens = tokenize('0xFF + 0x1A')
      expect(tokens.some(t => t.type === 'HEX_NUMBER')).toBe(true)
    })

    test('tokenize 函数调用', () => {
      const tokens = tokenize('min(1, 2)')
      expect(tokens.some(t => t.type === 'FUNCTION')).toBe(true)
    })

    test('tokenize fib 函数', () => {
      const tokens = tokenize('fib(100)')
      const funcToken = tokens.find(t => t.type === 'FUNCTION')
      expect(funcToken).toBeDefined()
      expect(funcToken.value).toBe('fib')
    })
  })

  describe('Parser', () => {
    test('解析简单算术表达式', () => {
      const ast = parse('1 + 2 * 3')
      expect(ast.type).toBe('BinaryExpression')
    })

    test('解析带括号的表达式', () => {
      const ast = parse('(1 + 2) * 3')
      expect(ast.operator).toBe('*')
    })

    test('解析函数调用', () => {
      const ast = parse('max(10, 20)')
      expect(ast.type).toBe('CallExpression')
      expect(ast.function).toBe('max')
    })

    test('解析科学计数法', () => {
      const ast = parse('1e10 + 2.5e-3')
      expect(ast.type).toBe('BinaryExpression')
    })

    test('解析 fib 函数', () => {
      const ast = parse('fib(1000)')
      expect(ast.type).toBe('CallExpression')
      expect(ast.function).toBe('fib')
    })

    test('抛出语法错误', () => {
      expect(() => parse('1 +')).toThrow()
      expect(() => parse('unknown(1)')).toThrow()
    })
  })
})

describe('表达式求值器', () => {
  describe('Number 模式', () => {
    test('基本算术运算', () => {
      const ast = parse('2 + 3 * 4')
      expect(evaluateNumber(ast)).toBe(14)
    })

    test('幂运算', () => {
      const ast = parse('2 ^ 10')
      expect(evaluateNumber(ast)).toBe(1024)
    })

    test('函数调用', () => {
      const ast = parse('min(5, 3, 9)')
      expect(evaluateNumber(ast)).toBe(3)
    })

    test('0.1 + 0.2 浮点精度问题', () => {
      const ast = parse('0.1 + 0.2')
      expect(evaluateNumber(ast)).not.toBe(0.3)
    })
  })

  describe('BigInt 模式', () => {
    test('基本算术运算', () => {
      const ast = parse('12345678901234567890 + 98765432109876543210')
      const result = evaluateBigInt(ast)
      expect(result.toString()).toBe('111111111011111111100')
    })

    test('大数幂运算', () => {
      const ast = parse('2 ^ 64')
      const result = evaluateBigInt(ast)
      expect(result.toString()).toBe('18446744073709551616')
    })

    test('模幂运算', () => {
      const ast = parse('modpow(2, 10, 1000)')
      const result = evaluateBigInt(ast)
      expect(result.toString()).toBe('24')
    })

    test('gcd 运算', () => {
      const ast = parse('gcd(48, 18)')
      const result = evaluateBigInt(ast)
      expect(result.toString()).toBe('6')
    })

    test('小数表达式应报错', () => {
      const ast = parse('0.1 + 0.2')
      expect(() => evaluateBigInt(ast)).toThrow('BigInt 不支持小数')
    })

    test('除零应报错', () => {
      const ast = parse('1 / 0')
      expect(() => evaluateBigInt(ast)).toThrow('除零错误')
    })

    test('fib 函数', () => {
      const ast = parse('fib(10)')
      const result = evaluateBigInt(ast)
      expect(result.toString()).toBe('55')
    })
  })

  describe('Decimal 模式', () => {
    test('0.1 + 0.2 精确计算', () => {
      const ast = parse('0.1 + 0.2')
      const result = evaluateDecimal(ast, { precision: 40, scale: 34, roundingMode: ROUNDING_MODES.ROUND_HALF_UP })
      expect(result.toString()).toBe('0.3')
    })

    test('平方根运算', () => {
      const ast = parse('sqrt(2)')
      const result = evaluateDecimal(ast, { precision: 40, scale: 20, roundingMode: ROUNDING_MODES.ROUND_HALF_UP })
      expect(result.toString().startsWith('1.4142')).toBe(true)
    })
  })

  describe('三路求值对比', () => {
    test('evaluateAllModes 基本功能', () => {
      const result = evaluateAllModes('0.1 + 0.2')
      expect(result.success).toBe(true)
      expect(result.number).toBeDefined()
      expect(result.bigint).toBeDefined()
      expect(result.decimal).toBeDefined()
    })

    test('检测 Number 模式的精度问题', () => {
      const result = evaluateAllModes('0.1 + 0.2')
      expect(result.number.stringValue).not.toBe('0.3')
      expect(result.decimal.stringValue).toBe('0.3')
    })

    test('BigInt 小数表达式返回 error', () => {
      const result = evaluateAllModes('0.1 + 0.2')
      expect(result.bigint.error).toContain('BigInt 不支持小数')
    })

    test('除零时三种模式对比', () => {
      const result = evaluateAllModes('1 / 0')
      expect(result.success).toBe(true)
      expect(result.number.isInfinity).toBe(true)
      expect(result.bigint.error).toBeDefined()
      expect(result.decimal.isInfinity).toBe(true)
      expect(result.comparison).toBeDefined()
    })

    test('fib(10) 三路求值', () => {
      const result = evaluateAllModes('fib(10)')
      expect(result.success).toBe(true)
      expect(result.bigint.stringValue).toBe('55')
    })

    test('检测 Number 模式的溢出', () => {
      const result = evaluateAllModes('2 ^ 100')
      expect(result.bigint.stringValue).toBeDefined()
    })

    test('对比提示信息', () => {
      const result = evaluateAllModes('0.1 + 0.2')
      expect(result.comparison).toBeDefined()
      expect(result.comparison.length).toBeGreaterThan(0)
    })
  })
})

describe('溢出和精度检测', () => {
  describe('checkNumberIssues', () => {
    test('检测安全整数溢出', () => {
      const issues = checkNumberIssues(Number.MAX_SAFE_INTEGER + 1)
      expect(issues.some(i => i.type === 'overflow')).toBe(true)
    })

    test('检测 Infinity', () => {
      const issues = checkNumberIssues(Infinity)
      expect(issues.some(i => i.type === 'infinity')).toBe(true)
    })
  })

  describe('getNumberBinaryRepresentation', () => {
    test('获取 IEEE 754 二进制表示', () => {
      const result = getNumberBinaryRepresentation(0.1)
      expect(result).toBeDefined()
      expect(result.hex).toBeDefined()
      expect(result.sign).toBe(0)
    })

    test('0.1 的二进制表示（经典浮点问题）', () => {
      const result = getNumberBinaryRepresentation(0.1)
      expect(result.hex.startsWith('0x3FB999')).toBe(true)
    })
  })
})
