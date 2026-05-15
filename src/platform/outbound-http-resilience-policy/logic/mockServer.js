/**
 * Mock 服务器模式枚举
 */
const MOCK_MODES = {
  /** 立即成功返回 200 */
  SUCCESS: 'success',
  /** 请求挂起直到超时（模拟真实网络超时） */
  TIMEOUT: 'timeout',
  /** 返回 429 限流并带 Retry-After 头 */
  RATE_LIMIT: 'rate_limit',
  /** 随机重置连接（503） */
  RANDOM_RESET: 'random_reset',
  /** 网络错误 */
  NETWORK_ERROR: 'network_error',
  /** 失败直到第 N 次尝试才成功 */
  FAIL_UNTIL_ATTEMPT: 'fail_until_attempt',
}

class MockHttpServer {
  /**
   * 创建 Mock HTTP 服务器实例
   * @param {Object} options - 配置选项
   * @param {number} options.baseDelay - 基础延迟（毫秒）
   * @param {string} options.defaultMode - 默认模式
   * @param {number} options.failUntilAttempt - FAIL_UNTIL_ATTEMPT 模式下成功所需尝试次数
   * @param {number} options.rateLimitRetryAfter - 限流时的重试间隔（秒）
   * @param {number} options.timeoutDuration - 超时模式的挂起时长（毫秒）
   */
  constructor(options = {}) {
    this.options = {
      baseDelay: 100,
      defaultMode: MOCK_MODES.SUCCESS,
      failUntilAttempt: 3,
      rateLimitRetryAfter: 5,
      timeoutDuration: 30000,
      ...options,
    }
    this.requestLog = []
    this.currentMode = this.options.defaultMode
    this.attemptCounter = new Map()
    this._pendingTimeouts = []
  }

  /**
   * 设置当前 Mock 模式
   * @param {string} mode - 模式名称（来自 MOCK_MODES）
   */
  setMode(mode) {
    this.currentMode = mode
  }

  /**
   * 重置服务器状态：清空日志、计数器和待处理的超时
   */
  reset() {
    this.requestLog = []
    this.attemptCounter.clear()
    this.currentMode = this.options.defaultMode
    this._pendingTimeouts.forEach((id) => clearTimeout(id))
    this._pendingTimeouts = []
  }

  /**
   * 获取请求日志
   * @returns {Array} 请求日志数组
   */
  getRequestLog() {
    return [...this.requestLog]
  }

  /**
   * 创建 Mock 响应
   * @param {string} url - 请求 URL
   * @param {Object} init - 请求配置
   * @returns {Promise<Response>} Response Promise
   */
  createMockResponse(url, init = {}) {
    const requestId = `${init.method || 'GET'}_${url}`
    const attempt = (this.attemptCounter.get(requestId) || 0) + 1
    this.attemptCounter.set(requestId, attempt)

    const logEntry = {
      id: Date.now() + Math.random(),
      url,
      method: init.method || 'GET',
      attempt,
      mode: this.currentMode,
      timestamp: Date.now(),
    }
    this.requestLog.push(logEntry)

    return new Promise((resolve, reject) => {
      const handleSuccess = () => {
        resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { message: 'OK', attempt },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      }

      /**
       * 安全设置超时，支持 AbortSignal 取消
       * @param {Function} callback - 超时回调
       * @param {number} delay - 延迟毫秒数
       */
      const safeTimeout = (callback, delay) => {
        const timeoutId = setTimeout(callback, delay)
        this._pendingTimeouts.push(timeoutId)

        if (init?.signal) {
          const onAbort = () => {
            clearTimeout(timeoutId)
            const idx = this._pendingTimeouts.indexOf(timeoutId)
            if (idx > -1) this._pendingTimeouts.splice(idx, 1)

            const abortError = new Error('Aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          }

          if (init.signal.aborted) {
            onAbort()
            return
          }

          init.signal.addEventListener('abort', onAbort, { once: true })
        }
      }

      switch (this.currentMode) {
        case MOCK_MODES.SUCCESS:
          safeTimeout(handleSuccess, this.options.baseDelay)
          break

        case MOCK_MODES.TIMEOUT:
          // 模拟真实超时：长时间挂起，等待 AbortController 触发
          // 不主动返回 408，而是让超时机制触发错误
          safeTimeout(() => {
            // 只有当没有 AbortSignal 取消时才返回 408
            resolve(
              new Response(null, {
                status: 408,
                statusText: 'Request Timeout',
              })
            )
          }, this.options.timeoutDuration)
          break

        case MOCK_MODES.RATE_LIMIT:
          safeTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({ error: 'Rate limited' }),
                {
                  status: 429,
                  headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(this.options.rateLimitRetryAfter),
                  },
                }
              )
            )
          }, this.options.baseDelay)
          break

        case MOCK_MODES.NETWORK_ERROR:
          safeTimeout(() => {
            reject(new TypeError('Failed to fetch: Network error'))
          }, this.options.baseDelay)
          break

        case MOCK_MODES.FAIL_UNTIL_ATTEMPT:
          if (attempt < this.options.failUntilAttempt) {
            safeTimeout(() => {
              resolve(
                new Response(
                  JSON.stringify({ error: 'Service unavailable' }),
                  {
                    status: 503,
                    headers: {
                      'Content-Type': 'application/json',
                      'Retry-After': String(1),
                    },
                  }
                )
              )
            }, this.options.baseDelay)
          } else {
            safeTimeout(handleSuccess, this.options.baseDelay)
          }
          break

        case MOCK_MODES.RANDOM_RESET:
          const shouldSucceed = Math.random() > 0.5
          safeTimeout(() => {
            if (shouldSucceed) {
              handleSuccess()
            } else {
              resolve(
                new Response(
                  JSON.stringify({ error: 'Random reset' }),
                  {
                    status: 503,
                    headers: {
                      'Content-Type': 'application/json',
                      'Retry-After': String(2),
                    },
                  }
                )
              )
            }
          }, this.options.baseDelay)
          break

        default:
          safeTimeout(handleSuccess, this.options.baseDelay)
      }
    })
  }

  /**
   * 创建包装后的 fetch 函数
   * @returns {Function} fetch 包装函数
   */
  createFetchWrapper() {
    return (url, init) => this.createMockResponse(url, init)
  }
}

/**
 * 创建 Mock HTTP 服务器实例
 * @param {Object} options - 配置选项
 * @returns {MockHttpServer} Mock 服务器实例
 */
function createMockServer(options = {}) {
  return new MockHttpServer(options)
}

export { createMockServer, MOCK_MODES }
