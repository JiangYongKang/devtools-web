import { PKCE, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export const generateRandomString = (length) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => PKCE_CHARSET[byte % PKCE_CHARSET.length]).join('')
}

export const generateCodeVerifier = () => {
  const length = Math.floor(
    Math.random() * (PKCE.CODE_VERIFIER_MAX_LENGTH - PKCE.CODE_VERIFIER_MIN_LENGTH + 1)
  ) + PKCE.CODE_VERIFIER_MIN_LENGTH
  return generateRandomString(length)
}

export const validateCodeVerifier = (codeVerifier) => {
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    return { valid: false, error: createError(ERROR_CODES.INVALID_CODE_VERIFIER) }
  }
  if (codeVerifier.length < PKCE.CODE_VERIFIER_MIN_LENGTH || codeVerifier.length > PKCE.CODE_VERIFIER_MAX_LENGTH) {
    return { valid: false, error: createError(ERROR_CODES.INVALID_CODE_VERIFIER) }
  }
  const validCharset = /^[A-Za-z0-9\-._~]+$/
  if (!validCharset.test(codeVerifier)) {
    return { valid: false, error: createError(ERROR_CODES.INVALID_CODE_VERIFIER) }
  }
  return { valid: true }
}

const base64UrlEncode = (arrayBuffer) => {
  const uint8Array = new Uint8Array(arrayBuffer)
  let base64 = btoa(String.fromCharCode.apply(null, uint8Array))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export const generateCodeChallenge = async (codeVerifier) => {
  const validation = validateCodeVerifier(codeVerifier)
  if (!validation.valid) {
    throw validation.error
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

export const verifyCodeChallenge = async (codeVerifier, codeChallenge) => {
  const expectedChallenge = await generateCodeChallenge(codeVerifier)
  return expectedChallenge === codeChallenge
}

export const createPkcePair = async () => {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: PKCE.DEFAULT_CODE_CHALLENGE_METHOD,
  }
}
