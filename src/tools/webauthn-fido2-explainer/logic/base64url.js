/**
 * Base64URL 编解码辅助函数
 * 遵循 RFC 4648 §5 规范，用于 WebAuthn 数据传输
 */

/**
 * 将 Base64URL 字符串转换为标准 Base64
 * @param {string} base64url - Base64URL 编码字符串
 * @returns {string} 标准 Base64 字符串
 */
function base64UrlToBase64(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) {
    if (pad === 1) {
      throw new Error('无效的 Base64URL 字符串长度')
    }
    base64 += new Array(5 - pad).join('=')
  }
  return base64
}

/**
 * 将标准 Base64 转换为 Base64URL
 * @param {string} base64 - 标准 Base64 字符串
 * @returns {string} Base64URL 编码字符串
 */
function base64ToBase64Url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * 将 Base64URL 字符串解码为 Uint8Array
 * @param {string} base64url - Base64URL 编码字符串
 * @returns {Uint8Array} 解码后的字节数组
 */
function base64UrlToUint8Array(base64url) {
  const base64 = base64UrlToBase64(base64url)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 将 Uint8Array 编码为 Base64URL 字符串
 * @param {Uint8Array} bytes - 字节数组
 * @returns {string} Base64URL 编码字符串
 */
function uint8ArrayToBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64ToBase64Url(base64)
}

/**
 * 将 UTF-8 字符串编码为 Uint8Array
 * @param {string} str - UTF-8 字符串
 * @returns {Uint8Array} 编码后的字节数组
 */
function stringToUint8Array(str) {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * 将 Uint8Array 解码为 UTF-8 字符串
 * @param {Uint8Array} bytes - 字节数组
 * @returns {string} UTF-8 字符串
 */
function uint8ArrayToString(bytes) {
  const decoder = new TextDecoder('utf-8')
  return decoder.decode(bytes)
}

/**
 * 将 UTF-8 字符串编码为 Base64URL
 * @param {string} str - UTF-8 字符串
 * @returns {string} Base64URL 编码字符串
 */
function stringToBase64Url(str) {
  const bytes = stringToUint8Array(str)
  return uint8ArrayToBase64Url(bytes)
}

/**
 * 将 Base64URL 解码为 UTF-8 字符串
 * @param {string} base64url - Base64URL 编码字符串
 * @returns {string} UTF-8 字符串
 */
function base64UrlToString(base64url) {
  const bytes = base64UrlToUint8Array(base64url)
  return uint8ArrayToString(bytes)
}

/**
 * 生成指定长度的随机字节数组
 * @param {number} length - 字节长度
 * @returns {Uint8Array} 随机字节数组
 */
function generateRandomBytes(length = 32) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * 生成随机 challenge（Base64URL 编码）
 * @param {number} length - 字节长度，默认 32
 * @returns {string} Base64URL 编码的 challenge
 */
function generateChallenge(length = 32) {
  const bytes = generateRandomBytes(length)
  return uint8ArrayToBase64Url(bytes)
}

/**
 * 生成随机 user.id（Base64URL 编码）
 * @param {number} length - 字节长度，默认 16
 * @returns {string} Base64URL 编码的用户 ID
 */
function generateUserId(length = 16) {
  const bytes = generateRandomBytes(length)
  return uint8ArrayToBase64Url(bytes)
}

export {
  base64UrlToBase64,
  base64ToBase64Url,
  base64UrlToUint8Array,
  uint8ArrayToBase64Url,
  stringToUint8Array,
  uint8ArrayToString,
  stringToBase64Url,
  base64UrlToString,
  generateRandomBytes,
  generateChallenge,
  generateUserId,
}
