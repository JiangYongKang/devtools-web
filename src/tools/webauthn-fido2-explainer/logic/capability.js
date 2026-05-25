/**
 * WebAuthn 能力检测函数
 * 检测浏览器是否支持 WebAuthn 以及相关功能
 */

/**
 * 检测浏览器是否支持 WebAuthn
 * @returns {Object} 能力检测结果
 */
function checkWebAuthnSupport() {
  const result = {
    supported: false,
    isSecureContext: false,
    credentialsApi: false,
    publicKey: false,
    conditionalMediation: false,
    userVerifyingPlatformAuthenticator: false,
  }

  result.isSecureContext = window.isSecureContext

  if (window.PublicKeyCredential) {
    result.supported = true
    result.credentialsApi = true
    result.publicKey = true
  }

  if (navigator.credentials && typeof navigator.credentials.create === 'function') {
    result.credentialsApi = true
  }

  return result
}

/**
 * 常见错误对照表
 */
const WEBAUTHN_ERRORS = [
  {
    name: 'InvalidStateError',
    description: '凭证已存在（同一用户在同一认证器上尝试创建重复凭证）',
    scenario: '注册时，authenticator 中已存在相同 RP ID + 用户的凭证',
  },
  {
    name: 'NotAllowedError',
    description: '用户拒绝或操作超时',
    scenario: '用户取消了认证器对话框，或超时未操作，或浏览器权限被阻止',
  },
  {
    name: 'SecurityError',
    description: '安全上下文错误',
    scenario: '页面不在 HTTPS 或 localhost 下，或 RP ID 与有效域名不匹配',
  },
  {
    name: 'NotSupportedError',
    description: '不支持的算法或选项',
    scenario: '指定的公钥算法不被认证器支持，或选项配置无效',
  },
  {
    name: 'ConstraintError',
    description: '约束条件不满足',
    scenario: '要求 userVerification 但认证器无法提供，或要求 residentKey 但不支持',
  },
  {
    name: 'AbortError',
    description: '操作被中止',
    scenario: '使用 AbortController 中止了 WebAuthn 操作',
  },
  {
    name: 'UnknownError',
    description: '未知错误',
    scenario: '认证器内部发生错误',
  },
]

/**
 * RP ID 与有效域名关系说明
 */
const RP_ID_DOCUMENTATION = {
  title: 'RP ID 与 Effective Domain 关系',
  rules: [
    'RP ID 必须是当前有效域名（effective domain）或其上级域名',
    '例如：页面在 "login.example.com"，RP ID 可以是 "login.example.com" 或 "example.com"',
    '不能使用完全不相关的域名（如 "other.com"）',
    '不能使用顶级域名（TLD）如 "com" 或 "co.uk"',
    '如果不指定 RP ID，默认为当前完整域名',
  ],
  examples: [
    { origin: 'https://app.example.com:8443', validRpIds: ['app.example.com', 'example.com'] },
    { origin: 'https://login.example.co.uk', validRpIds: ['login.example.co.uk', 'example.co.uk'] },
    { origin: 'http://localhost:3000', validRpIds: ['localhost'] },
  ],
  notes: [
    'RP ID 不包含协议（http/https）和端口号',
    '生产环境必须使用 HTTPS（localhost 除外用于开发）',
    'RP ID 决定了哪些凭证可以被调用（同一 RP ID 下的凭证可跨子域使用）',
  ],
}

export {
  checkWebAuthnSupport,
  WEBAUTHN_ERRORS,
  RP_ID_DOCUMENTATION,
}
