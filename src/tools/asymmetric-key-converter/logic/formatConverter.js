import { ERROR_CODES, createError, isWebCryptoAvailable } from './errors.js'

const PEM_TYPES = {
  PUBLIC_KEY: 'PUBLIC KEY',
  PRIVATE_KEY: 'PRIVATE KEY',
  RSA_PUBLIC_KEY: 'RSA PUBLIC KEY',
  RSA_PRIVATE_KEY: 'RSA PRIVATE KEY',
  EC_PRIVATE_KEY: 'EC PRIVATE KEY',
}

const PEM_BEGIN_REGEX = /^-----BEGIN ([A-Z ]+)-----\s*$/
const PEM_END_REGEX = /^-----END ([A-Z ]+)-----\s*$/

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function formatPEM(base64Content, type) {
  const lines = []
  lines.push(`-----BEGIN ${type}-----`)
  for (let i = 0; i < base64Content.length; i += 64) {
    lines.push(base64Content.slice(i, i + 64))
  }
  lines.push(`-----END ${type}-----`)
  return lines.join('\n')
}

function parsePEM(pemString) {
  const trimmed = pemString.trim()
  const lines = trimmed.split('\n').map(line => line.trim()).filter(line => line)

  if (lines.length < 3) {
    return { error: createError(ERROR_CODES.INVALID_PEM_FORMAT, 'PEM 内容过短') }
  }

  const beginMatch = lines[0].match(PEM_BEGIN_REGEX)
  if (!beginMatch) {
    return { error: createError(ERROR_CODES.INVALID_PEM_BEGIN) }
  }

  const endMatch = lines[lines.length - 1].match(PEM_END_REGEX)
  if (!endMatch) {
    return { error: createError(ERROR_CODES.INVALID_PEM_END) }
  }

  const beginType = beginMatch[1]
  const endType = endMatch[1]

  if (beginType !== endType) {
    return { error: createError(ERROR_CODES.INVALID_PEM_FORMAT, 'BEGIN 和 END 标记类型不一致') }
  }

  const base64Content = lines.slice(1, -1).join('')

  try {
    const derBuffer = base64ToArrayBuffer(base64Content)
    return {
      type: beginType,
      derBuffer,
      base64Content,
      errorCode: null,
      errorMessage: null,
    }
  } catch {
    return { error: createError(ERROR_CODES.INVALID_PEM_FORMAT, 'Base64 解码失败') }
  }
}

function isPEMPrivateKey(type) {
  return type.includes('PRIVATE')
}

function isPEMPublicKey(type) {
  return type.includes('PUBLIC')
}

function spkiToPEM(spkiBuffer) {
  const base64 = arrayBufferToBase64(spkiBuffer)
  return formatPEM(base64, PEM_TYPES.PUBLIC_KEY)
}

function pkcs8ToPEM(pkcs8Buffer) {
  const base64 = arrayBufferToBase64(pkcs8Buffer)
  return formatPEM(base64, PEM_TYPES.PRIVATE_KEY)
}

function pemToSpki(pemString) {
  const parsed = parsePEM(pemString)
  if (parsed.error) {
    return parsed
  }
  if (!isPEMPublicKey(parsed.type)) {
    return { error: createError(ERROR_CODES.INVALID_PEM_FORMAT, '不是公钥 PEM') }
  }
  return {
    spkiBuffer: parsed.derBuffer,
    type: parsed.type,
    errorCode: null,
    errorMessage: null,
  }
}

function pemToPkcs8(pemString) {
  const parsed = parsePEM(pemString)
  if (parsed.error) {
    return parsed
  }
  if (!isPEMPrivateKey(parsed.type)) {
    return { error: createError(ERROR_CODES.INVALID_PEM_FORMAT, '不是私钥 PEM') }
  }
  return {
    pkcs8Buffer: parsed.derBuffer,
    type: parsed.type,
    errorCode: null,
    errorMessage: null,
  }
}

function jwkToPem(jwk, isPrivate = false) {
  throw new Error('JWK to PEM conversion requires ASN.1 parsing')
}

function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToArrayBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes.buffer
}

function formatHexWithColon(hex) {
  return hex.match(/.{2}/g).join(':')
}

function parseHexWithColon(formattedHex) {
  return formattedHex.replace(/:/g, '')
}

async function exportPublicKeyToSPKI(publicKey) {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }
  try {
    const spkiBuffer = await crypto.subtle.exportKey('spki', publicKey)
    return { spkiBuffer, errorCode: null, errorMessage: null }
  } catch (err) {
    return { error: createError(ERROR_CODES.KEY_EXPORT_FAILED, err.message) }
  }
}

async function exportPrivateKeyToPKCS8(privateKey) {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }
  try {
    const pkcs8Buffer = await crypto.subtle.exportKey('pkcs8', privateKey)
    return { pkcs8Buffer, errorCode: null, errorMessage: null }
  } catch (err) {
    return { error: createError(ERROR_CODES.KEY_EXPORT_FAILED, err.message) }
  }
}

async function exportKeyToJWK(key) {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }
  try {
    const jwk = await crypto.subtle.exportKey('jwk', key)
    return { jwk, errorCode: null, errorMessage: null }
  } catch (err) {
    return { error: createError(ERROR_CODES.KEY_EXPORT_FAILED, err.message) }
  }
}

async function importPublicKeyFromSPKI(spkiBuffer, algorithm) {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }
  try {
    const publicKey = await crypto.subtle.importKey(
      'spki',
      spkiBuffer,
      algorithm,
      true,
      ['verify']
    )
    return { publicKey, errorCode: null, errorMessage: null }
  } catch (err) {
    return { error: createError(ERROR_CODES.KEY_IMPORT_FAILED, err.message) }
  }
}

async function importPrivateKeyFromPKCS8(pkcs8Buffer, algorithm) {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }
  try {
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Buffer,
      algorithm,
      true,
      ['sign']
    )
    return { privateKey, errorCode: null, errorMessage: null }
  } catch (err) {
    return { error: createError(ERROR_CODES.KEY_IMPORT_FAILED, err.message) }
  }
}

async function importKeyFromJWK(jwk, algorithm, isPrivate = false) {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }
  try {
    const usages = isPrivate ? ['sign'] : ['verify']
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      algorithm,
      true,
      usages
    )
    return { key, errorCode: null, errorMessage: null }
  } catch (err) {
    return { error: createError(ERROR_CODES.KEY_IMPORT_FAILED, err.message) }
  }
}

export {
  PEM_TYPES,
  parsePEM,
  formatPEM,
  spkiToPEM,
  pkcs8ToPEM,
  pemToSpki,
  pemToPkcs8,
  isPEMPrivateKey,
  isPEMPublicKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  arrayBufferToHex,
  hexToArrayBuffer,
  formatHexWithColon,
  parseHexWithColon,
  exportPublicKeyToSPKI,
  exportPrivateKeyToPKCS8,
  exportKeyToJWK,
  importPublicKeyFromSPKI,
  importPrivateKeyFromPKCS8,
  importKeyFromJWK,
}
