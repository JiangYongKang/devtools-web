import { PKCE, ERROR_CODES } from './constants.js'
import { createError, mapCallbackError } from './errors.js'

export const buildAuthorizationUrl = (options) => {
  const {
    authorizationEndpoint,
    clientId,
    redirectUri,
    scope,
    state,
    nonce,
    codeChallenge,
    codeChallengeMethod = PKCE.DEFAULT_CODE_CHALLENGE_METHOD,
    responseType = 'code',
    responseMode,
    prompt,
    maxAge,
    loginHint,
    acrValues,
    additionalParams = {},
  } = options

  if (!authorizationEndpoint || !clientId || !redirectUri) {
    throw createError(ERROR_CODES.INVALID_CONFIG, {
      missingFields: {
        authorizationEndpoint: !authorizationEndpoint,
        clientId: !clientId,
        redirectUri: !redirectUri,
      },
    })
  }

  const url = new URL(authorizationEndpoint)
  const params = url.searchParams

  params.set('client_id', clientId)
  params.set('redirect_uri', redirectUri)
  params.set('response_type', responseType)

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

  if (responseMode) {
    params.set('response_mode', responseMode)
  }

  if (prompt) {
    params.set('prompt', prompt)
  }

  if (maxAge !== undefined && maxAge !== null) {
    params.set('max_age', String(maxAge))
  }

  if (loginHint) {
    params.set('login_hint', loginHint)
  }

  if (acrValues) {
    params.set('acr_values', acrValues)
  }

  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value))
    }
  })

  return url.toString()
}

export const parseCallbackParams = (urlString, useFragment = false) => {
  let params

  if (urlString.includes('?') || urlString.includes('#')) {
    const url = new URL(urlString, window.location.origin)
    if (useFragment) {
      params = new URLSearchParams(url.hash.slice(1))
    } else {
      params = url.searchParams
    }
  } else {
    params = new URLSearchParams(urlString)
  }

  const result = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}

export const parseCurrentUrlParams = (useFragment = false) => {
  return parseCallbackParams(window.location.href, useFragment)
}

export const extractCallbackResult = (params) => {
  const code = params.code || params.authorization_code
  const state = params.state
  const error = mapCallbackError(params)

  if (error) {
    return {
      success: false,
      error,
      state,
    }
  }

  if (!code) {
    return {
      success: false,
      error: createError(ERROR_CODES.MISSING_CODE, { params }),
      state,
    }
  }

  return {
    success: true,
    code,
    state,
    params,
  }
}

export const validateAdvancedParams = (options) => {
  const errors = []

  if (options.responseMode) {
    const validResponseModes = ['query', 'fragment', 'form_post']
    if (!validResponseModes.includes(options.responseMode)) {
      errors.push({ field: 'responseMode', message: `response_mode 必须是: ${validResponseModes.join(', ')}` })
    }
  }

  if (options.prompt) {
    const validPrompts = ['none', 'login', 'consent', 'select_account']
    const promptValues = options.prompt.split(' ')
    const invalidPrompts = promptValues.filter((p) => !validPrompts.includes(p))
    if (invalidPrompts.length > 0) {
      errors.push({ field: 'prompt', message: `prompt 包含无效值: ${invalidPrompts.join(', ')}` })
    }
  }

  if (options.maxAge !== undefined && options.maxAge !== null) {
    const maxAgeNum = Number(options.maxAge)
    if (isNaN(maxAgeNum) || maxAgeNum < 0 || !Number.isInteger(maxAgeNum)) {
      errors.push({ field: 'maxAge', message: 'max_age 必须是非负整数' })
    }
  }

  if (options.scope) {
    if (/\n|\r/.test(options.scope)) {
      errors.push({ field: 'scope', message: 'scope 不能包含换行符' })
    }
    if (/[<>]/.test(options.scope)) {
      errors.push({ field: 'scope', message: 'scope 包含非法字符' })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const sanitizeUrlInput = (input) => {
  if (!input) return ''

  let sanitized = input.trim()

  sanitized = sanitized.replace(/[\n\r]/g, '')
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  sanitized = sanitized.replace(/javascript:/gi, '')

  return sanitized
}
