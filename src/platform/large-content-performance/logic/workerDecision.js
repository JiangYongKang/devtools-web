import {
  WORKER_DECISION_REASONS,
  DEFAULT_CONFIG,
} from './constants.js'

function isSSR() {
  return typeof window === 'undefined' || typeof document === 'undefined'
}

function hasWorkerSupport() {
  if (isSSR()) return false
  return typeof Worker !== 'undefined'
}

function hasSharedArrayBufferSupport() {
  if (isSSR()) return false
  if (typeof SharedArrayBuffer === 'undefined') return false
  
  try {
    const buffer = new SharedArrayBuffer(8)
    const view = new Int32Array(buffer)
    Atomics.store(view, 0, 1)
    return Atomics.load(view, 0) === 1
  } catch {
    return false
  }
}

function getHardwareConcurrency() {
  if (isSSR()) return 1
  return navigator?.hardwareConcurrency || 1
}

function decideWorkerUsage(payloadBytes, options = {}) {
  const thresholdBytes = options.thresholdBytes ?? DEFAULT_CONFIG.WORKER_THRESHOLD_BYTES
  const minCores = options.minCores ?? DEFAULT_CONFIG.WORKER_HARDWARE_MIN_CORES
  const forceWorker = options.forceWorker ?? false
  const forceMainThread = options.forceMainThread ?? false

  const result = {
    useWorker: false,
    reason: null,
    details: {
      payloadBytes,
      thresholdBytes,
      hardwareConcurrency: getHardwareConcurrency(),
      workerSupported: hasWorkerSupport(),
      sharedBufferSupported: hasSharedArrayBufferSupport(),
    },
    recommendation: 'main-thread',
  }

  if (forceMainThread) {
    result.reason = WORKER_DECISION_REASONS.SSS_SMALL_PAYLOAD
    result.recommendation = 'main-thread'
    return result
  }

  if (forceWorker && hasWorkerSupport()) {
    result.reason = WORKER_DECISION_REASONS.LARGE_PAYLOAD_MULTICORE
    result.useWorker = true
    result.recommendation = 'worker'
    return result
  }

  if (!hasWorkerSupport()) {
    result.reason = WORKER_DECISION_REASONS.SS_NO_WORKER_SUPPORT
    result.recommendation = 'main-thread'
    return result
  }

  const cores = getHardwareConcurrency()
  if (cores < minCores) {
    result.reason = WORKER_DECISION_REASONS.SSS_SINGLE_CORE
    result.recommendation = 'main-thread'
    return result
  }

  if (payloadBytes <= thresholdBytes) {
    result.reason = WORKER_DECISION_REASONS.SSS_SMALL_PAYLOAD
    result.recommendation = 'main-thread'
    return result
  }

  if (hasSharedArrayBufferSupport()) {
    result.reason = WORKER_DECISION_REASONS.SSS_SHARED_BUFFER_AVAILABLE
    result.useWorker = true
    result.recommendation = 'worker'
    return result
  }

  const borderlineRatio = payloadBytes / thresholdBytes
  if (borderlineRatio >= 2) {
    result.reason = WORKER_DECISION_REASONS.LARGE_PAYLOAD_MULTICORE
    result.useWorker = true
    result.recommendation = 'worker'
    return result
  }

  result.reason = WORKER_DECISION_REASONS.THRESHOLD_BORDERLINE
  result.useWorker = false
  result.recommendation = 'main-thread'
  return result
}

function shouldUseWorkerForText(text, encoding, options = {}) {
  if (encoding === 'utf-8') {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text).length
    return decideWorkerUsage(bytes, options)
  }
  return decideWorkerUsage(text.length * 2, options)
}

export {
  decideWorkerUsage,
  shouldUseWorkerForText,
  hasWorkerSupport,
  hasSharedArrayBufferSupport,
  getHardwareConcurrency,
  isSSR,
}
