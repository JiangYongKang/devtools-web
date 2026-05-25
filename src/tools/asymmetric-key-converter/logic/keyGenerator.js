import { ERROR_CODES, createError, isWebCryptoAvailable } from './errors.js'

const ALGORITHM_CONFIGS = {
  RSA: {
    name: 'RSASSA-PKCS1-v1_5',
    keySizes: [2048, 4096],
    defaultKeySize: 2048,
    hash: 'SHA-256',
    usage: ['sign', 'verify'],
    description: 'RSA 签名算法，用于数字签名验证',
  },
  RSA_OAEP: {
    name: 'RSA-OAEP',
    keySizes: [2048, 4096],
    defaultKeySize: 2048,
    hash: 'SHA-256',
    usage: ['encrypt', 'decrypt'],
    description: 'RSA 加密算法，用于非对称加密',
  },
  EC: {
    name: 'ECDSA',
    curves: ['P-256', 'P-384'],
    defaultCurve: 'P-256',
    hash: { 'P-256': 'SHA-256', 'P-384': 'SHA-384' },
    usage: ['sign', 'verify'],
    description: 'ECDSA 椭圆曲线签名算法',
  },
  ECDH: {
    name: 'ECDH',
    curves: ['P-256', 'P-384'],
    defaultCurve: 'P-256',
    usage: ['deriveKey', 'deriveBits'],
    description: 'ECDH 密钥协商算法',
  },
  Ed25519: {
    name: 'Ed25519',
    usage: ['sign', 'verify'],
    description: 'Ed25519  Edwards 曲线签名算法',
  },
}

function getAlgorithmInfo(algorithm) {
  return ALGORITHM_CONFIGS[algorithm] || null
}

function isValidAlgorithm(algorithm) {
  return Object.prototype.hasOwnProperty.call(ALGORITHM_CONFIGS, algorithm)
}

function isValidKeySize(algorithm, keySize) {
  const config = ALGORITHM_CONFIGS[algorithm]
  if (!config || !config.keySizes) return false
  return config.keySizes.includes(keySize)
}

function isValidCurve(algorithm, curve) {
  const config = ALGORITHM_CONFIGS[algorithm]
  if (!config || !config.curves) return false
  return config.curves.includes(curve)
}

async function generateKeyPair(algorithm, options = {}) {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }

  if (!isValidAlgorithm(algorithm)) {
    return { error: createError(ERROR_CODES.INVALID_ALGORITHM) }
  }

  const startTime = performance.now()
  const config = ALGORITHM_CONFIGS[algorithm]

  try {
    let algorithmParams
    let extractable = true
    let keyUsages = config.usage

    switch (algorithm) {
      case 'RSA':
      case 'RSA_OAEP': {
        const keySize = options.keySize || config.defaultKeySize
        if (!isValidKeySize(algorithm, keySize)) {
          return { error: createError(ERROR_CODES.INVALID_KEY_SIZE) }
        }
        algorithmParams = {
          name: config.name,
          modulusLength: keySize,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: { name: config.hash },
        }
        break
      }
      case 'EC':
      case 'ECDH': {
        const namedCurve = options.curve || config.defaultCurve
        if (!isValidCurve(algorithm, namedCurve)) {
          return { error: createError(ERROR_CODES.INVALID_CURVE) }
        }
        algorithmParams = {
          name: config.name,
          namedCurve,
        }
        break
      }
      case 'Ed25519': {
        algorithmParams = {
          name: config.name,
        }
        break
      }
      default:
        return { error: createError(ERROR_CODES.INVALID_ALGORITHM) }
    }

    const keyPair = await crypto.subtle.generateKey(
      algorithmParams,
      extractable,
      keyUsages
    )

    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)

    return {
      keyPair,
      algorithm,
      algorithmParams,
      duration,
      description: config.description,
      usage: keyUsages,
      errorCode: null,
      errorMessage: null,
    }
  } catch (err) {
    return {
      error: createError(ERROR_CODES.KEY_GENERATION_FAILED, err.message),
    }
  }
}

export {
  ALGORITHM_CONFIGS,
  getAlgorithmInfo,
  isValidAlgorithm,
  isValidKeySize,
  isValidCurve,
  generateKeyPair,
}
