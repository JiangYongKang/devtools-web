import {
  SUPPORT_STATUS,
  ERROR_CODES,
  ALGORITHMS,
  DEFAULT_OPTIONS,
  SCHEMA_VERSION,
  ENV_SCENARIOS,
} from './constants.js'
import { createError, classifyCryptoError, isAbortError } from './errors.js'

function getCryptoSubtle() {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle
  }
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle
  }
  if (typeof self !== 'undefined' && self.crypto && self.crypto.subtle) {
    return self.crypto.subtle
  }
  return null
}

function checkSecureContext() {
  if (typeof globalThis !== 'undefined' && typeof globalThis.isSecureContext !== 'undefined') {
    return globalThis.isSecureContext
  }
  if (typeof window !== 'undefined' && typeof window.isSecureContext !== 'undefined') {
    return window.isSecureContext
  }
  if (typeof location !== 'undefined') {
    return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  }
  return false
}

function detectEnvironmentScenario() {
  if (typeof location === 'undefined') {
    return ENV_SCENARIOS.SECURE_LOCALHOST
  }

  const isHttps = location.protocol === 'https:'
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  const isFileProtocol = location.protocol === 'file:'

  if (isFileProtocol) {
    return ENV_SCENARIOS.INSECURE_FILE
  }

  if (typeof window !== 'undefined' && window.parent !== window) {
    try {
      const iframePolicy = document.featurePolicy?.allowsFeature('crypto-key')
      if (iframePolicy === false) {
        return ENV_SCENARIOS.IFRAME_WITHOUT_CRYPTO_KEY
      }
    } catch {
    }
  }

  if (isLocalhost) {
    return ENV_SCENARIOS.SECURE_LOCALHOST
  }

  if (isHttps) {
    return ENV_SCENARIOS.SECURE_PUBLIC
  }

  return ENV_SCENARIOS.INSECURE_HTTP
}

function withTimeout(promise, ms, signal = null) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createError(ERROR_CODES.OPERATION_ERROR, '操作超时'))
    }, ms)

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId)
        reject(createError(ERROR_CODES.ABORT_ERROR, '操作已取消'))
      })
    }

    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

async function probeDigest(subtle, algorithm, signal, timeout) {
  const result = {
    algorithm,
    operation: 'digest',
    status: SUPPORT_STATUS.UNKNOWN,
    error: null,
    duration: 0,
  }

  const startTime = Date.now()
  try {
    const data = new Uint8Array([1, 2, 3, 4])
    await withTimeout(subtle.digest(algorithm, data), timeout, signal)
    result.status = SUPPORT_STATUS.FULL
  } catch (error) {
    if (isAbortError(error)) throw error
    result.status = SUPPORT_STATUS.NOT_SUPPORTED
    result.error = classifyCryptoError(error, 'digest').error
  }
  result.duration = Date.now() - startTime
  return result
}

async function probeAesGcm(subtle, options, signal, timeout) {
  const results = []
  const keySize = 256

  let key = null
  let encryptedData = null
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const startTime = Date.now()
  try {
    key = await withTimeout(
      subtle.generateKey({ name: ALGORITHMS.AES_GCM, length: keySize }, true, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'generateKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'generateKey',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'generateKey').error,
      duration: Date.now() - startTime,
    })
    return results
  }

  const encryptStart = Date.now()
  try {
    const data = new TextEncoder().encode('test data')
    encryptedData = await withTimeout(subtle.encrypt({ name: ALGORITHMS.AES_GCM, iv }, key, data), timeout, signal)
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'encrypt',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - encryptStart,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'encrypt',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'encrypt').error,
      duration: Date.now() - encryptStart,
    })
  }

  const decryptStart = Date.now()
  try {
    if (encryptedData) {
      await withTimeout(subtle.decrypt({ name: ALGORITHMS.AES_GCM, iv }, key, encryptedData), timeout, signal)
      results.push({
        algorithm: ALGORITHMS.AES_GCM,
        operation: 'decrypt',
        status: SUPPORT_STATUS.FULL,
        error: null,
        duration: Date.now() - decryptStart,
      })
    }
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'decrypt',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'decrypt').error,
      duration: Date.now() - decryptStart,
    })
  }

  const exportStart = Date.now()
  try {
    await withTimeout(subtle.exportKey('raw', key), timeout, signal)
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'exportKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - exportStart,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'exportKey',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'exportKey').error,
      duration: Date.now() - exportStart,
    })
  }

  const wrapKeyStart = Date.now()
  try {
    const wrappingKey = await withTimeout(
      subtle.generateKey({ name: ALGORITHMS.AES_GCM, length: 256 }, true, ['wrapKey', 'unwrapKey']),
      timeout,
      signal
    )
    const wrapIv = crypto.getRandomValues(new Uint8Array(12))
    await withTimeout(subtle.wrapKey('raw', key, wrappingKey, { name: ALGORITHMS.AES_GCM, iv: wrapIv }), timeout, signal)
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'wrapKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - wrapKeyStart,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.AES_GCM,
      operation: 'wrapKey',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'wrapKey').error,
      duration: Date.now() - wrapKeyStart,
    })
  }

  return results
}

