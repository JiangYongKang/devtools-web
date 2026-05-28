/**
 * 算术表达式解析器
 * Tokenizer + Recursive Descent Parser
 * 安全解析，不使用 eval
 */

const TOKEN_TYPES = {
  NUMBER: 'NUMBER',
  HEX_NUMBER: 'HEX_NUMBER',
  OPERATOR: 'OPERATOR',
  PAREN: 'PAREN',
  COMMA: 'COMMA',
  FUNCTION: 'FUNCTION',
  EOF: 'EOF',
}

const FUNCTIONS = ['min', 'max', 'abs', 'sqrt', 'gcd', 'mod', 'pow', 'modpow', 'fib']

class Tokenizer {
  constructor(input) {
    this.input = input
    this.pos = 0
    this.tokens = []
  }

  tokenize() {
    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const char = this.input[this.pos]

      if (char === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
        this.readHexNumber()
        continue
      }

      if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek()))) {
        this.readNumber()
        continue
      }

      if (this.isLetter(char)) {
        this.readIdentifier()
        continue
      }

      if ('+-*/%^'.includes(char)) {
        this.tokens.push({
          type: TOKEN_TYPES.OPERATOR,
          value: char,
          pos: this.pos,
        })
        this.pos++
        continue
      }

      if ('()'.includes(char)) {
        this.tokens.push({
          type: TOKEN_TYPES.PAREN,
          value: char,
          pos: this.pos,
        })
        this.pos++
        continue
      }

      if (char === ',') {
        this.tokens.push({
          type: TOKEN_TYPES.COMMA,
          value: char,
          pos: this.pos,
        })
        this.pos++
        continue
      }

      throw new Error(`位置 ${this.pos}: 意外的字符 '${char}'`)
    }

    this.tokens.push({ type: TOKEN_TYPES.EOF, pos: this.pos })
    return this.tokens
  }

  skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++
    }
  }

  peek(offset = 1) {
    return this.input[this.pos + offset]
  }

  isDigit(char) {
    return /\d/.test(char)
  }

  isLetter(char) {
    return /[a-zA-Z_]/.test(char)
  }

  readNumber() {
    const start = this.pos
    let hasDecimal = false
    let hasExponent = false

    while (this.pos < this.input.length) {
      const char = this.input[this.pos]

      if (this.isDigit(char)) {
        this.pos++
        continue
      }

      if (char === '.' && !hasDecimal) {
        hasDecimal = true
        this.pos++
        continue
      }

      if ((char === 'e' || char === 'E') && !hasExponent) {
        hasExponent = true
        this.pos++
        if (this.input[this.pos] === '+' || this.input[this.pos] === '-') {
          this.pos++
        }
        continue
      }

      break
    }

    this.tokens.push({
      type: TOKEN_TYPES.NUMBER,
      value: this.input.slice(start, this.pos),
      pos: start,
    })
  }

  readHexNumber() {
    const start = this.pos
    this.pos += 2

    while (this.pos < this.input.length && /[0-9a-fA-F]/.test(this.input[this.pos])) {
      this.pos++
    }

    this.tokens.push({
      type: TOKEN_TYPES.HEX_NUMBER,
      value: this.input.slice(start, this.pos),
      pos: start,
    })
  }

  readIdentifier() {
    const start = this.pos

    while (this.pos < this.input.length && (this.isLetter(this.input[this.pos]) || this.isDigit(this.input[this.pos]))) {
      this.pos++
    }

    const name = this.input.slice(start, this.pos).toLowerCase()

    if (FUNCTIONS.includes(name)) {
      this.tokens.push({
        type: TOKEN_TYPES.FUNCTION,
        value: name,
        pos: start,
      })
    } else {
      throw new Error(`位置 ${start}: 未知函数 '${name}'`)
    }
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }

  parse() {
    const ast = this.parseExpression()
    if (this.current().type !== TOKEN_TYPES.EOF) {
      throw new Error(`位置 ${this.current().pos}: 意外的 token '${this.current().value}'`)
    }
    return ast
  }

  current() {
    return this.tokens[this.pos]
  }

  consume() {
    return this.tokens[this.pos++]
  }

  expect(type, value = null) {
    const token = this.current()
    if (token.type !== type || (value !== null && token.value !== value)) {
      throw new Error(
        `位置 ${token.pos}: 期望 '${value || type}'，实际是 '${token.value}'`
      )
    }
    return this.consume()
  }

  parseExpression() {
    return this.parseAdditive()
  }

  parseAdditive() {
    let left = this.parseMultiplicative()

    while (this.current().type === TOKEN_TYPES.OPERATOR &&
           (this.current().value === '+' || this.current().value === '-')) {
      const operator = this.consume()
      const right = this.parseMultiplicative()
      left = {
        type: 'BinaryExpression',
        operator: operator.value,
        left,
        right,
        pos: operator.pos,
      }
    }

    return left
  }

  parseMultiplicative() {
    let left = this.parsePower()

    while (this.current().type === TOKEN_TYPES.OPERATOR &&
           (this.current().value === '*' || this.current().value === '/' || this.current().value === '%')) {
      const operator = this.consume()
      const right = this.parsePower()
      left = {
        type: 'BinaryExpression',
        operator: operator.value,
        left,
        right,
        pos: operator.pos,
      }
    }

    return left
  }

  parsePower() {
    let left = this.parseUnary()

    while (this.current().type === TOKEN_TYPES.OPERATOR && this.current().value === '^') {
      const operator = this.consume()
      const right = this.parseUnary()
      left = {
        type: 'BinaryExpression',
        operator: '^',
        left,
        right,
        pos: operator.pos,
      }
    }

    return left
  }

  parseUnary() {
    if (this.current().type === TOKEN_TYPES.OPERATOR &&
        (this.current().value === '+' || this.current().value === '-')) {
      const operator = this.consume()
      const operand = this.parseUnary()
      return {
        type: 'UnaryExpression',
        operator: operator.value,
        operand,
        pos: operator.pos,
      }
    }

    return this.parsePrimary()
  }

  parsePrimary() {
    const token = this.current()

    if (token.type === TOKEN_TYPES.NUMBER || token.type === TOKEN_TYPES.HEX_NUMBER) {
      this.consume()
      return {
        type: 'Literal',
        value: token.value,
        numberType: token.type === TOKEN_TYPES.HEX_NUMBER ? 'hex' : 'decimal',
        pos: token.pos,
      }
    }

    if (token.type === TOKEN_TYPES.FUNCTION) {
      return this.parseFunctionCall()
    }

    if (token.type === TOKEN_TYPES.PAREN && token.value === '(') {
      this.consume()
      const expr = this.parseExpression()
      this.expect(TOKEN_TYPES.PAREN, ')')
      return expr
    }

    throw new Error(`位置 ${token.pos}: 意外的 token '${token.value}'`)
  }

  parseFunctionCall() {
    const func = this.consume()
    this.expect(TOKEN_TYPES.PAREN, '(')

    const args = []
    if (this.current().type !== TOKEN_TYPES.PAREN || this.current().value !== ')') {
      args.push(this.parseExpression())
      while (this.current().type === TOKEN_TYPES.COMMA) {
        this.consume()
        args.push(this.parseExpression())
      }
    }

    this.expect(TOKEN_TYPES.PAREN, ')')

    return {
      type: 'CallExpression',
      function: func.value,
      arguments: args,
      pos: func.pos,
    }
  }
}

export function tokenize(input) {
  const tokenizer = new Tokenizer(input)
  return tokenizer.tokenize()
}

export function parse(input) {
  const tokens = tokenize(input)
  const parser = new Parser(tokens)
  return parser.parse()
}

export function getErrorPosition(error) {
  const match = error.message.match(/位置 (\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

export { TOKEN_TYPES, Tokenizer, Parser }
