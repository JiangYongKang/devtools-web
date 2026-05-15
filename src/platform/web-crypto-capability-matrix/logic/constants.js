const SUPPORT_STATUS = {
  FULL: 'supported',
  PARTIAL: 'partial',
  NOT_SUPPORTED: 'not_supported',
  UNKNOWN: 'unknown',
}

const ERROR_CODES = {
  NOT_SUPPORTED_ERROR: 'NotSupportedError',
  INVALID_ACCESS_ERROR: 'InvalidAccessError',
  SYNTAX_ERROR: 'SyntaxError',
  DATA_ERROR: 'DataError',
  OPERATION_ERROR: 'OperationError',
  SECURITY_ERROR: 'SecurityError',
  ABORT_ERROR: 'AbortError',
  TYPE_ERROR: 'TypeError',
  UNKNOWN_ERROR: 'UnknownError',
  INSECURE_CONTEXT: 'InsecureContext',
  WORKER_NOT_SUPPORTED: 'WorkerNotSupported',
}

const ALGORITHMS = {
  RSA_OAEP: 'RSA-OAEP',
  RSA_PSS: 'RSA-PSS',
  RSA_SSA_PKCS1_v1_5: 'RSASSA-PKCS1-v1_5',
  ECDSA: 'ECDSA',
  ECDH: 'ECDH',
  AES_CTR: 'AES-CTR',
  AES_CBC: 'AES-CBC',
  AES_GCM: 'AES-GCM',
  AES_KW: 'AES-KW',
  HMAC: 'HMAC',
  HKDF: 'HKDF',
  PBKDF2: 'PBKDF2',
  SHA_1: 'SHA-1',
  SHA_256: 'SHA-256',
  SHA_384: 'SHA-384',
  SHA_512: 'SHA-512',
}

const API_OPERATIONS = [
  'digest',
  'generateKey',
  'deriveKey',
  'deriveBits',
  'encrypt',
  'decrypt',
  'sign',
  'verify',
  'importKey',
  'exportKey',
  'wrapKey',
  'unwrapKey',
]

const ENV_SCENARIOS = {
  SECURE_LOCALHOST: 'secure_localhost',
  SECURE_PUBLIC: 'secure_public',
  INSECURE_HTTP: 'insecure_http',
  INSECURE_FILE: 'insecure_file',
  MIXED_CONTENT: 'mixed_content',
  IFRAME_WITHOUT_CRYPTO_KEY: 'iframe_without_crypto_key',
}

const DEFAULT_OPTIONS = {
  timeout: 30000,
  skipHeavyOperations: false,
  rsaKeySize: 2048,
  includeWorkerProbe: true,
  maxIterations: 100,
  maxBytes: 1024 * 1024,
}

const SCHEMA_VERSION = '1.0.0'

export {
  SUPPORT_STATUS,
  ERROR_CODES,
  ALGORITHMS,
  API_OPERATIONS,
  ENV_SCENARIOS,
  DEFAULT_OPTIONS,
  SCHEMA_VERSION,
}