async function probeRsaOaep(subtle, options, signal, timeout) {
  const results = []
  const keySize = options.rsaKeySize

  if (options.skipHeavyOperations) {
    results.push({
      algorithm: ALGORITHMS.RSA_OAEP,
      operation: 'generateKey',
      status: SUPPORT_STATUS.UNKNOWN,
      skipped: true,
      skipReason: 'heavy_operation',
      duration: 0,
    })
    return results
  }

  let key = null
  const startTime = Date.now()
  try {
    key = await withTimeout(
      subtle.generateKey(
        { name: ALGORITHMS.RSA_OAEP, modulusLength: keySize, publicExponent: new Uint8Array([1, 0, 1]), hash: ALGORITHMS.SHA_256 },
        true,
        ['encrypt', 'decrypt']
      ),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.RSA_OAEP,
      operation: 'generateKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.RSA_OAEP,
      operation: 'generateKey',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'generateKey').error,
      duration: Date.now() - startTime,
    })
    return results
  }

  const encryptStart = Date.now()
  try {
    const data = new TextEncoder().encode('test data')
    await withTimeout(subtle.encrypt({ name: ALGORITHMS.RSA_OAEP }, key.publicKey, data), timeout, signal)
    results.push({
      algorithm: ALGORITHMS.RSA_OAEP,
      operation: 'encrypt',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - encryptStart,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.RSA_OAEP,
      operation: 'encrypt',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'encrypt').error,
      duration: Date.now() - encryptStart,
    })
  }

  return results
}

async function probeEcdsa(subtle, options, signal, timeout) {
  const results = []

  let key = null
  let signature = null
  const data = new TextEncoder().encode('test data')
  const startTime = Date.now()
  try {
    key = await withTimeout(
      subtle.generateKey({ name: ALGORITHMS.ECDSA, namedCurve: 'P-256' }, true, ['sign', 'verify']),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.ECDSA,
      operation: 'generateKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.ECDSA,
      operation: 'generateKey',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'generateKey').error,
      duration: Date.now() - startTime,
    })
    return results
  }

  const signStart = Date.now()
  try {
    signature = await withTimeout(subtle.sign({ name: ALGORITHMS.ECDSA, hash: ALGORITHMS.SHA_256 }, key.privateKey, data), timeout, signal)
    results.push({
      algorithm: ALGORITHMS.ECDSA,
      operation: 'sign',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - signStart,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.ECDSA,
      operation: 'sign',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'sign').error,
      duration: Date.now() - signStart,
    })
  }

  const verifyStart = Date.now()
  try {
    if (signature) {
      await withTimeout(subtle.verify({ name: ALGORITHMS.ECDSA, hash: ALGORITHMS.SHA_256 }, key.publicKey, signature, data), timeout, signal)
      results.push({
        algorithm: ALGORITHMS.ECDSA,
        operation: 'verify',
        status: SUPPORT_STATUS.FULL,
        error: null,
        duration: Date.now() - verifyStart,
      })
    }
  } catch (error) {
    if (isAbortError(error)) throw error
    results.push({
      algorithm: ALGORITHMS.ECDSA,
      operation: 'verify',
      status: SUPPORT_STATUS.NOT_SUPPORTED,
      error: classifyCryptoError(error, 'verify').error,
      duration: Date.now() - verifyStart,
    })
  }

  return results
}

