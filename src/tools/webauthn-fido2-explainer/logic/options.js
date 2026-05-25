/**
 * WebAuthn 选项生成函数
 * 生成注册和认证的选项
 */

import { generateChallenge, generateUserId, stringToUint8Array, uint8ArrayToBase64Url } from './base64url.js'

/**
 * 公钥算法列表
 */
const PUBLIC_KEY_ALGORITHMS = [
  { alg: -7, name: 'ES256 (ECDSA w/ SHA-256)', type: 'public-key' },
  { alg: -8, name: 'EdDSA', type: 'public-key' },
  { alg: -257, name: 'RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)', type: 'public-key' },
  { alg: -37, name: 'PS256 (RSASSA-PSS w/ SHA-256)', type: 'public-key' },
]

/**
 * 认证器挂载方式
 */
const AUTHENTICATOR_ATTACHMENTS = [
  { value: 'platform', label: '平台内置（如 Touch ID、Windows Hello）' },
  { value: 'cross-platform', label: '跨平台（如 YubiKey 等安全密钥）' },
]

/**
 * 用户验证要求
 */
const USER_VERIFICATION_REQUIREMENTS = [
  { value: 'required', label: '必需（必须验证用户）' },
  { value: 'preferred', label: '优选（尽可能验证）' },
  { value: 'discouraged', label: '不鼓励（不要求验证）' },
]

/**
 * 常驻密钥要求
 */
const RESIDENT_KEY_REQUIREMENTS = [
  { value: 'required', label: '必需（必须创建常驻密钥）' },
  { value: 'preferred', label: '优选（尽可能创建）' },
  { value: 'discouraged', label: '不鼓励（不创建）' },
]

/**
 * 认证证明传递方式
 */
const ATTESTATION_CONVEYANCE_PREFERENCES = [
  { value: 'none', label: 'None（不传递，隐私优先）' },
  { value: 'indirect', label: 'Indirect（间接传递）' },
  { value: 'direct', label: 'Direct（直接传递）' },
  { value: 'enterprise', label: 'Enterprise（企业级）' },
]

/**
 * 创建注册选项
 * @param {Object} params - 参数对象
 * @returns {Object} 注册选项
 */
function createRegistrationOptions(params = {}) {
  const {
    rpName = '示例应用',
    rpId = window.location.hostname,
    userName = 'user@example.com',
    userDisplayName = '示例用户',
    userId = null,
    challenge = null,
    authenticatorAttachment = '',
    userVerification = 'preferred',
    residentKey = 'preferred',
    requireResidentKey = false,
    attestation = 'none',
    timeout = 60000,
  } = params

  const actualUserId = userId || generateUserId(16)
  const actualChallenge = challenge || generateChallenge(32)

  const pubKeyCredParams = PUBLIC_KEY_ALGORITHMS.map(alg => ({
    type: alg.type,
    alg: alg.alg,
  }))

  const authenticatorSelection = {}
  if (authenticatorAttachment) {
    authenticatorSelection.authenticatorAttachment = authenticatorAttachment
  }
  authenticatorSelection.userVerification = userVerification
  authenticatorSelection.residentKey = residentKey
  authenticatorSelection.requireResidentKey = requireResidentKey

  const options = {
    publicKey: {
      rp: {
        name: rpName,
        id: rpId,
      },
      user: {
        id: actualUserId,
        name: userName,
        displayName: userDisplayName,
      },
      challenge: actualChallenge,
      pubKeyCredParams,
      timeout,
      attestation,
      authenticatorSelection,
    },
  }

  return options
}

/**
 * 创建认证选项
 * @param {Object} params - 参数对象
 * @returns {Object} 认证选项
 */
function createAuthenticationOptions(params = {}) {
  const {
    rpId = window.location.hostname,
    challenge = null,
    userVerification = 'preferred',
    timeout = 60000,
    allowCredentials = [],
  } = params

  const actualChallenge = challenge || generateChallenge(32)

  const options = {
    publicKey: {
      rpId,
      challenge: actualChallenge,
      userVerification,
      timeout,
      allowCredentials,
    },
  }

  return options
}

/**
 * 创建示例凭证（用于 allowCredentials）
 * @param {string} credentialId - 凭证 ID（Base64URL）
 * @param {Array<string>} transports - 传输方式
 * @returns {Object} 凭证描述符
 */
function createCredentialDescriptor(credentialId, transports = ['usb', 'nfc', 'ble', 'internal']) {
  return {
    type: 'public-key',
    id: credentialId,
    transports,
  }
}

/**
 * Passkey 模板（一键填充）
 */
const PASSKEY_REGISTRATION_TEMPLATE = {
  rpName: '我的应用',
  userName: 'user@example.com',
  userDisplayName: '张三',
  authenticatorAttachment: '',
  userVerification: 'preferred',
  residentKey: 'required',
  requireResidentKey: true,
  attestation: 'none',
}

const PASSKEY_AUTHENTICATION_TEMPLATE = {
  userVerification: 'preferred',
  allowCredentials: [],
}

export {
  PUBLIC_KEY_ALGORITHMS,
  AUTHENTICATOR_ATTACHMENTS,
  USER_VERIFICATION_REQUIREMENTS,
  RESIDENT_KEY_REQUIREMENTS,
  ATTESTATION_CONVEYANCE_PREFERENCES,
  createRegistrationOptions,
  createAuthenticationOptions,
  createCredentialDescriptor,
  PASSKEY_REGISTRATION_TEMPLATE,
  PASSKEY_AUTHENTICATION_TEMPLATE,
}
