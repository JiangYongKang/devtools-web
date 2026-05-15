import { ERROR_CODES } from './constants.js'
import { createError } from './errors.js'
import { sanitizeHeaders, estimateSizeInBytes } from './utils.js'

/**
 * 队列持久化管理器 - 将队列保存到 localStorage
 *
 * 主要功能:
 * - 敏感请求头脱敏 (Authorization/Cookie 等)
 * - 大小限制保护 (防止占用过多存储空间)
 * - 启用/禁用切换
 * - 存储大小统计
 */
class QueuePersistence {
  /**
   * 创建持久化管理器
   * @param {Object} options - 配置选项
   * @param {string} options.storageKey - localStorage 键名 (默认: 'network_queue_snapshot')
   * @param {number} options.maxSizeBytes - 最大存储大小 (字节, 默认: 500KB)
   * @param {Array} options.sensitiveHeaders - 需要脱敏的请求头列表
   * @param {boolean} options.enabled - 是否默认启用
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'network_queue_snapshot'
    this.maxSizeBytes = options.maxSizeBytes || 500 * 1024
    this.sensitiveHeaders = options.sensitiveHeaders || ['authorization', 'cookie', 'x-auth-token']
    this.enabled = options.enabled ?? false
  }

  /**
   * 保存队列到 localStorage (自动脱敏)
   * @param {Array} queue - 要保存的队列数组
   * @returns {boolean} 是否保存成功
   * @throws {Error} 超过大小限制或存储失败时抛出错误
   */
  save(queue) {
    if (!this.enabled) return

    try {
      const sanitizedQueue = queue.map((item) => ({
        ...item,
        headers: sanitizeHeaders(item.headers, this.sensitiveHeaders),
      }))

      const data = {
        queue: sanitizedQueue,
        savedAt: Date.now(),
      }

      const size = estimateSizeInBytes(data)
      if (size > this.maxSizeBytes) {
        throw createError(
          ERROR_CODES.PERSISTENCE_SIZE_EXCEEDED,
          '队列数据超过持久化大小限制',
          { size, maxSize: this.maxSizeBytes }
        )
      }

      const jsonStr = JSON.stringify(data)
      localStorage.setItem(this.storageKey, jsonStr)
      return true
    } catch (error) {
      if (error.code === ERROR_CODES.PERSISTENCE_SIZE_EXCEEDED) {
        throw error
      }
      throw createError(
        ERROR_CODES.STORAGE_ERROR,
        '持久化失败',
        { originalMessage: error.message }
      )
    }
  }

  /**
   * 从 localStorage 加载队列
   * @returns {Object|null} 加载的数据，包含 queue 和 savedAt，失败返回 null
   */
  load() {
    if (!this.enabled) return null

    try {
      const jsonStr = localStorage.getItem(this.storageKey)
      if (!jsonStr) return null

      const data = JSON.parse(jsonStr)
      return data
    } catch (error) {
      console.warn('加载持久化队列失败:', error)
      return null
    }
  }

  /**
   * 清除已保存的队列数据
   * @returns {boolean} 是否清除成功
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 获取已存储数据的大小
   * @returns {number} 字节数，失败返回 0
   */
  getStoredSize() {
    try {
      const jsonStr = localStorage.getItem(this.storageKey)
      if (!jsonStr) return 0
      return new Blob([jsonStr]).size
    } catch {
      return 0
    }
  }

  /**
   * 检查持久化是否已启用
   * @returns {boolean} 是否启用
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * 设置持久化启用状态
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.enabled = enabled
  }
}

/**
 * 创建持久化中间件 - 自动监听队列变化并防抖保存
 * @param {RequestQueue} queue - 请求队列实例
 * @param {QueuePersistence} persistence - 持久化管理器实例
 * @returns {Object} 中间件对象 { loadStoredQueue: Function, dispose: Function }
 */
const createPersistenceMiddleware = (queue, persistence) => {
  let saveTimeout = null

  const scheduleSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(() => {
      try {
        persistence.save(queue.getQueue())
      } catch (error) {
        console.warn('自动持久化失败:', error)
      }
    }, 1000)
  }

  const unsubscribeEnqueued = queue.on('enqueued', scheduleSave)
  const unsubscribeCancelled = queue.on('cancelled', scheduleSave)
  const unsubscribeCompleted = queue.on('requestCompleted', scheduleSave)
  const unsubscribeFailed = queue.on('requestFailed', scheduleSave)

  const loadStoredQueue = () => {
    const stored = persistence.load()
    if (stored && stored.queue) {
      stored.queue.forEach((item) => {
        try {
          queue.enqueue(item)
        } catch (e) {
          console.warn('恢复队列项失败:', e)
        }
      })
      return stored.queue.length
    }
    return 0
  }

  return {
    loadStoredQueue,
    dispose: () => {
      unsubscribeEnqueued()
      unsubscribeCancelled()
      unsubscribeCompleted()
      unsubscribeFailed()
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
    },
  }
}

export {
  QueuePersistence,
  createPersistenceMiddleware,
}