async function probeHkdf(subtle, options, signal, timeout) {
  const results = []

  const startTime = Date.now()
  try {
    const keyMaterial = await withTimeout(
      subtle.importKey('raw', new Uint8Array(32), { name: ALGORITHMS.HKDF }, false, ['deriveKey', 'deriveBits']),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.HKDF,
      operation: 'importKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - startTime,
    })

    const deriveKeyStart = Date.now()
    await withTimeout(
      subtle.deriveKey(
        { name: ALGORITHMS.HKDF, hash: ALGORITHMS.SHA_256, salt: new Uint8Array(16), info: new Uint8Array(0) },
        keyMaterial,
        { name: ALGORITHMS.AES_GCM, length: 256 },
        true,
        ['encrypt']
      ),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.HKDF,
      operation: 'deriveKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - deriveKeyStart,
    })

    const deriveBitsStart = Date.now()
    await withTimeout(
      subtle.deriveBits(
        { name: ALGORITHMS.HKDF, hash: ALGORITHMS.SHA_256, salt: new Uint8Array(16), info: new Uint8Array(0) },
        keyMaterial,
        256
      ),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.HKDF,
      operation: 'deriveBits',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - deriveBitsStart,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    if (results.length < 2) {
      results.push({
        algorithm: ALGORITHMS.HKDF,
        operation: results.length === 0 ? 'importKey' : 'deriveKey',
        status: SUPPORT_STATUS.NOT_SUPPORTED,
        error: classifyCryptoError(error, results.length === 0 ? 'importKey' : 'deriveKey').error,
        duration: Date.now() - startTime,
      })
    } else {
      results.push({
        algorithm: ALGORITHMS.HKDF,
        operation: 'deriveBits',
        status: SUPPORT_STATUS.NOT_SUPPORTED,
        error: classifyCryptoError(error, 'deriveBits').error,
        duration: Date.now() - startTime,
      })
    }
  }

  return results
}

async function probePbkdf2(subtle, options, signal, timeout) {
  const results = []

  const startTime = Date.now()
  try {
    const keyMaterial = await withTimeout(
      subtle.importKey('raw', new TextEncoder().encode('password'), { name: ALGORITHMS.PBKDF2 }, false, ['deriveKey', 'deriveBits']),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.PBKDF2,
      operation: 'importKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - startTime,
    })

    const deriveKeyStart = Date.now()
    await withTimeout(
      subtle.deriveKey(
        { name: ALGORITHMS.PBKDF2, hash: ALGORITHMS.SHA_256, salt: new Uint8Array(16), iterations: 1000 },
        keyMaterial,
        { name: ALGORITHMS.AES_GCM, length: 256 },
        true,
        ['encrypt']
      ),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.PBKDF2,
      operation: 'deriveKey',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - deriveKeyStart,
    })

    const deriveBitsStart = Date.now()
    await withTimeout(
      subtle.deriveBits(
        { name: ALGORITHMS.PBKDF2, hash: ALGORITHMS.SHA_256, salt: new Uint8Array(16), iterations: 1000 },
        keyMaterial,
        256
      ),
      timeout,
      signal
    )
    results.push({
      algorithm: ALGORITHMS.PBKDF2,
      operation: 'deriveBits',
      status: SUPPORT_STATUS.FULL,
      error: null,
      duration: Date.now() - deriveBitsStart,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    if (results.length < 2) {
      results.push({
        algorithm: ALGORITHMS.PBKDF2,
        operation: results.length === 0 ? 'importKey' : 'deriveKey',
        status: SUPPORT_STATUS.NOT_SUPPORTED,
        error: classifyCryptoError(error, results.length === 0 ? 'importKey' : 'deriveKey').error,
        duration: Date.now() - startTime,
      })
    } else {
      results.push({
        algorithm: ALGORITHMS.PBKDF2,
        operation: 'deriveBits',
        status: SUPPORT_STATUS.NOT_SUPPORTED,
        error: classifyCryptoError(error, 'deriveBits').error,
        duration: Date.now() - startTime,
      })
    }
  }

  return results
}

async function probeSubtleCapabilities(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { signal, timeout, includeWorkerProbe } = opts

  const startTime = Date.now()
  const result = {
    schemaVersion: SCHEMA_VERSION,
    timestamp: Date.now(),
    isSecureContext: checkSecureContext(),
    environmentScenario: detectEnvironmentScenario(),
    hasSubtleCrypto: false,
    workerAvailable: false,
    workerResults: null,
    probeResults: [],
    summary: {},
    duration: 0,
    options: {
      skipHeavyOperations: opts.skipHeavyOperations,
      rsaKeySize: opts.rsaKeySize,
    },
  }

  const subtle = getCryptoSubtle()
  result.hasSubtleCrypto = !!subtle

  if (!result.isSecureContext) {
    result.error = createError(ERROR_CODES.INSECURE_CONTEXT).error
    result.duration = Date.now() - startTime
    return result
  }

  if (!subtle) {
    result.duration = Date.now() - startTime
    return result
  }

  try {
    const digestAlgorithms = [ALGORITHMS.SHA_1, ALGORITHMS.SHA_256, ALGORITHMS.SHA_384, ALGORITHMS.SHA_512]
    for (const algo of digestAlgorithms) {
      const probeResult = await probeDigest(subtle, algo, signal, 5000)
      result.probeResults.push(probeResult)
    }

    const aesResults = await probeAesGcm(subtle, opts, signal, timeout)
    result.probeResults.push(...aesResults)

    const rsaResults = await probeRsaOaep(subtle, opts, signal, timeout)
    result.probeResults.push(...rsaResults)

    const ecdsaResults = await probeEcdsa(subtle, opts, signal, timeout)
    result.probeResults.push(...ecdsaResults)

    const hkdfResults = await probeHkdf(subtle, opts, signal, timeout)
    result.probeResults.push(...hkdfResults)

    const pbkdf2Results = await probePbkdf2(subtle, opts, signal, timeout)
    result.probeResults.push(...pbkdf2Results)

    if (includeWorkerProbe) {
      const workerResult = await probeWorkerCapabilities(opts)
      result.workerAvailable = workerResult.available
      result.workerResults = workerResult.results
    }
  } catch (error) {
    if (!isAbortError(error)) {
      result.error = classifyCryptoError(error, 'probe').error
    }
  }

  result.duration = Date.now() - startTime
  result.summary = buildSummary(result.probeResults)

  return result
}

