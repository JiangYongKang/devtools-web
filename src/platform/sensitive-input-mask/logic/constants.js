export const ERROR_CODES = {
  INVALID_KEY_NAME: 'INVALID_KEY_NAME',
  SENSITIVE_KEY_REJECTED: 'SENSITIVE_KEY_REJECTED',
  STORAGE_WRITE_DENIED: 'STORAGE_WRITE_DENIED',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  USER_GESTURE_REQUIRED: 'USER_GESTURE_REQUIRED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  VALUE_EMPTY: 'VALUE_EMPTY',
}

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_KEY_NAME]: '无效的键名',
  [ERROR_CODES.SENSITIVE_KEY_REJECTED]: '检测到敏感键名，已拒绝写入',
  [ERROR_CODES.STORAGE_WRITE_DENIED]: '禁止将敏感值写入持久存储',
  [ERROR_CODES.CONTENT_TOO_LARGE]: '内容超过最大允许长度',
  [ERROR_CODES.USER_GESTURE_REQUIRED]: '需要用户手势',
  [ERROR_CODES.INVALID_CONFIG]: '无效的配置',
  [ERROR_CODES.VALUE_EMPTY]: '值为空',
}

export const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /apikey/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /credential/i,
  /auth[_-]?token/i,
  /bearer/i,
  /jwt/i,
  /passphrase/i,
  /pincode/i,
  /pin[_-]?code/i,
  /recovery[_-]?code/i,
  /otp/i,
  /totp/i,
  /hotp/i,
]

export const DEFAULT_REVEAL_DURATION_SECONDS = 5

export const MIN_REVEAL_DURATION_SECONDS = 3

export const MAX_REVEAL_DURATION_SECONDS = 15

export const MASK_CHAR = '\u2022'

export const MAX_CLIPBOARD_LENGTH = 4096

export const MAX_STORAGE_LENGTH = 8192

export const AUTOCOMPLETE_VALUES = {
  PASSWORD: 'current-password',
  NEW_PASSWORD: 'new-password',
  ONE_TIME_CODE: 'one-time-code',
  OFF: 'off',
}

export const REVEAL_STRATEGIES = {
  HOLD: 'hold',
  CLICK: 'click',
  DOUBLE_CLICK: 'double-click',
  DISABLED: 'disabled',
}

export const PASSWORD_STRENGTH_LEVELS = {
  WEAK: 'weak',
  FAIR: 'fair',
  STRONG: 'strong',
  VERY_STRONG: 'very-strong',
}

export const PASSWORD_STRENGTH_LABELS = {
  [PASSWORD_STRENGTH_LEVELS.WEAK]: '弱',
  [PASSWORD_STRENGTH_LEVELS.FAIR]: '一般',
  [PASSWORD_STRENGTH_LEVELS.STRONG]: '强',
  [PASSWORD_STRENGTH_LEVELS.VERY_STRONG]: '很强',
}

export const SHORTCUT_DISABLE_KEYS = ['ctrl', 'meta']

export const SHORTCUT_TOGGLE_KEY = 'L'
