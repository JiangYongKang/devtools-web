import { ERROR_CODES, ERROR_MESSAGES, getErrorMessage, createError } from './errors.js'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isValidBase64,
  arrayBufferToHex,
  hexToArrayBuffer,
  isValidHex,
  detectFormat,
  encodeArrayBuffer,
  decodeToArrayBuffer,
} from './encoding.js'
import {
  ALGORITHMS,
  INPUT_FORMATS,
  MAX_TEXT_LENGTH,
  EXAMPLE_PLAINTEXT,
  EXAMPLE_METADATA,
  SECURITY_WARNINGS,
  AUDIT_NOTE,
} from './constants.js'

function isCryptoAvailable() {
  return typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
}

function getAlgorithmById(id) {
  return ALGORITHMS.find((a) => a.id === id) || null
}

function validateAlgorithm(algorithmId) {
  if (algorithmId == null) {
    return createError(ERROR_CODES.NULL_INPUT)
  }
  if (typeof algorithmId !== 'string') {
    return createError(ERROR_CODES.INVALID_PARAMETER)
  }
  const algo = getAlgorithmById(algorithmId)
  if (!algo) {
    return createError(ERROR_CODES.INVALID_ALGORITHM)
  }
  return null
}

function validateKey(keyStr, format, expectedLength) {
  if (keyStr == null) {
    return createError(ERROR_CODES.NULL_INPUT)
  }
  if (typeof keyStr !== 'string') {
    return createError(ERROR_CODES.INVALID_PARAMETER)
  }
  const trimmed = keyStr.trim()
  if (!trimmed) {
    return createError(ERROR_CODES.INVALID_KEY)
  }

  if (format === 'hex') {
    if (!isValidHex(trimmed)) {
      return createError(ERROR_CODES.INVALID_HEX)
    }
    const byteLength = trimmed.replace(/\s+/g, '').length / 2
    if (byteLength !== expectedLength) {
      return createError(ERROR_CODES.KEY_LENGTH_MISMATCH)
    }
  } else if (format === 'base64') {
    if (!isValidBase64(trimmed)) {
      return createError(ERROR_CODES.INVALID_BASE64)
    }
    try {
      const buffer = base64ToArrayBuffer(trimmed)
      if (buffer.byteLength !== expectedLength) {
        return createError(ERROR_CODES.KEY_LENGTH_MISMATCH)
      }
    } catch {
      return createError(ERROR_CODES.INVALID_BASE64)
    }
  } else {
    return createError(ERROR_CODES.INVALID_INPUT_FORMAT)
  }

  return null
}

function validateIV(ivStr, format, expectedLength) {
  if (ivStr == null) {
    return createError(ERROR_CODES.NULL_INPUT)
  }
  if (typeof ivStr !== 'string') {
    return createError(ERROR_CODES.INVALID_PARAMETER)
  }
  const trimmed = ivStr.trim()
  if (!trimmed) {
    return createError(ERROR_CODES.INVALID_IV)
  }

  if (format === 'hex') {
    if (!isValidHex(trimmed)) {
      return createError(ERROR_CODES.INVALID_HEX)
    }
    const byteLength = trimmed.replace(/\s+/g, '').length / 2
    if (byteLength !== expectedLength) {
      return createError(ERROR_CODES.IV_LENGTH_MISMATCH)
    }
  } else if (format === 'base64') {
    if (!isValidBase64(trimmed)) {
      return createError(ERROR_CODES.INVALID_BASE64)
    }
    try {
      const buffer = base64ToArrayBuffer(trimmed)
      if (buffer.byteLength !== expectedLength) {
        return createError(ERROR_CODES.IV_LENGTH_MISMATCH)
      }
    } catch {
      return createError(ERROR_CODES.INVALID_BASE64)
    }
  } else {
    return createError(ERROR_CODES.INVALID_INPUT_FORMAT)
  }

  return null
}

function validatePlaintext(text) {
  if (text == null) {
    return createError(ERROR_CODES.NULL_INPUT)
  }
  if (typeof text !== 'string') {
    return createError(ERROR_CODES.INVALID_PARAMETER)
  }
  if (!text) {
    return createError(ERROR_CODES.EMPTY_PLAINTEXT)
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return createError(ERROR_CODES.TEXT_TOO_LONG)
  }
  return null
}

function validateCiphertext(ciphertext) {
  if (ciphertext == null) {
    return createError(ERROR_CODES.NULL_INPUT)
  }
  if (typeof ciphertext !== 'string') {
    return createError(ERROR_CODES.INVALID_PARAMETER)
  }
  if (!ciphertext.trim()) {
    return createError(ERROR_CODES.EMPTY_CIPHERTEXT)
  }
  return null
}

function generateRandomBytes(length) {
  if (!isCryptoAvailable()) {
    throw new Error(ERROR_CODES.CRYPTO_NOT_AVAILABLE)
  }
  const buffer = new Uint8Array(length)
  crypto.getRandomValues(buffer)
  return buffer.buffer
}

function generateRandomKey(keyLength, format = 'base64') {
  const buffer = generateRandomBytes(keyLength)
  return encodeArrayBuffer(buffer, format)
}

function generateRandomIV(ivLength, format = 'base64') {
  const buffer = generateRandomBytes(ivLength)
  return encodeArrayBuffer(buffer, format)
}

