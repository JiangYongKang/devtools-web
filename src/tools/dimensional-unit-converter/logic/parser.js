import {
  createZeroVector,
  addVectors,
  subtractVectors,
  multiplyVector,
  vectorsEqual,
  isDimensionless,
  formatVector,
} from './dimensions.js'
import { findUnit, hasUnit, UNIT_LIBRARY } from './units.js'

/**
 * 令牌类型
 */
const TokenType = {
  UNIT: 'UNIT',
  NUMBER: 'NUMBER',
  MUL: 'MUL',
  DIV: 'DIV',
  POW: 'POW',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  EOF: 'EOF',
}

/**
 * 解析结果
 * @typedef {Object} ParseResult
 * @property {boolean} ok - 是否成功
 * @property {Object} [result] - 成功结果
 * @property {number[]} result.dimension - 归约后的量纲向量
 * @property {number} result.scale - 归约后的缩放因子（到 SI）
 * @property {boolean} [result.isTemperature] - 是否涉及温度单位
 * @property {string} [result.humanReadable] - 人类可读的规范化表示
 * @property {string} [result.unitString] - 规范化后的单位字符串
 * @property {Object} [error] - 错误信息
 * @property {string} error.message - 错误消息
 * @property {number} [error.position] - 错误位置
 */

/**
 * 解析错误
 */
class ParseError extends Error {
  constructor(message, position) {
    super(message)
    this.position = position
  }
}

/**
 * 词法分析器
 * @param {string} input - 输入字符串
 * @returns {Object[]} 令牌数组
 */
function tokenize(input) {
  const tokens = []
  let pos = 0
  const str = input.trim()
  const allSymbols = Object.keys(UNIT_LIBRARY).sort((a, b) => b.length - a.length)

  while (pos < str.length) {
    const c = str[pos]

    // 跳过空白
    if (/\s/.test(c)) {
      pos++
      continue
    }

    // 运算符
    if (c === '·' || c === '*' || c === '⋅') {
      tokens.push({ type: TokenType.MUL, value: '·', pos })
      pos++
      continue
    }
    if (c === '/') {
      tokens.push({ type: TokenType.DIV, value: '/', pos })
      pos++
      continue
    }
    if (c === '^') {
      tokens.push({ type: TokenType.POW, value: '^', pos })
      pos++
      continue
    }
    if (c === '(') {
      tokens.push({ type: TokenType.LPAREN, value: '(', pos })
      pos++
      continue
    }
    if (c === ')') {
      tokens.push({ type: TokenType.RPAREN, value: ')', pos })
      pos++
      continue
    }

    // 上标数字（如 s² 中的 ²）
    const superscriptMap = {
      '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4,
      '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9,
      '⁻': '-',
    }
    if (superscriptMap[c] !== undefined) {
      let numStr = ''
      while (pos < str.length && superscriptMap[str[pos]] !== undefined) {
        numStr += superscriptMap[str[pos]]
        pos++
      }
      const num = parseFloat(numStr)
      if (!isNaN(num)) {
        tokens.push({ type: TokenType.POW, value: '^', pos: pos - numStr.length })
        tokens.push({ type: TokenType.NUMBER, value: num, pos: pos - numStr.length })
      }
      continue
    }

    // 数字（用于指数）
    if (/[0-9.-]/.test(c)) {
      let numStr = ''
      const isExponentContext = pos > 0 && tokens.length > 0 &&
          tokens[tokens.length - 1].type === TokenType.POW

      if (c === '-' && isExponentContext) {
        numStr += '-'
        pos++
      }
      while (pos < str.length && /[0-9.]/.test(str[pos])) {
        numStr += str[pos]
        pos++
      }

      if (numStr === '1' && !isExponentContext && hasUnit('1')) {
        tokens.push({ type: TokenType.UNIT, value: '1', pos: pos - numStr.length })
        continue
      }

      if (numStr && numStr !== '-') {
        const num = parseFloat(numStr)
        if (!isNaN(num)) {
          tokens.push({ type: TokenType.NUMBER, value: num, pos: pos - numStr.length })
          continue
        }
      }
    }

    // 单位符号（最长匹配）
    let matched = false
    for (const symbol of allSymbols) {
      if (str.startsWith(symbol, pos)) {
        tokens.push({ type: TokenType.UNIT, value: symbol, pos })
        pos += symbol.length
        matched = true
        break
      }
    }

    if (!matched) {
      // 尝试匹配希腊字母或特殊符号单独作为单位
      const unit = findUnit(c)
      if (unit) {
        tokens.push({ type: TokenType.UNIT, value: c, pos })
        pos++
      } else {
        throw new ParseError(`无法识别的字符或单位: "${c}"`, pos)
      }
    }
  }

  tokens.push({ type: TokenType.EOF, value: '', pos })
  return tokens
}

/**
 * 语法分析器
 * 语法:
 *   expr → term ( (MUL|DIV) term )*
 *   term → factor ( MUL? factor )*   [处理隐式乘法]
 *   factor → atom ( POW NUMBER )?
 *   atom → UNIT | LPAREN expr RPAREN
 */
