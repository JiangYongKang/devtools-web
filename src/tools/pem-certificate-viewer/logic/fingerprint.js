function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer)
  const hexChars = []
  for (let i = 0; i < bytes.length; i++) {
    hexChars.push(bytes[i].toString(16).padStart(2, '0'))
  }
  return hexChars.join('')
}

function stringToArrayBuffer(str) {
  const buf = new ArrayBuffer(str.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i) & 0xFF
  }
  return buf
}

function uint8ArrayToArrayBuffer(uint8Array) {
  return uint8Array.buffer.slice(
    uint8Array.byteOffset,
    uint8Array.byteOffset + uint8Array.byteLength
  )
}

const MD5 = (function () {
  function F(x, y, z) { return (x & y) | ((~x) & z) }
  function G(x, y, z) { return (x & z) | (y & (~z)) }
  function H(x, y, z) { return x ^ y ^ z }
  function I(x, y, z) { return y ^ (x | (~z)) }

  function rotateLeft(x, n) {
    return (x << n) | (x >>> (32 - n))
  }

  function FF(a, b, c, d, x, s, ac) {
    a = a + F(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  function GG(a, b, c, d, x, s, ac) {
    a = a + G(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  function HH(a, b, c, d, x, s, ac) {
    a = a + H(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  function II(a, b, c, d, x, s, ac) {
    a = a + I(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  function convertToWordArray(bytes) {
    const wordCount = ((bytes.length + 8) >>> 6) + 1
    const wordArray = new Array(wordCount * 16).fill(0)
    let bytePos = 0
    let bitPos = 0
    while (bytePos < bytes.length) {
      wordArray[bitPos >>> 5] |= (bytes[bytePos] & 0xFF) << (bitPos % 32)
      bytePos++
      bitPos += 8
    }
    wordArray[bitPos >>> 5] |= 0x80 << (bitPos % 32)
    wordArray[((wordCount * 16) - 2)] = bytes.length * 8
    return wordArray
  }

  function wordToHex(value) {
    let hex = ''
    for (let i = 0; i < 4; i++) {
      const byte = (value >>> (i * 8)) & 0xFF
      hex += byte.toString(16).padStart(2, '0')
    }
    return hex
  }

  return function (buffer) {
    const bytes = new Uint8Array(buffer)
    const x = convertToWordArray(bytes)

    let a = 0x67452301
    let b = 0xEFCDAB89
    let c = 0x98BADCFE
    let d = 0x10325476

    for (let k = 0; k < x.length; k += 16) {
      const AA = a
      const BB = b
      const CC = c
      const DD = d

      a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478)
      d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756)
      c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB)
      b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE)
      a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF)
      d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A)
      c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613)
      b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501)
      a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8)
      d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF)
      c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1)
      b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE)
      a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122)
      d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193)
      c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E)
      b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821)

      a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562)
      d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340)
      c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51)
      b = GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA)
      a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D)
      d = GG(d, a, b, c, x[k + 10], 9, 0x02441453)
      c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681)
      b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8)
      a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6)
      d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6)
      c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87)
      b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED)
      a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905)
      d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8)
      c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9)
      b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A)

      a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942)
      d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681)
      c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122)
      b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C)
      a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44)
      d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9)
      c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60)
      b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70)
      a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6)
      d = HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA)
      c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085)
      b = HH(b, c, d, a, x[k + 6], 23, 0x04881D05)
      a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039)
      d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5)
      c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8)
      b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665)

      a = II(a, b, c, d, x[k + 0], 6, 0xF4292244)
      d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97)
      c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7)
      b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039)
      a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3)
      d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92)
      c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D)
      b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1)
      a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F)
      d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0)
      c = II(c, d, a, b, x[k + 6], 15, 0xA3014314)
      b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1)
      a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82)
      d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235)
      c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB)
      b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391)

      a = a + AA
      b = b + BB
      c = c + CC
      d = d + DD
    }

    return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
  }
})()

async function computeFingerprints(bytes) {
  const buffer = uint8ArrayToArrayBuffer(bytes)

  const fingerprints = {
    md5: '',
    sha1: '',
    sha256: '',
  }

  try {
    fingerprints.md5 = MD5(buffer)
  } catch (e) {
    fingerprints.md5 = 'N/A'
  }

  if (crypto?.subtle) {
    try {
      const sha1Result = await crypto.subtle.digest('SHA-1', buffer)
      fingerprints.sha1 = arrayBufferToHex(sha1Result)
    } catch (e) {
      fingerprints.sha1 = 'N/A'
    }

    try {
      const sha256Result = await crypto.subtle.digest('SHA-256', buffer)
      fingerprints.sha256 = arrayBufferToHex(sha256Result)
    } catch (e) {
      fingerprints.sha256 = 'N/A'
    }
  } else {
    fingerprints.sha1 = 'N/A'
    fingerprints.sha256 = 'N/A'
  }

  return fingerprints
}

function formatFingerprint(hex, separator = ':') {
  if (!hex || hex === 'N/A') return hex

  const pairs = []
  for (let i = 0; i < hex.length; i += 2) {
    pairs.push(hex.substring(i, i + 2).toUpperCase())
  }

  return pairs.join(separator)
}

export {
  MD5,
  arrayBufferToHex,
  stringToArrayBuffer,
  uint8ArrayToArrayBuffer,
  computeFingerprints,
  formatFingerprint,
}
