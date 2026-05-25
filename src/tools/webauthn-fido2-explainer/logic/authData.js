/**
 * authData 解析函数
 * 解析 WebAuthn 认证器数据结构
 */

import { uint8ArrayToBase64Url, base64UrlToUint8Array } from './base64url.js'

/**
 * 从 Uint8Array 读取大端序 32 位无符号整数
 * @param {Uint8Array} bytes - 字节数组
 * @param {number} offset - 起始偏移量
 * @returns {number} 32 位无符号整数
 */
function readUint32BE(bytes, offset) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0
}

/**
 * 解析 authData 标志位
 * @param {number} flags - 标志字节
 * @returns {Object} 解析后的标志对象
 */
function parseFlags(flags) {
  return {
    userPresent: !!(flags & 0x01),
    reserved1: !!(flags & 0x02),
    userVerified: !!(flags & 0x04),
    reserved2: !!(flags & 0x08),
    reserved3: !!(flags & 0x10),
    reserved4: !!(flags & 0x20),
    attestedCredentialDataIncluded: !!(flags & 0x40),
    extensionDataIncluded: !!(flags & 0x80),
    raw: flags,
  }
}

/**
 * 获取标志位描述
 * @param {Object} flags - 解析后的标志对象
 * @returns {Array<string>} 标志描述数组
 */
function getFlagDescriptions(flags) {
  const descriptions = []
  if (flags.userPresent) descriptions.push('UP (user present)')
  if (flags.userVerified) descriptions.push('UV (user verified)')
  if (flags.attestedCredentialDataIncluded) descriptions.push('AT (has credential data)')
  if (flags.extensionDataIncluded) descriptions.push('ED (has extension data)')
  return descriptions
}

/**
 * 解析 COSE 公钥关键字段
 * @param {Object} coseKey - COSE 公钥对象
 * @returns {Object} 公钥摘要信息
 */
function parseCoseKeySummary(coseKey) {
  const kty = coseKey[1]
  const alg = coseKey[3]

  const ktyNames = {
    1: 'OKP (Octet Key Pair)',
    2: 'EC2 (Elliptic Curve)',
    3: 'RSA',
    4: 'Symmetric',
  }

  const algNames = {
    '-7': 'ES256 (ECDSA w/ SHA-256)',
    '-8': 'EdDSA',
    '-257': 'RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)',
    '-258': 'RS384',
    '-259': 'RS512',
    '-65535': 'RS1',
  }

  const result = {
    kty,
    ktyName: ktyNames[kty] || `未知 (${kty})`,
    alg,
    algName: algNames[alg] || `未知 (${alg})`,
  }

  if (kty === 2) {
    const crv = coseKey[-1]
    const crvNames = {
      1: 'P-256',
      2: 'P-384',
      3: 'P-521',
    }
    result.crv = crv
    result.crvName = crvNames[crv] || `未知 (${crv})`
    result.x = coseKey[-2] ? uint8ArrayToBase64Url(new Uint8Array(coseKey[-2])) : null
    result.y = coseKey[-3] ? uint8ArrayToBase64Url(new Uint8Array(coseKey[-3])) : null
  }

  if (kty === 1) {
    const crv = coseKey[-1]
    const crvNames = {
      4: 'X25519',
      5: 'X448',
      6: 'Ed25519',
      7: 'Ed448',
    }
    result.crv = crv
    result.crvName = crvNames[crv] || `未知 (${crv})`
    result.x = coseKey[-2] ? uint8ArrayToBase64Url(new Uint8Array(coseKey[-2])) : null
  }

  if (kty === 3) {
    result.n = coseKey[-1] ? uint8ArrayToBase64Url(new Uint8Array(coseKey[-1])) : null
    result.e = coseKey[-2] ? uint8ArrayToBase64Url(new Uint8Array(coseKey[-2])) : null
  }

  return result
}

/**
 * 简单的 CBOR 解码器（仅解析 authData 所需的结构）
 * @param {Uint8Array} bytes - CBOR 编码的字节数组
 * @param {number} offset - 起始偏移量
 * @returns {Object} 解析结果 { value, offset }
 */
