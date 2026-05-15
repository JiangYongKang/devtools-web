export const VERSION = '1.0.0'

export const SCHEMA_VERSION = '1.0.0'

export const ERROR_CODES = {
  INVALID_LOCALE: 'INVALID_LOCALE',
  INVALID_NAMESPACE: 'INVALID_NAMESPACE',
  INVALID_KEY: 'INVALID_KEY',
  KEY_NOT_FOUND: 'KEY_NOT_FOUND',
  NAMESPACE_NOT_LOADED: 'NAMESPACE_NOT_LOADED',
  LOCALE_NOT_FOUND: 'LOCALE_NOT_FOUND',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  CHECKSUM_MISMATCH: 'CHECKSUM_MISMATCH',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  CIRCULAR_REFERENCE: 'CIRCULAR_REFERENCE',
  EMPTY_KEY: 'EMPTY_KEY',
  SCRIPT_TAG_DETECTED: 'SCRIPT_TAG_DETECTED',
  PLACEHOLDER_MISMATCH: 'PLACEHOLDER_MISMATCH',
  LOAD_FAILED: 'LOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  KEY_TOO_LONG: 'KEY_TOO_LONG',
}

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_LOCALE]: '无效的语言区域',
  [ERROR_CODES.INVALID_NAMESPACE]: '无效的命名空间',
  [ERROR_CODES.INVALID_KEY]: '无效的键',
  [ERROR_CODES.KEY_NOT_FOUND]: '键未找到',
  [ERROR_CODES.NAMESPACE_NOT_LOADED]: '命名空间未加载',
  [ERROR_CODES.LOCALE_NOT_FOUND]: '语言区域未找到',
  [ERROR_CODES.SCHEMA_VALIDATION_FAILED]: '语言包格式校验失败',
  [ERROR_CODES.CHECKSUM_MISMATCH]: '校验和不匹配',
  [ERROR_CODES.VERSION_CONFLICT]: '版本冲突',
  [ERROR_CODES.CIRCULAR_REFERENCE]: '检测到循环引用',
  [ERROR_CODES.EMPTY_KEY]: '检测到空键',
  [ERROR_CODES.SCRIPT_TAG_DETECTED]: '检测到潜在的 script 标记',
  [ERROR_CODES.PLACEHOLDER_MISMATCH]: '占位符不匹配',
  [ERROR_CODES.LOAD_FAILED]: '语言包加载失败',
  [ERROR_CODES.NETWORK_ERROR]: '网络错误',
  [ERROR_CODES.KEY_TOO_LONG]: '键名过长',
}

export const DEFAULT_NAMESPACE = 'common'

export const DEFAULT_LOCALE = 'en-US'

export const DEFAULT_FALLBACK_LOCALE = 'en-US'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US']

export const MAX_KEY_LENGTH = 256

export const MAX_NAMESPACES = 100

export const MAX_LOCALES = 50

export const PLACEHOLDER_PATTERN = /\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g

export const SCRIPT_PATTERN = /<\s*script/i

export const RTL_LOCALES = new Set([
  'ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW',
  'ar-LB', 'ar-LY', 'ar-MA', 'ar-OM', 'ar-QA', 'ar-SA', 'ar-SD', 'ar-SY',
  'ar-TN', 'ar-YE', 'fa', 'fa-IR', 'he', 'he-IL', 'ur', 'ur-PK',
  'ps', 'ps-AF', 'ps-PK', 'sd', 'sd-IN', 'sd-PK', 'ks', 'ks-IN',
  'ku', 'ku-IQ', 'ku-IR', 'ku-TR', 'yi', 'yi-001',
])

export const DEFAULT_LOAD_TIMEOUT_MS = 8000

export const INTERPOLATION_STYLE = {
  BRACES_DOUBLE: '{{name}}',
  ICU_PLURAL: '{n, plural, ...}',
}

export const USED_INTERPOLATION_STYLE = INTERPOLATION_STYLE.BRACES_DOUBLE

export const INTERPOLATION_DOC = `
本实现使用 {{name}} 风格的占位符插值。
示例:
  - "你好, {{name}}!" → t('greeting', { name: 'Alice' }) → "你好, Alice!"

不支持 ICU MessageFormat 复数形式。
`
