import { TOKEN_TYPES } from './constants.js'

function parseCharClass(pattern, startIndex) {
  let i = startIndex + 1
  const chars = []
  let negated = false
  let ranges = []

  if (pattern[i] === '!' || pattern[i] === '^') {
    negated = true
    i++
  }

  while (i < pattern.length) {
    if (pattern[i] === ']' && i > startIndex + (negated ? 2 : 1)) {
      break
    }

    if (i + 2 < pattern.length && pattern[i + 1] === '-' && pattern[i + 2] !== ']') {
      const startChar = pattern[i]
      const endChar = pattern[i + 2]
      ranges.push({ start: startChar, end: endChar })
      chars.push(startChar, endChar)
      i += 3
    } else {
      chars.push(pattern[i])
      i++
    }
  }

  const matchedLength = i - startIndex + 1

  return {
    matched: pattern.substring(startIndex, Math.min(i + 1, pattern.length)),
    chars: chars,
    ranges: ranges,
    negated: negated,
    isComplete: pattern[i] === ']',
    length: Math.min(matchedLength, pattern.length - startIndex),
  }
}

function tokenizePattern(pattern) {
  const tokens = []
  let i = 0

  while (i < pattern.length) {
    const char = pattern[i]

    if (char === '*') {
      if (i + 1 < pattern.length && pattern[i + 1] === '*') {
        if (
          (i === 0 || pattern[i - 1] === '/') &&
          (i + 2 === pattern.length || pattern[i + 2] === '/')
        ) {
          tokens.push({ type: TOKEN_TYPES.DOUBLE_ASTERISK, value: '**', position: i })
          i += 2
          continue
        }
      }
      tokens.push({ type: TOKEN_TYPES.ASTERISK, value: '*', position: i })
      i++
      continue
    }

    if (char === '?') {
      tokens.push({ type: TOKEN_TYPES.QUESTION_MARK, value: '?', position: i })
      i++
      continue
    }

    if (char === '[') {
      const charClassResult = parseCharClass(pattern, i)
      tokens.push({
        type: TOKEN_TYPES.CHAR_CLASS,
        value: charClassResult.matched,
        chars: charClassResult.chars,
        ranges: charClassResult.ranges,
        negated: charClassResult.negated,
        isComplete: charClassResult.isComplete,
        position: i,
      })
      i += charClassResult.length
      continue
    }

    if (char === '/') {
      if (i === 0) {
        tokens.push({ type: TOKEN_TYPES.LEADING_SLASH, value: '/', position: i })
      } else if (i === pattern.length - 1) {
        tokens.push({ type: TOKEN_TYPES.TRAILING_SLASH, value: '/', position: i })
      } else {
        tokens.push({ type: TOKEN_TYPES.SLASH, value: '/', position: i })
      }
      i++
      continue
    }

    tokens.push({ type: TOKEN_TYPES.LITERAL, value: char, position: i })
    i++
  }

  return tokens
}

function analyzePattern(rawLine, lineNumber) {
  const trimmed = rawLine.trim()

  if (trimmed.length === 0) {
    return {
      lineNumber,
      rawPattern: rawLine,
      isComment: false,
      isEmpty: true,
      isNegative: false,
      isDirectoryOnly: false,
      isAnchored: false,
      tokens: [],
      warnings: [],
      features: [],
    }
  }

  if (trimmed.startsWith('#')) {
    return {
      lineNumber,
      rawPattern: rawLine,
      isComment: true,
      isEmpty: false,
      comment: trimmed,
      tokens: [],
      warnings: [],
      features: [],
    }
  }

  let pattern = trimmed
  let isNegative = false

  if (pattern.startsWith('!')) {
    isNegative = true
    pattern = pattern.substring(1)
  }

  const isDirectoryOnly = pattern.endsWith('/')
  const isAnchored = pattern.startsWith('/')

  const patternForTokenizing = isDirectoryOnly
    ? pattern.slice(0, -1) + (pattern.length > 1 ? '/' : '')
    : pattern

  const tokens = tokenizePattern(patternForTokenizing)

  const warnings = []
  const features = []

  const literalBackslashes = rawLine.match(/\\/)
  if (literalBackslashes) {
    warnings.push({
      type: 'unsupported',
      message: '模式包含反斜杠（\\），本工具不支持转义字符处理，将按字面字符解释',
    })
    features.push({ type: 'backslash', description: '反斜杠（可能是转义）' })
  }

  if (rawLine.match(/\{[^}]*\}/)) {
    warnings.push({
      type: 'unsupported',
      message: '模式包含大括号（{}），本工具不支持大括号展开语法',
    })
    features.push({ type: 'brace_expansion', description: '大括号展开' })
  }

  if (rawLine.match(/\([^)]*\)/)) {
    warnings.push({
      type: 'unsupported',
      message: '模式包含圆括号（()），这是 Git 2.34+ 新增的语法，本工具不支持',
    })
    features.push({ type: 'paren_syntax', description: '圆括号语法' })
  }

  for (const token of tokens) {
    switch (token.type) {
      case TOKEN_TYPES.DOUBLE_ASTERISK:
        features.push({ type: 'double_asterisk', description: '双星号（**）' })
        break
      case TOKEN_TYPES.ASTERISK:
        features.push({ type: 'asterisk', description: '星号（*）' })
        break
      case TOKEN_TYPES.QUESTION_MARK:
        features.push({ type: 'question_mark', description: '问号（?）' })
        break
      case TOKEN_TYPES.CHAR_CLASS:
        if (!token.isComplete) {
          warnings.push({
            type: 'incomplete_char_class',
            message: '字符类（[）未闭合，可能不是有效的 .gitignore 模式',
          })
        }
        features.push({
          type: 'char_class',
          description: token.negated ? '字符类（取反）' : '字符类',
          details: token,
        })
        break
      case TOKEN_TYPES.LEADING_SLASH:
        features.push({ type: 'leading_slash', description: '前导斜杠（根目录限定）' })
        break
      case TOKEN_TYPES.TRAILING_SLASH:
        features.push({ type: 'trailing_slash', description: '末尾斜杠（仅目录）' })
        break
    }
  }

  if (isNegative) {
    features.unshift({ type: 'negation', description: '否定模式（!）' })
  }

  return {
    lineNumber,
    rawPattern: rawLine,
    effectivePattern: pattern,
    isComment: false,
    isEmpty: false,
    isNegative,
    isDirectoryOnly,
    isAnchored,
    tokens,
    warnings,
    features,
  }
}

function parseInput(input) {
  const lines = String(input).split(/\r?\n/)
  return lines.map((line, index) => analyzePattern(line, index + 1))
}

export { parseCharClass, tokenizePattern, analyzePattern, parseInput }
