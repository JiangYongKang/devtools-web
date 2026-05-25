import { createError, ERROR_CODES } from './errors.js'
import { WEAK_PARAMETER_THRESHOLDS } from './constants.js'

function validateArgon2Params(params) {
  const { password, salt, memory, iterations, parallelism, keyLength, type } = params

  if (password == null) {
    return { valid: false, ...createError(ERROR_CODES.NULL_INPUT) }
  }

  if (typeof password === 'string' && password === '') {
    return { valid: false, ...createError(ERROR_CODES.EMPTY_PASSWORD) }
  }

  if (salt == null || (ArrayBuffer.isView(salt) && salt.length === 0)) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SALT) }
  }

  if (!Number.isInteger(memory) || memory < 8) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SCRYPT_PARAMS, '内存大小 (memory) 必须至少为 8 KB') }
  }

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_ITERATIONS, '迭代次数必须为正整数') }
  }

  if (!Number.isInteger(parallelism) || parallelism <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SCRYPT_PARAMS, '并行度必须为正整数') }
  }

  if (!Number.isInteger(keyLength) || keyLength <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_KEY_LENGTH) }
  }

  const validTypes = ['d', 'i', 'id']
  if (!validTypes.includes(type)) {
    return { valid: false, ...createError(ERROR_CODES.UNSUPPORTED_ALGORITHM, `不支持的 Argon2 类型: ${type}，请使用 d、i 或 id`) }
  }

  return { valid: true }
}

function checkWeakArgon2Params(params) {
  const { memory, iterations } = params
  const warnings = []
  const threshold = WEAK_PARAMETER_THRESHOLDS.ARGON2

  if (memory < threshold.minMemory) {
    warnings.push({
      type: 'weak_memory',
      message: threshold.warning,
      current: memory,
      recommended: threshold.minMemory,
    })
  }

  if (iterations < threshold.minIterations) {
    warnings.push({
      type: 'weak_iterations',
      message: '迭代次数较少，建议至少为 2',
      current: iterations,
      recommended: threshold.minIterations,
    })
  }

  return warnings
}

async function deriveKeyArgon2(params) {
  const { type, memory, iterations, parallelism, keyLength } = params

  const validation = validateArgon2Params(params)
  if (!validation.valid) {
    return {
      derivedKey: null,
      params: { type, memory, iterations, parallelism, keyLength },
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    }
  }

  const warnings = checkWeakArgon2Params(params)

  return {
    derivedKey: null,
    params: { type, memory, iterations, parallelism, keyLength },
    warnings,
    info: {
      message: 'Argon2 需要 WASM 支持，当前环境未包含 WASM 实现',
      note: '配置已验证有效，可用于后端实现参考',
    },
    errorCode: null,
    errorMessage: null,
  }
}

function generateArgon2HashString(params, saltHex, derivedKeyHex) {
  const { type, memory, iterations, parallelism, keyLength } = params
  const version = 19
  return `$argon2${type}$v=${version}$m=${memory},t=${iterations},p=${parallelism}$${saltHex}$${derivedKeyHex}`
}

function parseArgon2HashString(hashString) {
  const pattern = /^\$argon2([di]+)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/
  const match = hashString.match(pattern)

  if (!match) {
    return { error: createError(ERROR_CODES.INVALID_BASE64, '无效的 Argon2 哈希字符串格式') }
  }

  return {
    type: match[1],
    version: parseInt(match[2], 10),
    memory: parseInt(match[3], 10),
    iterations: parseInt(match[4], 10),
    parallelism: parseInt(match[5], 10),
    salt: match[6],
    hash: match[7],
  }
}

export {
  validateArgon2Params,
  checkWeakArgon2Params,
  deriveKeyArgon2,
  generateArgon2HashString,
  parseArgon2HashString,
}
