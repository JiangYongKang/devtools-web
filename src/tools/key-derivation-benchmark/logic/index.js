import { deriveKeyPbkdf2, validatePbkdf2Params, checkWeakPbkdf2Params } from './pbkdf2.js'
import { deriveKeyScrypt, validateScryptParams, checkWeakScryptParams } from './scrypt.js'
import { deriveKeyArgon2, validateArgon2Params, checkWeakArgon2Params } from './argon2.js'
import {
  generateSalt,
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  parseSaltInput,
  measureTimeAsync,
  benchmark,
  exportParamsToJson,
} from './utils.js'
import {
  ALGORITHMS,
  OWASP_RECOMMENDATIONS,
  WEAK_PARAMETER_THRESHOLDS,
  DEFAULT_PARAMS,
  EDUCATION_CONTENT,
  PARAMETER_PRESETS,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'

async function deriveKey(algorithm, params) {
  switch (algorithm) {
    case ALGORITHMS.PBKDF2:
      return deriveKeyPbkdf2(params)
    case ALGORITHMS.SCRYPT:
      return deriveKeyScrypt(params)
    case ALGORITHMS.ARGON2:
      return deriveKeyArgon2(params)
    default:
      return {
        derivedKey: null,
        params,
        errorCode: ERROR_CODES.UNSUPPORTED_ALGORITHM,
        errorMessage: `不支持的算法: ${algorithm}`,
      }
  }
}

async function benchmarkDerivation(algorithm, params, iterations = 3) {
  const result = await benchmark(
    () => deriveKey(algorithm, params),
    iterations
  )

  return {
    algorithm,
    ...result,
  }
}

export {
  deriveKey,
  benchmarkDerivation,
  deriveKeyPbkdf2,
  validatePbkdf2Params,
  checkWeakPbkdf2Params,
  deriveKeyScrypt,
  validateScryptParams,
  checkWeakScryptParams,
  deriveKeyArgon2,
  validateArgon2Params,
  checkWeakArgon2Params,
  generateSalt,
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  parseSaltInput,
  measureTimeAsync,
  benchmark,
  exportParamsToJson,
  ALGORITHMS,
  OWASP_RECOMMENDATIONS,
  WEAK_PARAMETER_THRESHOLDS,
  DEFAULT_PARAMS,
  EDUCATION_CONTENT,
  PARAMETER_PRESETS,
  ERROR_CODES,
  createError,
}
