import { createError, ERROR_CODES } from './errors.js'
import { WEAK_PARAMETER_THRESHOLDS } from './constants.js'

function validatePbkdf2Params(params) {
  const { password, salt, iterations, hash, keyLength } = params

  if (password == null) {
    return { valid: false, ...createError(ERROR_CODES.NULL_INPUT) }
  }

  if (typeof password === 'string' && password === '') {
    return { valid: false, ...createError(ERROR_CODES.EMPTY_PASSWORD) }
  }

  if (salt == null || (ArrayBuffer.isView(salt) && salt.length === 0)) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SALT) }
  }

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_ITERATIONS) }
  }

  if (!Number.isInteger(keyLength) || keyLength <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_KEY_LENGTH) }
  }

  const validHashes = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
  if (!validHashes.includes(hash)) {
    return { valid: false, ...createError(ERROR_CODES.UNSUPPORTED_ALGORITHM, `不支持的哈希算法: ${hash}`) }
  }

  return { valid: true }
}

function checkWeakPbkdf2Params(params) {
  const { iterations, hash } = params
  const warnings = []

  const hashKey = hash === 'SHA-256' ? 'SHA256' : hash === 'SHA-512' ? 'SHA512' : null
  const threshold = hashKey ? WEAK_PARAMETER_THRESHOLDS.PBKDF2[hashKey] : null

  if (threshold && iterations < threshold.minIterations) {
    warnings.push({
      type: 'weak_iterations',
      message: threshold.warning,
      current: iterations,
      recommended: threshold.minIterations,
    })
  }

  return warnings
}

async function deriveKeyPbkdf2(params) {
  const { password, salt, iterations, hash, keyLength } = params

  const validation = validatePbkdf2Params(params)
  if (!validation.valid) {
    return {
      derivedKey: null,
      params: { iterations, hash, keyLength },
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    }
  }

  const warnings = checkWeakPbkdf2Params(params)

  try {
    const encoder = new TextEncoder()
    const passwordBytes = typeof password === 'string' ? encoder.encode(password) : password
    const saltBytes = ArrayBuffer.isView(salt) ? salt : encoder.encode(salt)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations,
        hash,
      },
      keyMaterial,
      keyLength * 8
    )

    const derivedKey = new Uint8Array(derivedBits)

    return {
      derivedKey,
      params: { iterations, hash, keyLength },
      warnings,
      errorCode: null,
      errorMessage: null,
    }
  } catch (error) {
    return {
      derivedKey: null,
      params: { iterations, hash, keyLength },
      errorCode: ERROR_CODES.DERIVATION_FAILED,
      errorMessage: `PBKDF2 派生失败: ${error.message}`,
    }
  }
}

export {
  validatePbkdf2Params,
  checkWeakPbkdf2Params,
  deriveKeyPbkdf2,
}
