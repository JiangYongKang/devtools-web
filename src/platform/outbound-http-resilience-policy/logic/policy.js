import { DEFAULT_POLICY_CONFIG, EVENT_TYPES } from './constants.js'
import {
  createTimeoutError,
  createAbortError,
  createHttpError,
  createNetworkError,
  createRetryExhaustedError,
  isAbortError,
} from './errors.js'
import {
  generateTraceId,
  calculateExponentialBackoff,
  applyFullJitter,
  clamp,
  parseRetryAfterHeader,
  isIdempotentRequest,
  createCombinedAbortController,
  sleep,
} from './utils.js'

/**
 * 创建 HTTP 弹性策略包装器
 * 提供指数退避重试、幂等检查、超时控制、取消链传播等功能
 *
 * @param {Object} policyOptions - 策略配置
 * @param {number} policyOptions.baseTimeout - 总请求超时（毫秒）
 * @param {number} policyOptions.perAttemptTimeout - 单次尝试超时（毫秒）
 * @param {number} policyOptions.retries - 最大重试次数
 * @param {Array<number>} policyOptions.retryOnStatuses - 需要重试的 HTTP 状态码
 * @param {boolean} policyOptions.retryAfterHeader - 是否尊重 Retry-After 头
 * @param {boolean} policyOptions.cancelInherited - 是否继承取消信号
 * @param {boolean} policyOptions.jitter - 是否启用抖动
 * @param {number} policyOptions.baseDelayMs - 基础退避延迟（毫秒）
 * @param {number} policyOptions.maxDelayMs - 最大退避延迟（毫秒）
 * @param {number} policyOptions.backoffMultiplier - 退避乘数
 * @param {Function} policyOptions.onAttempt - 每次尝试的钩子函数
 * @param {Function} policyOptions.onRetryDecision - 每次重试决策的钩子函数
 * @returns {Function} policyFetch - 包装后的 fetch 函数，签名与原生 fetch 对齐
 */
