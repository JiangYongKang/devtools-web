import {
  PROVIDERS,
  ENCODINGS,
  MAX_BODY_SIZE_BYTES,
  TRUNCATE_PREVIEW_LENGTH,
  STEP_TYPES,
  ERROR_CODES,
} from './constants.js'
import { createError } from './errors.js'

function countUtf8Bytes(str) {
  const encoder = new TextEncoder()
  return encoder.encode(str).length
}

function truncatePreview(str, maxLength = TRUNCATE_PREVIEW_LENGTH) {
  if (str.length <= maxLength) {
    return { value: str, truncated: false }
  }
  return {
    value: str.substring(0, maxLength) + '...',
    truncated: true,
    originalLength: str.length,
  }
}

function formatBytesPreview(bytes, maxShow = 32) {
  const hexArray = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'))
  if (hexArray.length <= maxShow) {
    return {
      value: hexArray.join(' '),
      truncated: false,
      totalBytes: bytes.length,
    }
  }
  return {
    value: hexArray.slice(0, maxShow).join(' ') + ' ...',
    truncated: true,
    totalBytes: bytes.length,
    shownBytes: maxShow,
  }
}

function minifyJson(jsonStr) {
  try {
    return JSON.stringify(JSON.parse(jsonStr))
  } catch {
    return jsonStr
  }
}

function getBodyBytes(body) {
  const encoder = new TextEncoder()
  return encoder.encode(body)
}

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function computeHmacSha256(message, secret) {
  const encoder = new TextEncoder()
  const messageBytes = encoder.encode(message)
  const secretBytes = encoder.encode(secret)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes)
  return signature
}

function buildHmacSha256Steps(parts) {
  const { body, secret } = parts
  const bodyBytes = getBodyBytes(body)

  const steps = []

  steps.push({
    type: STEP_TYPES.RAW_BODY,
    title: '原始请求体 (Raw Body)',
    formula: 'body',
    valuePreview: truncatePreview(body),
    encoding: null,
    fullValue: body,
  })

  steps.push({
    type: STEP_TYPES.BODY_BYTES,
    title: 'UTF-8 字节表示',
    formula: 'UTF8_Encode(body)',
    valuePreview: formatBytesPreview(bodyBytes),
    encoding: null,
    byteCount: bodyBytes.length,
  })

  steps.push({
    type: STEP_TYPES.SIGNING_STRING,
    title: '签名字符串',
    formula: 'body',
    valuePreview: truncatePreview(body),
    encoding: null,
    fullValue: body,
  })

  steps.push({
    type: STEP_TYPES.HMAC_CALCULATION,
    title: 'HMAC-SHA256 计算',
    formula: 'HMAC_SHA256(secret, signing_string)',
    valuePreview: { value: '[执行后显示]' },
    encoding: null,
    needsCompute: true,
  })

  steps.push({
    type: STEP_TYPES.FINAL_SIGNATURE,
    title: '最终签名 (十六进制)',
    formula: 'Hex_Encode(hmac_result)',
    valuePreview: { value: '[执行后显示]' },
    encoding: ENCODINGS.HEX,
    needsCompute: true,
  })

  return steps
}

function buildStripeV1Steps(parts) {
  const { body, secret, timestamp } = parts
  const bodyBytes = getBodyBytes(body)
  const signingString = `${timestamp}.${body}`

  const steps = []

  steps.push({
    type: STEP_TYPES.TIMESTAMP,
    title: '时间戳 (t)',
    formula: 'timestamp',
    valuePreview: { value: timestamp },
    encoding: null,
    fullValue: timestamp,
  })

  steps.push({
    type: STEP_TYPES.RAW_BODY,
    title: '原始请求体 (Raw Body)',
    formula: 'body',
    valuePreview: truncatePreview(body),
    encoding: null,
    fullValue: body,
  })

  steps.push({
    type: STEP_TYPES.BODY_BYTES,
    title: 'UTF-8 字节表示',
    formula: 'UTF8_Encode(body)',
    valuePreview: formatBytesPreview(bodyBytes),
    encoding: null,
    byteCount: bodyBytes.length,
  })

  steps.push({
    type: STEP_TYPES.SIGNING_STRING,
    title: '签名字符串拼接',
    formula: 'timestamp + "." + body',
    valuePreview: truncatePreview(signingString),
    encoding: null,
    fullValue: signingString,
  })

  steps.push({
    type: STEP_TYPES.HMAC_CALCULATION,
    title: 'HMAC-SHA256 计算',
    formula: 'HMAC_SHA256(secret, signing_string)',
    valuePreview: { value: '[执行后显示]' },
    encoding: null,
    needsCompute: true,
  })

  steps.push({
    type: STEP_TYPES.FINAL_SIGNATURE,
    title: '最终签名头格式',
    formula: '"t=" + timestamp + ",v1=" + Hex_Encode(hmac_result)',
    valuePreview: { value: '[执行后显示]' },
    encoding: ENCODINGS.HEX,
    needsCompute: true,
  })

  return steps
}

