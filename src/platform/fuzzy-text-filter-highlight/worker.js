import {
  buildFuzzyIndex,
  searchFuzzy,
  WORKER_MESSAGE_TYPES,
  ERROR_CODES,
  createError,
} from './logic/index.js'

/**
 * 存储构建好的模糊搜索索引
 * @type {Object|null}
 */
let index = null

/**
 * 存储索引构建选项
 * @type {Object}
 */
let buildOptions = {}

/**
 * Web Worker 消息处理器
 * 处理主线程发来的初始化、构建索引、搜索、取消等消息
 * @param {MessageEvent} event - Worker 消息事件
 */
self.onmessage = async function (event) {
  const message = event.data

  try {
    switch (message.type) {
      case WORKER_MESSAGE_TYPES.INIT:
        /**
         * 初始化 Worker，返回就绪状态
         */
        self.postMessage({
          type: WORKER_MESSAGE_TYPES.RESULT,
          payload: { status: 'ready' },
          id: message.id,
        })
        break

      case WORKER_MESSAGE_TYPES.BUILD_INDEX:
        /**
         * 构建模糊搜索索引
         */
        buildOptions = message.payload.options || {}
        index = buildFuzzyIndex(message.payload.corpus, buildOptions)
        self.postMessage({
          type: WORKER_MESSAGE_TYPES.RESULT,
          payload: {
            status: 'indexBuilt',
            meta: index.meta,
          },
          id: message.id,
        })
        break

      case WORKER_MESSAGE_TYPES.SEARCH:
        /**
         * 执行模糊搜索
         */
        if (!index) {
          throw createError(ERROR_CODES.INVALID_PAYLOAD, '索引未构建')
        }
        const startTime = performance.now()
        const results = searchFuzzy(index, message.payload.query, message.payload.options || {})
        const duration = performance.now() - startTime

        self.postMessage({
          type: WORKER_MESSAGE_TYPES.RESULT,
          payload: {
            status: 'searchComplete',
            results,
            duration,
          },
          id: message.id,
        })
        break

      case WORKER_MESSAGE_TYPES.CANCEL:
        /**
         * 取消当前操作
         */
        self.postMessage({
          type: WORKER_MESSAGE_TYPES.RESULT,
          payload: { status: 'cancelled' },
          id: message.id,
        })
        break

      default:
        throw createError(ERROR_CODES.INVALID_PAYLOAD, '未知消息类型')
    }
  } catch (error) {
    self.postMessage({
      type: WORKER_MESSAGE_TYPES.ERROR,
      payload: {
        error: error.toJSON ? error.toJSON() : { message: error.message },
      },
      id: message.id,
    })
  }
}
