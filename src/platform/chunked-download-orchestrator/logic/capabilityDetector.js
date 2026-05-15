import { BROWSER_FEATURES, DOWNLOAD_MODES } from './constants.js'

export function isSSR() {
  return typeof window === 'undefined' || typeof document === 'undefined'
}

export function detectBrowserFeatures() {
  if (isSSR()) {
    return {
      [BROWSER_FEATURES.OBJECT_URL]: false,
      [BROWSER_FEATURES.READABLE_STREAM]: false,
      [BROWSER_FEATURES.STREAM_SAVER]: false,
      [BROWSER_FEATURES.FILE_SYSTEM_ACCESS]: false,
      [BROWSER_FEATURES.BLOB_CONSTRUCTOR]: false,
      [BROWSER_FEATURES.TEXT_ENCODER]: false,
    }
  }

  return {
    [BROWSER_FEATURES.OBJECT_URL]: !!(window.URL && window.URL.createObjectURL),
    [BROWSER_FEATURES.READABLE_STREAM]: typeof ReadableStream === 'function',
    [BROWSER_FEATURES.STREAM_SAVER]: false,
    [BROWSER_FEATURES.FILE_SYSTEM_ACCESS]: 'showSaveFilePicker' in window,
    [BROWSER_FEATURES.BLOB_CONSTRUCTOR]: typeof Blob === 'function',
    [BROWSER_FEATURES.TEXT_ENCODER]: typeof TextEncoder === 'function',
  }
}

export function detectBestDownloadMode(features = null) {
  const f = features || detectBrowserFeatures()

  if (f[BROWSER_FEATURES.STREAM_SAVER]) {
    return DOWNLOAD_MODES.STREAM_SAVER
  }

  if (f[BROWSER_FEATURES.OBJECT_URL] && f[BROWSER_FEATURES.BLOB_CONSTRUCTOR]) {
    return DOWNLOAD_MODES.OBJECT_URL_MERGE
  }

  return DOWNLOAD_MODES.MULTI_BLOB_SEQUENTIAL
}

export function detectBrowserType() {
  if (isSSR()) {
    return 'ssr'
  }

  const userAgent = navigator.userAgent

  if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    return 'safari'
  }

  if (/Chrome/.test(userAgent) || /Chromium/.test(userAgent)) {
    return 'chromium'
  }

  if (/Firefox/.test(userAgent)) {
    return 'firefox'
  }

  if (/Edg/.test(userAgent)) {
    return 'edge'
  }

  return 'other'
}

export const BROWSER_COMPATIBILITY_TABLE = {
  safari: {
    objectUrl: {
      supported: true,
      notes: 'Safari 对 Blob 大小有限制，建议使用较小的分块大小',
      maxBlobSize: 500 * 1024 * 1024,
    },
    readableStream: {
      supported: true,
      notes: 'Safari 14.1+ 支持 ReadableStream',
    },
    streamSaver: {
      supported: false,
      notes: 'StreamSaver 在 Safari 上可能不稳定',
    },
    multiBlobSequential: {
      supported: true,
      notes: 'Safari 可能会拦截连续下载，需要用户交互',
    },
  },
  chromium: {
    objectUrl: {
      supported: true,
      notes: 'Chrome/Edge 支持较大的 Blob 大小',
      maxBlobSize: 2 * 1024 * 1024 * 1024,
    },
    readableStream: {
      supported: true,
      notes: '完全支持 ReadableStream',
    },
    streamSaver: {
      supported: true,
      notes: '推荐使用 StreamSaver 处理大文件',
    },
    multiBlobSequential: {
      supported: true,
      notes: '支持多 Blob 顺序下载',
    },
  },
  firefox: {
    objectUrl: {
      supported: true,
      notes: 'Firefox 支持 Blob 合并',
      maxBlobSize: 800 * 1024 * 1024,
    },
    readableStream: {
      supported: true,
      notes: '完全支持 ReadableStream',
    },
    streamSaver: {
      supported: false,
      notes: 'StreamSaver 在 Firefox 上支持有限',
    },
    multiBlobSequential: {
      supported: true,
      notes: '支持多 Blob 顺序下载',
    },
  },
  edge: {
    objectUrl: {
      supported: true,
      notes: 'Edge 基于 Chromium，支持较好',
      maxBlobSize: 2 * 1024 * 1024 * 1024,
    },
    readableStream: {
      supported: true,
      notes: '完全支持 ReadableStream',
    },
    streamSaver: {
      supported: true,
      notes: '推荐使用 StreamSaver',
    },
    multiBlobSequential: {
      supported: true,
      notes: '支持多 Blob 顺序下载',
    },
  },
  other: {
    objectUrl: {
      supported: true,
      notes: '假设基本支持',
      maxBlobSize: 500 * 1024 * 1024,
    },
    readableStream: {
      supported: true,
      notes: '假设支持 ReadableStream',
    },
    streamSaver: {
      supported: false,
      notes: '未检测到 StreamSaver 支持',
    },
    multiBlobSequential: {
      supported: true,
      notes: '使用降级方案',
    },
  },
}

export function getBrowserCompatibility() {
  const browserType = detectBrowserType()
  return BROWSER_COMPATIBILITY_TABLE[browserType] || BROWSER_COMPATIBILITY_TABLE.other
}

export function getRecommendedChunkSize(browserType = null) {
  const type = browserType || detectBrowserType()
  const compat = BROWSER_COMPATIBILITY_TABLE[type] || BROWSER_COMPATIBILITY_TABLE.other
  const maxBlobSize = compat.objectUrl?.maxBlobSize || 500 * 1024 * 1024
  return Math.min(1024 * 1024, Math.floor(maxBlobSize / 10))
}
