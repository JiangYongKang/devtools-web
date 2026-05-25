import { describe, test, expect } from 'vitest'
import {
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
} from '../logic/oauth.js'

describe('OAuth 常量', () => {
  test('STATE_LENGTH 为 32', () => {
    expect(STATE_LENGTH).toBe(32)
  })

  test('NONCE_LENGTH 为 32', () => {
    expect(NONCE_LENGTH).toBe(32)
  })

  test('EXAMPLE_FLOW 包含必要字段', () => {
    expect(EXAMPLE_FLOW.clientId).toBeDefined()
    expect(EXAMPLE_FLOW.redirectUri).toBeDefined()
    expect(EXAMPLE_FLOW.scope).toBeDefined()
    expect(EXAMPLE_FLOW.authorizationEndpoint).toBeDefined()
    expect(EXAMPLE_FLOW.tokenEndpoint).toBeDefined()
  })
})

describe('generateRandomState', () => {
  test('生成指定长度的随机字符串', () => {
    const state = generateRandomState(32)
    expect(state.length).toBe(32)
  })

  test('默认长度为 STATE_LENGTH', () => {
    const state = generateRandomState()
    expect(state.length).toBe(STATE_LENGTH)
  })

  test('只包含字母和数字', () => {
    const state = generateRandomState()
    expect(state).toMatch(/^[A-Za-z0-9]+$/)
  })

  test('多次生成的 state 不相同', () => {
    const state1 = generateRandomState()
    const state2 = generateRandomState()
    expect(state1).not.toBe(state2)
  })
})

describe('generateNonce', () => {
  test('生成 NONCE_LENGTH 长度的字符串', () => {
    const nonce = generateNonce()
    expect(nonce.length).toBe(NONCE_LENGTH)
  })

  test('只包含字母和数字', () => {
    const nonce = generateNonce()
    expect(nonce).toMatch(/^[A-Za-z0-9]+$/)
  })
})

describe('buildAuthorizationUrl', () => {
  const baseOptions = {
    authorizationEndpoint: 'https://auth.example.com/authorize',
    clientId: 'test-client',
    redirectUri: 'https://example.com/callback',
  }

  test('构建包含必要参数的 URL', () => {
    const result = buildAuthorizationUrl(baseOptions)

    expect(result.url).toContain('response_type=code')
    expect(result.url).toContain('client_id=test-client')
    expect(result.url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback')
  })

  test('包含 scope 参数', () => {
    const result = buildAuthorizationUrl({
      ...baseOptions,
      scope: 'openid profile',
    })
    expect(result.url).toMatch(/scope=openid(%20|\+)profile/)
  })

  test('包含 state 参数', () => {
    const result = buildAuthorizationUrl({
      ...baseOptions,
      state: 'test-state-123',
    })
    expect(result.url).toContain('state=test-state-123')
  })

  test('包含 nonce 参数', () => {
    const result = buildAuthorizationUrl({
      ...baseOptions,
      nonce: 'test-nonce-456',
    })
    expect(result.url).toContain('nonce=test-nonce-456')
  })

  test('包含 PKCE 参数', () => {
    const result = buildAuthorizationUrl({
      ...baseOptions,
      codeChallenge: 'challenge-value',
      codeChallengeMethod: 'S256',
    })
    expect(result.url).toContain('code_challenge=challenge-value')
    expect(result.url).toContain('code_challenge_method=S256')
  })

  test('标记必需参数', () => {
    const result = buildAuthorizationUrl(baseOptions)
    const requiredParams = result.params.filter((p) => p.isRequired)
    expect(requiredParams.some((p) => p.key === 'response_type')).toBe(true)
    expect(requiredParams.some((p) => p.key === 'client_id')).toBe(true)
    expect(requiredParams.some((p) => p.key === 'redirect_uri')).toBe(true)
  })

  test('标记安全参数', () => {
    const result = buildAuthorizationUrl({
      ...baseOptions,
      state: 'state',
      codeChallenge: 'challenge',
    })
    const securityParams = result.params.filter((p) => p.isSecurity)
    expect(securityParams.some((p) => p.key === 'state')).toBe(true)
    expect(securityParams.some((p) => p.key === 'code_challenge')).toBe(true)
    expect(securityParams.some((p) => p.key === 'code_challenge_method')).toBe(true)
  })

  test('返回 baseUrl', () => {
    const result = buildAuthorizationUrl(baseOptions)
    expect(result.baseUrl).toBe('https://auth.example.com/authorize')
  })
})

describe('parseCallbackUrl', () => {
  test('解析完整 URL', () => {
    const url = 'https://example.com/callback?code=auth-code-123&state=state-456'
    const result = parseCallbackUrl(url)

    expect(result.code).toBe('auth-code-123')
    expect(result.state).toBe('state-456')
    expect(result.hasCode).toBe(true)
    expect(result.hasError).toBe(false)
    expect(result.status).toBe('success')
  })

  test('解析仅 query 字符串', () => {
    const query = 'code=auth-code-123&state=state-456'
    const result = parseCallbackUrl(query)

    expect(result.code).toBe('auth-code-123')
    expect(result.state).toBe('state-456')
  })

  test('解析带 ? 的 query 字符串', () => {
    const query = '?code=auth-code-123&state=state-456'
    const result = parseCallbackUrl(query)

    expect(result.code).toBe('auth-code-123')
    expect(result.state).toBe('state-456')
  })

  test('解析 hash 片段参数', () => {
    const url = 'https://example.com/callback#code=auth-code-123&state=state-456'
    const result = parseCallbackUrl(url)

    expect(result.code).toBe('auth-code-123')
    expect(result.state).toBe('state-456')
  })

  test('解析错误回调', () => {
    const url = 'https://example.com/callback?error=access_denied&error_description=User+denied+access'
    const result = parseCallbackUrl(url)

    expect(result.error).toBe('access_denied')
    expect(result.errorDescription).toBe('User denied access')
    expect(result.hasError).toBe(true)
    expect(result.status).toBe('error')
  })

  test('缺少 code 时返回 warning', () => {
    const url = 'https://example.com/callback?state=state-456'
    const result = parseCallbackUrl(url)

    expect(result.code).toBeNull()
    expect(result.hasCode).toBe(false)
    expect(result.status).toBe('warning')
  })

  test('返回所有参数列表', () => {
    const url = 'https://example.com/callback?code=123&state=456&extra=value'
    const result = parseCallbackUrl(url)

    expect(result.allParams).toHaveLength(3)
    expect(result.allParams.some((p) => p.key === 'code')).toBe(true)
    expect(result.allParams.some((p) => p.key === 'state')).toBe(true)
    expect(result.allParams.some((p) => p.key === 'extra')).toBe(true)
  })
})

describe('getErrorMessage', () => {
  test('返回已知错误码的中文描述', () => {
    expect(getErrorMessage('access_denied')).toBe('用户拒绝了授权请求')
    expect(getErrorMessage('invalid_request')).toBe('请求无效，缺少必需参数或参数格式错误')
  })

  test('未知错误码返回原错误码', () => {
    expect(getErrorMessage('custom_error')).toBe('custom_error')
  })

  test('null 或 undefined 返回未知错误', () => {
    expect(getErrorMessage(null)).toBe('未知错误')
    expect(getErrorMessage(undefined)).toBe('未知错误')
  })
})

describe('compareStates', () => {
  test('相同的 state 返回匹配成功', () => {
    const result = compareStates('state-123', 'state-123')
    expect(result.match).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.severity).toBe('success')
    expect(result.message).toContain('校验通过')
  })

  test('不同的 state 返回不匹配', () => {
    const result = compareStates('state-123', 'state-456')
    expect(result.match).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.severity).toBe('error')
    expect(result.message).toContain('CSRF')
  })

  test('缺少发起 state 返回警告', () => {
    const result = compareStates('', 'state-456')
    expect(result.match).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.severity).toBe('warning')
  })

  test('缺少接收 state 返回警告', () => {
    const result = compareStates('state-123', '')
    expect(result.match).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.severity).toBe('warning')
  })

  test('两个都缺少返回警告', () => {
    const result = compareStates(null, null)
    expect(result.match).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.severity).toBe('warning')
  })
})

