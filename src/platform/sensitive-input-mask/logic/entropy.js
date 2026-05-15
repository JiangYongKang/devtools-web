import { PASSWORD_STRENGTH_LEVELS } from './constants.js'

const LOWERCASE_CHARS = 26
const UPPERCASE_CHARS = 26
const DIGIT_CHARS = 10
const SYMBOL_CHARS = 32
const EXTENDED_ASCII_CHARS = 128

const LOWERCASE_REGEX = /[a-z]/
const UPPERCASE_REGEX = /[A-Z]/
const DIGIT_REGEX = /[0-9]/
const SYMBOL_REGEX = /[^a-zA-Z0-9]/

const COMMON_PATTERNS = [
  /^12345/,
  /^password/i,
  /^qwerty/i,
  /^abc123/i,
  /^letmein/i,
  /^monkey/i,
  /^dragon/i,
  /^111111/,
  /^iloveyou/i,
  /^sunshine/i,
  /^princess/i,
  /^admin/i,
  /^welcome/i,
  /^shadow/i,
  /^superman/i,
]

function getPoolSize(password) {
  if (!password || typeof password !== 'string') {
    return 0
  }

  let pool = 0

  if (LOWERCASE_REGEX.test(password)) {
    pool += LOWERCASE_CHARS
  }
  if (UPPERCASE_REGEX.test(password)) {
    pool += UPPERCASE_CHARS
  }
  if (DIGIT_REGEX.test(password)) {
    pool += DIGIT_CHARS
  }
  if (SYMBOL_REGEX.test(password)) {
    pool += SYMBOL_CHARS
  }

  return pool
}

function calculateRawEntropy(password) {
  if (!password || typeof password !== 'string') {
    return 0
  }

  const pool = getPoolSize(password)
  if (pool === 0) {
    return 0
  }

  return password.length * Math.log2(pool)
}

function detectRepeatingChars(password) {
  if (!password || typeof password !== 'string') {
    return { count: 0, maxSequence: 0 }
  }

  let maxSequence = 0
  let currentSequence = 1
  let totalRepeating = 0

  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      currentSequence++
      if (currentSequence > 1) {
        totalRepeating++
      }
    } else {
      maxSequence = Math.max(maxSequence, currentSequence)
      currentSequence = 1
    }
  }
  maxSequence = Math.max(maxSequence, currentSequence)

  return { count: totalRepeating, maxSequence }
}

function detectSequentialChars(password) {
  if (!password || typeof password !== 'string') {
    return 0
  }

  let sequentialCount = 0
  let maxRun = 0
  let currentRun = 1

  for (let i = 1; i < password.length; i++) {
    const diff = password.charCodeAt(i) - password.charCodeAt(i - 1)
    if (diff === 1 || diff === -1) {
      currentRun++
      if (currentRun >= 3) {
        sequentialCount++
      }
    } else {
      maxRun = Math.max(maxRun, currentRun)
      currentRun = 1
    }
  }
  maxRun = Math.max(maxRun, currentRun)

  return {
    count: sequentialCount,
    maxRun,
  }
}

function containsCommonPattern(password) {
  if (!password || typeof password !== 'string') {
    return false
  }

  for (const pattern of COMMON_PATTERNS) {
    if (pattern.test(password)) {
      return true
    }
  }
  return false
}

