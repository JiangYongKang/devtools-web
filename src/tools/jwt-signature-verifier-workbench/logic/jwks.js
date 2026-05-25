import { ERROR_CODES, createError } from './errors.js'

function parseJwks(input) {
  if (input == null) {
    return { success: false, error: createError(ERROR_CODES.NULL_INPUT) }
  }
  const trimmed = String(input).trim()
  if (trimmed === '') {
    return { success: false, error: createError(ERROR_CODES.EMPTY_VALUE) }
  }

  try {
    const parsed = JSON.parse(trimmed)

    if (Array.isArray(parsed)) {
      return {
        success: true,
        keys: parsed,
        keyCount: parsed.length,
      }
    }

    if (parsed.keys && Array.isArray(parsed.keys)) {
      return {
        success: true,
        keys: parsed.keys,
        keyCount: parsed.keys.length,
      }
    }

    if (parsed.kty) {
      return {
        success: true,
        keys: [parsed],
        keyCount: 1,
      }
    }

    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_JWKS_FORMAT, 'JWKS 格式无效：应为 keys 数组或单个 JWK'),
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_JSON, `JWKS JSON 解析失败: ${e.message}`),
    }
  }
}

function getKeySummary(jwk) {
  const summary = {
    kid: jwk.kid || '(无 kid)',
    kty: jwk.kty || '(未知)',
    alg: jwk.alg || '(未指定)',
    use: jwk.use || '(未指定)',
  }

  if (jwk.kty === 'RSA') {
    summary.n = jwk.n ? (jwk.n.length > 32 ? jwk.n.slice(0, 32) + '...' : jwk.n) : '(无)'
    summary.e = jwk.e || '(无)'
    summary.fingerprint = `RSA: n=${summary.n?.slice(0, 16)}..., e=${summary.e}`
  } else if (jwk.kty === 'EC') {
    summary.crv = jwk.crv || '(未知)'
    summary.x = jwk.x ? (jwk.x.length > 32 ? jwk.x.slice(0, 32) + '...' : jwk.x) : '(无)'
    summary.y = jwk.y ? (jwk.y.length > 32 ? jwk.y.slice(0, 32) + '...' : jwk.y) : '(无)'
    summary.fingerprint = `EC: ${summary.crv}, x=${summary.x?.slice(0, 16)}...`
  } else if (jwk.kty === 'OKP') {
    summary.crv = jwk.crv || '(未知)'
    summary.x = jwk.x ? (jwk.x.length > 32 ? jwk.x.slice(0, 32) + '...' : jwk.x) : '(无)'
    summary.fingerprint = `OKP: ${summary.crv}, x=${summary.x?.slice(0, 16)}...`
  } else if (jwk.kty === 'oct') {
    summary.fingerprint = `oct: ${jwk.k ? '对称密钥' : '(无密钥)'}`
  } else {
    summary.fingerprint = `${summary.kty}: 未知类型`
  }

  return summary
}

function findMatchingKey(keys, headerAlg, headerKid) {
  const targetAlg = headerAlg?.toUpperCase() || ''
  const targetKid = headerKid || ''

  const results = {
    exactMatch: null,
    kidMatch: null,
    algMatch: null,
    availableKeys: keys.map((k, i) => ({ index: i, ...getKeySummary(k) })),
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const keyAlg = key.alg?.toUpperCase() || ''
    const keyKid = key.kid || ''

    const hasKidMatch = targetKid && keyKid === targetKid
    const hasAlgMatch = targetAlg && (keyAlg === targetAlg || !key.alg)

    if (hasKidMatch && hasAlgMatch) {
      results.exactMatch = { index: i, key, summary: getKeySummary(key) }
      break
    }

    if (hasKidMatch && !results.kidMatch) {
      results.kidMatch = { index: i, key, summary: getKeySummary(key) }
    }

    if (hasAlgMatch && !results.algMatch) {
      results.algMatch = { index: i, key, summary: getKeySummary(key) }
    }
  }

  return results
}

function selectBestKey(matchResults) {
  if (matchResults.exactMatch) {
    return {
      success: true,
      matchType: 'exact',
      ...matchResults.exactMatch,
    }
  }

  if (matchResults.kidMatch) {
    return {
      success: true,
      matchType: 'kid',
      warning: '仅 kid 匹配，alg 未验证',
      ...matchResults.kidMatch,
    }
  }

  if (matchResults.algMatch) {
    return {
      success: true,
      matchType: 'alg',
      warning: '仅 alg 匹配，kid 不匹配',
      ...matchResults.algMatch,
    }
  }

  return {
    success: false,
    error: createError(ERROR_CODES.NO_MATCHING_KEY, '未找到匹配的密钥', {
      availableKeys: matchResults.availableKeys,
    }),
    availableKeys: matchResults.availableKeys,
  }
}

function jwkToCryptoKey(jwk, algorithm) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      success: false,
      error: createError(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  const alg = algorithm?.toUpperCase() || ''

  try {
    let subtleAlg = null
    let usages = []

    if (alg.startsWith('HS')) {
      const hashBits = parseInt(alg.slice(2), 10)
      subtleAlg = { name: 'HMAC', hash: { name: `SHA-${hashBits}` } }
      usages = ['verify']
    } else if (alg.startsWith('RS')) {
      const hashBits = parseInt(alg.slice(2), 10)
      subtleAlg = { name: 'RSASSA-PKCS1-v1_5', hash: { name: `SHA-${hashBits}` } }
      usages = ['verify']
    } else if (alg.startsWith('ES')) {
      const hashBits = parseInt(alg.slice(2), 10)
      const crvMap = { 256: 'P-256', 384: 'P-384', 512: 'P-521' }
      subtleAlg = { name: 'ECDSA', namedCurve: jwk.crv || crvMap[hashBits] || 'P-256' }
      usages = ['verify']
    } else {
      return {
        success: false,
        error: createError(ERROR_CODES.UNSUPPORTED_ALGORITHM, `不支持的算法: ${alg}`),
      }
    }

    return {
      success: true,
      subtleAlg,
      usages,
      jwk,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_KEY_FORMAT, `密钥转换失败: ${e.message}`),
    }
  }
}

async function importJwk(jwk, algorithm) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      success: false,
      error: createError(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  const keyInfo = jwkToCryptoKey(jwk, algorithm)
  if (!keyInfo.success) {
    return keyInfo
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      keyInfo.subtleAlg,
      true,
      keyInfo.usages
    )
    return {
      success: true,
      cryptoKey,
      subtleAlg: keyInfo.subtleAlg,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_KEY_FORMAT, `密钥导入失败: ${e.message}`),
    }
  }
}

async function importSecretKey(secret, algorithm) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      success: false,
      error: createError(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  const alg = algorithm?.toUpperCase() || 'HS256'
  const hashBits = parseInt(alg.slice(2), 10) || 256

  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: `SHA-${hashBits}` } },
      true,
      ['verify']
    )
    return {
      success: true,
      cryptoKey,
      subtleAlg: { name: 'HMAC', hash: { name: `SHA-${hashBits}` } },
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_KEY_FORMAT, `对称密钥导入失败: ${e.message}`),
    }
  }
}

export {
  parseJwks,
  getKeySummary,
  findMatchingKey,
  selectBestKey,
  jwkToCryptoKey,
  importJwk,
  importSecretKey,
}
