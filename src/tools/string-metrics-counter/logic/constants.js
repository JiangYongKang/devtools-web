const NEWLINE_MODES = {
  LF: 'lf',
  CRLF: 'crlf',
  AUTO: 'auto',
}

const TOKENIZATION_PROFILES = {
  WHITESPACE: 'whitespace',
  ENGLISH: 'english',
  CHINESE: 'chinese',
  MIXED: 'mixed',
  NONE: 'none',
}

const NORMALIZE_FLAGS = {
  TRIM: 'trim',
  TO_LOWER: 'toLower',
  TO_UPPER: 'toUpper',
  COLLAPSE_SPACES: 'collapseSpaces',
  STRIP_CONTROL: 'stripControl',
  NORMALIZE_NFC: 'normalizeNFC',
  NORMALIZE_NFD: 'normalizeNFD',
}

const MAX_LINES_FOR_FULL_DISPLAY = 1000

const EXAMPLES = {
  MULTILINE_LOG: `[2025-05-10 14:30:01] INFO: 服务器启动成功
[2025-05-10 14:30:02] DEBUG: 连接数据库 localhost:5432
[2025-05-10 14:30:03] WARN: 内存使用率超过 80%
[2025-05-10 14:30:04] ERROR: 请求超时: GET /api/users
[2025-05-10 14:30:05] INFO: 服务恢复正常`,
  JSON_ONE_LINE: `{"name":"张三","age":30,"hobbies":["coding","reading"],"active":true,"email":"zhangsan@example.com","tokens":12345}`,
  EMOJI_MIXED: `Hello 世界 🌍! 你好 👋 欢迎 🎉
今天天气真好 ☀️ 心情很棒 😊
混合测试: 🏳️‍🌈 🇨🇳 👨‍👩‍👧‍👦
Emoji 序列: 👋🏻 👋🏼 👋🏽 👋🏾 👋🏿
字母: abcdefg 汉字: 你好世界
数字: 12345 符号: !@#$%`,
  EMPTY_OR_WHITESPACE: `   \t   \n\n\t   \n   `,
  SPECIAL_CHARS: `带有BOM的文本
包含\0控制字符
混合换行\r\n和\n
空格制表符\t测试
结尾有空格  `,
}

export {
  NEWLINE_MODES,
  TOKENIZATION_PROFILES,
  NORMALIZE_FLAGS,
  MAX_LINES_FOR_FULL_DISPLAY,
  EXAMPLES,
}
