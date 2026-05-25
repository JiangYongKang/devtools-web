/**
 * attestationObject 解析函数
 * 解析 WebAuthn 注册返回的 attestation 对象
 */

import { base64UrlToUint8Array, uint8ArrayToBase64Url } from './base64url.js'
import { parseAuthData, decodeCborSimple } from './authData.js'

/**
 * 解析 attestationObject
 * @param {string|Uint8Array} attestationInput - Base64URL 字符串或 Uint8Array
 * @returns {Object} 解析后的 attestation 对象摘要
 */
function parseAttestationObject(attestationInput) {
  let bytes
  if (typeof attestationInput === 'string') {
    bytes = base64UrlToUint8Array(attestationInput)
  } else if (attestationInput instanceof Uint8Array || (attestationInput && attestationInput.constructor && attestationInput.constructor.name === 'Uint8Array')) {
    bytes = attestationInput
  } else {
    throw new Error('attestationObject 必须是 Base64URL 字符串或 Uint8Array')
  }

  const decoded = decodeCborSimple(bytes, 0)
  const attObj = decoded.value

  const fmt = attObj.fmt
  const attStmt = attObj.attStmt
  const authData = parseAuthData(new Uint8Array(attObj.authData))

  const fmtDescriptions = {
    'packed': 'Packed (通用 attestation 格式)',
    'tpm': 'TPM (可信平台模块)',
    'android-key': 'Android Key',
    'android-safetynet': 'Android SafetyNet',
    'fido-u2f': 'FIDO U2F',
    'none': 'None (无 attestation)',
    'apple': 'Apple Anonymous',
  }

  return {
    fmt,
    fmtDescription: fmtDescriptions[fmt] || `未知格式: ${fmt}`,
    attStmtFields: attStmt ? Object.keys(attStmt) : [],
    authData,
    raw: {
      fmt,
      attStmtFields: attStmt ? Object.keys(attStmt) : [],
    },
  }
}

export {
  parseAttestationObject,
}