function createHttpClientPolicy(policyOptions = {}) {
  const config = {
    ...DEFAULT_POLICY_CONFIG,
    ...policyOptions,
  }

  const {
    baseTimeout,
    perAttemptTimeout,
    retries: maxRetries,
    retryOnStatuses,
    retryAfterHeader,
    cancelInherited,
    jitter: useJitter,
    baseDelayMs,
    maxDelayMs,
    backoffMultiplier,
  } = config

  const onAttempt = policyOptions.onAttempt || (() => {})
  const onRetryDecision = policyOptions.onRetryDecision || (() => {})

  /**
   * 包装后的 fetch 函数，签名与原生 fetch 对齐
   * @param {string|Request} input - URL 或 Request 对象
   * @param {Object} init - fetch 配置
   * @returns {Promise<Response>} Response Promise
   */
  function policyFetch(input, init = {}) {
    const requestTraceId = generateTraceId('req')
    const startTime = Date.now()
    let attemptCount = 0
    let lastError = null
    let isCancelled = false
    let currentDelayController = null

    const userSignal = init.signal
    const baseController = baseTimeout > 0 ? new AbortController() : null
    let baseTimeoutId = null

    if (baseController) {
      baseTimeoutId = setTimeout(() => {
        baseController.abort(createTimeoutError('Base timeout', { traceId: requestTraceId }))
      }, baseTimeout)
    }

    /**
     * 清理所有资源：超时和延迟控制器
     */
    function cleanup() {
      if (baseTimeoutId) {
        clearTimeout(baseTimeoutId)
        baseTimeoutId = null
      }
      if (currentDelayController) {
        currentDelayController.abort()
        currentDelayController = null
      }
    }

    /**
     * 获取请求的 HTTP 方法
     * @returns {string} HTTP 方法
     */
    function getRequestMethod() {
      if (input instanceof Request) {
        return input.method
      }
      return init.method || 'GET'
    }

    /**
     * 获取请求头对象
     * @returns {Object} 请求头
     */
    function getRequestHeaders() {
      if (input instanceof Request) {
        return Object.fromEntries(input.headers.entries())
      }
      return init.headers || {}
    }

    /**
     * 执行单次请求尝试
     * @returns {Promise<Response|null>} 成功返回 Response，失败返回 null
     */
    async function executeAttempt() {
      attemptCount++
      const attemptTraceId = generateTraceId('att')
      const attemptStartTime = Date.now()

      onAttempt({
        type: EVENT_TYPES.ATTEMPT_START,
        traceId: requestTraceId,
        attemptTraceId,
        attempt: attemptCount,
        maxAttempts: maxRetries + 1,
        url: input instanceof Request ? input.url : input,
        method: getRequestMethod(),
        timestamp: attemptStartTime,
      })

      const attemptController = createCombinedAbortController(
        userSignal,
        baseController?.signal
      )

      let perAttemptTimeoutId = null
      if (perAttemptTimeout > 0) {
        perAttemptTimeoutId = setTimeout(() => {
          attemptController.abort(
            createTimeoutError('Per-attempt timeout', {
              traceId: requestTraceId,
              attemptTraceId,
              attempt: attemptCount,
            })
          )
        }, perAttemptTimeout)
      }

      const attemptInit = {
        ...init,
        signal: attemptController.signal,
      }

      try {
        const response = await fetch(input, attemptInit)
        clearTimeout(perAttemptTimeoutId)

        const duration = Date.now() - attemptStartTime

        if (response.ok) {
          onAttempt({
            type: EVENT_TYPES.ATTEMPT_SUCCESS,
            traceId: requestTraceId,
            attemptTraceId,
            attempt: attemptCount,
            status: response.status,
            duration,
            timestamp: Date.now(),
          })
          cleanup()
          return response
        }

        const httpError = createHttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response
        )

        onAttempt({
          type: EVENT_TYPES.ATTEMPT_FAILURE,
          traceId: requestTraceId,
          attemptTraceId,
          attempt: attemptCount,
          status: response.status,
          error: httpError,
          duration,
          timestamp: Date.now(),
        })

        lastError = httpError
        return null
      } catch (error) {
        clearTimeout(perAttemptTimeoutId)
        const duration = Date.now() - attemptStartTime

        let normalizedError
        if (isAbortError(error) || error.name === 'AbortError') {
          normalizedError = createAbortError(error.message, {
            traceId: requestTraceId,
            attemptTraceId,
            originalError: error,
          })
          isCancelled = true
        } else if (error.message?.errorCode === 'TIMEOUT') {
          normalizedError = error
        } else {
          normalizedError = createNetworkError(error.message, error, {
            traceId: requestTraceId,
            attemptTraceId,
          })
        }

        onAttempt({
          type: EVENT_TYPES.ATTEMPT_FAILURE,
          traceId: requestTraceId,
          attemptTraceId,
          attempt: attemptCount,
          error: normalizedError,
          duration,
          timestamp: Date.now(),
        })

        lastError = normalizedError
        return null
      }
    }

    /**
     * 判断是否应该重试当前请求
     * @returns {Object} 重试决策 { shouldRetry: boolean, reason: string }
     */
    async function shouldRetry() {
      if (isCancelled) {
        return { shouldRetry: false, reason: 'cancelled' }
      }

      if (attemptCount > maxRetries) {
        return { shouldRetry: false, reason: 'exhausted' }
      }

      if (!lastError) {
        return { shouldRetry: false, reason: 'no_error' }
      }

      if (isAbortError(lastError)) {
        return { shouldRetry: false, reason: 'aborted' }
      }

      const method = getRequestMethod()
      const headers = getRequestHeaders()

      if (!isIdempotentRequest(method, headers)) {
        return { shouldRetry: false, reason: 'not_idempotent' }
      }

      if (lastError.status && retryOnStatuses.includes(lastError.status)) {
        return { shouldRetry: true, reason: 'retryable_status' }
      }

      if (lastError.errorCode === 'NETWORK_ERROR') {
        return { shouldRetry: true, reason: 'network_error' }
      }

      if (lastError.errorCode === 'TIMEOUT') {
        return { shouldRetry: true, reason: 'timeout' }
      }

      return { shouldRetry: false, reason: 'not_retryable' }
    }

    /**
     * 计算重试延迟，考虑 Retry-After 头、指数退避和抖动
     * @returns {number} 延迟毫秒数
     */
    function calculateRetryDelay() {
      if (retryAfterHeader && lastError?.response?.headers) {
        const retryAfterMs = parseRetryAfterHeader(lastError.response.headers)
        if (retryAfterMs !== null && retryAfterMs > 0) {
          return Math.min(retryAfterMs, maxDelayMs)
        }
      }

      let delay = calculateExponentialBackoff(attemptCount, baseDelayMs, backoffMultiplier)

      if (useJitter) {
        delay = applyFullJitter(delay)
      }

      return clamp(delay, 0, maxDelayMs)
    }

    /**
     * 主重试循环：执行请求、判断重试、等待延迟、递归调用
     * @returns {Promise<Response>} 成功的 Response
     * @throws 各种归一化错误（TimeoutError、AbortError、RetryExhaustedError 等）
     */
    async function runWithRetry() {
      while (true) {
        const result = await executeAttempt()

        if (result !== null) {
          return result
        }

        const retryDecision = await shouldRetry()

        if (!retryDecision.shouldRetry) {
          cleanup()

          if (retryDecision.reason === 'exhausted') {
            onRetryDecision({
              type: EVENT_TYPES.RETRY_EXHAUSTED,
              traceId: requestTraceId,
              attempts: attemptCount,
              lastError,
              timestamp: Date.now(),
            })
            throw createRetryExhaustedError(
              'Retry attempts exhausted',
              lastError,
              attemptCount
            )
          }

          if (retryDecision.reason === 'cancelled') {
            onRetryDecision({
              type: EVENT_TYPES.CANCELLED,
              traceId: requestTraceId,
              attempts: attemptCount,
              lastError,
              timestamp: Date.now(),
            })
          }

          throw lastError
        }

        const delayMs = calculateRetryDelay()

        onRetryDecision({
          type: EVENT_TYPES.RETRY_DECIDED,
          traceId: requestTraceId,
          attempt: attemptCount,
          delayMs,
          reason: retryDecision.reason,
          lastError,
          timestamp: Date.now(),
        })

        currentDelayController = new AbortController()
        const delaySignal = cancelInherited
          ? createCombinedAbortController(
              userSignal,
              baseController?.signal,
              currentDelayController.signal
            ).signal
          : currentDelayController.signal

        try {
          await sleep(delayMs, delaySignal)
        } catch (abortError) {
          cleanup()
          isCancelled = true
          throw createAbortError('Retry cancelled during delay', {
            traceId: requestTraceId,
            originalError: abortError,
          })
        }
      }
    }

    return runWithRetry()
  }

  return policyFetch
}

export { createHttpClientPolicy }
