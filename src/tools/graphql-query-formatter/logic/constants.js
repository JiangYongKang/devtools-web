const MODE = {
  FORMAT: 'FORMAT',
  COMPRESS: 'COMPRESS',
}

const DEFAULT_PARAMS = {
  mode: MODE.FORMAT,
  indentWidth: 2,
  stripComments: false,
  validateOnly: false,
  maxInputSizeKb: 500,
}

const VALID_INDENT_WIDTHS = [1, 2, 3, 4, 5, 6, 7, 8]

const GRAPHQL_KEYWORDS = new Set([
  'query',
  'mutation',
  'subscription',
  'fragment',
  'on',
  'true',
  'false',
  'null',
  'Query',
  'Mutation',
  'Subscription',
])

const GRAPHQL_BUILTIN_TYPES = new Set([
  'Int',
  'Float',
  'String',
  'Boolean',
  'ID',
])

const TOKEN_TYPES = {
  KEYWORD: 'keyword',
  IDENTIFIER: 'identifier',
  STRING: 'string',
  NUMBER: 'number',
  COMMENT: 'comment',
  COMMENT_LINE: 'comment_line',
  PUNCTUATION: 'punctuation',
  VARIABLE: 'variable',
  DIRECTIVE: 'directive',
  SPREAD: 'spread',
  WHITESPACE: 'whitespace',
  BUILTIN_TYPE: 'builtin_type',
}

function getIndentString(params) {
  const width = params.indentWidth ?? DEFAULT_PARAMS.indentWidth
  return ' '.repeat(width)
}

function normalizeParams(params = {}) {
  return {
    mode: params.mode === MODE.COMPRESS ? MODE.COMPRESS : DEFAULT_PARAMS.mode,
    indentWidth: VALID_INDENT_WIDTHS.includes(params.indentWidth)
      ? params.indentWidth
      : DEFAULT_PARAMS.indentWidth,
    stripComments: Boolean(params.stripComments),
    validateOnly: Boolean(params.validateOnly),
    maxInputSizeKb: params.maxInputSizeKb ?? DEFAULT_PARAMS.maxInputSizeKb,
  }
}

function isKeyword(value) {
  return GRAPHQL_KEYWORDS.has(value)
}

function isBuiltinType(value) {
  return GRAPHQL_BUILTIN_TYPES.has(value)
}

export {
  MODE,
  DEFAULT_PARAMS,
  VALID_INDENT_WIDTHS,
  GRAPHQL_KEYWORDS,
  GRAPHQL_BUILTIN_TYPES,
  TOKEN_TYPES,
  getIndentString,
  normalizeParams,
  isKeyword,
  isBuiltinType,
}
