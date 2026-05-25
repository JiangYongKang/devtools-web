import { createError, ERROR_CODES } from './errors.js'
import { WEAK_PARAMETER_THRESHOLDS } from './constants.js'

function ROTL(a, b) {
  return (a << b) | (a >>> (32 - b))
}

function salsa208Words(B, i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11, i12, i13, i14, i15) {
  let x0 = B[i0], x1 = B[i1], x2 = B[i2], x3 = B[i3]
  let x4 = B[i4], x5 = B[i5], x6 = B[i6], x7 = B[i7]
  let x8 = B[i8], x9 = B[i9], x10 = B[i10], x11 = B[i11]
  let x12 = B[i12], x13 = B[i13], x14 = B[i14], x15 = B[i15]

  for (let i = 0; i < 8; i += 2) {
    x4 ^= ROTL(x0 + x12, 7); x8 ^= ROTL(x4 + x0, 9); x12 ^= ROTL(x8 + x4, 13); x0 ^= ROTL(x12 + x8, 18)
    x9 ^= ROTL(x5 + x1, 7); x13 ^= ROTL(x9 + x5, 9); x1 ^= ROTL(x13 + x9, 13); x5 ^= ROTL(x1 + x13, 18)
    x14 ^= ROTL(x10 + x6, 7); x2 ^= ROTL(x14 + x10, 9); x6 ^= ROTL(x2 + x14, 13); x10 ^= ROTL(x6 + x2, 18)
    x3 ^= ROTL(x15 + x11, 7); x7 ^= ROTL(x3 + x15, 9); x11 ^= ROTL(x7 + x3, 13); x15 ^= ROTL(x11 + x7, 18)

    x1 ^= ROTL(x0 + x3, 7); x2 ^= ROTL(x1 + x0, 9); x3 ^= ROTL(x2 + x1, 13); x0 ^= ROTL(x3 + x2, 18)
    x6 ^= ROTL(x5 + x4, 7); x7 ^= ROTL(x6 + x5, 9); x4 ^= ROTL(x7 + x6, 13); x5 ^= ROTL(x4 + x7, 18)
    x11 ^= ROTL(x10 + x9, 7); x8 ^= ROTL(x11 + x10, 9); x9 ^= ROTL(x8 + x11, 13); x10 ^= ROTL(x9 + x8, 18)
    x12 ^= ROTL(x15 + x14, 7); x13 ^= ROTL(x12 + x15, 9); x14 ^= ROTL(x13 + x12, 13); x15 ^= ROTL(x14 + x13, 18)
  }

  B[i0] += x0; B[i1] += x1; B[i2] += x2; B[i3] += x3
  B[i4] += x4; B[i5] += x5; B[i6] += x6; B[i7] += x7
  B[i8] += x8; B[i9] += x9; B[i10] += x10; B[i11] += x11
  B[i12] += x12; B[i13] += x13; B[i14] += x14; B[i15] += x15
}

function blockMix(B, r) {
  const X = B.slice((2 * r - 1) * 16, (2 * r - 1) * 16 + 16)

  for (let i = 0; i < 2 * r; i++) {
    for (let j = 0; j < 16; j++) {
      X[j] ^= B[i * 16 + j]
    }
    salsa208Words(X, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)

    const idx = i % 2 === 0 ? (i / 2) * 16 : r * 16 + ((i - 1) / 2) * 16
    for (let j = 0; j < 16; j++) {
      B[idx + j] = X[j]
    }
  }
}

function integerify(B, r) {
  const idx = (2 * r - 1) * 64
  return B[idx] | (B[idx + 1] << 8) | (B[idx + 2] << 16) | (B[idx + 3] << 24) >>> 0
}

async function pbkdf2HmacSha256(password, salt, iterations, dkLen) {
  const encoder = new TextEncoder()
  const passwordBytes = typeof password === 'string' ? encoder.encode(password) : password
  const saltBytes = typeof salt === 'string' ? encoder.encode(salt) : salt

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    dkLen * 8
  )

  return new Uint8Array(derivedBits)
}

