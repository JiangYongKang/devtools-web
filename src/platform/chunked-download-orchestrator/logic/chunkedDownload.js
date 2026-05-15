import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MAX_TOTAL_BYTES,
  DEFAULT_RETRY_COUNT,
  ERROR_CODES,
} from './constants.js'
import { createError, isAbortError, isQuotaExceededError, wrapError } from './errors.js'
import { createExportSource, getSourceSize, SOURCE_TYPES } from './exportSource.js'
import {
  createSpeedEstimator,
  createRafThrottler,
  sanitizeFilename,
  normalizeMimeType,
  inferMimeTypeFromFilename,
  shouldAddUtf8Bom,
  addUtf8Bom,
  delay,
} from './utils.js'
import { isSSR } from './capabilityDetector.js'

/**
 * 创建分块下载计划，支持大对象内存友好的导出编排
 *
 * @param {string|Blob|Uint8Array|ArrayBuffer|ReadableStream} source - 数据源，支持字符串、Blob、Uint8Array、ArrayBuffer、ReadableStream
 * @param {Object} options - 配置选项
 * @param {number} [options.chunkSize=1048576] - 分块大小，单位字节，默认 1MB
 * @param {number} [options.maxTotalBytes=524288000] - 最大允许字节数，默认 500MB，超限制抛出错误
 * @param {string} [options.filename='download'] - 下载文件名，会自动消毒处理
 * @param {string} [options.mimeType=null] - MIME 类型，为空则从文件名推断
 * @param {number} [options.retryCount=1] - 下载失败重试次数
 * @param {Function} [options.onProgress=null] - 进度回调函数，接收 progress 对象
 * @param {boolean} [options.throttleProgress=true] - 是否使用 requestAnimationFrame 节流进度回调
 * @param {boolean} [options.addBom=null] - 是否添加 UTF-8 BOM，null 表示根据 MIME 类型自动判断
 * @param {number} [options.simulateDelayMs=0] - 模拟网络延迟，用于演示和测试，单位毫秒
 * @returns {Object} 下载计划对象，包含执行、取消、获取进度等方法
 * @property {Function} execute - 异步迭代器，执行分块下载，yield { type: 'chunk'|'complete', ... }
 * @property {Function} cancel - 取消下载，传播 AbortSignal 到数据源
 * @property {Function} reset - 重置下载状态，清空分块数据
 * @property {Function} getChunks - 获取所有已下载的 Uint8Array 分块数组
 * @property {Function} getCombinedBlob - 将所有分块合并为单个 Blob
 * @property {Function} getObjectUrl - 创建并返回 Blob URL，调用 revokeObjectUrl 释放
 * @property {Function} revokeObjectUrl - 释放 Blob URL，防止内存泄漏
 * @property {Function} getProgress - 获取当前进度状态对象
 * @property {Object} state - 只读状态对象 { isStarted, isCompleted, isCancelled, writtenBytes, totalBytes, filename, mimeType, chunkCount }
 * @property {AbortController} abortController - 内部 AbortController 实例
 *
 * @example
 * // 基础用法 - 字符串导出
 * const plan = planChunkedDownload('大文本内容...', {
 *   filename: 'data.txt',
 *   chunkSize: 1024 * 100,
 *   onProgress: (p) => console.log(`进度: ${p.percent}%`)
 * });
 * for await (const event of plan.execute()) {
 *   if (event.type === 'complete') {
 *     triggerDownload(plan);
 *   }
 * }
 *
 * @example
 * // ReadableStream 流式导出（可取消）
 * const stream = response.body;
 * const plan = planChunkedDownload(stream, { filename: 'large.zip' });
 * // 5 秒后取消
 * setTimeout(() => plan.cancel(), 5000);
 */
