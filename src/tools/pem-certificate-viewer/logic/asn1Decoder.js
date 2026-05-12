const ASN1_TAG = {
  BOOLEAN: 0x01,
  INTEGER: 0x02,
  BIT_STRING: 0x03,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OBJECT_IDENTIFIER: 0x06,
  SEQUENCE: 0x30,
  SET: 0x31,
  PRINTABLE_STRING: 0x13,
  T61_STRING: 0x14,
  IA5_STRING: 0x16,
  UTCTime: 0x17,
  GeneralizedTime: 0x18,
  UTF8String: 0x0C,
  BMPString: 0x1E,
  ContextSpecific: 0xA0,
}

const OID_NAMES = {
  '1.2.840.113549.1.1.1': 'RSA Encryption',
  '1.2.840.113549.1.1.2': 'MD2 with RSA',
  '1.2.840.113549.1.1.3': 'MD4 with RSA',
  '1.2.840.113549.1.1.4': 'MD5 with RSA',
  '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
  '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
  '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.113549.1.1.14': 'SHA-224 with RSA',
  '1.2.840.10045.2.1': 'Elliptic Curve',
  '1.2.840.10045.4.3.2': 'SHA-256 with ECDSA',
  '1.2.840.10045.4.3.3': 'SHA-384 with ECDSA',
  '1.2.840.10045.4.3.4': 'SHA-512 with ECDSA',
  '1.3.14.3.2.26': 'SHA-1',
  '2.16.840.1.101.3.4.2.1': 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512',
  '2.16.840.1.101.3.4.2.4': 'SHA-224',
  '1.3.14.3.2.29': 'SHA-1 with RSA',
  '2.5.4.3': 'Common Name',
  '2.5.4.5': 'Serial Number',
  '2.5.4.6': 'Country Name',
  '2.5.4.7': 'Locality Name',
  '2.5.4.8': 'State or Province Name',
  '2.5.4.9': 'Street Address',
  '2.5.4.10': 'Organization Name',
  '2.5.4.11': 'Organizational Unit Name',
  '2.5.4.12': 'Title',
  '2.5.4.13': 'Description',
  '2.5.4.15': 'Business Category',
  '2.5.4.16': 'Postal Address',
  '2.5.4.17': 'Postal Code',
  '2.5.4.18': 'Post Office Box',
  '2.5.4.20': 'Telephone Number',
  '2.5.4.42': 'Given Name',
  '2.5.4.43': 'Initials',
  '2.5.4.44': 'Generation Qualifier',
  '2.5.4.45': 'Unique Identifier',
  '2.5.4.46': 'Distinguished Name Qualifier',
  '2.5.4.48': 'Organization Identifier',
  '2.5.4.65': 'Pseudonym',
  '2.5.4.97': 'Organization Identifier',
  '2.5.29.14': 'Subject Key Identifier',
  '2.5.29.15': 'Key Usage',
  '2.5.29.17': 'Subject Alternative Name',
  '2.5.29.18': 'Issuer Alternative Name',
  '2.5.29.19': 'Basic Constraints',
  '2.5.29.20': 'CRL Number',
  '2.5.29.21': 'CRL Reason',
  '2.5.29.23': 'Issuing Distribution Point',
  '2.5.29.24': 'Invalidity Date',
  '2.5.29.27': 'Delta CRL Indicator',
  '2.5.29.28': 'Issuer Distribution Point',
  '2.5.29.30': 'Certificate Policies',
  '2.5.29.31': 'CRL Distribution Points',
  '2.5.29.32': 'Certificate Policies',
  '2.5.29.35': 'Authority Key Identifier',
  '2.5.29.37': 'Extended Key Usage',
  '2.5.29.38': 'Authority Constraints',
  '2.5.29.46': 'Freshest CRL',
  '2.5.29.54': 'Inhibit Any Policy',
  '2.5.29.55': 'Delta CRL Indicator',
  '1.3.6.1.5.5.7.1.1': 'Authority Information Access',
  '1.3.6.1.5.5.7.3.1': 'Server Authentication',
  '1.3.6.1.5.5.7.3.2': 'Client Authentication',
  '1.3.6.1.5.5.7.3.3': 'Code Signing',
  '1.3.6.1.5.5.7.3.4': 'Email Protection',
  '1.3.6.1.5.5.7.3.5': 'IPsec End System',
  '1.3.6.1.5.5.7.3.6': 'IPsec Tunnel',
  '1.3.6.1.5.5.7.3.7': 'IPsec User',
  '1.3.6.1.5.5.7.3.8': 'Time Stamping',
  '1.3.6.1.5.5.7.3.9': 'OCSP Signing',
  '1.3.6.1.5.5.7.48.1': 'OCSP',
  '1.3.6.1.5.5.7.48.2': 'CA Issuers',
}

