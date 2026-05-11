const DEFAULT_PARAMS = {
  dialect: 'standard',
  keywordCase: 'upper',
  indentType: 'space',
  indentWidth: 2,
  lineBreakStyle: 'unix',
  commentPolicy: 'preserve',
  includeHighlight: false,
  maxInputSizeKb: 500,
  maxNestingDepth: 50,
}

const VALID_DIALECTS = ['standard', 'mysql', 'postgresql', 'sqlite', 'oracle', 'sqlserver']
const VALID_KEYWORD_CASES = ['upper', 'lower', 'preserve']
const VALID_INDENT_TYPES = ['space', 'tab']
const VALID_LINE_BREAK_STYLES = ['unix', 'windows', 'preserve']
const VALID_COMMENT_POLICIES = ['preserve', 'remove', 'removeAll']

function normalizeParams(params = {}) {
  const normalized = { ...DEFAULT_PARAMS }

  if (params.dialect && VALID_DIALECTS.includes(params.dialect)) {
    normalized.dialect = params.dialect
  }

  if (params.keywordCase && VALID_KEYWORD_CASES.includes(params.keywordCase)) {
    normalized.keywordCase = params.keywordCase
  }

  if (params.indentType && VALID_INDENT_TYPES.includes(params.indentType)) {
    normalized.indentType = params.indentType
  }

  if (params.indentWidth !== undefined) {
    const width = parseInt(params.indentWidth, 10)
    if (!isNaN(width) && width >= 1 && width <= 8) {
      normalized.indentWidth = width
    }
  }

  if (params.lineBreakStyle && VALID_LINE_BREAK_STYLES.includes(params.lineBreakStyle)) {
    normalized.lineBreakStyle = params.lineBreakStyle
  }

  if (params.commentPolicy && VALID_COMMENT_POLICIES.includes(params.commentPolicy)) {
    normalized.commentPolicy = params.commentPolicy
  }

  if (params.includeHighlight !== undefined) {
    normalized.includeHighlight = Boolean(params.includeHighlight)
  }

  if (params.maxInputSizeKb !== undefined) {
    const size = parseInt(params.maxInputSizeKb, 10)
    if (!isNaN(size) && size > 0) {
      normalized.maxInputSizeKb = size
    }
  }

  if (params.maxNestingDepth !== undefined) {
    const depth = parseInt(params.maxNestingDepth, 10)
    if (!isNaN(depth) && depth > 0) {
      normalized.maxNestingDepth = depth
    }
  }

  return normalized
}

function getIndentString(params) {
  if (params.indentType === 'tab') {
    return '\t'
  }
  return ' '.repeat(params.indentWidth)
}

function validateParams(params) {
  const errors = []

  if (params.dialect && !VALID_DIALECTS.includes(params.dialect)) {
    errors.push(`无效的方言: ${params.dialect}`)
  }

  if (params.keywordCase && !VALID_KEYWORD_CASES.includes(params.keywordCase)) {
    errors.push(`无效的关键字大小写: ${params.keywordCase}`)
  }

  if (params.indentType && !VALID_INDENT_TYPES.includes(params.indentType)) {
    errors.push(`无效的缩进类型: ${params.indentType}`)
  }

  if (params.indentWidth !== undefined) {
    const width = parseInt(params.indentWidth, 10)
    if (isNaN(width) || width < 1 || width > 8) {
      errors.push('缩进宽度应在 1-8 之间')
    }
  }

  return errors.length > 0 ? errors : null
}

export {
  DEFAULT_PARAMS,
  VALID_DIALECTS,
  VALID_KEYWORD_CASES,
  VALID_INDENT_TYPES,
  VALID_LINE_BREAK_STYLES,
  VALID_COMMENT_POLICIES,
  normalizeParams,
  getIndentString,
  validateParams,
}
