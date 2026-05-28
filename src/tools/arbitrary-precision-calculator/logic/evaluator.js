/**
 * 表达式求值器
 * 支持 Number / BigInt / Decimal 三种模式
 */

import { parse, getErrorPosition } from './parser.js'
import * as BigIntOps from './bigint.js'
import { Decimal, ROUNDING_MODES } from './decimal.js'
import { computeFibonacci } from './examples.js'

export const EVAL_MODES = {
  NUMBER: 'number',
  BIGINT: 'bigint',
  DECIMAL: 'decimal',
}

function hasDecimalPart(str) {
  return typeof str === 'string' && str.includes('.') && str.split('.')[1].replace(/0+$/, '').length > 0
}

export function evaluateNumber(ast) {
  function evaluate(node) {
    switch (node.type) {
      case 'Literal': {
        const value = node.numberType === 'hex'
          ? parseInt(node.value, 16)
          : parseFloat(node.value)
        return value
      }

      case 'UnaryExpression': {
        const operand = evaluate(node.operand)
        if (node.operator === '-') return -operand
        if (node.operator === '+') return operand
        throw new Error(`未知一元运算符: ${node.operator}`)
      }

      case 'BinaryExpression': {
        const left = evaluate(node.left)
        const right = evaluate(node.right)
        switch (node.operator) {
          case '+': return left + right
          case '-': return left - right
          case '*': return left * right
          case '/': return left / right
          case '%': return left % right
          case '^': return Math.pow(left, right)
          default: throw new Error(`未知二元运算符: ${node.operator}`)
        }
      }

      case 'CallExpression': {
        const args = node.arguments.map(evaluate)
        switch (node.function) {
          case 'min': return Math.min(...args)
          case 'max': return Math.max(...args)
          case 'abs': return Math.abs(args[0])
          case 'sqrt': return Math.sqrt(args[0])
          case 'gcd': return numberGcd(args[0], args[1])
          case 'mod': return args[0] % args[1]
          case 'pow': return Math.pow(args[0], args[1])
          case 'modpow': return Math.pow(args[0], args[1]) % args[2]
          case 'fib': return Number(computeFibonacci(Math.round(args[0])))
          default: throw new Error(`未知函数: ${node.function}`)
        }
      }

      default:
        throw new Error(`未知节点类型: ${node.type}`)
    }
  }

  return evaluate(ast)
}

