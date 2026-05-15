import { GRANT_TYPES } from './constants.js'

export const TOKEN_EXCHANGE_FIELDS = {
  request: [
    {
      name: 'grant_type',
      type: 'string',
      required: true,
      description: '必须设为 "authorization_code"',
      example: GRANT_TYPES.AUTHORIZATION_CODE,
    },
    {
      name: 'code',
      type: 'string',
      required: true,
      description: '从授权端点获取的授权码',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    {
      name: 'redirect_uri',
      type: 'string',
      required: true,
      description: '与授权请求中使用的 redirect_uri 必须完全相同',
      example: 'https://app.example.com/callback',
    },
    {
      name: 'client_id',
      type: 'string',
      required: true,
      description: '客户端标识符',
      example: 'demo-client-12345',
    },
    {
      name: 'code_verifier',
      type: 'string',
      required: true,
      description: 'PKCE 代码验证器，与 code_challenge 对应',
      example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    },
    {
      name: 'client_secret',
      type: 'string',
      required: false,
      description: '客户端密钥（仅机密客户端需要，⚠️ 仅服务端使用）',
      example: 'your-client-secret-here',
      sensitive: true,
    },
  ],
  response: {
    success: [
      {
        name: 'access_token',
        type: 'string',
        description: '访问令牌，用于调用受保护的 API',
      },
      {
        name: 'token_type',
        type: 'string',
        description: '令牌类型，通常为 "Bearer"',
        example: 'Bearer',
      },
      {
        name: 'expires_in',
        type: 'number',
        description: '令牌过期时间（秒）',
        example: 3600,
      },
      {
        name: 'refresh_token',
        type: 'string',
        description: '刷新令牌（可选，用于获取新的访问令牌）',
        optional: true,
      },
      {
        name: 'id_token',
        type: 'string',
        description: 'ID 令牌（仅 OpenID Connect 流程）',
        optional: true,
      },
      {
        name: 'scope',
        type: 'string',
        description: '实际授予的权限范围',
        optional: true,
      },
    ],
    error: [
      {
        name: 'error',
        type: 'string',
        description: '错误码',
        enum: [
          'invalid_request',
          'invalid_client',
          'invalid_grant',
          'unauthorized_client',
          'unsupported_grant_type',
          'invalid_scope',
        ],
      },
      {
        name: 'error_description',
        type: 'string',
        description: '人类可读的错误描述',
        optional: true,
      },
      {
        name: 'error_uri',
        type: 'string',
        description: '包含错误详情的 URI',
        optional: true,
      },
    ],
  },
  httpStatus: {
    success: 200,
    badRequest: 400,
    unauthorized: 401,
  },
}

export const generateCurlTemplate = (options) => {
  const {
    tokenEndpoint,
    clientId,
    clientSecret,
    code,
    redirectUri,
    codeVerifier,
    includeClientSecret = false,
  } = options

  const formData = [
    `grant_type="${GRANT_TYPES.AUTHORIZATION_CODE}"`,
    `code="${code || 'YOUR_AUTHORIZATION_CODE'}"`,
    `redirect_uri="${redirectUri || 'https://app.example.com/callback'}"`,
    `client_id="${clientId || 'YOUR_CLIENT_ID'}"`,
    `code_verifier="${codeVerifier || 'YOUR_CODE_VERIFIER'}"`,
  ]

  if (includeClientSecret && clientSecret) {
    formData.push(`client_secret="${clientSecret}"`)
  }

  const formDataString = formData.join(' \\\n  -d ')

  const warning = includeClientSecret
    ? '# ⚠️ 警告: client_secret 已包含在此模板中，仅用于服务端测试！\n'
    : '# ℹ️ 提示: 此模板不包含 client_secret（适用于公共客户端）\n'

  return `${warning}curl -X POST "${tokenEndpoint || 'https://idp.example.com/token'}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d ${formDataString}`
}

export const generateMockTokenResponse = (customFields = {}) => {
  return {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_access_token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_refresh_token',
    id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_id_token',
    scope: 'openid profile email',
    ...customFields,
  }
}

export const generateMockErrorResponse = (error = 'invalid_grant', description = '') => {
  return {
    error,
    error_description: description || '授权码无效或已过期',
  }
}

export const mockTokenExchange = async (requestBody, options = {}) => {
  const { delayMs = 500, shouldFail = false } = options

  await new Promise((resolve) => setTimeout(resolve, delayMs))

  if (shouldFail || !requestBody.code || !requestBody.code_verifier) {
    return {
      status: 400,
      ok: false,
      json: () => Promise.resolve(generateMockErrorResponse()),
    }
  }

  return {
    status: 200,
    ok: true,
    json: () => Promise.resolve(generateMockTokenResponse()),
  }
}

export const getExchangeContractSummary = () => {
  return {
    endpoint: 'POST /token',
    contentType: 'application/x-www-form-urlencoded',
    authentication: [
      'client_secret_basic (HTTP Basic Auth)',
      'client_secret_post (表单参数)',
      'none (公共客户端，仅 PKCE)',
    ],
    securityNotes: [
      '⚠️ refresh_token 不应存储在 localStorage 中',
      '⚠️ client_secret 绝不能暴露在浏览器端',
      '⚠️ 令牌交换应通过后端代理进行',
      '✅ 使用 PKCE 防止授权码拦截',
      '✅ 使用 state 防止 CSRF 攻击',
    ],
  }
}