function calculateAdjustedEntropy(password, options = {}) {
  const {
    accountForPatterns = true,
  } = options

  const rawEntropy = calculateRawEntropy(password)

  if (!accountForPatterns || rawEntropy === 0) {
    return {
      rawEntropy,
      adjustedEntropy: rawEntropy,
      deductions: [],
    }
  }

  const deductions = []
  let adjusted = rawEntropy

  const repeating = detectRepeatingChars(password)
  if (repeating.maxSequence >= 3) {
    const deduction = Math.min(repeating.count * 2, rawEntropy * 0.3)
    adjusted -= deduction
    deductions.push({
      type: 'repeating',
      maxSequence: repeating.maxSequence,
      deduction,
    })
  }

  const sequential = detectSequentialChars(password)
  if (sequential.maxRun >= 3) {
    const deduction = Math.min(sequential.count * 1.5, rawEntropy * 0.25)
    adjusted -= deduction
    deductions.push({
      type: 'sequential',
      maxRun: sequential.maxRun,
      deduction,
    })
  }

  if (containsCommonPattern(password)) {
    const deduction = Math.min(rawEntropy * 0.2, 10)
    adjusted -= deduction
    deductions.push({
      type: 'common_pattern',
      deduction,
    })
  }

  adjusted = Math.max(0, adjusted)

  return {
    rawEntropy,
    adjustedEntropy: adjusted,
    deductions,
  }
}

function getCharacteristics(password) {
  if (!password || typeof password !== 'string') {
    return {
      length: 0,
      hasLowercase: false,
      hasUppercase: false,
      hasDigit: false,
      hasSymbol: false,
      hasCommonPattern: false,
      repeating: { count: 0, maxSequence: 0 },
      sequential: { count: 0, maxRun: 0 },
    }
  }

  return {
    length: password.length,
    hasLowercase: LOWERCASE_REGEX.test(password),
    hasUppercase: UPPERCASE_REGEX.test(password),
    hasDigit: DIGIT_REGEX.test(password),
    hasSymbol: SYMBOL_REGEX.test(password),
    hasCommonPattern: containsCommonPattern(password),
    repeating: detectRepeatingChars(password),
    sequential: detectSequentialChars(password),
  }
}

function estimateStrength(entropy) {
  if (entropy < 28) {
    return {
      level: PASSWORD_STRENGTH_LEVELS.WEAK,
      score: 0,
      minEntropy: 0,
      maxEntropy: 28,
    }
  }
  if (entropy < 36) {
    return {
      level: PASSWORD_STRENGTH_LEVELS.FAIR,
      score: 1,
      minEntropy: 28,
      maxEntropy: 36,
    }
  }
  if (entropy < 60) {
    return {
      level: PASSWORD_STRENGTH_LEVELS.STRONG,
      score: 2,
      minEntropy: 36,
      maxEntropy: 60,
    }
  }
  return {
    level: PASSWORD_STRENGTH_LEVELS.VERY_STRONG,
    score: 3,
    minEntropy: 60,
    maxEntropy: Infinity,
  }
}

function analyzePassword(password, options = {}) {
  const {
    accountForPatterns = true,
  } = options

  const characteristics = getCharacteristics(password)
  const entropyResult = calculateAdjustedEntropy(password, { accountForPatterns })
  const strength = estimateStrength(entropyResult.adjustedEntropy)

  return {
    length: characteristics.length,
    poolSize: getPoolSize(password),
    ...entropyResult,
    characteristics,
    strength,
  }
}

function createMetadata(password, options = {}) {
  if (!password || typeof password !== 'string') {
    return {
      length: 0,
      rawEntropy: 0,
      adjustedEntropy: 0,
      strengthLevel: null,
      strengthScore: -1,
    }
  }

  const analysis = analyzePassword(password, options)

  return {
    length: analysis.length,
    rawEntropy: analysis.rawEntropy,
    adjustedEntropy: analysis.adjustedEntropy,
    strengthLevel: analysis.strength.level,
    strengthScore: analysis.strength.score,
    hasLowercase: analysis.characteristics.hasLowercase,
    hasUppercase: analysis.characteristics.hasUppercase,
    hasDigit: analysis.characteristics.hasDigit,
    hasSymbol: analysis.characteristics.hasSymbol,
  }
}

export {
  getPoolSize,
  calculateRawEntropy,
  detectRepeatingChars,
  detectSequentialChars,
  containsCommonPattern,
  calculateAdjustedEntropy,
  getCharacteristics,
  estimateStrength,
  analyzePassword,
  createMetadata,
}
