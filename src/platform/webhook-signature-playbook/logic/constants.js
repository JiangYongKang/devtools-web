const PROVIDERS = {
  HMAC_SHA256: 'hmac-sha256',
  STRIPE_V1: 'stripe-v1',
  GITHUB_SHA256: 'github-sha256',
}

const ENCODINGS = {
  HEX: 'hex',
  BASE64: 'base64',
}

const EXAMPLES = {
  'stripe-v1': {
    label: 'Stripe 签名示例',
    body: JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded', created: 1620000000 }, null, 2),
    secret: 'whsec_test_secret_1234567890',
    timestamp: '1620000000',
    signatureHeader: 't=1620000000,v1=a1b2c3d4e5f6',
  },
  'github-sha256': {
    label: 'GitHub 签名示例',
    body: JSON.stringify({ action: 'push', ref: 'refs/heads/main', repository: { name: 'test' } }, null, 2),
    secret: 'github_secret_123456',
    signatureHeader: 'sha256=abcdef1234567890',
  },
  'hmac-sha256': {
    label: '通用 HMAC-SHA256 示例',
    body: JSON.stringify({ event: 'test', data: { foo: 'bar' } }, null, 2),
    secret: 'my_test_secret_key',
    signatureHeader: 'abcdef1234567890',
  },
}

const MAX_BODY_SIZE_BYTES = 512 * 1024

const TRUNCATE_PREVIEW_LENGTH = 100

const STEP_TYPES = {
  RAW_BODY: 'raw-body',
  BODY_BYTES: 'body-bytes',
  TIMESTAMP: 'timestamp',
  SIGNING_STRING: 'signing-string',
  HMAC_CALCULATION: 'hmac-calculation',
  FINAL_SIGNATURE: 'final-signature',
}

const ERROR_CODES = {
  BODY_TOO_LARGE: 'BODY_TOO_LARGE',
  MISSING_SECRET: 'MISSING_SECRET',
  MISSING_TIMESTAMP: 'MISSING_TIMESTAMP',
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  CRYPTO_NOT_SUPPORTED: 'CRYPTO_NOT_SUPPORTED',
}

export {
  PROVIDERS,
  ENCODINGS,
  EXAMPLES,
  MAX_BODY_SIZE_BYTES,
  TRUNCATE_PREVIEW_LENGTH,
  STEP_TYPES,
  ERROR_CODES,
}
