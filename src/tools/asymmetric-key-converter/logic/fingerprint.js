import { ERROR_CODES, createError, isWebCryptoAvailable } from './errors.js'
import { arrayBufferToHex, formatHexWithColon } from './formatConverter.js'

const FINGERPRINT_ALGORITHMS = {
  SHA256: 'SHA-256',
  SHA1: 'SHA-1',
}

async function computeFingerprint(buffer, algorithm = 'SHA-256') {
  if (!isWebCryptoAvailable()) {
    return { error: createError(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE) }
  }

  try {
    const hashBuffer = await crypto.subtle.digest(algorithm, buffer)
    const hex = arrayBufferToHex(hashBuffer)

    return {
      hex,
      hexColon: formatHexWithColon(hex),
      algorithm,
      errorCode: null,
      errorMessage: null,
    }
  } catch (err) {
    return { error: createError(ERROR_CODES.FINGERPRINT_FAILED, err.message) }
  }
}

async function computePublicKeyFingerprint(spkiBuffer, algorithm = 'SHA-256') {
  return computeFingerprint(spkiBuffer, algorithm)
}

function openSSHFingerprintToHex(sshFingerprint) {
  if (sshFingerprint.startsWith('SHA256:')) {
    const base64Part = sshFingerprint.slice(7)
    try {
      const binary = atob(base64Part)
      let hex = ''
      for (let i = 0; i < binary.length; i++) {
        hex += binary.charCodeAt(i).toString(16).padStart(2, '0')
      }
      return hex
    } catch {
      return null
    }
  }
  return null
}

function formatAsOpenSSH(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `SHA256:${btoa(binary).replace(/=+$/, '')}`
}

export {
  FINGERPRINT_ALGORITHMS,
  computeFingerprint,
  computePublicKeyFingerprint,
  openSSHFingerprintToHex,
  formatAsOpenSSH,
}