function buildGithubSha256Steps(parts) {
  const { body, secret } = parts
  const bodyBytes = getBodyBytes(body)

  const steps = []

  steps.push({
    type: STEP_TYPES.RAW_BODY,
    title: '原始请求体 (Raw Body)',
    formula: 'body',
    valuePreview: truncatePreview(body),
    encoding: null,
    fullValue: body,
  })

  steps.push({
    type: STEP_TYPES.BODY_BYTES,
    title: 'UTF-8 字节表示',
    formula: 'UTF8_Encode(body)',
    valuePreview: formatBytesPreview(bodyBytes),
    encoding: null,
    byteCount: bodyBytes.length,
  })

  steps.push({
    type: STEP_TYPES.SIGNING_STRING,
    title: '签名字符串',
    formula: 'body',
    valuePreview: truncatePreview(body),
    encoding: null,
    fullValue: body,
  })

  steps.push({
    type: STEP_TYPES.HMAC_CALCULATION,
    title: 'HMAC-SHA256 计算',
    formula: 'HMAC_SHA256(secret, signing_string)',
    valuePreview: { value: '[执行后显示]' },
    encoding: null,
    needsCompute: true,
  })

  steps.push({
    type: STEP_TYPES.FINAL_SIGNATURE,
    title: '最终签名头格式',
    formula: '"sha256=" + Hex_Encode(hmac_result)',
    valuePreview: { value: '[执行后显示]' },
    encoding: ENCODINGS.HEX,
    needsCompute: true,
  })

  return steps
}

function buildWebhookSignatureSteps(provider, parts) {
  const { body, secret } = parts

  const bodySize = countUtf8Bytes(body)
  if (bodySize > MAX_BODY_SIZE_BYTES) {
    throw createError(ERROR_CODES.BODY_TOO_LARGE, {
      maxSize: MAX_BODY_SIZE_BYTES,
      actualSize: bodySize,
    })
  }

  if (!secret) {
    throw createError(ERROR_CODES.MISSING_SECRET)
  }

  switch (provider) {
    case PROVIDERS.HMAC_SHA256:
      return buildHmacSha256Steps(parts)

    case PROVIDERS.STRIPE_V1:
      if (!parts.timestamp) {
        throw createError(ERROR_CODES.MISSING_TIMESTAMP)
      }
      return buildStripeV1Steps(parts)

    case PROVIDERS.GITHUB_SHA256:
      return buildGithubSha256Steps(parts)

    default:
      throw createError(ERROR_CODES.INVALID_PROVIDER, { provider })
  }
}

async function computeSignatureValues(steps, provider, parts) {
  const { body, secret, timestamp } = parts

  let signingString
  switch (provider) {
    case PROVIDERS.STRIPE_V1:
      signingString = `${timestamp}.${body}`
      break
    case PROVIDERS.HMAC_SHA256:
    case PROVIDERS.GITHUB_SHA256:
    default:
      signingString = body
  }

  const hmacResult = await computeHmacSha256(signingString, secret)
  const hexSignature = arrayBufferToHex(hmacResult)

  return steps.map((step) => {
    if (!step.needsCompute) return step

    if (step.type === STEP_TYPES.HMAC_CALCULATION) {
      return {
        ...step,
        valuePreview: formatBytesPreview(new Uint8Array(hmacResult)),
      }
    }

    if (step.type === STEP_TYPES.FINAL_SIGNATURE) {
      let finalValue
      switch (provider) {
        case PROVIDERS.STRIPE_V1:
          finalValue = `t=${timestamp},v1=${hexSignature}`
          break
        case PROVIDERS.GITHUB_SHA256:
          finalValue = `sha256=${hexSignature}`
          break
        default:
          finalValue = hexSignature
      }
      return {
        ...step,
        valuePreview: { value: finalValue },
        fullValue: finalValue,
      }
    }

    return step
  })
}

function isWebCryptoSupported() {
  return typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
}

export {
  countUtf8Bytes,
  truncatePreview,
  formatBytesPreview,
  minifyJson,
  getBodyBytes,
  arrayBufferToHex,
  arrayBufferToBase64,
  computeHmacSha256,
  buildHmacSha256Steps,
  buildStripeV1Steps,
  buildGithubSha256Steps,
  buildWebhookSignatureSteps,
  computeSignatureValues,
  isWebCryptoSupported,
}
