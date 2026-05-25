import { ERROR_CODES, createError } from './errors.js'

function getCurrentTimeSeconds() {
  return Math.floor(Date.now() / 1000)
}

function validateExp(payload, clockSkewSeconds = 0, currentTime = null) {
  const now = currentTime ?? getCurrentTimeSeconds()
  const exp = payload.exp

  if (exp == null) {
    return {
      valid: true,
      claim: 'exp',
      hasClaim: false,
      message: '无 exp 声明',
    }
  }

  const adjustedNow = now - clockSkewSeconds
  const isExpired = adjustedNow >= exp

  return {
    valid: !isExpired,
    claim: 'exp',
    hasClaim: true,
    value: exp,
    currentTime: now,
    clockSkew: clockSkewSeconds,
    adjustedTime: adjustedNow,
    message: isExpired
      ? `令牌已过期 (exp: ${new Date(exp * 1000).toISOString()}, 当前: ${new Date(now * 1000).toISOString()})`
      : `exp 有效 (过期时间: ${new Date(exp * 1000).toISOString()})`,
    error: isExpired ? createError(ERROR_CODES.TOKEN_EXPIRED) : null,
  }
}

function validateNbf(payload, clockSkewSeconds = 0, currentTime = null) {
  const now = currentTime ?? getCurrentTimeSeconds()
  const nbf = payload.nbf

  if (nbf == null) {
    return {
      valid: true,
      claim: 'nbf',
      hasClaim: false,
      message: '无 nbf 声明',
    }
  }

  const adjustedNow = now + clockSkewSeconds
  const isNotYetValid = adjustedNow < nbf

  return {
    valid: !isNotYetValid,
    claim: 'nbf',
    hasClaim: true,
    value: nbf,
    currentTime: now,
    clockSkew: clockSkewSeconds,
    adjustedTime: adjustedNow,
    message: isNotYetValid
      ? `令牌尚未生效 (nbf: ${new Date(nbf * 1000).toISOString()}, 当前: ${new Date(now * 1000).toISOString()})`
      : `nbf 有效 (生效时间: ${new Date(nbf * 1000).toISOString()})`,
    error: isNotYetValid ? createError(ERROR_CODES.TOKEN_NOT_YET_VALID) : null,
  }
}

function validateIss(payload, expectedIss) {
  const iss = payload.iss

  if (expectedIss == null || expectedIss === '') {
    return {
      valid: true,
      claim: 'iss',
      hasClaim: iss != null,
      value: iss,
      expected: expectedIss,
      message: '未配置 iss 校验',
      checked: false,
    }
  }

  if (iss == null) {
    return {
      valid: false,
      claim: 'iss',
      hasClaim: false,
      value: iss,
      expected: expectedIss,
      message: `iss 声明缺失，期望: ${expectedIss}`,
      checked: true,
      error: createError(ERROR_CODES.ISSUER_MISMATCH, `发行者不匹配：期望 ${expectedIss}，实际 无`),
    }
  }

  const isValid = iss === expectedIss

  return {
    valid: isValid,
    claim: 'iss',
    hasClaim: true,
    value: iss,
    expected: expectedIss,
    message: isValid
      ? `iss 有效: ${iss}`
      : `iss 不匹配：期望 ${expectedIss}，实际 ${iss}`,
    checked: true,
    error: isValid ? null : createError(ERROR_CODES.ISSUER_MISMATCH, `发行者不匹配：期望 ${expectedIss}，实际 ${iss}`),
  }
}

function validateAud(payload, expectedAud) {
  const aud = payload.aud

  if (expectedAud == null || expectedAud === '') {
    return {
      valid: true,
      claim: 'aud',
      hasClaim: aud != null,
      value: aud,
      expected: expectedAud,
      message: '未配置 aud 校验',
      checked: false,
    }
  }

  if (aud == null) {
    return {
      valid: false,
      claim: 'aud',
      hasClaim: false,
      value: aud,
      expected: expectedAud,
      message: `aud 声明缺失，期望: ${expectedAud}`,
      checked: true,
      error: createError(ERROR_CODES.AUDIENCE_MISMATCH, `受众不匹配：期望 ${expectedAud}，实际 无`),
    }
  }

  const audValues = Array.isArray(aud) ? aud : [aud]
  const expectedValues = Array.isArray(expectedAud) ? expectedAud : [expectedAud]

  const isValid = audValues.some(a => expectedValues.includes(a))

  return {
    valid: isValid,
    claim: 'aud',
    hasClaim: true,
    value: aud,
    expected: expectedAud,
    message: isValid
      ? `aud 有效: ${JSON.stringify(aud)}`
      : `aud 不匹配：期望 ${JSON.stringify(expectedAud)}，实际 ${JSON.stringify(aud)}`,
    checked: true,
    error: isValid ? null : createError(ERROR_CODES.AUDIENCE_MISMATCH, `受众不匹配：期望 ${JSON.stringify(expectedAud)}，实际 ${JSON.stringify(aud)}`),
  }
}

function buildDefaultRules() {
  return {
    validateExp: true,
    validateNbf: true,
    validateIss: false,
    validateAud: false,
    clockSkewSeconds: 0,
    expectedIss: '',
    expectedAud: '',
  }
}

function validateRules(rules) {
  if (rules == null) {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_CLAIM_RULES, '规则配置为 null'),
    }
  }

  const clockSkew = Number(rules.clockSkewSeconds)
  if (isNaN(clockSkew) || clockSkew < 0 || clockSkew > 3600) {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_CLAIM_RULES, 'clockSkewSeconds 应在 0~3600 秒范围内'),
    }
  }

  return { valid: true }
}

function validateClaims(payload, rules, currentTime = null) {
  const rulesValidation = validateRules(rules)
  if (!rulesValidation.valid) {
    return {
      success: false,
      ...rulesValidation.error,
      results: null,
    }
  }

  const effectiveRules = {
    ...buildDefaultRules(),
    ...rules,
  }

  const results = []

  if (effectiveRules.validateExp) {
    results.push(validateExp(payload, effectiveRules.clockSkewSeconds, currentTime))
  }

  if (effectiveRules.validateNbf) {
    results.push(validateNbf(payload, effectiveRules.clockSkewSeconds, currentTime))
  }

  if (effectiveRules.validateIss) {
    results.push(validateIss(payload, effectiveRules.expectedIss))
  }

  if (effectiveRules.validateAud) {
    results.push(validateAud(payload, effectiveRules.expectedAud))
  }

  const allValid = results.every(r => r.valid)
  const errors = results.filter(r => r.error).map(r => r.error)

  return {
    success: true,
    allValid,
    results,
    errors,
    failedClaims: results.filter(r => !r.valid).map(r => r.claim),
  }
}

export {
  getCurrentTimeSeconds,
  validateExp,
  validateNbf,
  validateIss,
  validateAud,
  buildDefaultRules,
  validateRules,
  validateClaims,
}
