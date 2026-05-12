import {
  parseJSONWithDetails,
  formatJSON,
  minifyJSON,
  offsetToLineColumn,
  getErrorContext,
  calculateDepth,
} from './parser.js'
import {
  ERROR_CODES,
  MAX_SAFE_INPUT_SIZE,
  MAX_NESTING_DEPTH,
  createError,
} from './errors.js'

function validateJSON(input, options = {}) {
  const {
    maxSize = MAX_SAFE_INPUT_SIZE,
    maxDepth = MAX_NESTING_DEPTH,
  } = options

  if (input == null || (typeof input === 'string' && input.trim().length === 0)) {
    return {
      valid: false,
      errorCode: ERROR_CODES.EMPTY_INPUT,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      result: null,
    }
  }

  const text = String(input)

  if (text.length > maxSize) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INPUT_TOO_LARGE,
      error: createError(ERROR_CODES.INPUT_TOO_LARGE, { actualSize: text.length, maxSize }),
      result: null,
    }
  }

  const parseResult = parseJSONWithDetails(text, { maxDepth })

  if (!parseResult.valid) {
    return {
      valid: false,
      errorCode: parseResult.errorCode,
      error: parseResult.error,
      result: null,
    }
  }

  const depth = calculateDepth(parseResult.parsed)

  return {
    valid: true,
    errorCode: null,
    error: null,
    result: {
      parsed: parseResult.parsed,
      depth,
      characterCount: text.length,
    },
  }
}

function formatJSONContent(text, indent = 2) {
  return formatJSON(text, indent)
}

function minifyJSONContent(text) {
  return minifyJSON(text)
}

function generateDiagnosticReport(validationResult) {
  const lines = []
  lines.push('=== JSON 语法校验诊断报告 ===')
  lines.push(`生成时间: ${new Date().toLocaleString()}`)
  lines.push('')
  
  if (validationResult.valid) {
    lines.push('✅ 校验结果: 合法')
    if (validationResult.result) {
      lines.push(`嵌套深度: ${validationResult.result.depth}`)
      lines.push(`字符数: ${validationResult.result.characterCount}`)
    }
  } else {
    lines.push('❌ 校验结果: 非法')
    lines.push(`错误码: ${validationResult.errorCode}`)
    if (validationResult.error?.message) {
      lines.push(`错误信息: ${validationResult.error.message}`)
    }
    if (validationResult.error?.details?.position) {
      const pos = validationResult.error.details.position
      lines.push(`错误位置: 第 ${pos.line} 行, 第 ${pos.column} 列 (偏移 ${pos.offset})`)
    }
    if (validationResult.error?.details?.nativeMessage) {
      lines.push(`原生错误: ${validationResult.error.details.nativeMessage}`)
    }
  }
  
  return lines.join('\n')
}

export {
  validateJSON,
  formatJSONContent,
  minifyJSONContent,
  generateDiagnosticReport,
  offsetToLineColumn,
  getErrorContext,
  calculateDepth,
}
