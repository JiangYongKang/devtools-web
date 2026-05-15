import { NETWORK_STATES, REQUEST_STATES, ERROR_CODES, DEFAULT_OPTIONS } from './constants.js'
import { createError } from './errors.js'
import {
  generateId,
  calculateNextBackoff,
  generateDedupeKey,
  sanitizeHeaders,
} from './utils.js'
import { classifyNetwork, takeNetworkSnapshot } from './networkClassifier.js'

/**
 * 网络弹性请求队列 - 支持离线排队、自动重试、优先级调度
 *
 * 主要功能:
 * - 三态网络感知 (Online/Degraded/Offline)
 * - 按优先级排序的内存队列
 * - 指数退避重试 (含抖动)
 * - 请求去重
 * - 并发控制
 * - 事件订阅
 */
class RequestQueue {
  /**
   * 创建请求队列实例
   * @param {Object} options - 配置选项
   * @param {number} options.maxQueueSize - 最大队列长度 (默认 100)
   * @param {number} options.maxConcurrency - 最大并发请求数 (默认 3)
   * @param {number} options.defaultPriority - 默认优先级 (默认 5)
   * @param {boolean} options.enablePersistence - 是否启用本地持久化
   * @param {Object} options.backoff - 退避算法配置
   */
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.queue = []
    this.runningRequests = new Map()
    this.networkState = NETWORK_STATES.ONLINE
    this.lastUserInteractionMs = Date.now()
    this.listeners = new Map()
    this.isMonitoring = false
    this.networkMonitorInterval = null
    this._setupUserInteractionHandler = null
  }

  /**
   * 将请求加入队列
   * @param {Object} requestSpec - 请求规范
   * @param {string} requestSpec.method - HTTP 方法 (GET/POST/PUT 等)
   * @param {string} requestSpec.url - 请求 URL
   * @param {Object} requestSpec.headers - 请求头
   * @param {string} requestSpec.body - 请求体
   * @param {number} requestSpec.priority - 优先级 (1-10, 越大越优先)
   * @param {string} requestSpec.dedupeKey - 去重键 (自动生成)
   * @returns {string} 请求 ID
   * @throws {Error} 队列已满时抛出错误
   */
  enqueue(requestSpec) {
    if (this.queue.length >= this.options.maxQueueSize) {
      throw createError(ERROR_CODES.QUEUE_FULL, '队列已满', {
        maxSize: this.options.maxQueueSize,
      })
    }

    const dedupeKey = requestSpec.dedupeKey || generateDedupeKey(requestSpec)
    const existingIndex = this.queue.findIndex((r) => r.dedupeKey === dedupeKey)
    if (existingIndex >= 0) {
      const existing = this.queue[existingIndex]
      if (existing.state === REQUEST_STATES.QUEUED) {
        return existing.id
      }
    }

    const request = {
      id: generateId('req'),
      ...requestSpec,
      dedupeKey,
      state: REQUEST_STATES.QUEUED,
      priority: requestSpec.priority ?? this.options.defaultPriority,
      retryCount: 0,
      nextRetryAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      error: null,
      result: null,
    }

    this.queue.push(request)
    this._sortQueue()
    this._notifyListeners('enqueued', request)

    if (this._shouldProcessImmediately()) {
      this._processQueue()
    }

    return request.id
  }

  /**
   * 取消指定请求
   * @param {string} requestId - 请求 ID
   * @returns {boolean} 是否成功取消
   */
  cancel(requestId) {
    const index = this.queue.findIndex((r) => r.id === requestId)
    if (index >= 0) {
      const request = this.queue[index]
      request.state = REQUEST_STATES.CANCELLED
      request.updatedAt = Date.now()
      this.queue.splice(index, 1)
      this._notifyListeners('cancelled', request)
      return true
    }

    if (this.runningRequests.has(requestId)) {
      const abortController = this.runningRequests.get(requestId).abortController
      if (abortController) {
        abortController.abort()
      }
      return true
    }

    return false
  }

  /**
   * 清空队列并取消所有进行中的请求
   */
  clear() {
    const cancelledRequests = this.queue.map((r) => ({
      ...r,
      state: REQUEST_STATES.CANCELLED,
      updatedAt: Date.now(),
    }))
    this.queue = []

    this.runningRequests.forEach(({ abortController }) => {
      if (abortController) {
        abortController.abort()
      }
    })
    this.runningRequests.clear()

    cancelledRequests.forEach((r) => {
      this._notifyListeners('cancelled', r)
    })
  }

  /**
   * 获取当前队列快照
   * @returns {Array} 队列中的所有请求 (副本)
   */
  getQueue() {
    return [...this.queue]
  }

  /**
   * 获取当前网络状态
   * @returns {string} Online/Degraded/Offline
   */
  getNetworkState() {
    return this.networkState
  }

  /**
   * 启动网络状态监控
   * 监听 online/offline 事件、用户交互，并定期进行健康检查
   */
  startNetworkMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._handleOnline.bind(this))
      window.addEventListener('offline', this._handleOffline.bind(this))

      this._setupUserInteractionHandler = this._handleUserInteraction.bind(this)
      document.addEventListener('click', this._setupUserInteractionHandler)
      document.addEventListener('keydown', this._setupUserInteractionHandler)
      document.addEventListener('mousemove', this._setupUserInteractionHandler)
    }

    this._updateNetworkState()
    this.networkMonitorInterval = setInterval(
      () => this._updateNetworkState(),
      this.options.healthCheckIntervalMs
    )
  }

  /**
   * 停止网络状态监控
   */
  stopNetworkMonitoring() {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline.bind(this))
      window.removeEventListener('offline', this._handleOffline.bind(this))

      if (this._setupUserInteractionHandler) {
        document.removeEventListener('click', this._setupUserInteractionHandler)
        document.removeEventListener('keydown', this._setupUserInteractionHandler)
        document.removeEventListener('mousemove', this._setupUserInteractionHandler)
      }
    }

    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval)
      this.networkMonitorInterval = null
    }
  }

  /**
   * 订阅队列事件
   * @param {string} event - 事件类型 (enqueued/cancelled/requestStarted/requestCompleted/requestFailed/networkStateChanged)
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    return () => {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index >= 0) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 销毁队列，停止监控并清理所有资源
   */
  dispose() {
    this.stopNetworkMonitoring()
    this.clear()
    this.listeners.clear()
  }

  _handleOnline() {
    this._updateNetworkState()
    this._processQueue()
  }

  _handleOffline() {
    this._updateNetworkState()
  }

  _handleUserInteraction() {
    this.lastUserInteractionMs = Date.now()
  }

  async _updateNetworkState() {
    try {
      const snapshot = await takeNetworkSnapshot({
        healthCheckUrl: this.options.healthCheckUrl,
        healthCheckTimeoutMs: this.options.healthCheckTimeoutMs,
        degradedRttThresholdMs: this.options.degradedRttThresholdMs,
      })
      snapshot.lastUserInteractionMs = this.lastUserInteractionMs
      snapshot.nowMs = Date.now()

      const result = classifyNetwork(snapshot)
      this.networkState = result.state
      this._notifyListeners('networkStateChanged', result)
    } catch (error) {
      console.warn('网络状态更新失败', error)
    }
  }

  _shouldProcessImmediately() {
    return (
      this.networkState === NETWORK_STATES.ONLINE &&
      this.runningRequests.size < this.options.maxConcurrency
    )
  }

  _canRetryOnCurrentNetwork() {
    if (!this.options.retryOnWifiOnly) {
      return true
    }

    if (typeof navigator === 'undefined' || !navigator.connection) {
      return true
    }

    return navigator.connection.effectiveType === '4g' ||
           navigator.connection.effectiveType === '3g'
  }

  async _processQueue() {
    if (
      this.networkState !== NETWORK_STATES.ONLINE ||
      !this._canRetryOnCurrentNetwork()
    ) {
      return
    }

    while (
      this.runningRequests.size < this.options.maxConcurrency &&
      this.queue.length > 0
    ) {
      const nextRequest = this._getNextRunnableRequest()
      if (!nextRequest) break

      this._executeRequest(nextRequest)
    }
  }

  _getNextRunnableRequest() {
    const now = Date.now()
    return this.queue.find((r) => {
      if (r.state !== REQUEST_STATES.QUEUED) return false
      if (r.nextRetryAt && r.nextRetryAt > now) return false
      return true
    })
  }

  _sortQueue() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.createdAt - b.createdAt
    })
  }

  async _executeRequest(request) {
    const index = this.queue.findIndex((r) => r.id === request.id)
    if (index < 0) return

    request.state = request.retryCount > 0 ? REQUEST_STATES.RETRYING : REQUEST_STATES.RUNNING
    request.updatedAt = Date.now()

    const abortController = new AbortController()
    this.runningRequests.set(request.id, { abortController })

    this._notifyListeners('requestStarted', request)

    try {
      const response = await fetch(request.url, {
        method: request.method || 'GET',
        headers: request.headers,
        body: request.body,
        signal: abortController.signal,
      })

      const result = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      }

      try {
        result.data = await response.json()
      } catch {
        try {
          result.text = await response.text()
        } catch {
        }
      }

      request.state = REQUEST_STATES.COMPLETED
      request.result = result
      request.updatedAt = Date.now()

      this.queue.splice(index, 1)
      this._notifyListeners('requestCompleted', request)
    } catch (error) {
      if (error.name === 'AbortError') {
        request.state = REQUEST_STATES.CANCELLED
        this.queue.splice(index, 1)
        this._notifyListeners('cancelled', request)
      } else {
        request.retryCount++
        request.error = {
          message: error.message,
          name: error.name,
        }

        if (request.retryCount >= this.options.backoff.maxRetries) {
          request.state = REQUEST_STATES.FAILED
          request.updatedAt = Date.now()
          this.queue.splice(index, 1)
          this._notifyListeners('requestFailed', request)
        } else {
          const nextDelay = calculateNextBackoff(request.retryCount - 1, this.options.backoff)
          request.nextRetryAt = Date.now() + nextDelay
          request.state = REQUEST_STATES.QUEUED
          request.updatedAt = Date.now()
          this._notifyListeners('requestRetrying', { ...request, nextDelay })

          setTimeout(() => {
            if (request.state === REQUEST_STATES.QUEUED) {
              this._processQueue()
            }
          }, nextDelay)
        }
      }
    } finally {
      this.runningRequests.delete(request.id)
      this._processQueue()
    }
  }

  _notifyListeners(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data)
        } catch (e) {
          console.error('Listener error:', e)
        }
      })
    }
  }

  getStats() {
    const stats = {
      total: this.queue.length,
      queued: this.queue.filter((r) => r.state === REQUEST_STATES.QUEUED).length,
      running: this.runningRequests.size,
      completed: 0,
      failed: 0,
      networkState: this.networkState,
    }
    return stats
  }

  toJSON() {
    return {
      queue: this.queue.map((r) => ({
        ...r,
        headers: sanitizeHeaders(r.headers, this.options.sensitiveHeaders),
      })),
      networkState: this.networkState,
      options: {
        maxQueueSize: this.options.maxQueueSize,
        maxConcurrency: this.options.maxConcurrency,
      },
    }
  }
}

export {
  RequestQueue,
}
