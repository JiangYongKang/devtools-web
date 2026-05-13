const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  ALL_WHITESPACE: 'ALL_WHITESPACE',
  TOO_MANY_LINES: 'TOO_MANY_LINES',
  LINE_TOO_LONG: 'LINE_TOO_LONG',
  DANGEROUS_TRAVERSAL: 'DANGEROUS_TRAVERSAL',
  INVALID_UNC_FORMAT: 'INVALID_UNC_FORMAT',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_INPUT]: '输入为空，请至少输入一个有效的路径',
  [ERROR_CODES.ALL_WHITESPACE]: '输入内容全为空白字符，请输入有效的路径',
  [ERROR_CODES.TOO_MANY_LINES]: '路径数量超出上限',
  [ERROR_CODES.LINE_TOO_LONG]: '单条路径长度超出上限',
  [ERROR_CODES.DANGEROUS_TRAVERSAL]: '危险的目录穿越：规范化后仍残留 .. 段',
  [ERROR_CODES.INVALID_UNC_FORMAT]: 'UNC 路径格式无效',
}

const MAX_LINES = 5000
const MAX_LINE_LENGTH = 32768
const FRAME_SIZE = 100

const PLATFORM = {
  POSIX: 'posix',
  WINDOWS: 'windows',
  NEUTRAL: 'neutral',
}

const PLATFORM_LABELS = {
  [PLATFORM.POSIX]: 'POSIX (/)',
  [PLATFORM.WINDOWS]: 'Windows (\\)',
  [PLATFORM.NEUTRAL]: '中性展示',
}

const WINDOWS_RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]

const EXAMPLE_CASES = [
  {
    name: 'UNC 路径',
    paths: '\\\\server\\share\\folder\\file.txt\n\\\\192.168.1.100\\c$\\Windows',
    description: 'Windows UNC 网络路径',
  },
  {
    name: '混合分隔符',
    paths: 'C:\\Users\\name/Documents\\project/src/index.js\n/home/user\\docs/file.txt',
    description: '同时包含正斜杠和反斜杠',
  },
  {
    name: '含空格路径',
    paths: 'C:\\Program Files\\My App\\data.txt\n/var/log/my app/logs.log',
    description: '路径中包含空格',
  },
  {
    name: '.. 穿越示例',
    paths: '/home/user/../docs/../file.txt\nC:\\Users\\..\\Windows\\..\\Program Files',
    description: '包含目录穿越的路径',
  },
  {
    name: 'Windows 保留名',
    paths: 'C:\\Windows\\System32\\CON\nD:\\NUL.txt\nE:\\LPT1\\data',
    description: '包含 Windows 保留文件名的路径',
  },
  {
    name: '多点文件名',
    paths: '/home/user/file.min.js\nC:\\Users\\name\\archive.tar.gz\n/var/log/access.log.2024-01-15',
    description: '包含多个点的文件名（扩展名处理示例）',
  },
  {
    name: '重复分隔符',
    paths: '/home//user///docs////file.txt\nC:\\\\Users\\\\\\\\name\\\\docs',
    description: '包含多个连续分隔符的路径',
  },
  {
    name: '相对路径与 .',
    paths: './docs/./file.txt\n../sibling/../parent/./child\nC:\\Users\\.\\name\\.\\docs',
    description: '包含 . 的相对路径',
  },
]

const PRESETS = {
  NORMALIZE_ONLY: {
    name: '仅归一化分隔符不消解 ..',
    description: '仅统一分隔符和折叠重复分隔符，不解构 ..',
    platform: PLATFORM.NEUTRAL,
    resolveDots: false,
    collapseSeparators: true,
    normalizeDriveCase: false,
    rejectDangerous: false,
    strictPosix: false,
  },
  STRICT_POSIX: {
    name: '严格 POSIX',
    description: '严格 POSIX 风格：正斜杠、消解 ..、拒绝危险穿越',
    platform: PLATFORM.POSIX,
    resolveDots: true,
    collapseSeparators: true,
    normalizeDriveCase: false,
    rejectDangerous: true,
    strictPosix: true,
  },
}

const DEFAULT_OPTIONS = {
  platform: PLATFORM.NEUTRAL,
  resolveDots: true,
  collapseSeparators: true,
  normalizeDriveCase: true,
  rejectDangerous: true,
  strictPosix: false,
  multiDotExtension: false,
}

const STORAGE_KEY = 'filepath-normalizer-presets'
const STORAGE_VERSION = 1

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_LINES,
  MAX_LINE_LENGTH,
  FRAME_SIZE,
  PLATFORM,
  PLATFORM_LABELS,
  WINDOWS_RESERVED_NAMES,
  EXAMPLE_CASES,
  PRESETS,
  DEFAULT_OPTIONS,
  STORAGE_KEY,
  STORAGE_VERSION,
}
