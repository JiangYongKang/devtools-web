const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
const MIN_VERIFIER_LENGTH = 43
const MAX_VERIFIER_LENGTH = 128

function generateRandomString(length) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += PKCE_CHARSET[array[i] % PKCE_CHARSET.length]
  }
  return result
}

function generateCodeVerifier(length = 64) {
  const actualLength = Math.max(
    MIN_VERIFIER_LENGTH,
    Math.min(MAX_VERIFIER_LENGTH, length)
  )
  return generateRandomString(actualLength)
}

function isValidCodeVerifier(verifier) {
  if (typeof verifier !== 'string') return false
  if (verifier.length < MIN_VERIFIER_LENGTH) return false
  if (verifier.length > MAX_VERIFIER_LENGTH) return false
  for (let i = 0; i < verifier.length; i++) {
    if (!PKCE_CHARSET.includes(verifier[i])) return false
  }
  return true
}

async function sha256(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hash)
}

function base64UrlEncode(array) {
  let base64 = btoa(String.fromCharCode(...array))
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateCodeChallengeS256(verifier) {
  const hash = await sha256(verifier)
  return base64UrlEncode(hash)
}

function generateCodeChallengePlain(verifier) {
  return verifier
}

async function generateCodeChallenge(verifier, method = 'S256') {
  if (method === 'plain') {
    return {
      method: 'plain',
      challenge: generateCodeChallengePlain(verifier),
    }
  }
  return {
    method: 'S256',
    challenge: await generateCodeChallengeS256(verifier),
  }
}

function getCodeChallengeSteps(verifier) {
  return [
    {
      step: 1,
      title: '输入 code_verifier',
      description: '原始随机字符串',
      value: verifier,
    },
    {
      step: 2,
      title: 'SHA-256 哈希',
      description: '对 verifier 计算 SHA-256 哈希值',
      value: null,
      note: '需要异步计算',
    },
    {
      step: 3,
      title: 'Base64URL 编码',
      description:
        '将哈希结果进行 Base64 编码后转换为 URL 安全格式（替换 + 为 -，/ 为 _，去掉末尾 =）',
      value: null,
      note: '需要异步计算',
    },
  ]
}

async function computeCodeChallengeWithSteps(verifier) {
  const steps = getCodeChallengeSteps(verifier)

  const hash = await sha256(verifier)
  steps[1].value = Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const challenge = base64UrlEncode(hash)
  steps[2].value = challenge

  return {
    challenge,
    steps,
  }
}

export {
  PKCE_CHARSET,
  MIN_VERIFIER_LENGTH,
  MAX_VERIFIER_LENGTH,
  generateRandomString,
  generateCodeVerifier,
  isValidCodeVerifier,
  sha256,
  base64UrlEncode,
  generateCodeChallengeS256,
  generateCodeChallengePlain,
  generateCodeChallenge,
  getCodeChallengeSteps,
  computeCodeChallengeWithSteps,
}