class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }

  peek() {
    return this.tokens[this.pos]
  }

  consume(type) {
    const token = this.tokens[this.pos]
    if (token.type !== type) {
      throw new ParseError(
        `期望 ${type}，但得到 ${token.type} "${token.value}"`,
        token.pos,
      )
    }
    this.pos++
    return token
  }

  /**
   * 解析表达式
   * @returns {Object} { dimension, scale, isTemperature, parts }
   */
  parseExpr() {
    let result = this.parseTerm()

    while (this.peek().type === TokenType.MUL || this.peek().type === TokenType.DIV) {
      const op = this.consume(this.peek().type)
      const right = this.parseTerm()

      if (op.type === TokenType.MUL) {
        result = {
          dimension: addVectors(result.dimension, right.dimension),
          scale: result.scale * right.scale,
          isTemperature: result.isTemperature || right.isTemperature,
          parts: [...result.parts, '·', ...right.parts],
        }
      } else {
        result = {
          dimension: subtractVectors(result.dimension, right.dimension),
          scale: result.scale / right.scale,
          isTemperature: result.isTemperature || right.isTemperature,
          parts: [...result.parts, '/', ...right.parts],
        }
      }
    }

    return result
  }

  /**
   * 解析项（处理隐式乘法）
   */
  parseTerm() {
    let result = this.parseFactor()

    // 隐式乘法：单位后面紧跟另一个单位、数字指数或左括号
    while (
      this.peek().type === TokenType.UNIT ||
      this.peek().type === TokenType.LPAREN ||
      (this.peek().type === TokenType.NUMBER &&
        this.pos > 0 &&
        this.tokens[this.pos - 1].type !== TokenType.POW)
    ) {
      const right = this.parseFactor()
      result = {
        dimension: addVectors(result.dimension, right.dimension),
        scale: result.scale * right.scale,
        isTemperature: result.isTemperature || right.isTemperature,
        parts: [...result.parts, '·', ...right.parts],
      }
    }

    return result
  }

  /**
   * 解析因子（处理指数）
   */
  parseFactor() {
    let result = this.parseAtom()

    if (this.peek().type === TokenType.POW) {
      this.consume(TokenType.POW)
      const numToken = this.consume(TokenType.NUMBER)
      const exponent = numToken.value

      result = {
        dimension: multiplyVector(result.dimension, exponent),
        scale: Math.pow(result.scale, exponent),
        isTemperature: result.isTemperature,
        parts: [...result.parts, `^${exponent}`],
      }
    }

    return result
  }

  /**
   * 解析原子（单位或括号）
   */
  parseAtom() {
    const token = this.peek()

    if (token.type === TokenType.UNIT) {
      this.consume(TokenType.UNIT)
      const unit = findUnit(token.value)
      if (!unit) {
        throw new ParseError(`未知的单位符号: "${token.value}"`, token.pos)
      }
      return {
        dimension: [...unit.dimension],
        scale: unit.scale,
        isTemperature: unit.isTemperature || false,
        parts: [token.value],
      }
    }

    if (token.type === TokenType.LPAREN) {
      this.consume(TokenType.LPAREN)
      const result = this.parseExpr()
      this.consume(TokenType.RPAREN)
      return {
        ...result,
        parts: ['(', ...result.parts, ')'],
      }
    }

    throw new ParseError(
      `期望单位符号或左括号，但得到 ${token.type} "${token.value}"`,
      token.pos,
    )
  }
}

/**
 * 规范化单位字符串为人类可读形式
 * @param {string[]} parts - 解析得到的部分
 * @returns {string}
 */
function normalizeParts(parts) {
  return parts.join('')
}

/**
 * 解析单位字符串并归约到 SI 基维
 * @param {string} unitStr - 单位字符串，如 "kg·m/s²"、"N"、"km/h"
 * @returns {ParseResult}
 */
export function parseUnit(unitStr) {
  if (!unitStr || !unitStr.trim()) {
    return {
      ok: false,
      error: { message: '单位字符串不能为空' },
    }
  }

  try {
    const tokens = tokenize(unitStr)
    const parser = new Parser(tokens)
    const result = parser.parseExpr()

    // 检查是否还有未解析的令牌
    if (parser.peek().type !== TokenType.EOF) {
      throw new ParseError(
        `表达式未完全解析，在位置 ${parser.peek().pos} 处有多余内容`,
        parser.peek().pos,
      )
    }

    return {
      ok: true,
      result: {
        dimension: result.dimension,
        scale: result.scale,
        isTemperature: result.isTemperature,
        humanReadable: normalizeParts(result.parts),
        unitString: normalizeParts(result.parts),
      },
    }
  } catch (e) {
    if (e instanceof ParseError) {
      return {
        ok: false,
        error: { message: e.message, position: e.position },
      }
    }
    return {
      ok: false,
      error: { message: e.message },
    }
  }
}

/**
 * 解析并返回量纲向量（快捷方法）
 * @param {string} unitStr
 * @returns {number[]|null}
 */
export function getDimensionVector(unitStr) {
  const r = parseUnit(unitStr)
  return r.ok ? r.result.dimension : null
}

/**
 * 判断两个单位是否量纲相容
 * @param {string} unitStr1
 * @param {string} unitStr2
 * @returns {boolean}
 */
export function areDimensionsCompatible(unitStr1, unitStr2) {
  const r1 = parseUnit(unitStr1)
  const r2 = parseUnit(unitStr2)
  if (!r1.ok || !r2.ok) return false
  return vectorsEqual(r1.result.dimension, r2.result.dimension)
}

/**
 * 格式化量纲解析结果为摘要
 * @param {Object} parseResult
 * @returns {string}
 */
export function formatParseResult(parseResult) {
  if (!parseResult.ok) {
    return `错误: ${parseResult.error.message}`
  }
  const { dimension, scale, isTemperature } = parseResult.result
  const dimStr = formatVector(dimension)
  const dimless = isDimensionless(dimension)
  return `量纲: ${dimStr}${dimless ? '（无量纲）' : ''} | 缩放: ${scale}${isTemperature ? ' | 含温度（需仿射变换）' : ''}`
}

export { TokenType, tokenize, ParseError, vectorsEqual, isDimensionless, formatVector }