export function planChunkedDownload(source, options = {}) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
    filename = 'download',
    mimeType = null,
    retryCount = DEFAULT_RETRY_COUNT,
    onProgress = null,
    throttleProgress = true,
    addBom = null,
    simulateDelayMs = 0,
  } = options

  const abortController = new AbortController()
  const speedEstimator = createSpeedEstimator()
  const progressThrottler = throttleProgress ? createRafThrottler() : null

  const sanitizedFilename = sanitizeFilename(filename)
  const finalMimeType = mimeType
    ? normalizeMimeType(mimeType)
    : inferMimeTypeFromFilename(sanitizedFilename)

  const shouldAddBom = addBom !== null ? addBom : shouldAddUtf8Bom(finalMimeType)

  let chunks = []
  let writtenBytes = 0
  let totalBytes = null
  let isCancelled = false
  let isCompleted = false
  let isStarted = false
  let objectUrl = null
  let currentRetry = 0

  const emitProgress = (progress) => {
    if (!onProgress) return

    if (progressThrottler) {
      progressThrottler(onProgress, progress)
    } else {
      onProgress(progress)
    }
  }

  const calculateProgress = () => {
    const percent = totalBytes
      ? Math.min(100, (writtenBytes / totalBytes) * 100)
      : isCompleted ? 100 : null

    const speed = speedEstimator.update(writtenBytes)
    const remainingBytes = totalBytes ? totalBytes - writtenBytes : null
    const eta = speed > 0 && remainingBytes !== null ? remainingBytes / speed : null

    return {
      percent,
      writtenBytes,
      totalBytes,
      speed,
      eta,
      isStarted,
      isCompleted,
      isCancelled,
      filename: sanitizedFilename,
      mimeType: finalMimeType,
    }
  }

  async function* execute() {
    if (isSSR()) {
      throw createError(ERROR_CODES.SSR_ENVIRONMENT)
    }

    isStarted = true
    const exportSource = createExportSource(source, {
      filename: sanitizedFilename,
      mimeType: finalMimeType,
    })

    totalBytes = await getSourceSize(exportSource.source, exportSource.sourceType)

    if (totalBytes !== null && totalBytes > maxTotalBytes) {
      throw createError(
        ERROR_CODES.EXCEEDS_MAX_BYTES,
        `文件大小 ${totalBytes} 超过最大限制 ${maxTotalBytes}`
      )
    }

    if (exportSource.sourceType === SOURCE_TYPES.STRING) {
      const stringSize = new TextEncoder().encode(exportSource.source).length
      if (stringSize > maxTotalBytes) {
        throw createError(
          ERROR_CODES.EXCEEDS_MAX_BYTES,
          `字符串大小 ${stringSize} 超过最大限制 ${maxTotalBytes}`
        )
      }
    }

    let isFirstChunk = true
    let chunkIndex = 0

    try {
      const iterator = exportSource.createIterator(chunkSize, abortController.signal)

      while (true) {
        if (isCancelled) {
          break
        }

        if (abortController.signal.aborted) {
          throw createError(ERROR_CODES.USER_ABORTED)
        }

        let result
        try {
          result = await iterator.next()
        } catch (error) {
          if (isAbortError(error)) {
            isCancelled = true
            throw error
          }

          if (currentRetry < retryCount) {
            currentRetry++
            await delay(100 * currentRetry)
            continue
          }

          throw wrapError(error, ERROR_CODES.NETWORK_ERROR)
        }

        if (result.done) {
          break
        }

        let chunk = result.value

        if (isFirstChunk && shouldAddBom) {
          chunk = addUtf8Bom(chunk)
          isFirstChunk = false
        }

        if (simulateDelayMs > 0) {
          await delay(simulateDelayMs)
        }

        chunks.push(chunk)
        writtenBytes += chunk.length

        const progress = calculateProgress()
        emitProgress(progress)

        yield {
          type: 'chunk',
          chunkIndex,
          chunkData: chunk,
          writtenBytes,
          totalBytes,
          progress,
        }

        chunkIndex++
      }

      isCompleted = true
      const finalProgress = calculateProgress()
      emitProgress(finalProgress)

      yield {
        type: 'complete',
        writtenBytes,
        totalBytes,
        chunkCount: chunks.length,
        progress: finalProgress,
      }
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw createError(ERROR_CODES.QUOTA_EXCEEDED, '内存配额不足', error)
      }
      throw error
    } finally {
      if (progressThrottler) {
        progressThrottler.cancel()
      }
    }
  }

  function getChunks() {
    return chunks
  }

  function getCombinedBlob() {
    if (isSSR()) {
      return null
    }
    return new Blob(chunks, { type: finalMimeType })
  }

  function getObjectUrl() {
    if (isSSR()) {
      return null
    }

    if (!objectUrl) {
      const blob = getCombinedBlob()
      objectUrl = URL.createObjectURL(blob)
    }
    return objectUrl
  }

  function revokeObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
  }

  function cancel() {
    if (isCancelled || isCompleted) {
      return
    }

    isCancelled = true
    abortController.abort()

    const progress = calculateProgress()
    emitProgress(progress)

    revokeObjectUrl()
  }

  function reset() {
    cancel()
    chunks = []
    writtenBytes = 0
    isCancelled = false
    isCompleted = false
    isStarted = false
    currentRetry = 0
    speedEstimator.reset()
  }

  const state = {
    get isStarted() { return isStarted },
    get isCompleted() { return isCompleted },
    get isCancelled() { return isCancelled },
    get writtenBytes() { return writtenBytes },
    get totalBytes() { return totalBytes },
    get filename() { return sanitizedFilename },
    get mimeType() { return finalMimeType },
    get chunkCount() { return chunks.length },
  }

  return {
    execute,
    cancel,
    reset,
    getChunks,
    getCombinedBlob,
    getObjectUrl,
    revokeObjectUrl,
    getProgress: calculateProgress,
    state,
    abortController,
  }
}

export function createChunkedDownloadManager() {
  const activeDownloads = new Map()

  return {
    startDownload: (id, source, options) => {
      const download = planChunkedDownload(source, options)
      activeDownloads.set(id, download)
      return download
    },

    cancelDownload: (id) => {
      const download = activeDownloads.get(id)
      if (download) {
        download.cancel()
        activeDownloads.delete(id)
      }
    },

    getDownload: (id) => activeDownloads.get(id),

    cancelAll: () => {
      for (const download of activeDownloads.values()) {
        download.cancel()
      }
      activeDownloads.clear()
    },

    getActiveCount: () => activeDownloads.size,
  }
}
