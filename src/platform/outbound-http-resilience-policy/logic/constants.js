/**
 * 幂等 HTTP 方法集合
 * 这些方法可以安全重试
 */
export const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'])

/**
 * 幂等性请求头
 * POST 请求携带此头时视为可重试
 */
export const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key'

/**
 * 可重试的 HTTP 状态码列表
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * 错误码枚举
 */
export const ERROR_CODES = {
  /** 超时错误 */
  TIMEOUT: 'TIMEOUT',
  /** 取消/中止错误 */
  ABORT: 'ABORT',
  /** HTTP 错误 */
  HTTP_ERROR: 'HTTP_ERROR',
  /** 网络错误 */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** 重试耗尽错误 */
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
}

/**
 * 错误名映射
 */
export const ERROR_NAMES = {
  TIMEOUT: 'TimeoutError',
  ABORT: 'AbortError',
  HTTP_ERROR: 'HttpError',
  NETWORK_ERROR: 'NetworkError',
  RETRY_EXHAUSTED: 'RetryExhaustedError',
}

/**
 * 默认弹性策略配置
 */
export const DEFAULT_POLICY_CONFIG = {
  /** 总请求超时（毫秒） */
  baseTimeout: 30000,
  /** 单次尝试超时（毫秒） */
  perAttemptTimeout: 10000,
  /** 最大重试次数 */
  retries: 3,
  /** 需要重试的 HTTP 状态码 */
  retryOnStatuses: RETRYABLE_STATUS_CODES,
  /** 是否尊重 Retry-After 响应头 */
  retryAfterHeader: true,
  /** 是否继承取消信号传播 */
  cancelInherited: true,
  /** 是否启用抖动 */
  jitter: true,
  /** 基础退避延迟（毫秒） */
  baseDelayMs: 100,
  /** 最大退避延迟（毫秒） */
  maxDelayMs: 10000,
  /** 退避乘数 */
  backoffMultiplier: 2,
}

/**
 * 事件类型枚举（用于可观测性钩子）
 */
export const EVENT_TYPES = {
  /** 尝试开始 */
  ATTEMPT_START: 'attempt_start',
  /** 尝试成功 */
  ATTEMPT_SUCCESS: 'attempt_success',
  /** 尝试失败 */
  ATTEMPT_FAILURE: 'attempt_failure',
  /** 重试决策 */
  RETRY_DECIDED: 'retry_decided',
  /** 重试耗尽 */
  RETRY_EXHAUSTED: 'retry_exhausted',
  /** 用户取消 */
  CANCELLED: 'cancelled',
}
