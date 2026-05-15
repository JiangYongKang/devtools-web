import {
  WELL_KNOWN_REQUIRED_FIELDS,
  WELL_KNOWN_RECOMMENDED_FIELDS,
  PKCE,
  ERROR_CODES,
} from './constants.js'
import { createError } from './errors.js'

export const parseWellKnownConfig = (jsonString) => {
  try {
    const config = JSON.parse(jsonString)
    return config
  } catch (error) {
    throw createError(ERROR_CODES.WELL_KNOWN_PARSE_FAILED, {
      parseError: error.message,
    })
  }
}

export const validateWellKnownConfig = (config) => {
  const missingRequired = []
  const missingRecommended = []
  const incompatibilities = []

  for (const field of WELL_KNOWN_REQUIRED_FIELDS) {
    if (!config[field]) {
      missingRequired.push(field)
    }
  }

  for (const field of WELL_KNOWN_RECOMMENDED_FIELDS) {
    if (!config[field]) {
      missingRecommended.push(field)
    }
  }

  if (config.code_challenge_methods_supported) {
    if (!config.code_challenge_methods_supported.includes(PKCE.DEFAULT_CODE_CHALLENGE_METHOD)) {
      incompatibilities.push({
        type: 'pkce',
        message: `不支持 S256 代码挑战方法，仅支持: ${config.code_challenge_methods_supported.join(', ')}`,
        supported: config.code_challenge_methods_supported,
      })
    }
  } else {
    incompatibilities.push({
      type: 'pkce',
      message: '未声明支持 PKCE，可能无法使用代码授权流程',
    })
  }

  if (config.response_types_supported) {
    if (!config.response_types_supported.includes('code')) {
      incompatibilities.push({
        type: 'response_type',
        message: `不支持 code 响应类型，支持: ${config.response_types_supported.join(', ')}`,
        supported: config.response_types_supported,
      })
    }
  }

  if (config.grant_types_supported) {
    if (!config.grant_types_supported.includes('authorization_code')) {
      incompatibilities.push({
        type: 'grant_type',
        message: `不支持 authorization_code 授权类型，支持: ${config.grant_types_supported.join(', ')}`,
        supported: config.grant_types_supported,
      })
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    incompatibilities,
  }
}

export const getWellKnownUrl = (issuer) => {
  const normalizedIssuer = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer
  return `${normalizedIssuer}/.well-known/openid-configuration`
}

export const extractEndpoints = (config) => {
  return {
    authorizationEndpoint: config.authorization_endpoint,
    tokenEndpoint: config.token_endpoint,
    userinfoEndpoint: config.userinfo_endpoint,
    jwksUri: config.jwks_uri,
    endSessionEndpoint: config.end_session_endpoint,
    introspectionEndpoint: config.introspection_endpoint,
    revocationEndpoint: config.revocation_endpoint,
  }
}

export const getSupportedFeatures = (config) => {
  return {
    responseTypes: config.response_types_supported || [],
    codeChallengeMethods: config.code_challenge_methods_supported || [],
    grantTypes: config.grant_types_supported || [],
    scopes: config.scopes_supported || [],
    tokenEndpointAuthMethods: config.token_endpoint_auth_methods_supported || [],
    idTokenSigningAlgValues: config.id_token_signing_alg_values_supported || [],
  }
}

export const checkBrowserCompatibility = (config) => {
  const issues = []
  const features = getSupportedFeatures(config)

  if (!features.codeChallengeMethods.includes('S256')) {
    issues.push({
      level: 'warning',
      message: 'IdP 不支持 S256 代码挑战，浏览器端安全性较低',
    })
  }

  if (features.tokenEndpointAuthMethods.includes('client_secret_basic')) {
    issues.push({
      level: 'info',
      message: '支持 client_secret_basic 认证，但浏览器端不建议使用 client_secret',
    })
  }

  return issues
}