const ECDSA_CURVE_NAMES = {
  '1.2.840.10045.3.1.1': 'prime192v1',
  '1.2.840.10045.3.1.2': 'prime192v2',
  '1.2.840.10045.3.1.3': 'prime192v3',
  '1.2.840.10045.3.1.4': 'prime239v1',
  '1.2.840.10045.3.1.5': 'prime239v2',
  '1.2.840.10045.3.1.6': 'prime239v3',
  '1.2.840.10045.3.1.7': 'prime256v1',
  '1.3.132.0.1': 'sect163k1',
  '1.3.132.0.15': 'sect283r1',
  '1.3.132.0.16': 'sect409k1',
  '1.3.132.0.17': 'sect409r1',
  '1.3.132.0.2': 'sect163r2',
  '1.3.132.0.26': 'sect571k1',
  '1.3.132.0.27': 'sect571r1',
  '1.3.132.0.3': 'sect193r1',
  '1.3.132.0.4': 'sect193r2',
  '1.3.132.0.5': 'sect233k1',
  '1.3.132.0.6': 'sect233r1',
  '1.3.132.0.8': 'secp192k1',
  '1.3.132.0.9': 'secp224k1',
  '1.3.132.0.10': 'secp224r1',
  '1.3.132.0.11': 'secp256k1',
  '1.3.132.0.12': 'secp384r1',
  '1.3.132.0.13': 'secp521r1',
  '1.3.132.0.14': 'sect283k1',
}

function readLength(bytes, offset) {
  const firstByte = bytes[offset]
  if ((firstByte & 0x80) === 0) {
    return { length: firstByte, bytesRead: 1 }
  }

  const lengthBytes = firstByte & 0x7F
  if (lengthBytes === 0) {
    return { length: 0, bytesRead: 1, indefinite: true }
  }

  let length = 0
  for (let i = 0; i < lengthBytes; i++) {
    length = (length << 8) | bytes[offset + 1 + i]
  }

  return { length, bytesRead: lengthBytes + 1 }
}

function parseObjectIdentifier(bytes, start, length) {
  const result = []
  const firstByte = bytes[start]
  result.push(Math.floor(firstByte / 40))
  result.push(firstByte % 40)

  let value = 0
  for (let i = 1; i < length; i++) {
    const byte = bytes[start + i]
    value = (value << 7) | (byte & 0x7F)
    if ((byte & 0x80) === 0) {
      result.push(value)
      value = 0
    }
  }

  return result.join('.')
}

function parseUTCTime(bytes, start, length) {
  const str = String.fromCharCode.apply(null, bytes.slice(start, start + length))
  let year, month, day, hour, minute, second

  if (str.length >= 10) {
    year = parseInt(str.substring(0, 2), 10)
    month = parseInt(str.substring(2, 4), 10)
    day = parseInt(str.substring(4, 6), 10)
    hour = parseInt(str.substring(6, 8), 10)
    minute = parseInt(str.substring(8, 10), 10)
    second = str.length >= 12 ? parseInt(str.substring(10, 12), 10) : 0

    if (year < 50) {
      year += 2000
    } else {
      year += 1900
    }

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  }

  return null
}

function parseGeneralizedTime(bytes, start, length) {
  const str = String.fromCharCode.apply(null, bytes.slice(start, start + length))

  if (str.length >= 10) {
    const year = parseInt(str.substring(0, 4), 10)
    const month = parseInt(str.substring(4, 6), 10)
    const day = parseInt(str.substring(6, 8), 10)
    const hour = parseInt(str.substring(8, 10), 10)
    const minute = str.length >= 12 ? parseInt(str.substring(10, 12), 10) : 0
    const second = str.length >= 14 ? parseInt(str.substring(12, 14), 10) : 0

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  }

  return null
}