function numberGcd(a, b) {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

export function evaluateBigInt(ast) {
  function evaluate(node) {
    switch (node.type) {
      case 'Literal': {
        if (hasDecimalPart(node.value)) {
          throw new Error('BigInt 不支持小数')
        }
        return BigIntOps.parseBigInt(node.value)
      }

      case 'UnaryExpression': {
        const operand = evaluate(node.operand)
        if (node.operator === '-') return -operand
        if (node.operator === '+') return operand
        throw new Error(`未知一元运算符: ${node.operator}`)
      }

      case 'BinaryExpression': {
        const left = evaluate(node.left)
        const right = evaluate(node.right)
        switch (node.operator) {
          case '+': return left + right
          case '-': return left - right
          case '*': return left * right
          case '/':
            if (right === 0n) throw new Error('除零错误: BigInt 除数不能为零')
            return left / right
          case '%': return BigIntOps.mod(left, right)
          case '^': return BigIntOps.pow(left, right)
          default: throw new Error(`未知二元运算符: ${node.operator}`)
        }
      }

      case 'CallExpression': {
        const args = node.arguments.map(evaluate)
        switch (node.function) {
          case 'min': return BigIntOps.min(...args)
          case 'max': return BigIntOps.max(...args)
          case 'abs': return BigIntOps.abs(args[0])
          case 'sqrt':
            return BigInt(Math.floor(Math.sqrt(Number(args[0]))))
          case 'gcd': return BigIntOps.gcd(args[0], args[1])
          case 'mod': return BigIntOps.mod(args[0], args[1])
          case 'pow': return BigIntOps.pow(args[0], args[1])
          case 'modpow': return BigIntOps.modPow(args[0], args[1], args[2])
          case 'fib': return computeFibonacci(Math.round(Number(args[0])))
          default: throw new Error(`未知函数: ${node.function}`)
        }
      }

      default:
        throw new Error(`未知节点类型: ${node.type}`)
    }
  }

  return evaluate(ast)
}

export function evaluateDecimal(ast, config = {}) {
  function evaluate(node) {
    switch (node.type) {
      case 'Literal': {
        const value = node.numberType === 'hex'
          ? BigInt(node.value).toString()
          : node.value
        return new Decimal(value, config)
      }

      case 'UnaryExpression': {
        const operand = evaluate(node.operand)
        if (node.operator === '-') return operand.negate()
        if (node.operator === '+') return operand
        throw new Error(`未知一元运算符: ${node.operator}`)
      }

      case 'BinaryExpression': {
        const left = evaluate(node.left)
        const right = evaluate(node.right)
        switch (node.operator) {
          case '+': return left.add(right)
          case '-': return left.sub(right)
          case '*': return left.mul(right)
          case '/': return left.div(right, config.scale)
          case '%': {
            const div = left.div(right, 0)
            const floorDiv = new Decimal(Math.floor(div.toNumber()), config)
            return left.sub(right.mul(floorDiv))
          }
          case '^': {
            const exp = Math.round(right.toNumber())
            if (exp < 0) throw new Error('Decimal 幂运算不支持负指数')
            let result = new Decimal(1, config)
            const base = left
            for (let i = 0; i < exp; i++) {
              result = result.mul(base)
            }
            return result
          }
          default: throw new Error(`未知二元运算符: ${node.operator}`)
        }
      }

      case 'CallExpression': {
        const args = node.arguments.map(evaluate)
        switch (node.function) {
          case 'min':
            return args.reduce((a, b) => (a.lessThan(b) ? a : b))
          case 'max':
            return args.reduce((a, b) => (a.greaterThan(b) ? a : b))
          case 'abs': return args[0].abs()
          case 'sqrt': return args[0].sqrt()
          case 'gcd': {
            let a = args[0].abs()
            let b = args[1].abs()
            while (!b.equals(new Decimal(0))) {
              const temp = b
              const div = a.div(b, 0)
              const floorDiv = new Decimal(Math.floor(div.toNumber()), config)
              b = a.sub(b.mul(floorDiv))
              a = temp
            }
            return a
          }
          case 'mod': {
            const [a, b] = args
            const div = a.div(b, 0)
            const floorDiv = new Decimal(Math.floor(div.toNumber()), config)
            return a.sub(b.mul(floorDiv))
          }
          case 'pow': {
            const [base, exp] = args
            const exponent = Math.round(exp.toNumber())
            if (exponent < 0) throw new Error('Decimal 幂运算不支持负指数')
            let result = new Decimal(1, config)
            for (let i = 0; i < exponent; i++) {
              result = result.mul(base)
            }
            return result
          }
          case 'modpow': {
            const [base, exp, mod] = args
            const exponent = Math.round(exp.toNumber())
            if (exponent < 0) throw new Error('模幂不支持负指数')
            let result = new Decimal(1, config)
            let b = base
            let e = exponent
            const m = mod
            b = b.sub(m.mul(new Decimal(Math.floor(b.div(m, 0).toNumber()), config)))
            while (e > 0) {
              if (e % 2 === 1) {
                result = result.mul(b)
                result = result.sub(m.mul(new Decimal(Math.floor(result.div(m, 0).toNumber()), config)))
              }
              e = Math.floor(e / 2)
              b = b.mul(b)
              b = b.sub(m.mul(new Decimal(Math.floor(b.div(m, 0).toNumber()), config)))
            }
            return result
          }
          case 'fib': {
            const n = Math.round(args[0].toNumber())
            return new Decimal(computeFibonacci(n).toString(), config)
          }
          default: throw new Error(`未知函数: ${node.function}`)
        }
      }

      default:
        throw new Error(`未知节点类型: ${node.type}`)
    }
  }

  return evaluate(ast)
}

export function checkNumberIssues(value, originalValue = null) {
  const issues = []

  if (typeof value !== 'number') {
    return issues
  }

  if (!isFinite(value)) {
    issues.push({
      type: value > 0 ? 'infinity' : 'negative-infinity',
      message: '结果为 Infinity（溢出）',
      severity: 'error',
    })
    return issues
  }

  if (Number.isInteger(value)) {
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      issues.push({
        type: 'overflow',
        message: `超出安全整数范围 (|x| > 2^53-1)，可能丢失精度`,
        severity: 'warning',
      })
    }
  }

  if (originalValue !== null && typeof originalValue === 'string') {
    const parsed = parseFloat(originalValue)
    if (parsed.toString() !== originalValue && !originalValue.includes('e')) {
      const decimalCount = (originalValue.split('.')[1] || '').length
      if (decimalCount > 15) {
        issues.push({
          type: 'precision-loss',
          message: `输入精度超过 Number 限制 (${decimalCount} > 15)，已丢失精度`,
          severity: 'warning',
        })
      }
    }
  }

  return issues
}

