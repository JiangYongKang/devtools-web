const STATE_LENGTH = 32
const NONCE_LENGTH = 32

function generateRandomState(length = STATE_LENGTH) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

function generateNonce(length = NONCE_LENGTH) {
  return generateRandomState(length)
}

function buildAuthorizationUrl(options) {
  const {
    authorizationEndpoint,
    clientId,
    redirectUri,
    scope,
    responseType = 'code',
    state,
    nonce,
    codeChallenge,
    codeChallengeMethod = 'S256',
    additionalParams = {},
  } = options

  const url = new URL(authorizationEndpoint)
  const params = new URLSearchParams()

  params.set('response_type', responseType)
  params.set('client_id', clientId)
  params.set('redirect_uri', redirectUri)

  if (scope) {
    params.set('scope', scope)
  }

  if (state) {
    params.set('state', state)
  }

  if (nonce) {
    params.set('nonce', nonce)
  }

  if (codeChallenge) {
    params.set('code_challenge', codeChallenge)
    params.set('code_challenge_method', codeChallengeMethod)
  }

  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  url.search = params.toString()

  const highlightedParams = Array.from(params.entries()).map(([key, value]) => ({
    key,
    value,
    isRequired: ['response_type', 'client_id', 'redirect_uri'].includes(key),
    isSecurity: ['state', 'nonce', 'code_challenge', 'code_challenge_method'].includes(key),
  }))

  return {
    url: url.toString(),
    baseUrl: `${url.protocol}//${url.host}${url.pathname}`,
    params: highlightedParams,
  }
}

function parseCallbackUrl(input) {
  let queryString = ''

  if (input.includes('?') || input.includes('#')) {
    try {
      const url = new URL(input)
      queryString = url.search.slice(1)
      if (!queryString && url.hash) {
        queryString = url.hash.replace(/^#/, '')
      }
    } catch {
      queryString = input.split('?')[1] || input.split('#')[1] || ''
    }
  } else {
    queryString = input
  }

  const params = new URLSearchParams(queryString)

  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  const errorDescription = params.get('error_description')

  const allParams = Array.from(params.entries()).map(([key, value]) => ({
    key,
    value,
  }))

  const hasError = error !== null
  const hasCode = code !== null && code !== ''

  let status = 'success'
  let statusMessage = '授权成功'

  if (hasError) {
    status = 'error'
    statusMessage = errorDescription || getErrorMessage(error)
  } else if (!hasCode) {
    status = 'warning'
    statusMessage = '回调中缺少 code 参数'
  }

  return {
    code,
    state,
    error,
    errorDescription,
    allParams,
    status,
    statusMessage,
    hasError,
    hasCode,
  }
}

function getErrorMessage(errorCode) {
  const errorMessages = {
    invalid_request: '请求无效，缺少必需参数或参数格式错误',
    unauthorized_client: '客户端未被授权使用此授权类型',
    access_denied: '用户拒绝了授权请求',
    unsupported_response_type: '不支持的响应类型',
    invalid_scope: '请求的 scope 无效、未知或格式错误',
    server_error: '授权服务器发生内部错误',
    temporarily_unavailable: '授权服务器暂时不可用',
  }
  return errorMessages[errorCode] || errorCode || '未知错误'
}

function compareStates(initiatedState, receivedState) {
  if (!initiatedState || !receivedState) {
    return {
      match: false,
      valid: false,
      message: '缺少 state 值，无法进行比对',
      severity: 'warning',
    }
  }

  const match = initiatedState === receivedState

  if (match) {
    return {
      match: true,
      valid: true,
      message: 'state 校验通过，请求来自合法授权服务器',
      severity: 'success',
    }
  }

  return {
    match: false,
    valid: false,
    message: 'state 不匹配，可能存在 CSRF 攻击风险',
    severity: 'error',
  }
}

function buildTokenRequestBody(options) {
  const {
    code,
    redirectUri,
    clientId,
    codeVerifier,
    grantType = 'authorization_code',
    clientSecret,
  } = options

  const params = new URLSearchParams()
  params.set('grant_type', grantType)
  params.set('code', code)
  params.set('redirect_uri', redirectUri)
  params.set('client_id', clientId)

  if (codeVerifier) {
    params.set('code_verifier', codeVerifier)
  }

  if (clientSecret) {
    params.set('client_secret', clientSecret)
  }

  return {
    body: params.toString(),
    contentType: 'application/x-www-form-urlencoded',
    params: Array.from(params.entries()).map(([key, value]) => ({
      key,
      value,
      isSensitive: ['code_verifier', 'client_secret'].includes(key),
    })),
  }
}

function buildTokenFetchTemplate(options) {
  const { tokenEndpoint, body, contentType, includeCredentials = false, headers = {} } = options

  const allHeaders = {
    'Content-Type': contentType,
    ...headers,
  }

  const headerLines = Object.entries(allHeaders)
    .map(([key, value]) => `    '${key}': '${value}'`)
    .join(',\n')

  const fetchTemplate = `const response = await fetch('${tokenEndpoint}', {
  method: 'POST',
  headers: {
${headerLines}
  },
  body: '${body.replace(/'/g, "\\'")}',
  ${includeCredentials ? "credentials: 'include'," : ''}
})

const data = await response.json()
console.log('Token response:', data)`

  const curlTemplate = `curl -X POST '${tokenEndpoint}' \\
  -H 'Content-Type: ${contentType}' \\
  -d '${body}'`

  const notes = [
    {
      type: 'warning',
      title: '仅用于演示',
      message: '此模板仅用于演示目的，实际 token 交换应在后端完成',
    },
    {
      type: 'info',
      title: 'Public Client (PKCE)',
      message: '对于前端应用，使用 PKCE 时不需要 client_secret',
    },
    {
      type: 'danger',
      title: '不要在前端泄露 secret',
      message: '绝不要在前端代码中硬编码或暴露 client_secret',
    },
  ]

  return {
    fetchTemplate,
    curlTemplate,
    notes,
  }
}

const EXAMPLE_FLOW = {
  clientId: 'demo-client-123',
  redirectUri: 'https://example.com/callback',
  scope: 'openid profile email',
  authorizationEndpoint: 'https://auth.example.com/authorize',
  tokenEndpoint: 'https://auth.example.com/token',
}

export {
  STATE_LENGTH,
  NONCE_LENGTH,
  generateRandomState,
  generateNonce,
  buildAuthorizationUrl,
  parseCallbackUrl,
  getErrorMessage,
  compareStates,
  buildTokenRequestBody,
  buildTokenFetchTemplate,
  EXAMPLE_FLOW,
}
