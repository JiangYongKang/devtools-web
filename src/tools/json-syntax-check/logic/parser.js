function offsetToLineColumn(text, offset) {
  const safeOffset = Math.max(0, Math.min(offset, text.length))
  let line = 1
  let column = 1
  for (let i = 0; i < safeOffset; i++) {
    if (text[i] === '\n') {
      line++
      column = 1
    } else if (text[i] === '\r') {
      if (text[i + 1] === '\n') {
        i++
      }
      line++
      column = 1
    } else {
      column++
    }
  }
  return { line, column, offset: safeOffset }
}

function getErrorContext(text, offset, contextLines = 2) {
  const { line } = offsetToLineColumn(text, offset)
  const lines = text.split(/\r?\n/)
  const startLine = Math.max(0, line - 1 - contextLines)
  const endLine = Math.min(lines.length, line + contextLines)
  const context = []
  for (let i = startLine; i < endLine; i++) {
    const lineNum = i + 1
    const isErrorLine = lineNum === line
    context.push({
      lineNumber: lineNum,
      content: lines[i],
      isErrorLine,
    })
  }
  return context
}

function extractPositionFromNativeError(errorMessage, text) {
  if (!errorMessage) return null
  const positionMatch = errorMessage.match(/position\s+(\d+)/i)
  if (positionMatch) {
    return {
      offset: parseInt(positionMatch[1], 10),
      source: 'native-position',
    }
  }
  const atLineMatch = errorMessage.match(/at\s+line\s+(\d+)/i)
  if (atLineMatch) {
    const line = parseInt(atLineMatch[1], 10)
    const colMatch = errorMessage.match(/column\s+(\d+)/i)
    const column = colMatch ? parseInt(colMatch[1], 10) : 1
    let offset = 0
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      offset += lines[i].length + (text.indexOf('\n', offset) !== -1 ? 1 : 0)
    }
    offset += column - 1
    return { offset, source: 'native-line-column' }
  }
  return null
}

function simpleScanForErrorPosition(text) {
  let depth = 0
  let inString = false
  let escapeNext = false
  let lastOpenPosition = -1
  let lastKeyStart = -1
  let lastColonSeen = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escapeNext) {
        escapeNext = false
      } else if (ch === '\\') {
        escapeNext = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      lastKeyStart = i
      continue
    }
    if (ch === '{' || ch === '[') {
      depth++
      lastOpenPosition = i
      lastColonSeen = false
    } else if (ch === '}' || ch === ']') {
      depth--
      lastColonSeen = false
    } else if (ch === ':') {
      lastColonSeen = true
    } else if (ch === ',') {
      lastColonSeen = false
    }
  }
  if (inString) {
    return { offset: lastKeyStart, reason: '未闭合的字符串' }
  }
  if (depth !== 0) {
    return { offset: lastOpenPosition, reason: depth > 0 ? '缺少闭合括号' : '多余的闭合括号' }
  }
  return null
}

function determineErrorType(text, offset, nativeMessage) {
  const msg = nativeMessage || ''
  if (msg.includes('Unexpected token')) {
    const tokenMatch = msg.match(/Unexpected token\s+([^\s]+)/i)
    const token = tokenMatch ? tokenMatch[1] : null
    if (token === '\\' && text.substring(offset - 2, offset + 1).includes("'")) {
      return { type: 'SINGLE_QUOTE', message: 'JSON 字符串必须使用双引号，不能使用单引号' }
    }
    if (token === ',' || (token && /['\"\}\]]/.test(token))) {
      const beforeText = text.substring(Math.max(0, offset - 50), offset)
      if (beforeText.includes(',') && /,\s*[\}\]]/.test(beforeText + (text[offset] || ''))) {
        return { type: 'TRAILING_COMMA', message: '检测到尾逗号（trailing comma），JSON 标准不允许数组或对象最后一个元素后有逗号' }
      }
    }
    return { type: 'UNEXPECTED_TOKEN', message: `意外的 token: ${token || '未知'}` }
  }
  if (msg.includes('Unexpected end of JSON')) {
    return { type: 'UNEXPECTED_END', message: 'JSON 输入意外结束，可能缺少闭合括号、引号或逗号' }
  }
  if (msg.includes('Expected') || msg.includes('expected')) {
    return { type: 'EXPECTED_TOKEN', message: msg }
  }
  if (msg.includes('Bad escape') || msg.includes('Invalid escape')) {
    return { type: 'BAD_ESCAPE', message: '字符串中包含无效的转义序列' }
  }
  if (msg.includes('Invalid number')) {
    return { type: 'INVALID_NUMBER', message: '数字格式无效，JSON 不支持前导零（如 0123）或十六进制/八进制字面量' }
  }
  return { type: 'SYNTAX_ERROR', message: msg || '未知语法错误' }
}

function parseJSONWithDetails(text, options = {}) {
  const { maxDepth = Infinity } = options
  try {
    let parsed = JSON.parse(text)
    if (maxDepth !== Infinity) {
      const depth = calculateDepth(parsed)
      if (depth > maxDepth) {
        return {
          valid: false,
          errorCode: 'DEPTH_TOO_DEEP',
          error: {
            code: 'DEPTH_TOO_DEEP',
            message: 'JSON 嵌套深度超出安全上限',
          },
        }
      }
    }
    return {
      valid: true,
      parsed,
      errorCode: null,
      error: null,
    }
  } catch (err) {
    const nativePosition = extractPositionFromNativeError(err.message, text)
    let offset = nativePosition ? nativePosition.offset : null
    if (offset === null) {
      const scanResult = simpleScanForErrorPosition(text)
      offset = scanResult ? scanResult.offset : text.length - 1
    }
    const position = offsetToLineColumn(text, offset)
    const context = getErrorContext(text, offset, 2)
    const errorInfo = determineErrorType(text, offset, err.message)
    return {
      valid: false,
      errorCode: 'SYNTAX_ERROR',
      error: {
        code: 'SYNTAX_ERROR',
        message: errorInfo.message,
        details: {
          position,
          context,
          nativeMessage: err.message,
          errorType: errorInfo.type,
        },
      },
    }
  }
}

function calculateDepth(obj, currentDepth = 0) {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return currentDepth + 1
    let maxSubDepth = 0
    for (const item of obj) {
      const d = calculateDepth(item, currentDepth + 1)
      if (d > maxSubDepth) maxSubDepth = d
    }
    return maxSubDepth
  }
  const keys = Object.keys(obj)
  if (keys.length === 0) return currentDepth + 1
  let maxSubDepth = 0
  for (const key of keys) {
    const d = calculateDepth(obj[key], currentDepth + 1)
    if (d > maxSubDepth) maxSubDepth = d
  }
  return maxSubDepth
}

function formatJSON(text, indent = 2) {
  try {
    const parsed = JSON.parse(text)
    return {
      formatted: JSON.stringify(parsed, null, indent),
      error: null,
    }
  } catch (err) {
    return {
      formatted: null,
      error: err.message,
    }
  }
}

function minifyJSON(text) {
  try {
    const parsed = JSON.parse(text)
    return {
      minified: JSON.stringify(parsed),
      error: null,
    }
  } catch (err) {
    return {
      minified: null,
      error: err.message,
    }
  }
}

export {
  offsetToLineColumn,
  getErrorContext,
  parseJSONWithDetails,
  calculateDepth,
  formatJSON,
  minifyJSON,
  extractPositionFromNativeError,
  simpleScanForErrorPosition,
  determineErrorType,
}
