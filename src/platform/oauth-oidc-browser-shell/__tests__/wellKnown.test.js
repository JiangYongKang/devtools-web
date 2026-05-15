import {
  parseWellKnownConfig,
  validateWellKnownConfig,
  getWellKnownUrl,
  extractEndpoints,
  getSupportedFeatures,
} from '../logic/wellKnown'
import { WELL_KNOWN_REQUIRED_FIELDS, ERROR_CODES } from '../logic/constants'

describe('OIDC Well-Known 配置解析测试', () => {
  const validConfig = {
    issuer: 'https://idp.example.com',
    authorization_endpoint: 'https://idp.example.com/authorize',
    token_endpoint: 'https://idp.example.com/token',
    userinfo_endpoint: 'https://idp.example.com/userinfo',
    jwks_uri: 'https://idp.example.com/.well-known/jwks.json',
    response_types_supported: ['code', 'code id_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    id_token_signing_alg_values_supported: ['RS256'],
  }

  describe('parseWellKnownConfig', () => {
    it('应该正确解析有效的 JSON 配置', () => {
      const jsonString = JSON.stringify(validConfig)
      const result = parseWellKnownConfig(jsonString)
      expect(result.issuer).toBe(validConfig.issuer)
      expect(result.authorization_endpoint).toBe(validConfig.authorization_endpoint)
      expect(result.token_endpoint).toBe(validConfig.token_endpoint)
    })

    it('应该在解析无效 JSON 时抛出错误', () => {
      expect(() => {
        parseWellKnownConfig('invalid json')
      }).toThrow()
    })

    it('应该在解析无效 JSON 时抛出正确的错误码', () => {
      try {
        parseWellKnownConfig('invalid json')
      } catch (error) {
        expect(error.errorCode).toBe(ERROR_CODES.WELL_KNOWN_PARSE_FAILED)
      }
    })
  })

  describe('validateWellKnownConfig', () => {
    it('应该验证完整有效的配置', () => {
      const result = validateWellKnownConfig(validConfig)
      expect(result.valid).toBe(true)
      expect(result.missingRequired).toHaveLength(0)
    })

    it('应该检测缺失的必填字段', () => {
      const incompleteConfig = {
        issuer: 'https://idp.example.com',
      }
      const result = validateWellKnownConfig(incompleteConfig)
      expect(result.valid).toBe(false)
      expect(result.missingRequired).toContain('authorization_endpoint')
      expect(result.missingRequired).toContain('token_endpoint')
    })

    it('应该检测缺失的推荐字段', () => {
      const minimalConfig = {
        issuer: 'https://idp.example.com',
        authorization_endpoint: 'https://idp.example.com/authorize',
        token_endpoint: 'https://idp.example.com/token',
      }
      const result = validateWellKnownConfig(minimalConfig)
      expect(result.missingRecommended.length).toBeGreaterThan(0)
    })

    it('应该检测 PKCE S256 支持情况', () => {
      const noPkceConfig = {
        ...validConfig,
        code_challenge_methods_supported: ['plain'],
      }
      const result = validateWellKnownConfig(noPkceConfig)
      const pkceIssue = result.incompatibilities.find((c) => c.type === 'pkce')
      expect(pkceIssue).toBeDefined()
      expect(pkceIssue.message).toContain('S256')
    })

    it('应该检测 authorization_code 授权类型支持', () => {
      const noAuthCodeConfig = {
        ...validConfig,
        grant_types_supported: ['implicit'],
      }
      const result = validateWellKnownConfig(noAuthCodeConfig)
      const grantTypeIssue = result.incompatibilities.find((c) => c.type === 'grant_type')
      expect(grantTypeIssue).toBeDefined()
    })

    it('应该检测 code 响应类型支持', () => {
      const noCodeResponseConfig = {
        ...validConfig,
        response_types_supported: ['id_token'],
      }
      const result = validateWellKnownConfig(noCodeResponseConfig)
      const responseTypeIssue = result.incompatibilities.find((c) => c.type === 'response_type')
      expect(responseTypeIssue).toBeDefined()
    })

    it('应该在未声明 PKCE 支持时发出警告', () => {
      const noPkceDeclarationConfig = {
        ...validConfig,
        code_challenge_methods_supported: undefined,
      }
      const result = validateWellKnownConfig(noPkceDeclarationConfig)
      const pkceIssue = result.incompatibilities.find((c) => c.type === 'pkce')
      expect(pkceIssue).toBeDefined()
    })
  })

  describe('getWellKnownUrl', () => {
    it('应该正确生成 well-known 配置 URL', () => {
      const issuer = 'https://idp.example.com'
      const url = getWellKnownUrl(issuer)
      expect(url).toBe('https://idp.example.com/.well-known/openid-configuration')
    })

    it('应该正确处理末尾有斜杠的 issuer', () => {
      const issuer = 'https://idp.example.com/'
      const url = getWellKnownUrl(issuer)
      expect(url).toBe('https://idp.example.com/.well-known/openid-configuration')
    })
  })

  describe('extractEndpoints', () => {
    it('应该正确提取所有端点', () => {
      const endpoints = extractEndpoints(validConfig)
      expect(endpoints.authorizationEndpoint).toBe(validConfig.authorization_endpoint)
      expect(endpoints.tokenEndpoint).toBe(validConfig.token_endpoint)
      expect(endpoints.userinfoEndpoint).toBe(validConfig.userinfo_endpoint)
      expect(endpoints.jwksUri).toBe(validConfig.jwks_uri)
    })

    it('应该为缺失的端点返回 undefined', () => {
      const minimalConfig = {
        issuer: 'https://idp.example.com',
        authorization_endpoint: 'https://idp.example.com/authorize',
        token_endpoint: 'https://idp.example.com/token',
      }
      const endpoints = extractEndpoints(minimalConfig)
      expect(endpoints.userinfoEndpoint).toBeUndefined()
      expect(endpoints.jwksUri).toBeUndefined()
    })
  })

  describe('getSupportedFeatures', () => {
    it('应该正确提取支持的功能列表', () => {
      const features = getSupportedFeatures(validConfig)
      expect(features.responseTypes).toEqual(validConfig.response_types_supported)
      expect(features.codeChallengeMethods).toEqual(validConfig.code_challenge_methods_supported)
      expect(features.grantTypes).toEqual(validConfig.grant_types_supported)
      expect(features.scopes).toEqual(validConfig.scopes_supported)
      expect(features.tokenEndpointAuthMethods).toEqual(
        validConfig.token_endpoint_auth_methods_supported
      )
      expect(features.idTokenSigningAlgValues).toEqual(
        validConfig.id_token_signing_alg_values_supported
      )
    })

    it('应该为缺失的字段返回空数组', () => {
      const minimalConfig = {
        issuer: 'https://idp.example.com',
        authorization_endpoint: 'https://idp.example.com/authorize',
        token_endpoint: 'https://idp.example.com/token',
      }
      const features = getSupportedFeatures(minimalConfig)
      expect(features.responseTypes).toEqual([])
      expect(features.codeChallengeMethods).toEqual([])
      expect(features.grantTypes).toEqual([])
    })
  })

  describe('必填字段验证', () => {
    it('应该包含所有 OIDC 规范要求的必填字段', () => {
      expect(WELL_KNOWN_REQUIRED_FIELDS).toContain('issuer')
      expect(WELL_KNOWN_REQUIRED_FIELDS).toContain('authorization_endpoint')
      expect(WELL_KNOWN_REQUIRED_FIELDS).toContain('token_endpoint')
    })
  })
})
