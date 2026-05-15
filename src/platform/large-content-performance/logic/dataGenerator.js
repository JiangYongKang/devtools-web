import {
  DEFAULT_CONFIG,
  ERROR_CODES,
} from './constants.js'
import {
  createError,
} from './errors.js'

function createCancelToken() {
  let _cancelled = false
  const listeners = new Set()

  return {
    get isCancelled() {
      return _cancelled
    },
    cancel() {
      if (!_cancelled) {
        _cancelled = true
        listeners.forEach((fn) => fn())
        listeners.clear()
      }
    },
    onCancel(callback) {
      if (_cancelled) {
        callback()
        return () => {}
      }
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    throwIfCancelled() {
      if (_cancelled) {
        throw createError(ERROR_CODES.CANCELLED)
      }
    },
  }
}

function scheduleTask(fn, options = {}) {
  const signal = options.signal
  if (signal?.aborted) {
    return Promise.reject(createError(ERROR_CODES.CANCELLED))
  }

  if (typeof scheduler !== 'undefined' && scheduler.postTask) {
    return scheduler.postTask(fn, {
      priority: options.priority || 'background',
      signal,
    })
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        const result = fn()
        resolve(result)
      } catch (e) {
        reject(e)
      }
    }, 0)

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(createError(ERROR_CODES.CANCELLED))
      }, { once: true })
    }
  })
}

function estimateMemoryUsage(itemCount, itemType = 'object') {
  let perItemBytes = 0

  switch (itemType) {
    case 'string':
      perItemBytes = 100
      break
    case 'object':
      perItemBytes = 200
      break
    case 'table-row':
      perItemBytes = 500
      break
    case 'log-line':
      perItemBytes = 150
      break
    case 'json-array-item':
      perItemBytes = 300
      break
    default:
      perItemBytes = 150
  }

  const bytes = itemCount * perItemBytes
  return {
    bytes,
    kilobytes: bytes / 1024,
    megabytes: bytes / (1024 * 1024),
  }
}

function generateRandomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateJsonArrayItem(index) {
  return {
    id: index,
    name: generateRandomString(8),
    email: `${generateRandomString(6)}@example.com`,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      tags: [generateRandomString(4), generateRandomString(6)],
      score: Math.random() * 100,
      active: Math.random() > 0.3,
    },
  }
}

function generateLogLine(index) {
  const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR']
  const level = levels[Math.floor(Math.random() * levels.length)]
  const timestamp = new Date(Date.now() - index * 1000).toISOString()
  const message = generateRandomString(30 + Math.floor(Math.random() * 50))
  return `[${timestamp}] [${level}] ${message}`
}

function generateTableRow(index) {
  return {
    id: index,
    productId: `PROD-${String(index).padStart(6, '0')}`,
    name: `Product ${generateRandomString(6)}`,
    category: ['Electronics', 'Clothing', 'Home', 'Sports', 'Books'][
      Math.floor(Math.random() * 5)
    ],
    price: Math.round(Math.random() * 1000 * 100) / 100,
    stock: Math.floor(Math.random() * 1000),
    rating: Math.round(Math.random() * 50) / 10,
  }
}

function generateLargeString(byteSize, options = {}) {
  const encoding = options.encoding || 'utf-16'
  const charPerUnit = encoding === 'utf-8' ? 1 : 2
  const targetLength = Math.ceil(byteSize / charPerUnit)

  const basePattern = options.pattern || null
  let result = ''

  if (basePattern) {
    while (result.length < targetLength) {
      result += basePattern
    }
    return result.slice(0, targetLength)
  }

  const chars = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
  while (result.length < targetLength) {
    result += chars
  }
  return result.slice(0, targetLength)
}

async function generateDatasetAsync(
  size = 'medium',
  options = {}
) {
  const actualSize =
    typeof size === 'string'
      ? DEFAULT_CONFIG.DATASET_SIZES[size] || DEFAULT_CONFIG.DATASET_SIZES.small
      : size

  const generator = options.generator || generateJsonArrayItem
  const cancelToken = options.cancelToken || null
  const frameBudget = options.frameBudget ?? DEFAULT_CONFIG.FRAME_TIME_BUDGET_MS
  const onProgress = options.onProgress || null

  const items = []
  let i = 0
  const batchSize = 100

  while (i < actualSize) {
    if (cancelToken?.isCancelled) {
      throw createError(ERROR_CODES.CANCELLED)
    }

    const startTime = performance.now()
    let batchEnd = Math.min(i + batchSize, actualSize)

    for (; i < batchEnd; i++) {
      items.push(generator(i))

      if (performance.now() - startTime > frameBudget) {
        break
      }
    }

    if (i < actualSize) {
      if (onProgress) {
        onProgress({
          generated: i,
          total: actualSize,
          percent: (i / actualSize) * 100,
          memory: estimateMemoryUsage(i, options.itemType),
        })
      }
      await scheduleTask(() => {}, { priority: 'background' })
    }
  }

  if (onProgress) {
    onProgress({
      generated: actualSize,
      total: actualSize,
      percent: 100,
      memory: estimateMemoryUsage(actualSize, options.itemType),
    })
  }

  return items
}

function reportSample(data) {
  void data
  return Promise.resolve()
}

export {
  createCancelToken,
  scheduleTask,
  estimateMemoryUsage,
  generateRandomString,
  generateJsonArrayItem,
  generateLogLine,
  generateTableRow,
  generateLargeString,
  generateDatasetAsync,
  reportSample,
}
