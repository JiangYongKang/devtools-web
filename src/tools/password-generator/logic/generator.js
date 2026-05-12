import {
  CHARACTER_CLASS_CHARS,
  CONFUSING_CHARACTERS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_BATCH_COUNT,
  MAX_BATCH_COUNT,
  MAX_TOTAL_OUTPUT_LENGTH,
  STRENGTH_LABELS,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'

function getRandomInt(max) {
  if (max <= 0) return 0
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

function getRandomLength(minLength, maxLength) {
  if (minLength === maxLength) return minLength
  return minLength + getRandomInt(maxLength - minLength + 1)
}

function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function filterCharacters(chars, excludeConfusing, customExclusions) {
  let filtered = chars

  if (excludeConfusing) {
    filtered = filtered.split('').filter(c => !CONFUSING_CHARACTERS.includes(c)).join('')
  }

  if (customExclusions && customExclusions.length > 0) {
    filtered = filtered.split('').filter(c => {
      return !customExclusions.some(excl => {
        if (excl.length === 1) {
          return excl === c
        }
        return false
      })
    }).join('')
  }

  return filtered
}

function buildCharacterPool(requiredClasses, optionalClasses, excludeConfusing, customExclusions) {
  const pools = {}
  const allClasses = [...new Set([...requiredClasses, ...optionalClasses])]

  for (const cls of allClasses) {
    const baseChars = CHARACTER_CLASS_CHARS[cls]
    if (baseChars) {
      const filtered = filterCharacters(baseChars, excludeConfusing, customExclusions)
      if (filtered.length > 0) {
        pools[cls] = filtered
      }
    }
  }

  return pools
}

function containsAnyHomoglyph(password, customExclusions) {
  if (!customExclusions || customExclusions.length === 0) return false
  
  for (const excl of customExclusions) {
    if (excl.length === 1 && password.includes(excl)) {
      return true
    }
    if (excl.length > 1 && password.includes(excl)) {
      return true
    }
  }
  return false
}

function validateRules(options) {
  const {
    minLength,
    maxLength,
    requiredClasses = [],
    optionalClasses = [],
    excludeConfusing = false,
    customExclusions = [],
    batchCount = 1,
  } = options

  if (minLength === 0 && maxLength === 0) {
    return createError(ERROR_CODES.ZERO_LENGTH, null, [
      '请设置有效的密码长度范围',
      `建议长度范围：${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} 位`,
    ])
  }

  if (minLength > maxLength) {
    return createError(ERROR_CODES.MIN_LENGTH_GREATER_THAN_MAX, null, [
      `当前设置：最小 ${minLength} 位，最大 ${maxLength} 位`,
      '请调整使最小长度不大于最大长度',
    ])
  }

  if (minLength < MIN_PASSWORD_LENGTH || maxLength > MAX_PASSWORD_LENGTH) {
    return createError(ERROR_CODES.LENGTH_OUT_OF_RANGE, null, [
      `允许的长度范围：${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} 位`,
      `当前设置：${minLength}-${maxLength} 位`,
    ])
  }

  const allClasses = [...requiredClasses, ...optionalClasses]
  if (allClasses.length === 0) {
    return createError(ERROR_CODES.NO_CHARACTER_CLASSES_SELECTED, null, [
      '请至少选择一个字符类（必选或可选）',
      '可选字符类：大写字母、小写字母、数字、符号',
    ])
  }

  const pools = buildCharacterPool(requiredClasses, optionalClasses, excludeConfusing, customExclusions)

  for (const cls of requiredClasses) {
    if (!pools[cls] || pools[cls].length === 0) {
      return createError(ERROR_CODES.ALL_CHARACTERS_EXCLUDED, null, [
        `字符类 "${cls}" 的所有字符都被排除`,
        '请放宽排除条件或取消该字符类的必选要求',
      ])
    }
  }

  const requiredCount = requiredClasses.length
  if (requiredCount > minLength) {
    return createError(ERROR_CODES.INSUFFICIENT_LENGTH_FOR_REQUIRED_CLASSES, null, [
      `需要容纳 ${requiredCount} 个必选字符类`,
      `当前最小长度：${minLength} 位`,
      `建议最小长度：至少 ${requiredCount} 位`,
    ])
  }

  if (batchCount < MIN_BATCH_COUNT || batchCount > MAX_BATCH_COUNT) {
    return createError(ERROR_CODES.BATCH_COUNT_OUT_OF_RANGE, null, [
      `允许的批量数量：${MIN_BATCH_COUNT}-${MAX_BATCH_COUNT}`,
      `当前设置：${batchCount}`,
    ])
  }

  const maxTotalLength = batchCount * maxLength
  if (maxTotalLength > MAX_TOTAL_OUTPUT_LENGTH) {
    return createError(ERROR_CODES.TOTAL_OUTPUT_TOO_LARGE, null, [
      `允许的总输出长度：${MAX_TOTAL_OUTPUT_LENGTH} 字符`,
      `当前最大总长度：${maxTotalLength} 字符`,
      '请减少批量数量或缩短密码长度',
    ])
  }

  return null
}

function calculateEntropy(password, pools, usedClasses) {
  let totalPoolSize = 0
  for (const cls of usedClasses) {
    if (pools[cls]) {
      totalPoolSize += pools[cls].length
    }
  }

  if (totalPoolSize === 0) return 0

  const uniqueChars = new Set(password)
  const effectivePoolSize = Math.min(totalPoolSize, uniqueChars.size * 2)

  return password.length * Math.log2(effectivePoolSize)
}

function calculateStrength(entropy, passwordLength, usedClassesCount) {
  let score = 0

  if (entropy >= 128) score += 4
  else if (entropy >= 96) score += 3
  else if (entropy >= 64) score += 2
  else if (entropy >= 40) score += 1
  else score += 0

  if (passwordLength >= 16) score += 2
  else if (passwordLength >= 12) score += 1
  else if (passwordLength >= 8) score += 0
  else score -= 1

  if (usedClassesCount >= 4) score += 2
  else if (usedClassesCount >= 3) score += 1
  else if (usedClassesCount >= 2) score += 0
  else score -= 1

  if (score >= 7) return STRENGTH_LABELS.VERY_STRONG
  if (score >= 5) return STRENGTH_LABELS.STRONG
  if (score >= 3) return STRENGTH_LABELS.MEDIUM
  if (score >= 1) return STRENGTH_LABELS.WEAK
  return STRENGTH_LABELS.VERY_WEAK
}

function generateSinglePassword(options) {
  const {
    minLength,
    maxLength,
    requiredClasses = [],
    optionalClasses = [],
    excludeConfusing = false,
    customExclusions = [],
  } = options

  const pools = buildCharacterPool(requiredClasses, optionalClasses, excludeConfusing, customExclusions)

  const length = getRandomLength(minLength, maxLength)

  const passwordChars = []
  const usedClasses = new Set()

  for (const cls of requiredClasses) {
    const pool = pools[cls]
    if (pool && pool.length > 0) {
      const randomChar = pool[getRandomInt(pool.length)]
      passwordChars.push(randomChar)
      usedClasses.add(cls)
    }
  }

  const allAvailableClasses = [...new Set([...requiredClasses, ...optionalClasses])].filter(
    cls => pools[cls] && pools[cls].length > 0
  )

  while (passwordChars.length < length) {
    const randomClass = allAvailableClasses[getRandomInt(allAvailableClasses.length)]
    const pool = pools[randomClass]
    if (pool && pool.length > 0) {
      const randomChar = pool[getRandomInt(pool.length)]
      passwordChars.push(randomChar)
      usedClasses.add(randomClass)
    }
  }

  const shuffled = shuffleArray(passwordChars)
  const password = shuffled.join('')

  if (containsAnyHomoglyph(password, customExclusions)) {
    return generateSinglePassword(options)
  }

  const entropy = calculateEntropy(password, pools, [...usedClasses])
  const strength = calculateStrength(entropy, length, usedClasses.size)

  return {
    password,
    length,
    entropy: entropy.toFixed(2),
    strength,
    usedClasses: [...usedClasses],
  }
}

function generatePasswords(options) {
  const validationError = validateRules(options)
  if (validationError) {
    return {
      success: false,
      ...validationError,
    }
  }

  const { batchCount = 1 } = options
  const passwords = []

  for (let i = 0; i < batchCount; i++) {
    passwords.push(generateSinglePassword(options))
  }

  return {
    success: true,
    passwords,
  }
}

export {
  validateRules,
  generateSinglePassword,
  generatePasswords,
  calculateEntropy,
  calculateStrength,
  buildCharacterPool,
  filterCharacters,
}
