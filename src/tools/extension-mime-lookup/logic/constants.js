const CATEGORIES = {
  WEB: 'web',
  OFFICE: 'office',
  COMPRESSION: 'compression',
  MEDIA: 'media',
  OTHER: 'other',
}

const CATEGORY_LABELS = {
  [CATEGORIES.WEB]: 'Web',
  [CATEGORIES.OFFICE]: '办公',
  [CATEGORIES.COMPRESSION]: '压缩',
  [CATEGORIES.MEDIA]: '音视频',
  [CATEGORIES.OTHER]: '其他',
}

const TABLE_VERSIONS = {
  v1: 'v1',
  v2: 'v2',
}

const CURRENT_TABLE_VERSION = TABLE_VERSIONS.v2

const STORAGE_KEY = 'extension_mime_lookup_overrides'

const DEBOUNCE_DELAY = 150

const MAX_FILE_HEADER_BYTES = 512

const MAX_FUZZY_RESULTS = 100

const MAX_BATCH_ITEMS = 500

const SEARCH_MODES = {
  EXTENSION_TO_MIME: 'extension-to-mime',
  MIME_TO_EXTENSION: 'mime-to-extension',
  FILE_HEADER: 'file-header',
}

const MATCH_STATES = {
  MATCH: 'match',
  CONFLICT: 'conflict',
  UNKNOWN: 'unknown',
}

const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  STORAGE_READ_ERROR: 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR: 'STORAGE_WRITE_ERROR',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  UNKNOWN_VERSION: 'UNKNOWN_VERSION',
  OVERFLOW: 'OVERFLOW',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: '输入不能为空',
  [ERROR_CODES.INVALID_FORMAT]: '输入格式无效',
  [ERROR_CODES.STORAGE_READ_ERROR]: '无法从本地存储读取数据',
  [ERROR_CODES.STORAGE_WRITE_ERROR]: '无法写入本地存储',
  [ERROR_CODES.FILE_READ_ERROR]: '无法读取文件',
  [ERROR_CODES.UNKNOWN_VERSION]: '未知的数据表版本',
  [ERROR_CODES.OVERFLOW]: '查询数量超过上限',
  [ERROR_CODES.NOT_FOUND]: '未找到匹配项',
  [ERROR_CODES.DUPLICATE_KEY]: '覆盖表中已存在相同键',
}

const EXAMPLES = {
  extensionToMime: 'html\njs\n.css\n.webp',
  mimeToExtension: 'text/html\napplication/javascript; charset=utf-8\nimage/png\napplication/pdf',
  extensions: ['html', 'js', 'css', 'json', 'png', 'pdf', 'zip'],
  mimes: [
    'text/html',
    'application/javascript',
    'image/png',
    'application/pdf',
    'application/zip',
  ],
}

export {
  CATEGORIES,
  CATEGORY_LABELS,
  TABLE_VERSIONS,
  CURRENT_TABLE_VERSION,
  STORAGE_KEY,
  DEBOUNCE_DELAY,
  MAX_FILE_HEADER_BYTES,
  MAX_FUZZY_RESULTS,
  MAX_BATCH_ITEMS,
  SEARCH_MODES,
  MATCH_STATES,
  ERROR_CODES,
  ERROR_MESSAGES,
  EXAMPLES,
}
