const SCHEMA_VERSION = '1.0.0'

const OTP_STATES = {
  IDLE: 'idle',
  SENDING: 'sending',
  COOLDOWN: 'cooldown',
  RESEND_READY: 'resend_ready',
  LOCKED: 'locked',
}

const OTP_EVENTS = {
  SEND: 'send',
  SEND_SUCCESS: 'send_success',
  SEND_FAIL: 'send_fail',
  COOLDOWN_END: 'cooldown_end',
  RESET: 'reset',
  RATE_LIMIT_HIT: 'rate_limit_hit',
}

const ERROR_CODES = {
  INVALID_CONFIG: 'INVALID_CONFIG',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MAX_ATTEMPTS_EXCEEDED: 'MAX_ATTEMPTS_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  CLOCK_ROLLBACK: 'CLOCK_ROLLBACK',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  UNKNOWN: 'UNKNOWN',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CONFIG]: '配置参数无效',
  [ERROR_CODES.INVALID_STATE_TRANSITION]: '无效的状态迁移',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: '频率限制已触发，请稍后再试',
  [ERROR_CODES.MAX_ATTEMPTS_EXCEEDED]: '发送次数已达上限，请联系支持',
  [ERROR_CODES.NETWORK_ERROR]: '网络错误，请稍后重试',
  [ERROR_CODES.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [ERROR_CODES.CLOCK_ROLLBACK]: '检测到系统时钟回拨',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
  [ERROR_CODES.UNKNOWN]: '未知错误',
}

const CHANNEL_TYPES = {
  SMS: 'sms',
  EMAIL: 'email',
  TOTP: 'totp',
}

const CHANNEL_LABELS = {
  [CHANNEL_TYPES.SMS]: '短信验证码',
  [CHANNEL_TYPES.EMAIL]: '邮件验证码',
  [CHANNEL_TYPES.TOTP]: 'TOTP 备用码',
}

const DEFAULT_RATE_LIMITER_CONFIG = {
  cooldownSeconds: 60,
  maxSendAttempts: 5,
  slidingWindowSeconds: 3600,
  slidingWindowMaxAttempts: 10,
  tokenBucketCapacity: 5,
  tokenRefillRatePerSecond: 1 / 60,
}

const DEFAULT_SEND_SIMULATOR_CONFIG = {
  successDelayMs: 1000,
  failureDelayMs: 800,
  failureRate: 0.2,
  rate429Rate: 0.1,
}

const UI_TEXT = {
  sendButton: {
    idle: '发送验证码',
    sending: '发送中...',
    cooldown: '秒后可重发',
    resendReady: '重新发送',
    locked: '已锁定',
  },
  contactSupport: '请联系客服解锁',
  networkError: '网络异常，请检查连接后重试',
  rateLimited: '请求过于频繁，请稍后再试',
  status: {
    idle: '等待发送',
    sending: '正在发送验证码...',
    cooldown: '冷却中',
    resendReady: '可重新发送',
    locked: '功能已锁定',
  },
}

const ARIA_LABELS = {
  cooldownProgress: '冷却进度，剩余 {remaining} 秒',
  sendButton: '发送验证码按钮',
  otpInput: '验证码输入框',
  statusAnnouncement: '状态通知',
}

export {
  ARIA_LABELS,
  CHANNEL_LABELS,
  CHANNEL_TYPES,
  DEFAULT_RATE_LIMITER_CONFIG,
  DEFAULT_SEND_SIMULATOR_CONFIG,
  ERROR_CODES,
  ERROR_MESSAGES,
  OTP_EVENTS,
  OTP_STATES,
  SCHEMA_VERSION,
  UI_TEXT,
}
