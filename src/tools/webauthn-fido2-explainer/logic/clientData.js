/**
 * clientDataJSON 解析函数
 * 解析 WebAuthn 注册/认证过程中的客户端数据
 */

import { base64UrlToUint8Array, uint8ArrayToString } from './base64url.js'

/**
 * 解析 clientDataJSON
 * @param {string|Uint8Array} clientData - Base64URL 字符串或 Uint8Array
 * @returns {Object} 解析后的 clientData 对象
 */
function parseClientDataJSON(clientData) {
  let jsonString

  if (typeof clientData === 'string') {
    try {
      const bytes = base64UrlToUint8Array(clientData)
      jsonString = uint8ArrayToString(bytes)
    } catch {
      jsonString = clientData
    }
  } else if (clientData instanceof Uint8Array || (clientData && clientData.constructor && clientData.constructor.name === 'Uint8Array')) {
    jsonString = uint8ArrayToString(clientData)
  } else {
    throw new Error('clientData 必须是 Base64URL 字符串或 Uint8Array')
  }

  const parsed = JSON.parse(jsonString)

  return {
    type: parsed.type,
    challenge: parsed.challenge,
    origin: parsed.origin,
    crossOrigin: parsed.crossOrigin || false,
    tokenBinding: parsed.tokenBinding || null,
    raw: parsed,
  }
}

/**
 * 获取 clientData 类型描述
 * @param {string} type - clientData 类型
 * @returns {string} 类型描述
 */
function getClientDataTypeDescription(type) {
  const descriptions = {
    'webauthn.create': 'WebAuthn 注册（创建新凭证）',
    'webauthn.get': 'WebAuthn 认证（使用已有凭证）',
  }
  return descriptions[type] || `未知类型: ${type}`
}

/**
 * 验证 challenge 是否匹配
 * @param {string} expectedChallenge - 期望的 challenge（Base64URL）
 * @param {string} actualChallenge - 实际返回的 challenge（Base64URL）
 * @returns {boolean} 是否匹配
 */
function validateChallenge(expectedChallenge, actualChallenge) {
  return expectedChallenge === actualChallenge
}

/**
 * 验证 origin 是否匹配
 * @param {string} expectedOrigin - 期望的 origin
 * @param {string} actualOrigin - 实际的 origin
 * @returns {boolean} 是否匹配
 */
function validateOrigin(expectedOrigin, actualOrigin) {
  return expectedOrigin === actualOrigin
}

export {
  parseClientDataJSON,
  getClientDataTypeDescription,
  validateChallenge,
  validateOrigin,
}