function parseString(bytes, start, length) {
  let result = ''
  try {
    result = String.fromCharCode.apply(null, bytes.slice(start, start + length))
  } catch (e) {
    result = '[Binary Data]'
  }
  return result
}

function parseUTF8String(bytes, start, length) {
  try {
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes.slice(start, start + length))
  } catch (e) {
    return parseString(bytes, start, length)
  }
}

function parseInteger(bytes, start, length) {
  let hex = ''
  for (let i = 0; i < length; i++) {
    hex += bytes[start + i].toString(16).padStart(2, '0')
  }
  return hex
}

function parseBitString(bytes, start, length) {
  if (length === 0) return { unused: 0, value: new Uint8Array() }

  const unusedBits = bytes[start]
  const data = bytes.slice(start + 1, start + length)

  return { unused: unusedBits, value: data }
}

function parseAsn1Node(bytes, offset = 0, maxDepth = 100) {
  if (maxDepth <= 0 || offset >= bytes.length) {
    return null
  }

  const tag = bytes[offset]
  const lengthInfo = readLength(bytes, offset + 1)
  const contentStart = offset + 1 + lengthInfo.bytesRead
  const contentEnd = contentStart + lengthInfo.length

  const result = {
    tag,
    tagClass: (tag & 0xC0) >> 6,
    tagConstructed: (tag & 0x20) !== 0,
    tagNumber: tag & 0x1F,
    start: offset,
    end: contentEnd,
    children: [],
  }

  if (result.tagConstructed && !lengthInfo.indefinite) {
    let childOffset = contentStart
    while (childOffset < contentEnd) {
      const child = parseAsn1Node(bytes, childOffset, maxDepth - 1)
      if (!child) break
      result.children.push(child)
      childOffset = child.end
    }
  }

  return result
}

function getNodeValue(bytes, node) {
  const contentStart = node.start + 1 + readLength(bytes, node.start + 1).bytesRead
  const length = node.end - contentStart

  if (node.tagClass === 2 && !node.tagConstructed) {
    return parseString(bytes, contentStart, length)
  }

  switch (node.tag) {
    case ASN1_TAG.BOOLEAN:
      return bytes[contentStart] !== 0x00
    case ASN1_TAG.INTEGER:
      return parseInteger(bytes, contentStart, length)
    case ASN1_TAG.BIT_STRING:
      return parseBitString(bytes, contentStart, length)
    case ASN1_TAG.OCTET_STRING:
      return bytes.slice(contentStart, node.end)
    case ASN1_TAG.NULL:
      return null
    case ASN1_TAG.OBJECT_IDENTIFIER:
      return parseObjectIdentifier(bytes, contentStart, length)
    case ASN1_TAG.PRINTABLE_STRING:
    case ASN1_TAG.T61_STRING:
    case ASN1_TAG.IA5_STRING:
      return parseString(bytes, contentStart, length)
    case ASN1_TAG.UTF8String:
      return parseUTF8String(bytes, contentStart, length)
    case ASN1_TAG.UTCTime:
      return parseUTCTime(bytes, contentStart, length)
    case ASN1_TAG.GeneralizedTime:
      return parseGeneralizedTime(bytes, contentStart, length)
    case ASN1_TAG.BMPString:
      let result = ''
      for (let i = 0; i < length; i += 2) {
        result += String.fromCharCode((bytes[contentStart + i] << 8) | bytes[contentStart + i + 1])
      }
      return result
    default:
      return bytes.slice(contentStart, node.end)
  }
}

function getOidName(oid) {
  return OID_NAMES[oid] || oid
}

function getCurveName(oid) {
  return ECDSA_CURVE_NAMES[oid] || oid
}

export {
  ASN1_TAG,
  OID_NAMES,
  ECDSA_CURVE_NAMES,
  parseAsn1Node,
  getNodeValue,
  getOidName,
  getCurveName,
}