describe('buildTokenRequestBody', () => {
  const baseOptions = {
    code: 'auth-code-123',
    redirectUri: 'https://example.com/callback',
    clientId: 'test-client',
  }

  test('构建包含必要参数的 body', () => {
    const result = buildTokenRequestBody(baseOptions)

    expect(result.contentType).toBe('application/x-www-form-urlencoded')
    expect(result.body).toContain('grant_type=authorization_code')
    expect(result.body).toContain('code=auth-code-123')
    expect(result.body).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback')
    expect(result.body).toContain('client_id=test-client')
  })

  test('包含 code_verifier 参数', () => {
    const result = buildTokenRequestBody({
      ...baseOptions,
      codeVerifier: 'code-verifier-456',
    })
    expect(result.body).toContain('code_verifier=code-verifier-456')
  })

  test('包含 client_secret 参数', () => {
    const result = buildTokenRequestBody({
      ...baseOptions,
      clientSecret: 'secret-789',
    })
    expect(result.body).toContain('client_secret=secret-789')
  })

  test('标记敏感参数', () => {
    const result = buildTokenRequestBody({
      ...baseOptions,
      codeVerifier: 'verifier',
      clientSecret: 'secret',
    })
    const sensitiveParams = result.params.filter((p) => p.isSensitive)
    expect(sensitiveParams.some((p) => p.key === 'code_verifier')).toBe(true)
    expect(sensitiveParams.some((p) => p.key === 'client_secret')).toBe(true)
  })
})

describe('buildTokenFetchTemplate', () => {
  const baseOptions = {
    tokenEndpoint: 'https://auth.example.com/token',
    body: 'grant_type=authorization_code&code=123',
    contentType: 'application/x-www-form-urlencoded',
  }

  test('生成有效的 fetch 模板', () => {
    const result = buildTokenFetchTemplate(baseOptions)

    expect(result.fetchTemplate).toContain("fetch('https://auth.example.com/token'")
    expect(result.fetchTemplate).toContain('method: \'POST\'')
    expect(result.fetchTemplate).toContain('Content-Type')
    expect(result.fetchTemplate).toContain('grant_type=authorization_code')
  })

  test('生成有效的 cURL 模板', () => {
    const result = buildTokenFetchTemplate(baseOptions)

    expect(result.curlTemplate).toContain('curl -X POST')
    expect(result.curlTemplate).toContain('\'https://auth.example.com/token\'')
    expect(result.curlTemplate).toContain('Content-Type')
  })

  test('包含注意事项', () => {
    const result = buildTokenFetchTemplate(baseOptions)

    expect(result.notes).toHaveLength(3)
    expect(result.notes.some((n) => n.type === 'warning')).toBe(true)
    expect(result.notes.some((n) => n.type === 'info')).toBe(true)
    expect(result.notes.some((n) => n.type === 'danger')).toBe(true)
  })
})