function buildSummary(probeResults) {
  const summary = {
    total: probeResults.length,
    supported: 0,
    notSupported: 0,
    partial: 0,
    unknown: 0,
    byAlgorithm: {},
  }

  for (const result of probeResults) {
    if (result.status === SUPPORT_STATUS.FULL) {
      summary.supported++
    } else if (result.status === SUPPORT_STATUS.NOT_SUPPORTED) {
      summary.notSupported++
    } else if (result.status === SUPPORT_STATUS.PARTIAL) {
      summary.partial++
    } else {
      summary.unknown++
    }

    if (!summary.byAlgorithm[result.algorithm]) {
      summary.byAlgorithm[result.algorithm] = {
        supported: 0,
        notSupported: 0,
        partial: 0,
        unknown: 0,
        operations: [],
      }
    }

    const algoSummary = summary.byAlgorithm[result.algorithm]
    if (result.status === SUPPORT_STATUS.FULL) {
      algoSummary.supported++
    } else if (result.status === SUPPORT_STATUS.NOT_SUPPORTED) {
      algoSummary.notSupported++
    } else if (result.status === SUPPORT_STATUS.PARTIAL) {
      algoSummary.partial++
    } else {
      algoSummary.unknown++
    }

    algoSummary.operations.push({
      operation: result.operation,
      status: result.status,
      duration: result.duration,
    })
  }

  return summary
}

function getWorkerBlobUrl() {
  const workerCode = `
    self.onmessage = async function(e) {
      const { options } = e.data
      const result = await runProbe(options)
      self.postMessage(result)
    }

    async function runProbe(options) {
      const subtle = crypto.subtle
      const results = []

      try {
        const data = new Uint8Array([1, 2, 3, 4])
        const start = Date.now()
        await crypto.subtle.digest('SHA-256', data)
        results.push({
          algorithm: 'SHA-256',
          operation: 'digest',
          status: 'supported',
          duration: Date.now() - start,
        })

        const keyStart = Date.now()
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )
        results.push({
          algorithm: 'AES-GCM',
          operation: 'generateKey',
          status: 'supported',
          duration: Date.now() - keyStart,
        })
      } catch (error) {
        results.push({
          algorithm: 'Worker',
          operation: 'probe',
          status: 'not_supported',
          error: { errorCode: error.name, errorMessage: error.message },
        })
      }

      return results
    }
  `

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  return URL.createObjectURL(blob)
}

async function probeWorkerCapabilities(options = {}) {
  if (typeof Worker === 'undefined') {
    return { available: false, results: null }
  }

  return new Promise((resolve) => {
    try {
      const workerUrl = getWorkerBlobUrl()
      const worker = new Worker(workerUrl)

      worker.onmessage = (e) => {
        worker.terminate()
        URL.revokeObjectURL(workerUrl)
        resolve({ available: true, results: e.data })
      }

      worker.onerror = () => {
        worker.terminate()
        URL.revokeObjectURL(workerUrl)
        resolve({ available: false, results: null })
      }

      worker.postMessage({ options })

      setTimeout(() => {
        try { worker.terminate() } catch { }
        URL.revokeObjectURL(workerUrl)
        resolve({ available: false, results: null })
      }, 10000)
    } catch {
      resolve({ available: false, results: null })
    }
  })
}

export {
  probeSubtleCapabilities,
  probeDigest,
  probeAesGcm,
  probeRsaOaep,
  probeEcdsa,
  probeHkdf,
  probePbkdf2,
  getCryptoSubtle,
  checkSecureContext,
  detectEnvironmentScenario,
  buildSummary,
  probeWorkerCapabilities,
}
