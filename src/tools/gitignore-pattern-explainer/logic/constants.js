const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  ALL_COMMENTS: 'ALL_COMMENTS',
  TOO_MANY_LINES: 'TOO_MANY_LINES',
  LINE_TOO_LONG: 'LINE_TOO_LONG',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_INPUT]: '输入为空，请至少输入一个有效的 .gitignore 模式',
  [ERROR_CODES.ALL_COMMENTS]: '输入内容全为注释行（# 开头）或空行，请输入有效的 .gitignore 模式',
  [ERROR_CODES.TOO_MANY_LINES]: '模式条数超出上限',
  [ERROR_CODES.LINE_TOO_LONG]: '单条模式长度超出上限',
}

const MAX_PATTERNS = 100
const MAX_PATTERN_LENGTH = 500

const SUPPORTED_FEATURES = {
  ASTERISK: '*',
  QUESTION_MARK: '?',
  BRACKETS: '[]',
  DOUBLE_ASTERISK: '**',
  LEADING_SLASH: '/',
  TRAILING_SLASH: '/',
  NEGATION: '!',
  COMMENT: '#',
}

const FEATURE_DESCRIPTIONS = {
  [SUPPORTED_FEATURES.ASTERISK]:
    '匹配零个或多个字符（不包含路径分隔符 /）。例如 *.txt 匹配 foo.txt 和 bar.txt，但不匹配 sub/foo.txt',
  [SUPPORTED_FEATURES.QUESTION_MARK]:
    '匹配单个任意字符（不包含路径分隔符 /）。例如 file?.log 匹配 file1.log，但不匹配 file10.log',
  [SUPPORTED_FEATURES.BRACKETS]:
    '字符类，匹配方括号内的任一字符。支持范围如 [0-9]、[a-z]，以及取反如 [!abc] 或 [^abc]',
  [SUPPORTED_FEATURES.DOUBLE_ASTERISK]:
    '双星号，跨目录级别的匹配。例如 **/node_modules 匹配任意层级的 node_modules 目录',
  leadingSlash:
    '前导斜杠，表示只匹配仓库根目录下的路径。例如 /build 只匹配根目录下的 build/ 目录',
  trailingSlash:
    '末尾斜杠，表示只匹配目录，不匹配文件。例如 dist/ 匹配 dist 目录，但不匹配名为 dist 的文件',
  [SUPPORTED_FEATURES.NEGATION]:
    '否定模式，取消之前匹配的文件或目录。注意：如果父目录已被忽略，子文件无法被重新包含',
  [SUPPORTED_FEATURES.COMMENT]: '注释行，以 # 开头，不会参与匹配',
}

const TOKEN_TYPES = {
  LITERAL: 'literal',
  ASTERISK: 'asterisk',
  QUESTION_MARK: 'question_mark',
  DOUBLE_ASTERISK: 'double_asterisk',
  CHAR_CLASS: 'char_class',
  SLASH: 'slash',
  LEADING_SLASH: 'leading_slash',
  TRAILING_SLASH: 'trailing_slash',
  NEGATION: 'negation',
}

const EXAMPLE_CASES = [
  {
    name: '基础文件忽略',
    patterns: '*.log\n*.tmp\n*.bak',
    description: '忽略日志和临时文件',
  },
  {
    name: '目录忽略',
    patterns: 'node_modules/\ndist/\nbuild/',
    description: '忽略常见的依赖和构建目录',
  },
  {
    name: '否定规则示例',
    patterns: '*.log\n!important.log',
    description: '忽略所有 .log 文件，但保留 important.log',
  },
  {
    name: '双星递归匹配',
    patterns: '**/*.tmp\n**/debug/',
    description: '递归匹配任意层级的 .tmp 文件和 debug 目录',
  },
  {
    name: '字符类与单字符匹配',
    patterns: 'file?.log\ndata[0-9].csv',
    description: '使用 ? 匹配单字符，[0-9] 匹配数字范围',
  },
  {
    name: '前导斜杠（根目录限定）',
    patterns: '/README.md\n/build/',
    description: '只匹配根目录下的 README.md 和 build 目录',
  },
  {
    name: '综合示例',
    patterns: '# 依赖和构建产物\nnode_modules/\ndist/\n\n# 日志\n*.log\n!important.log\n\n# 临时文件\n**/*.tmp',
    description: '包含注释、目录忽略、否定规则和双星的综合示例',
  },
]

const PATTERN_SUBSET_DECLARATION = {
  title: '本工具支持的 .gitignore 模式子集',
  features: [
    { symbol: '*', description: '匹配零个或多个字符（不含 /）' },
    { symbol: '?', description: '匹配单个任意字符（不含 /）' },
    { symbol: '[abc]', description: '字符类，匹配方括号内任一字符' },
    { symbol: '[a-z]', description: '字符类范围匹配' },
    { symbol: '[!abc]', description: '字符类取反（也支持 [^abc]）' },
    { symbol: '**', description: '双星号，跨目录递归匹配' },
    { symbol: '/path', description: '前导斜杠，限定匹配根目录' },
    { symbol: 'path/', description: '末尾斜杠，只匹配目录' },
    { symbol: '!pattern', description: '否定模式，取消之前的匹配' },
    { symbol: '# comment', description: '注释行，以 # 开头' },
  ],
  notSupported: [
    '反斜杠转义（\\）用于匹配特殊字面值',
    '大括号展开（{*.js,*.ts}）',
    'Git 2.34+ 的 `(pattern)` 语法',
  ],
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_PATTERNS,
  MAX_PATTERN_LENGTH,
  SUPPORTED_FEATURES,
  FEATURE_DESCRIPTIONS,
  TOKEN_TYPES,
  EXAMPLE_CASES,
  PATTERN_SUBSET_DECLARATION,
}