export function getNumberBinaryRepresentation(value) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return null
  }

  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setFloat64(0, value, false)

  let binary = ''
  for (let i = 0; i < 8; i++) {
    binary += view.getUint8(i).toString(2).padStart(8, '0')
  }

  const sign = binary[0]
  const exponent = binary.slice(1, 12)
  const mantissa = binary.slice(12)

  const bigIntValue = view.getBigUint64(0, false)
  let hexStr = bigIntValue.toString(16).toUpperCase()
  while (hexStr.length < 16) {
    hexStr = '0' + hexStr
  }

  return {
    binary,
    sign: parseInt(sign, 2),
    exponent: parseInt(exponent, 2) - 1023,
    mantissa,
    hex: '0x' + hexStr,
  }
}

export function evaluateAllModes(expression, decimalConfig = {}) {
  const result = {
    expression,
    success: false,
    error: null,
    errorPosition: null,
    number: null,
    bigint: null,
    decimal: null,
    comparison: null,
  }

  try {
    const ast = parse(expression)

    try {
      const numValue = evaluateNumber(ast)
      const issues = checkNumberIssues(numValue, expression)
      const binary = getNumberBinaryRepresentation(numValue)
      result.number = {
        value: numValue,
        issues,
        binary,
        stringValue: isFinite(numValue) ? numValue.toString() : (numValue > 0 ? 'Infinity' : '-Infinity'),
        isInfinity: !isFinite(numValue),
      }
    } catch (e) {
      result.number = { error: e.message }
    }

    try {
      const bigintValue = evaluateBigInt(ast)
      result.bigint = {
        value: bigintValue,
        stringValue: bigintValue.toString(),
        hexValue: '0x' + bigintValue.toString(16).toUpperCase(),
      }
    } catch (e) {
      result.bigint = { error: e.message }
    }

    try {
      const decimalValue = evaluateDecimal(ast, decimalConfig)
      result.decimal = {
        value: decimalValue,
        stringValue: decimalValue.toString(),
        expValue: decimalValue.toExponential(20),
        isInfinity: decimalValue.isInfinity,
      }
    } catch (e) {
      result.decimal = { error: e.message }
    }

    result.comparison = buildComparison(result)

    result.success = true
  } catch (e) {
    result.error = e.message
    result.errorPosition = getErrorPosition(e)
  }

  return result
}

function buildComparison(result) {
  const notes = []

  const numIsInf = result.number && result.number.isInfinity
  const bigHasErr = result.bigint && result.bigint.error
  const decIsInf = result.decimal && result.decimal.isInfinity

  if (numIsInf && bigHasErr) {
    notes.push({
      type: 'info',
      message: 'Number 溢出为 Infinity，BigInt 报错（除零或小数不支持），这是类型差异的正常表现',
    })
  }

  if (numIsInf && !bigHasErr) {
    notes.push({
      type: 'warning',
      message: 'Number 溢出为 Infinity，但 BigInt/Decimal 仍可精确计算',
    })
  }

  if (bigHasErr && result.bigint.error.includes('小数')) {
    notes.push({
      type: 'info',
      message: 'BigInt 不支持小数运算，请使用 Number 或 Decimal 模式',
    })
  }

  if (bigHasErr && result.bigint.error.includes('除零')) {
    notes.push({
      type: 'info',
      message: '除零时 Number 返回 Infinity，BigInt 报错，Decimal 返回 Infinity',
    })
  }

  if (result.number && !result.number.error && result.bigint && !result.bigint.error) {
    const numStr = result.number.stringValue
    const bigStr = result.bigint.stringValue
    if (numStr !== bigStr && numStr !== 'Infinity' && numStr !== '-Infinity') {
      notes.push({
        type: 'warning',
        message: `Number 与 BigInt 结果不一致：Number=${numStr}，BigInt=${bigStr}`,
      })
    }
  }

  return notes.length > 0 ? notes : null
}

export { ROUNDING_MODES }