function validateScryptParams(params) {
  const { password, salt, N, r, p, keyLength } = params

  if (password == null) {
    return { valid: false, ...createError(ERROR_CODES.NULL_INPUT) }
  }

  if (typeof password === 'string' && password === '') {
    return { valid: false, ...createError(ERROR_CODES.EMPTY_PASSWORD) }
  }

  if (salt == null || (ArrayBuffer.isView(salt) && salt.length === 0)) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SALT) }
  }

  if (!Number.isInteger(N) || N <= 1 || (N & (N - 1)) !== 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SCRYPT_PARAMS, 'N 必须是大于 1 的 2 的幂') }
  }

  if (!Number.isInteger(r) || r <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SCRYPT_PARAMS, 'r 必须是正整数') }
  }

  if (!Number.isInteger(p) || p <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SCRYPT_PARAMS, 'p 必须是正整数') }
  }

  if (r * p >= (1 << 30)) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_SCRYPT_PARAMS, 'r * p 必须小于 2^30') }
  }

  if (!Number.isInteger(keyLength) || keyLength <= 0) {
    return { valid: false, ...createError(ERROR_CODES.INVALID_KEY_LENGTH) }
  }

  return { valid: true }
}

function checkWeakScryptParams(params) {
  const { N, r } = params
  const warnings = []
  const threshold = WEAK_PARAMETER_THRESHOLDS.SCRYPT

  if (N < threshold.minN) {
    warnings.push({
      type: 'weak_n',
      message: threshold.warning,
      current: N,
      recommended: threshold.minN,
    })
  }

  if (r < threshold.minR) {
    warnings.push({
      type: 'weak_r',
      message: '块大小 r 较小，建议至少为 8',
      current: r,
      recommended: threshold.minR,
    })
  }

  return warnings
}

async function scryptROMix(B, r, N) {
  const X = new Uint32Array(B.buffer)
  const V = new Uint32Array(N * 32 * r)

  for (let i = 0; i < N; i++) {
    V.set(X, i * 32 * r)
    blockMix(X, r)
  }

  for (let i = 0; i < N; i++) {
    const j = integerify(new Uint8Array(X.buffer), r) & (N - 1)
    for (let k = 0; k < 32 * r; k++) {
      X[k] ^= V[j * 32 * r + k]
    }
    blockMix(X, r)
  }
}

async function deriveKeyScrypt(params) {
  const { password, salt, N, r, p, keyLength } = params

  const validation = validateScryptParams(params)
  if (!validation.valid) {
    return {
      derivedKey: null,
      params: { N, r, p, keyLength },
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    }
  }

  const warnings = checkWeakScryptParams(params)

  try {
    const encoder = new TextEncoder()
    const passwordBytes = typeof password === 'string' ? encoder.encode(password) : password
    const saltBytes = ArrayBuffer.isView(salt) ? salt : encoder.encode(salt)

    const maxMemory = N * r * 128 * p
    if (maxMemory > 1024 * 1024 * 1024) {
      return {
        derivedKey: null,
        params: { N, r, p, keyLength },
        errorCode: ERROR_CODES.DERIVATION_FAILED,
        errorMessage: `内存需求过大 (${(maxMemory / 1024 / 1024).toFixed(2)} MB)，可能导致浏览器崩溃`,
      }
    }

    const dkLen = p * 128 * r
    const dk = await pbkdf2HmacSha256(passwordBytes, saltBytes, 1, dkLen)

    for (let i = 0; i < p; i++) {
      const blockOffset = i * 128 * r
      const blockData = new Uint8Array(dk.slice(blockOffset, blockOffset + 128 * r))
      const block32 = new Uint32Array(blockData.buffer)

      await scryptROMix(blockData, r, N)

      for (let j = 0; j < block32.length; j++) {
        new Uint32Array(dk.buffer, blockOffset + j * 4, 1)[0] = block32[j]
      }
    }

    const finalKey = await pbkdf2HmacSha256(passwordBytes, dk, 1, keyLength)

    return {
      derivedKey: finalKey,
      params: { N, r, p, keyLength },
      warnings,
      errorCode: null,
      errorMessage: null,
    }
  } catch (error) {
    return {
      derivedKey: null,
      params: { N, r, p, keyLength },
      errorCode: ERROR_CODES.DERIVATION_FAILED,
      errorMessage: `scrypt 派生失败: ${error.message}`,
    }
  }
}

export {
  validateScryptParams,
  checkWeakScryptParams,
  deriveKeyScrypt,
}
