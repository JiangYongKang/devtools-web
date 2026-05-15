import { DOWNLOAD_MODES, MAX_BEFOREUNLOAD_MESSAGE } from './constants.js'
import { detectBestDownloadMode, isSSR } from './capabilityDetector.js'
import { delay } from './utils.js'

export function createObjectUrlDownloader() {
  let activeUrl = null

  return {
    trigger: (blob, filename) => {
      if (isSSR()) {
        return { success: false, error: 'SSR 环境不支持' }
      }

      try {
        const url = URL.createObjectURL(blob)
        activeUrl = url

        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.style.display = 'none'
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)

        return { success: true, mode: DOWNLOAD_MODES.OBJECT_URL_MERGE }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    cleanup: () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl)
        activeUrl = null
      }
    },
  }
}

export function createMultiBlobSequentialDownloader(options = {}) {
  const {
    chunkDelayMs = 500,
    onChunkDownload = null,
  } = options

  const activeUrls = []

  return {
    trigger: async (chunks, filename, mimeType) => {
      if (isSSR()) {
        return { success: false, error: 'SSR 环境不支持' }
      }

      try {
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          const blob = new Blob([chunk], { type: mimeType })
          const url = URL.createObjectURL(blob)
          activeUrls.push(url)

          const chunkFilename = i === 0
            ? filename
            : filename.replace(/(\.[^.]+)?$/, `_part${i + 1}$1`)

          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = chunkFilename
          anchor.style.display = 'none'
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)

          if (onChunkDownload) {
            onChunkDownload({
              chunkIndex: i,
              totalChunks: chunks.length,
              filename: chunkFilename,
            })
          }

          if (i < chunks.length - 1) {
            await delay(chunkDelayMs)
          }
        }

        return {
          success: true,
          mode: DOWNLOAD_MODES.MULTI_BLOB_SEQUENTIAL,
          chunkCount: chunks.length,
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    cleanup: () => {
      for (const url of activeUrls) {
        URL.revokeObjectURL(url)
      }
      activeUrls.length = 0
    },
  }
}

/**
 * 创建下载触发器，自动选择最佳下载策略
 *
 * 下载策略优先级：
 * 1. Object URL 合并模式 - 将所有分块合并为单个 Blob，触发一次下载（首选）
 * 2. 多 Blob 顺序下载 - 每个分块单独下载，用户需手动合并（降级方案）
 * 3. StreamSaver 风格 - 需要额外引入 streamSaver 库（当前未实现，预留扩展点）
 *
 * @param {Object} options - 配置选项
 * @param {string} [options.preferredMode=null] - 强制指定下载模式，不指定则自动检测
 * @param {Function} [options.onModeFallback=null] - 模式降级回调，当 Object URL 失败时触发
 * @param {number} [options.chunkDelayMs=500] - 多 Blob 顺序下载时的间隔时间，避免浏览器拦截
 * @param {Function} [options.onChunkDownload=null] - 每个分块下载完成的回调
 * @returns {Object} 下载触发器对象
 * @property {Function} triggerDownload - 触发下载，传入 downloadPlan 对象
 * @property {Function} cleanup - 清理所有创建的 Object URL，防止内存泄漏
 * @property {string[]} availableModes - 支持的下载模式列表
 *
 * @example
 * const trigger = createDownloadTrigger({
 *   onModeFallback: ({ from, to, reason }) => {
 *     console.warn(`下载模式降级: ${from} -> ${to}, 原因: ${reason}`);
 *     // 可在这里提示用户手动合并文件
 *   }
 * });
 * const result = await trigger.triggerDownload(downloadPlan);
 * console.log(`下载模式: ${result.mode}`);
 */
export function createDownloadTrigger(options = {}) {
  const {
    preferredMode = null,
    onModeFallback = null,
    ...sequentialOptions
  } = options

  const objectUrlDownloader = createObjectUrlDownloader()
  const sequentialDownloader = createMultiBlobSequentialDownloader(sequentialOptions)

  const triggerDownload = async (downloadPlan) => {
    if (isSSR()) {
      return { success: false, error: 'SSR 环境不支持' }
    }

    const targetMode = preferredMode || detectBestDownloadMode()
    const { filename, mimeType } = downloadPlan.state

    if (targetMode === DOWNLOAD_MODES.OBJECT_URL_MERGE) {
      try {
        const blob = downloadPlan.getCombinedBlob()
        const result = objectUrlDownloader.trigger(blob, filename)

        if (result.success) {
          return result
        }

        if (onModeFallback) {
          onModeFallback({
            from: DOWNLOAD_MODES.OBJECT_URL_MERGE,
            to: DOWNLOAD_MODES.MULTI_BLOB_SEQUENTIAL,
            reason: result.error,
          })
        }
      } catch (error) {
        if (onModeFallback) {
          onModeFallback({
            from: DOWNLOAD_MODES.OBJECT_URL_MERGE,
            to: DOWNLOAD_MODES.MULTI_BLOB_SEQUENTIAL,
            reason: error.message,
          })
        }
      }
    }

    const chunks = downloadPlan.getChunks()
    return sequentialDownloader.trigger(chunks, filename, mimeType)
  }

  const cleanup = () => {
    objectUrlDownloader.cleanup()
    sequentialDownloader.cleanup()
  }

  return {
    triggerDownload,
    cleanup,
    availableModes: [
      DOWNLOAD_MODES.OBJECT_URL_MERGE,
      DOWNLOAD_MODES.MULTI_BLOB_SEQUENTIAL,
    ],
  }
}

export function createBeforeUnloadHandler() {
  let activeDownloads = new Set()
  let handlerInstalled = false

  const handleBeforeUnload = (event) => {
    if (activeDownloads.size > 0) {
      event.preventDefault()
      event.returnValue = MAX_BEFOREUNLOAD_MESSAGE
      return MAX_BEFOREUNLOAD_MESSAGE
    }
  }

  const addDownload = (id) => {
    activeDownloads.add(id)

    if (!handlerInstalled && !isSSR()) {
      window.addEventListener('beforeunload', handleBeforeUnload)
      handlerInstalled = true
    }
  }

  const removeDownload = (id) => {
    activeDownloads.delete(id)

    if (handlerInstalled && activeDownloads.size === 0 && !isSSR()) {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      handlerInstalled = false
    }
  }

  const hasActiveDownloads = () => activeDownloads.size > 0

  const cleanup = () => {
    if (handlerInstalled && !isSSR()) {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      handlerInstalled = false
    }
    activeDownloads.clear()
  }

  return {
    addDownload,
    removeDownload,
    hasActiveDownloads,
    cleanup,
  }
}

/**
 * 创建完整的下载执行器，整合触发器、进度回调和 beforeunload 防护
 *
 * @param {Object} options - 配置选项
 * @param {Function} [options.onProgress=null] - 全局进度回调
 * @param {Function} [options.onComplete=null] - 下载完成回调，包含分块数和下载模式
 * @param {Function} [options.onError=null] - 下载错误回调
 * @param {Function} [options.onCancel=null] - 用户取消下载回调
 * @param {boolean} [options.autoCleanup=true] - 是否自动释放 Object URL
 * @returns {Object} 下载执行器对象
 * @property {Function} execute - 执行完整下载流程，传入 downloadPlan
 * @property {Function} cleanup - 清理所有资源
 * @property {Object} downloadTrigger - 内部下载触发器
 * @property {Object} beforeUnloadHandler - 页面卸载防护处理器
 */
export function createDownloadExecutor(options = {}) {
  const {
    onProgress = null,
    onComplete = null,
    onError = null,
    onCancel = null,
    autoCleanup = true,
  } = options

  const downloadTrigger = createDownloadTrigger(options)
  const beforeUnloadHandler = createBeforeUnloadHandler()

  const execute = async (downloadPlan, downloadId = null) => {
    const id = downloadId || `download_${Date.now()}`

    try {
      beforeUnloadHandler.addDownload(id)

      for await (const event of downloadPlan.execute()) {
        if (event.type === 'chunk' && onProgress) {
          onProgress(event.progress)
        }

        if (event.type === 'complete') {
          if (onProgress) {
            onProgress(event.progress)
          }

          const downloadResult = await downloadTrigger.triggerDownload(downloadPlan)

          if (onComplete) {
            onComplete({
              ...event,
              downloadResult,
            })
          }

          if (autoCleanup) {
            downloadPlan.revokeObjectUrl()
          }

          return {
            success: true,
            downloadId: id,
            ...event,
            downloadResult,
          }
        }
      }

      return { success: false, cancelled: true }
    } catch (error) {
      if (error.errorCode === 'USER_ABORTED') {
        if (onCancel) {
          onCancel(error)
        }
        return { success: false, cancelled: true, error }
      }

      if (onError) {
        onError(error)
      }

      return { success: false, error }
    } finally {
      beforeUnloadHandler.removeDownload(id)

      if (autoCleanup) {
        downloadTrigger.cleanup()
      }
    }
  }

  const cleanup = () => {
    downloadTrigger.cleanup()
    beforeUnloadHandler.cleanup()
  }

  return {
    execute,
    cleanup,
    downloadTrigger,
    beforeUnloadHandler,
  }
}
