const SUPPORTED_ALGORITHMS = ['sha256', 'sha384', 'sha512']

const ALGORITHM_WEB_CRYPTO_NAMES = {
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function computeHash(content, algorithm) {
  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new Error(`不支持的算法: ${algorithm}。支持的算法: ${SUPPORTED_ALGORITHMS.join(', ')}`)
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest(ALGORITHM_WEB_CRYPTO_NAMES[algorithm], data)
  return arrayBufferToBase64(hashBuffer)
}

async function computeIntegrity(content, algorithm) {
  const hash = await computeHash(content, algorithm)
  return `${algorithm}-${hash}`
}

async function computeAllAlgorithms(content) {
  const results = {}
  for (const algo of SUPPORTED_ALGORITHMS) {
    const startTime = performance.now()
    const hash = await computeHash(content, algo)
    const endTime = performance.now()
    results[algo] = {
      algorithm: algo,
      hash,
      integrity: `${algo}-${hash}`,
      duration: endTime - startTime,
    }
  }
  return results
}

function buildIntegrityAttribute(integrity) {
  return `integrity="${integrity}"`
}

function getCrossoriginRecommendation(integrity) {
  if (!integrity) {
    return {
      recommended: 'anonymous',
      reason: '对于跨域资源，建议使用 crossorigin="anonymous"',
    }
  }
  return {
    recommended: 'anonymous',
    reason: '配合 integrity 属性，跨域资源应使用 crossorigin="anonymous" 以确保浏览器正确校验 SRI',
  }
}

function parseIntegrityString(integrityStr) {
  if (!integrityStr || typeof integrityStr !== 'string') {
    return { valid: false, error: '输入不能为空' }
  }

  const trimmed = integrityStr.trim()

  const tagMatch = trimmed.match(/integrity\s*=\s*["']([^"']+)["']/i)
  const hashPart = tagMatch ? tagMatch[1] : trimmed

  const integrityMatch = hashPart.match(/^(sha(?:256|384|512))-([A-Za-z0-9+/=]+)$/)

  if (!integrityMatch) {
    return { valid: false, error: 'integrity 格式无效，应为 shaXXX-base64hash 格式' }
  }

  const [, algorithm, hash] = integrityMatch

  try {
    atob(hash)
  } catch (e) {
    return { valid: false, error: 'Base64 编码无效' }
  }

  return {
    valid: true,
    algorithm,
    hash,
    fullIntegrity: `${algorithm}-${hash}`,
  }
}

async function verifyIntegrity(content, integrityToVerify) {
  const parsed = parseIntegrityString(integrityToVerify)

  if (!parsed.valid) {
    return {
      match: false,
      error: parsed.error,
    }
  }

  const computedHash = await computeHash(content, parsed.algorithm)
  const computedIntegrity = `${parsed.algorithm}-${computedHash}`

  const match = computedIntegrity === parsed.fullIntegrity

  return {
    match,
    expected: parsed.fullIntegrity,
    actual: computedIntegrity,
    algorithm: parsed.algorithm,
  }
}

function buildManifestEntry(path, algorithm, integrity) {
  return {
    path,
    algorithm,
    integrity,
  }
}

function generateManifestJSON(entries) {
  return JSON.stringify(
    {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      resources: entries,
    },
    null,
    2
  )
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} μs`
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)} ms`
  }
  return `${(ms / 1000).toFixed(2)} s`
}

export {
  SUPPORTED_ALGORITHMS,
  ALGORITHM_WEB_CRYPTO_NAMES,
  arrayBufferToBase64,
  computeHash,
  computeIntegrity,
  computeAllAlgorithms,
  buildIntegrityAttribute,
  getCrossoriginRecommendation,
  parseIntegrityString,
  verifyIntegrity,
  buildManifestEntry,
  generateManifestJSON,
  formatBytes,
  formatDuration,
}
