import { IDEMPOTENT_METHODS, IDEMPOTENCY_KEY_HEADER } from './constants.js'

let traceIdCounter = 0

/**
 * 生成唯一的 Trace ID
 * @param {string} prefix - ID 前缀
 * @returns {string} 生成的 Trace ID
 */
function generateTraceId(prefix = 'trace') {
  traceIdCounter++
  const random = Math.random().toString(36).substring(2, 10)
  const timestamp = Date.now().toString(36)
  return `${prefix}-${timestamp}-${random}-${traceIdCounter}`
}

/**
 * 计算指数退避延迟
 * @param {number} attempt - 当前尝试次数（从 1 开始）
 * @param {number} baseDelayMs - 基础延迟（毫秒）
 * @param {number} multiplier - 退避乘数
 * @returns {number} 计算后的延迟（毫秒）
 */
function calculateExponentialBackoff(attempt, baseDelayMs, multiplier = 2) {
  if (attempt <= 0) return 0
  return baseDelayMs * Math.pow(multiplier, attempt - 1)
}

/**
 * 应用完全抖动（Full Jitter），随机化退避延迟
 * @param {number} delayMs - 基础延迟（毫秒）
 * @returns {number} 抖动后的延迟（毫秒）
 */
function applyFullJitter(delayMs) {
  if (delayMs <= 0) return 0
  return Math.floor(Math.random() * delayMs)
}

/**
 * 将值限制在指定范围内
 * @param {number} value - 待限制的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * 解析 Retry-After 响应头
 * @param {Object|Headers} headers - 响应头对象或 Headers 实例
 * @returns {number|null} 延迟毫秒数，解析失败返回 null
 */
function parseRetryAfterHeader(headers) {
  if (!headers) return null

  let retryAfterValue = null

  if (typeof headers.get === 'function') {
    retryAfterValue = headers.get('retry-after')
  } else if (typeof headers === 'object') {
    const lowerKey = Object.keys(headers).find(
      (k) => k.toLowerCase() === 'retry-after'
    )
    if (lowerKey) {
      retryAfterValue = headers[lowerKey]
    }
  }

  if (!retryAfterValue) return null

  const seconds = parseInt(retryAfterValue, 10)
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const date = Date.parse(retryAfterValue)
  if (!isNaN(date)) {
    const diff = date - Date.now()
    return Math.max(0, diff)
  }

  return null
}

/**
 * 判断请求是否幂等
 * @param {string} method - HTTP 方法
 * @param {Object} headers - 请求头
 * @returns {boolean} 是否幂等
 */
function isIdempotentRequest(method, headers = {}) {
  const upperMethod = method?.toUpperCase()
  if (IDEMPOTENT_METHODS.has(upperMethod)) {
    return true
  }

  const hasIdempotencyKey = Object.keys(headers).some(
    (k) => k.toLowerCase() === IDEMPOTENCY_KEY_HEADER
  )

  return hasIdempotencyKey
}

/**
 * 创建组合的 AbortController，支持多个信号串联取消
 * @param {...AbortSignal} signals - 任意数量的 AbortSignal
 * @returns {AbortController} 组合后的 AbortController
 */
function createCombinedAbortController(...signals) {
  const controller = new AbortController()

  function onAbort() {
    controller.abort()
    signals.forEach((s) => {
      if (s && typeof s.removeEventListener === 'function') {
        s.removeEventListener('abort', onAbort)
      }
    })
  }

  signals.forEach((signal) => {
    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason)
      } else if (typeof signal.addEventListener === 'function') {
        signal.addEventListener('abort', onAbort, { once: true })
      }
    }
  })

  return controller
}

/**
 * 可取消的延时 Sleep
 * @param {number} ms - 延迟毫秒数
 * @param {AbortSignal|null} signal - 取消信号
 * @returns {Promise<void>} Promise，取消时抛出 AbortError
 */
function sleep(ms, signal = null) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(signal.reason)
      return
    }

    const timeoutId = setTimeout(() => {
      if (signal && typeof signal.removeEventListener === 'function') {
        signal.removeEventListener('abort', onAbort)
      }
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timeoutId)
      reject(signal.reason)
    }

    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

export {
  generateTraceId,
  calculateExponentialBackoff,
  applyFullJitter,
  clamp,
  parseRetryAfterHeader,
  isIdempotentRequest,
  createCombinedAbortController,
  sleep,
}
