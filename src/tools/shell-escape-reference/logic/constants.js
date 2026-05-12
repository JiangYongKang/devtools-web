const SHELL_PROFILES = {
  POSIX_BASH_LITE: 'POSIX_BASH_LITE',
  ZSH_EXTENDED: 'ZSH_EXTENDED',
  STRICT_POSIX: 'STRICT_POSIX',
}

const SHELL_PROFILE_NAMES = {
  [SHELL_PROFILES.POSIX_BASH_LITE]: 'Bash/POSIX 兼容（推荐）',
  [SHELL_PROFILES.ZSH_EXTENDED]: 'Zsh 扩展模式',
  [SHELL_PROFILES.STRICT_POSIX]: '严格 POSIX 模式',
}

const QUOTE_STRATEGIES = {
  DOUBLE: 'double',
  SINGLE: 'single',
  BARE: 'bare',
}

const QUOTE_STRATEGY_NAMES = {
  [QUOTE_STRATEGIES.DOUBLE]: '双引号',
  [QUOTE_STRATEGIES.SINGLE]: '单引号',
  [QUOTE_STRATEGIES.BARE]: '无引号',
}

const MAX_INPUT_CHARS = 10000

const META_CHARACTERS = {
  SPACE: ' ',
  TAB: '\t',
  NEWLINE: '\n',
  CARRIAGE_RETURN: '\r',
  DOLLAR: '$',
  BACKTICK: '`',
  BACKSLASH: '\\',
  EXCLAMATION: '!',
  HASH: '#',
  SINGLE_QUOTE: "'",
  DOUBLE_QUOTE: '"',
  ASTERISK: '*',
  QUESTION: '?',
  LEFT_BRACKET: '[',
  RIGHT_BRACKET: ']',
  LEFT_BRACE: '{',
  RIGHT_BRACE: '}',
  LEFT_PAREN: '(',
  RIGHT_PAREN: ')',
  PIPE: '|',
  AMPERSAND: '&',
  SEMICOLON: ';',
  LESS_THAN: '<',
  GREATER_THAN: '>',
  TILDE: '~',
  EQUAL: '=',
  COLON: ':',
  COMMA: ',',
  PERCENT: '%',
  AT: '@',
}

const CHAR_CATEGORIES = {
  SPACE_TAB: 'space_tab',
  NEWLINE: 'newline',
  VARIABLE: 'variable',
  COMMAND_SUBST: 'command_subst',
  ESCAPE: 'escape',
  HISTORY: 'history',
  COMMENT: 'comment',
  QUOTE: 'quote',
  GLOB: 'glob',
  PUNCTUATION: 'punctuation',
  NORMAL: 'normal',
}

const CATEGORY_NAMES = {
  [CHAR_CATEGORIES.SPACE_TAB]: '空格与制表符',
  [CHAR_CATEGORIES.NEWLINE]: '换行符',
  [CHAR_CATEGORIES.VARIABLE]: '变量展开',
  [CHAR_CATEGORIES.COMMAND_SUBST]: '命令替换',
  [CHAR_CATEGORIES.ESCAPE]: '转义字符',
  [CHAR_CATEGORIES.HISTORY]: '历史展开',
  [CHAR_CATEGORIES.COMMENT]: '注释',
  [CHAR_CATEGORIES.QUOTE]: '引号',
  [CHAR_CATEGORIES.GLOB]: '通配符',
  [CHAR_CATEGORIES.PUNCTUATION]: '标点符号',
  [CHAR_CATEGORIES.NORMAL]: '普通字符',
}

const CATEGORY_RISK_LEVELS = {
  [CHAR_CATEGORIES.SPACE_TAB]: 'medium',
  [CHAR_CATEGORIES.NEWLINE]: 'high',
  [CHAR_CATEGORIES.VARIABLE]: 'high',
  [CHAR_CATEGORIES.COMMAND_SUBST]: 'critical',
  [CHAR_CATEGORIES.ESCAPE]: 'medium',
  [CHAR_CATEGORIES.HISTORY]: 'high',
  [CHAR_CATEGORIES.COMMENT]: 'medium',
  [CHAR_CATEGORIES.QUOTE]: 'high',
  [CHAR_CATEGORIES.GLOB]: 'medium',
  [CHAR_CATEGORIES.PUNCTUATION]: 'medium',
  [CHAR_CATEGORIES.NORMAL]: 'low',
}

const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

