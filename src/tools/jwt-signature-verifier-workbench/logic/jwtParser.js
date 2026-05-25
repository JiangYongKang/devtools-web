import { ERROR_CODES, createError } from './errors.js'

function base64UrlDecode(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) {
      if (pad === 1) {
        throw new Error('Invalid base64url string')
      }
      base64 += new Array(5 - pad).join('=')
    }
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const decoder = new TextDecoder('utf-8')
    return {
      success: true,
      text: decoder.decode(bytes),
      bytes,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.BASE64URL_DECODE_ERROR, `Base64URL 解码失败: ${e.message}`),
    }
  }
}

function base64UrlEncode(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function parseJsonSegment(text, segmentName) {
  try {
    return {
      success: true,
      data: JSON.parse(text),
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_JSON, `${segmentName} JSON 解析失败: ${e.message}`),
    }
  }
}

function splitJwt(jwt) {
  if (jwt == null) {
    return { success: false, error: createError(ERROR_CODES.NULL_INPUT) }
  }
  const trimmed = String(jwt).trim()
  if (trimmed === '') {
    return { success: false, error: createError(ERROR_CODES.EMPTY_VALUE) }
  }
  const segments = trimmed.split('.')
  if (segments.length !== 3) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_SEGMENT_COUNT, `JWT 包含 ${segments.length} 段，应为 3 段`),
      segmentCount: segments.length,
    }
  }
  return {
    success: true,
    headerSegment: segments[0],
    payloadSegment: segments[1],
    signatureSegment: segments[2],
    signingInput: `${segments[0]}.${segments[1]}`,
  }
}

function parseJwt(jwt) {
  const splitResult = splitJwt(jwt)
  if (!splitResult.success) {
    return {
      success: false,
      ...splitResult.error,
      parsed: null,
    }
  }

  const { headerSegment, payloadSegment, signatureSegment, signingInput } = splitResult

  const headerDecode = base64UrlDecode(headerSegment)
  const payloadDecode = base64UrlDecode(payloadSegment)
  const signatureBytes = base64UrlDecode(signatureSegment)

  const segments = [
    {
      index: 0,
      name: 'Header',
      raw: headerSegment,
      decoded: headerDecode.success ? headerDecode.text : null,
      bytes: headerDecode.success ? headerDecode.bytes : null,
      decodeError: headerDecode.success ? null : headerDecode.error,
      json: null,
      jsonError: null,
    },
    {
      index: 1,
      name: 'Payload',
      raw: payloadSegment,
      decoded: payloadDecode.success ? payloadDecode.text : null,
      bytes: payloadDecode.success ? payloadDecode.bytes : null,
      decodeError: payloadDecode.success ? null : payloadDecode.error,
      json: null,
      jsonError: null,
    },
    {
      index: 2,
      name: 'Signature',
      raw: signatureSegment,
      bytes: signatureBytes.success ? signatureBytes.bytes : null,
      decodeError: signatureBytes.success ? null : signatureBytes.error,
    },
  ]

  if (headerDecode.success) {
    const jsonResult = parseJsonSegment(headerDecode.text, 'Header')
    if (jsonResult.success) {
      segments[0].json = jsonResult.data
    } else {
      segments[0].jsonError = jsonResult.error
    }
  }

  if (payloadDecode.success) {
    const jsonResult = parseJsonSegment(payloadDecode.text, 'Payload')
    if (jsonResult.success) {
      segments[1].json = jsonResult.data
    } else {
      segments[1].jsonError = jsonResult.error
    }
  }

  const hasErrors = segments.some(s => s.decodeError || s.jsonError)

  return {
    success: !hasErrors,
    errorCode: hasErrors ? (segments.find(s => s.decodeError || s.jsonError)?.decodeError?.errorCode || segments.find(s => s.jsonError)?.jsonError?.errorCode) : null,
    errorMessage: hasErrors ? (segments.find(s => s.decodeError || s.jsonError)?.decodeError?.errorMessage || segments.find(s => s.jsonError)?.jsonError?.errorMessage) : null,
    parsed: {
      segments,
      signingInput,
      header: segments[0].json,
      payload: segments[1].json,
      signatureBytes: segments[2].bytes,
    },
  }
}

function formatJson(obj, indent = 2) {
  return JSON.stringify(obj, null, indent)
}

export {
  base64UrlDecode,
  base64UrlEncode,
  parseJsonSegment,
  splitJwt,
  parseJwt,
  formatJson,
}