function decodeCborSimple(bytes, offset = 0) {
  const firstByte = bytes[offset]
  offset++

  const majorType = (firstByte >> 5) & 0x07
  let additionalInfo = firstByte & 0x1f

  let length
  if (additionalInfo < 24) {
    length = additionalInfo
  } else if (additionalInfo === 24) {
    length = bytes[offset]
    offset += 1
  } else if (additionalInfo === 25) {
    length = (bytes[offset] << 8) | bytes[offset + 1]
    offset += 2
  } else if (additionalInfo === 26) {
    length = readUint32BE(bytes, offset)
    offset += 4
  } else {
    throw new Error(`不支持的 additionalInfo: ${additionalInfo}`)
  }

  switch (majorType) {
    case 0:
      return { value: length, offset }
    case 1:
      return { value: -1 - length, offset }
    case 2: {
      const value = bytes.slice(offset, offset + length)
      offset += length
      return { value, offset }
    }
    case 3: {
      const value = new TextDecoder('utf-8').decode(bytes.slice(offset, offset + length))
      offset += length
      return { value, offset }
    }
    case 4: {
      const array = []
      for (let i = 0; i < length; i++) {
        const result = decodeCborSimple(bytes, offset)
        array.push(result.value)
        offset = result.offset
      }
      return { value: array, offset }
    }
    case 5: {
      const map = {}
      for (let i = 0; i < length; i++) {
        const keyResult = decodeCborSimple(bytes, offset)
        offset = keyResult.offset
        const valueResult = decodeCborSimple(bytes, offset)
        offset = valueResult.offset
        map[keyResult.value] = valueResult.value
      }
      return { value: map, offset }
    }
    default:
      throw new Error(`不支持的 majorType: ${majorType}`)
  }
}

/**
 * 解析 authData
 * @param {string|Uint8Array} authDataInput - Base64URL 字符串或 Uint8Array
 * @returns {Object} 解析后的 authData 对象
 */
function parseAuthData(authDataInput) {
  let bytes
  if (typeof authDataInput === 'string') {
    bytes = base64UrlToUint8Array(authDataInput)
  } else if (authDataInput instanceof Uint8Array || (authDataInput && authDataInput.constructor && authDataInput.constructor.name === 'Uint8Array')) {
    bytes = authDataInput
  } else {
    throw new Error('authData must be Base64URL string or Uint8Array')
  }

  let offset = 0

  const rpIdHash = bytes.slice(offset, offset + 32)
  offset += 32

  const flagsByte = bytes[offset]
  offset += 1
  const flags = parseFlags(flagsByte)

  const signCount = readUint32BE(bytes, offset)
  offset += 4

  const result = {
    rpIdHash: uint8ArrayToBase64Url(rpIdHash),
    rpIdHashHex: Array.from(rpIdHash).map(b => b.toString(16).padStart(2, '0')).join(''),
    flags,
    flagDescriptions: getFlagDescriptions(flags),
    signCount,
    attestedCredentialData: null,
    extensions: null,
  }

  if (flags.attestedCredentialDataIncluded) {
    const aaguid = bytes.slice(offset, offset + 16)
    offset += 16

    const credentialIdLength = (bytes[offset] << 8) | bytes[offset + 1]
    offset += 2

    const credentialId = bytes.slice(offset, offset + credentialIdLength)
    offset += credentialIdLength

    const cborResult = decodeCborSimple(bytes, offset)
    const credentialPublicKey = cborResult.value
    offset = cborResult.offset

    result.attestedCredentialData = {
      aaguid: uint8ArrayToBase64Url(aaguid),
      aaguidHex: Array.from(aaguid).map(b => b.toString(16).padStart(2, '0')).join(''),
      credentialIdLength,
      credentialId: uint8ArrayToBase64Url(credentialId),
      credentialPublicKey: parseCoseKeySummary(credentialPublicKey),
    }
  }

  if (flags.extensionDataIncluded) {
    try {
      const extResult = decodeCborSimple(bytes, offset)
      result.extensions = extResult.value
    } catch {
      result.extensions = { error: '扩展数据解析失败' }
    }
  }

  return result
}

export {
  parseAuthData,
  parseFlags,
  getFlagDescriptions,
  parseCoseKeySummary,
  readUint32BE,
  decodeCborSimple,
}