const RULE_DESCRIPTIONS = {
  double: {
    name: '双引号字面量',
    description: '双引号保留大多数字符的字面意义，但以下字符仍有特殊含义：',
    rules: [
      { char: '$', rule: '变量展开，如 $VAR 或 ${VAR}', risk: 'high' },
      { char: '`', rule: '命令替换（旧式语法），如 `command`', risk: 'critical' },
      { char: '\\', rule: '转义字符，仅对 $、`、"、\\ 有意义', risk: 'medium' },
      { char: '"', rule: '结束双引号', risk: 'high' },
      { char: '!', rule: '在交互式 shell 中触发历史展开', risk: 'high', note: '非交互脚本中通常无特殊含义' },
    ],
  },
  single: {
    name: '单引号字面量',
    description: '单引号保留所有字符的字面意义，包括特殊字符。',
    rules: [
      { char: "'", rule: '结束单引号，单引号内无法包含单引号', risk: 'high', note: "可用 '\\'' 或 $'\\'' 绕过" },
    ],
  },
  bare: {
    name: '无引号（裸词）',
    description: '无引号时，几乎所有特殊字符都有特殊含义，需极其谨慎。',
    rules: [
      { char: ' ', rule: '参数分隔符', risk: 'medium' },
      { char: '\\t', rule: '制表符（参数分隔符）', risk: 'medium' },
      { char: '\\n', rule: '换行符（命令分隔符）', risk: 'high' },
      { char: '$', rule: '变量展开', risk: 'high' },
      { char: '`', rule: '命令替换', risk: 'critical' },
      { char: '\\', rule: '转义字符', risk: 'medium' },
      { char: '!', rule: '历史展开（交互模式）', risk: 'high' },
      { char: '#', rule: '注释开始', risk: 'medium' },
      { char: '*', rule: '任意字符通配', risk: 'medium' },
      { char: '?', rule: '单个字符通配', risk: 'medium' },
      { char: '[', rule: '字符类通配开始', risk: 'medium' },
      { char: '{', rule: '大括号展开开始', risk: 'medium' },
      { char: '(', rule: '子shell/数组开始', risk: 'high' },
      { char: '|', rule: '管道', risk: 'high' },
      { char: '&', rule: '后台执行/重定向', risk: 'high' },
      { char: ';', rule: '命令分隔符', risk: 'high' },
      { char: '<', rule: '输入重定向', risk: 'high' },
      { char: '>', rule: '输出重定向', risk: 'high' },
      { char: '~', rule: '用户主目录展开', risk: 'medium' },
      { char: '=', rule: '变量赋值（单词开头时）', risk: 'medium' },
    ],
  },
}

const EXAMPLE_CASES = [
  {
    name: '包含空格和换行的文本',
    rawText: 'Hello World\nSecond Line',
    description: '展示空格和换行的处理',
  },
  {
    name: '包含变量的危险片段',
    rawText: 'Value: $HOME and ${USER}',
    description: '展示变量展开的风险',
  },
  {
    name: '命令替换示例',
    rawText: 'Result: `whoami` or $(pwd)',
    description: '展示命令替换的极高风险',
  },
  {
    name: '通配符集合',
    rawText: 'Files: *.txt, file?.log, data[0-9].csv',
    description: '展示 glob 通配符',
  },
  {
    name: '混合特殊字符',
    rawText: "It's a \"test\" with \\backslashes\\ and !history",
    description: '混合引号、反斜杠和历史展开',
  },
  {
    name: '安全对照范例',
    rawText: 'safestring123',
    description: '不含任何特殊字符的安全字符串',
  },
]

const QUICK_REFERENCE_CATEGORIES = [
  {
    category: '空格与换行',
    items: [
      { char: ' ', name: '空格', double: '保留字面量', single: '保留字面量', bare: '参数分隔' },
      { char: '\\t', name: '制表符', double: '保留字面量', single: '保留字面量', bare: '参数分隔' },
      { char: '\\n', name: '换行符', double: '保留字面量', single: '保留字面量', bare: '命令分隔' },
    ],
  },
  {
    category: '变量展开',
    items: [
      { char: '$VAR', name: '简单变量', double: '展开', single: '保留字面量', bare: '展开' },
      { char: '${VAR}', name: '大括号变量', double: '展开', single: '保留字面量', bare: '展开' },
      { char: '$', name: '美元符', double: '特殊（若后跟有效名称）', single: '保留字面量', bare: '特殊' },
    ],
  },
  {
    category: '命令替换',
    items: [
      { char: '`cmd`', name: '反引号', double: '执行命令', single: '保留字面量', bare: '执行命令' },
      { char: '$(cmd)', name: '新式语法', double: '执行命令', single: '保留字面量', bare: '执行命令' },
    ],
  },
  {
    category: '通配符（Glob）',
    items: [
      { char: '*', name: '任意字符', double: '保留字面量', single: '保留字面量', bare: '路径匹配' },
      { char: '?', name: '单个字符', double: '保留字面量', single: '保留字面量', bare: '路径匹配' },
      { char: '[abc]', name: '字符类', double: '保留字面量', single: '保留字面量', bare: '路径匹配' },
    ],
  },
  {
    category: '历史展开（交互模式）',
    items: [
      { char: '!', name: '历史展开', double: '交互模式展开', single: '保留字面量', bare: '交互模式展开' },
      { char: '!!', name: '上一条命令', double: '交互模式展开', single: '保留字面量', bare: '交互模式展开' },
      { char: '!$', name: '上一参数', double: '交互模式展开', single: '保留字面量', bare: '交互模式展开' },
    ],
  },
  {
    category: '其他元字符',
    items: [
      { char: '#', name: '注释', double: '保留字面量', single: '保留字面量', bare: '单词开头时' },
      { char: '~', name: '主目录', double: '保留字面量', single: '保留字面量', bare: '单词开头时' },
      { char: '|', name: '管道', double: '保留字面量', single: '保留字面量', bare: '管道' },
      { char: ';', name: '命令分隔', double: '保留字面量', single: '保留字面量', bare: '命令分隔' },
      { char: '&', name: '后台/重定向', double: '保留字面量', single: '保留字面量', bare: '后台/重定向' },
    ],
  },
]

export {
  SHELL_PROFILES,
  SHELL_PROFILE_NAMES,
  QUOTE_STRATEGIES,
  QUOTE_STRATEGY_NAMES,
  MAX_INPUT_CHARS,
  META_CHARACTERS,
  CHAR_CATEGORIES,
  CATEGORY_NAMES,
  CATEGORY_RISK_LEVELS,
  RISK_LEVELS,
  RULE_DESCRIPTIONS,
  EXAMPLE_CASES,
  QUICK_REFERENCE_CATEGORIES,
}
