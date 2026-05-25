import { ERROR_CODES, createError, isAlgorithmSupported } from './errors.js'
import { base64UrlDecode } from './jwtParser.js'

async function verifyHmac(signingInput, signatureBytes, cryptoKey) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      success: false,
      error: createError(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(signingInput)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      data
    )
    return {
      success: true,
      isValid,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.SIGNATURE_VERIFICATION_FAILED, `HMAC 验证失败: ${e.message}`),
    }
  }
}

async function verifyRsa(signingInput, signatureBytes, cryptoKey) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      success: false,
      error: createError(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(signingInput)
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      data
    )
    return {
      success: true,
      isValid,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.SIGNATURE_VERIFICATION_FAILED, `RSA 验证失败: ${e.message}`),
    }
  }
}

async function verifyEcdsa(signingInput, signatureBytes, cryptoKey, subtleAlg) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      success: false,
      error: createError(ERROR_CODES.CRYPTO_NOT_AVAILABLE),
    }
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(signingInput)
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: subtleAlg?.hash || { name: 'SHA-256' },
      },
      cryptoKey,
      signatureBytes,
      data
    )
    return {
      success: true,
      isValid,
    }
  } catch (e) {
    return {
      success: false,
      error: createError(ERROR_CODES.SIGNATURE_VERIFICATION_FAILED, `ECDSA 验证失败: ${e.message}`),
    }
  }
}

async function verifySignature(signingInput, signatureSegment, cryptoKey, algorithm, subtleAlg) {
  const sigDecode = base64UrlDecode(signatureSegment)
  if (!sigDecode.success) {
    return {
      success: false,
      error: sigDecode.error,
    }
  }

  const signatureBytes = sigDecode.bytes
  const alg = algorithm?.toUpperCase() || ''

  if (!isAlgorithmSupported(alg)) {
    return {
      success: false,
      error: createError(ERROR_CODES.UNSUPPORTED_ALGORITHM, `不支持的算法: ${alg}`),
    }
  }

  let result
  if (alg.startsWith('HS')) {
    result = await verifyHmac(signingInput, signatureBytes, cryptoKey)
  } else if (alg.startsWith('RS')) {
    result = await verifyRsa(signingInput, signatureBytes, cryptoKey)
  } else if (alg.startsWith('ES')) {
    result = await verifyEcdsa(signingInput, signatureBytes, cryptoKey, subtleAlg)
  } else {
    return {
      success: false,
      error: createError(ERROR_CODES.UNSUPPORTED_ALGORITHM, `不支持的算法: ${alg}`),
    }
  }

  if (!result.success) {
    return result
  }

  return {
    success: true,
    isValid: result.isValid,
    algorithm: alg,
  }
}

function validateAlgorithm(headerAlg, selectedAlg) {
  const header = headerAlg?.toUpperCase() || ''
  const selected = selectedAlg?.toUpperCase() || ''

  if (!header && !selected) {
    return {
      success: false,
      error: createError(ERROR_CODES.ALGORITHM_MISMATCH, '未指定算法'),
    }
  }

  if (selected && header && header !== selected) {
    return {
      success: false,
      error: createError(ERROR_CODES.ALGORITHM_MISMATCH, `算法不匹配: JWT Header 声明 ${header}，选择 ${selected}`),
      headerAlg: header,
      selectedAlg: selected,
    }
  }

  return {
    success: true,
    algorithm: header || selected,
  }
}

export {
  verifyHmac,
  verifyRsa,
  verifyEcdsa,
  verifySignature,
  validateAlgorithm,
}