async function encrypt(params) {
  if (!isCryptoAvailable()) {
    return {
      success: false,
      errorCode: ERROR_CODES.CRYPTO_NOT_AVAILABLE,
      errorMessage: getErrorMessage(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  const {
    algorithmId,
    plaintext,
    key,
    keyFormat = 'base64',
    iv,
    ivFormat = 'base64',
    outputFormat = 'base64',
  } = params

  const algoError = validateAlgorithm(algorithmId)
  if (algoError) {
    return { success: false, ...algoError }
  }

  const textError = validatePlaintext(plaintext)
  if (textError) {
    return { success: false, ...textError }
  }

  const algorithm = getAlgorithmById(algorithmId)

  const keyError = validateKey(key, keyFormat, algorithm.keyLength)
  if (keyError) {
    return { success: false, ...keyError }
  }

  const ivError = validateIV(iv, ivFormat, algorithm.ivLength)
  if (ivError) {
    return { success: false, ...ivError }
  }

  try {
    const keyBuffer = decodeToArrayBuffer(key, keyFormat)
    const ivBuffer = decodeToArrayBuffer(iv, ivFormat)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: algorithm.algorithm },
      false,
      ['encrypt']
    )

    const encoder = new TextEncoder()
    const plaintextBuffer = encoder.encode(plaintext)

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: algorithm.algorithm,
        iv: ivBuffer,
      },
      cryptoKey,
      plaintextBuffer
    )

    const ciphertext = encodeArrayBuffer(encryptedBuffer, outputFormat)

    return {
      success: true,
      ciphertext,
      ciphertextFormat: outputFormat,
      plaintextLength: plaintext.length,
      ciphertextLength: ciphertext.length,
      algorithm: algorithmId,
    }
  } catch (e) {
    return {
      success: false,
      errorCode: ERROR_CODES.ENCRYPTION_FAILED,
      errorMessage: e?.message || getErrorMessage(ERROR_CODES.ENCRYPTION_FAILED),
    }
  }
}

async function decrypt(params) {
  if (!isCryptoAvailable()) {
    return {
      success: false,
      errorCode: ERROR_CODES.CRYPTO_NOT_AVAILABLE,
      errorMessage: getErrorMessage(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  const {
    algorithmId,
    ciphertext,
    ciphertextFormat = 'base64',
    key,
    keyFormat = 'base64',
    iv,
    ivFormat = 'base64',
  } = params

  const algoError = validateAlgorithm(algorithmId)
  if (algoError) {
    return { success: false, ...algoError }
  }

  const ctError = validateCiphertext(ciphertext)
  if (ctError) {
    return { success: false, ...ctError }
  }

  const algorithm = getAlgorithmById(algorithmId)

  const keyError = validateKey(key, keyFormat, algorithm.keyLength)
  if (keyError) {
    return { success: false, ...keyError }
  }

  const ivError = validateIV(iv, ivFormat, algorithm.ivLength)
  if (ivError) {
    return { success: false, ...ivError }
  }

  try {
    let ciphertextBuffer
    try {
      ciphertextBuffer = decodeToArrayBuffer(ciphertext, ciphertextFormat)
    } catch {
      if (ciphertextFormat === 'base64') {
        return {
          success: false,
          errorCode: ERROR_CODES.INVALID_BASE64,
          errorMessage: getErrorMessage(ERROR_CODES.INVALID_BASE64),
        }
      }
      return {
        success: false,
        errorCode: ERROR_CODES.INVALID_HEX,
        errorMessage: getErrorMessage(ERROR_CODES.INVALID_HEX),
      }
    }

    const keyBuffer = decodeToArrayBuffer(key, keyFormat)
    const ivBuffer = decodeToArrayBuffer(iv, ivFormat)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: algorithm.algorithm },
      false,
      ['decrypt']
    )

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: algorithm.algorithm,
        iv: ivBuffer,
      },
      cryptoKey,
      ciphertextBuffer
    )

    const decoder = new TextDecoder()
    const plaintext = decoder.decode(decryptedBuffer)

    return {
      success: true,
      plaintext,
      ciphertextLength: ciphertext.length,
      plaintextLength: plaintext.length,
      algorithm: algorithmId,
    }
  } catch (e) {
    const isTagError = e?.name === 'OperationError' || 
      e?.message?.includes('tag') ||
      e?.message?.includes('authentication')
    
    if (isTagError) {
      return {
        success: false,
        errorCode: ERROR_CODES.TAG_MISMATCH,
        errorMessage: getErrorMessage(ERROR_CODES.TAG_MISMATCH),
      }
    }

    return {
      success: false,
      errorCode: ERROR_CODES.DECRYPTION_FAILED,
      errorMessage: e?.message || getErrorMessage(ERROR_CODES.DECRYPTION_FAILED),
    }
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  ALGORITHMS,
  INPUT_FORMATS,
  MAX_TEXT_LENGTH,
  EXAMPLE_PLAINTEXT,
  EXAMPLE_METADATA,
  SECURITY_WARNINGS,
  AUDIT_NOTE,
  isCryptoAvailable,
  getAlgorithmById,
  validateAlgorithm,
  validateKey,
  validateIV,
  validatePlaintext,
  validateCiphertext,
  generateRandomKey,
  generateRandomIV,
  encrypt,
  decrypt,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isValidBase64,
  arrayBufferToHex,
  hexToArrayBuffer,
  isValidHex,
  detectFormat,
  encodeArrayBuffer,
  decodeToArrayBuffer,
}
