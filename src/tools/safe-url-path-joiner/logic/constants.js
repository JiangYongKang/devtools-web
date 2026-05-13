const MODE = {
  URL_ONLY: 'URL_ONLY',
  POSIX_ONLY: 'POSIX_ONLY',
  WINDOWS_ONLY: 'WINDOWS_ONLY',
  AUTO_DETECT: 'AUTO_DETECT',
}

const QUERY_HASH_POLICY = {
  PRESERVE: 'PRESERVE',
  STRIP: 'STRIP',
  MERGE_LAST: 'MERGE_LAST',
}

const WARNING_LEVEL = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
}

const MAX_SEGMENTS_PER_GROUP = 50
const MAX_SINGLE_SEGMENT_LENGTH = 4096
const MAX_TOTAL_LENGTH = 1024 * 1024
const MAX_BATCH_LINES = 1000
const LARGE_BATCH_THRESHOLD = 100

const DEFAULT_SCHEME_PORTS = {
  'http:': '80',
  'https:': '443',
  'ftp:': '21',
  'ftps:': '990',
  'ws:': '80',
  'wss:': '443',
}

const DANGEROUS_SCHEMES = new Set([
  'javascript:',
  'vbscript:',
  'data:',
  'blob:',
  'file:',
])

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

const STORAGE_KEY = 'safe-url-path-joiner:presets:v1'

const DEFAULT_PRESET = {
  name: '默认配置',
  mode: MODE.AUTO_DETECT,
  resolveDotDot: true,
  collapseRepeated: true,
  preserveTrailingSlash: false,
  forceAbsoluteRoot: false,
  stripDefaultPort: true,
  normalizePercentEncoding: true,
  queryHashPolicy: QUERY_HASH_POLICY.PRESERVE,
  rejectTraversal: true,
  rejectDangerousSchemes: true,
  allowFileScheme: false,
  rejectWindowsReserved: true,
  diagnosticMode: false,
}

const EXAMPLES = [
  {
    name: '🌐 基础 URL 拼接',
    input: 'https://example.com|api|v2|users',
    expected: 'https://example.com/api/v2/users',
  },
  {
    name: '⚠️ 恶意穿越样例',
    input: '/var/www/html|..|..|etc|passwd',
    expected: '[TRAVERSAL_REJECTED]',
  },
  {
    name: '🔄 双斜杠折叠',
    input: 'https://example.com//api////v2//users',
    expected: 'https://example.com/api/v2/users',
  },
  {
    name: '🇨🇳 URL 含中文片段',
    input: 'https://example.com|路径|文件.txt',
    expected: 'https://example.com/%E8%B7%AF%E5%BE%84/%E6%96%87%E4%BB%B6.txt',
  },
  {
    name: '🪟 Windows UNC 路径',
    input: '\\\\server01\\share01|documents|reports',
    expected: '\\\\server01\\share01\\documents\\reports',
  },
  {
    name: '🔒 危险 scheme 检测',
    input: 'javascript:alert(1)|test',
    expected: '[DANGEROUS_SCHEME]',
  },
  {
    name: '❌ 空片段测试',
    input: 'https://example.com||test',
    expected: 'https://example.com/test',
  },
  {
    name: '📋 批量示例（多行）',
    input: 'https://a.com|path1|sub1\nhttps://b.com|path2|sub2\n/var/www|html|index.html',
    expected: '多行结果',
  },
]

export {
  MODE,
  QUERY_HASH_POLICY,
  WARNING_LEVEL,
  MAX_SEGMENTS_PER_GROUP,
  MAX_SINGLE_SEGMENT_LENGTH,
  MAX_TOTAL_LENGTH,
  MAX_BATCH_LINES,
  LARGE_BATCH_THRESHOLD,
  DEFAULT_SCHEME_PORTS,
  DANGEROUS_SCHEMES,
  WINDOWS_RESERVED_NAMES,
  STORAGE_KEY,
  DEFAULT_PRESET,
  EXAMPLES,
}
