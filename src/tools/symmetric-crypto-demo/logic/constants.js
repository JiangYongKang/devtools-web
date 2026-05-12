const ALGORITHMS = [
  {
    id: 'AES-GCM-128',
    name: 'AES-GCM-128',
    algorithm: 'AES-GCM',
    keyLength: 16,
    ivLength: 12,
    tagLength: 16,
    description: 'AES-128-GCM 模式，提供机密性和完整性认证',
    recommended: true,
  },
  {
    id: 'AES-GCM-256',
    name: 'AES-GCM-256',
    algorithm: 'AES-GCM',
    keyLength: 32,
    ivLength: 12,
    tagLength: 16,
    description: 'AES-256-GCM 模式，更高安全强度的机密性和完整性认证',
    recommended: true,
  },
]

const INPUT_FORMATS = [
  { id: 'base64', name: 'Base64' },
  { id: 'hex', name: '十六进制 (Hex)' },
]

const MAX_TEXT_LENGTH = 1024 * 100

const EXAMPLE_PLAINTEXT = '这是一条测试消息，用于演示 AES-GCM 对称加密。'

const EXAMPLE_METADATA = {
  algorithm: 'AES-GCM-128',
  keyFormat: 'base64',
  key: 'aGVsbG8td29ybGQxMjM0',
  ivFormat: 'base64',
  iv: 'SW5pdFZlY3Rvcg==',
}

const SECURITY_WARNINGS = {
  DEMO_PURPOSE: '仅用于演示用途，请勿在生产环境中使用',
  DO_NOT_PASTE_PRODUCTION_KEYS: '请勿粘贴生产环境密钥、API 密钥或其他敏感信息',
  NO_PERSISTENCE: '默认情况下，密钥和数据不会被持久化存储',
  ALWAYS_USE_NEW_IV: '每次加密应使用新的随机 IV，不要重复使用同一 IV',
  STORAGE_OPTIONAL: '如需保存密钥，请谨慎勾选并注意安全风险',
}

const AUDIT_NOTE = '本工具仅在浏览器本地执行加密操作，不向任何服务器发送数据。' +
  '所有加密材料（密钥、IV、明文）默认仅存在于内存中，页面刷新后将丢失。'

export {
  ALGORITHMS,
  INPUT_FORMATS,
  MAX_TEXT_LENGTH,
  EXAMPLE_PLAINTEXT,
  EXAMPLE_METADATA,
  SECURITY_WARNINGS,
  AUDIT_NOTE,
}
