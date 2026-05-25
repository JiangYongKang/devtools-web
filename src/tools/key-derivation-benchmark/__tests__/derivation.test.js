import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
} from '../logic/errors.js'
import {
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  isHexString,
  parseSaltInput,
  median,
  generateSalt,
} from '../logic/utils.js'
import {
  validatePbkdf2Params,
  checkWeakPbkdf2Params,
} from '../logic/pbkdf2.js'
import {
  validateScryptParams,
  checkWeakScryptParams,
} from '../logic/scrypt.js'
import {
  validateArgon2Params,
  checkWeakArgon2Params,
} from '../logic/argon2.js'
import {
  ALGORITHMS,
  OWASP_RECOMMENDATIONS,
  WEAK_PARAMETER_THRESHOLDS,
  DEFAULT_PARAMS,
} from '../logic/constants.js'

describe('errors 模块', () => {
  describe('ERROR_CODES', () => {
    test('应包含所有必需的错误码', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.EMPTY_PASSWORD).toBe('EMPTY_PASSWORD')
      expect(ERROR_CODES.INVALID_SALT).toBe('INVALID_SALT')
      expect(ERROR_CODES.INVALID_ITERATIONS).toBe('INVALID_ITERATIONS')
      expect(ERROR_CODES.INVALID_KEY_LENGTH).toBe('INVALID_KEY_LENGTH')
      expect(ERROR_CODES.UNSUPPORTED_ALGORITHM).toBe('UNSUPPORTED_ALGORITHM')
      expect(ERROR_CODES.DERIVATION_FAILED).toBe('DERIVATION_FAILED')
      expect(ERROR_CODES.INVALID_HEX).toBe('INVALID_HEX')
      expect(ERROR_CODES.WEAK_PARAMETERS).toBe('WEAK_PARAMETERS')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('应为所有错误码提供消息', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('getErrorMessage', () => {
    test('应返回已知错误码的正确消息', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
      expect(getErrorMessage(ERROR_CODES.EMPTY_PASSWORD)).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_PASSWORD])
    })

    test('未知错误码应返回默认消息', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('应创建包含正确错误码和默认消息的错误对象', () => {
      const result = createError(ERROR_CODES.INVALID_ITERATIONS)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ITERATIONS)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_ITERATIONS])
    })

    test('应创建包含自定义消息的错误对象', () => {
      const customMessage = '自定义错误消息'
      const result = createError(ERROR_CODES.INVALID_ITERATIONS, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ITERATIONS)
      expect(result.errorMessage).toBe(customMessage)
    })
  })
})

describe('utils 模块', () => {
  describe('generateSalt', () => {
    test('应生成指定长度的随机字节数组', () => {
      const length = 16
      const salt = generateSalt(length)
      expect(salt.constructor.name).toBe('Uint8Array')
      expect(salt.length).toBe(length)
    })

    test('每次调用应生成不同的盐值', () => {
      const salt1 = generateSalt(16)
      const salt2 = generateSalt(16)
      expect(Array.from(salt1)).not.toEqual(Array.from(salt2))
    })
  })

  describe('bytesToHex', () => {
    test('应将字节数组转换为十六进制字符串', () => {
      const bytes = new Uint8Array([0x00, 0xff, 0x1a, 0x2b])
      const hex = bytesToHex(bytes)
      expect(hex).toBe('00ff1a2b')
    })

    test('应正确处理空数组', () => {
      const bytes = new Uint8Array([])
      const hex = bytesToHex(bytes)
      expect(hex).toBe('')
    })
  })

  describe('hexToBytes', () => {
    test('应将有效的十六进制字符串转换为字节数组', () => {
      const result = hexToBytes('00ff1a2b')
      expect(result.error).toBeUndefined()
      expect(result.bytes.constructor.name).toBe('Uint8Array')
      expect(Array.from(result.bytes)).toEqual([0x00, 0xff, 0x1a, 0x2b])
    })

    test('应处理带空格的十六进制字符串', () => {
      const result = hexToBytes('00 ff 1a 2b')
      expect(result.error).toBeUndefined()
      expect(Array.from(result.bytes)).toEqual([0x00, 0xff, 0x1a, 0x2b])
    })

    test('长度为奇数时应返回错误', () => {
      const result = hexToBytes('00f')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_HEX)
    })

    test('包含无效字符时应返回错误', () => {
      const result = hexToBytes('00gg')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_HEX)
    })

    test('非字符串输入应返回错误', () => {
      const result = hexToBytes(123)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_HEX)
    })
  })

  describe('bytesToBase64', () => {
    test('应将字节数组转换为Base64字符串', () => {
      const bytes = new Uint8Array([0x00, 0xff, 0x1a, 0x2b])
      const base64 = bytesToBase64(bytes)
      expect(base64).toBe('AP8aKw==')
    })
  })

  describe('base64ToBytes', () => {
    test('应将有效的Base64字符串转换为字节数组', () => {
      const result = base64ToBytes('AP8aKw==')
      expect(result.error).toBeUndefined()
      expect(Array.from(result.bytes)).toEqual([0x00, 0xff, 0x1a, 0x2b])
    })

    test('无效的Base64字符串应返回错误', () => {
      const result = base64ToBytes('!!!invalid')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_BASE64)
    })
  })

  describe('stringToBytes', () => {
    test('应将字符串转换为UTF-8字节数组', () => {
      const bytes = stringToBytes('hello')
      expect(bytes.constructor.name).toBe('Uint8Array')
      expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
    })
  })

  describe('isHexString', () => {
    test('应正确识别有效的十六进制字符串', () => {
      expect(isHexString('00ff1a2b')).toBe(true)
      expect(isHexString('00FF1A2B')).toBe(true)
      expect(isHexString('00 ff 1a 2b')).toBe(true)
    })

    test('应正确识别无效的十六进制字符串', () => {
      expect(isHexString('00gg')).toBe(false)
      expect(isHexString('00f')).toBe(false)
      expect(isHexString('')).toBe(true)
      expect(isHexString(null)).toBe(false)
    })
  })

  describe('parseSaltInput', () => {
    test('空输入应生成随机盐值', () => {
      const result = parseSaltInput('', 16)
      expect(result.salt.constructor.name).toBe('Uint8Array')
      expect(result.salt.length).toBe(16)
      expect(result.isRandom).toBe(true)
    })

    test('十六进制输入应解析为字节数组', () => {
      const result = parseSaltInput('00ff1a2b', 16)
      expect(result.isRandom).toBe(false)
      expect(Array.from(result.salt)).toEqual([0x00, 0xff, 0x1a, 0x2b])
    })

    test('普通字符串应转换为字节数组', () => {
      const result = parseSaltInput('mysalt', 16)
      expect(result.isRandom).toBe(false)
      expect(Array.from(result.salt)).toEqual([109, 121, 115, 97, 108, 116])
    })
  })

  describe('median', () => {
    test('奇数个元素应返回中间值', () => {
      expect(median([1, 3, 5])).toBe(3)
      expect(median([5, 1, 3])).toBe(3)
    })

    test('偶数个元素应返回中间两个值的平均', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5)
    })

    test('空数组应返回0', () => {
      expect(median([])).toBe(0)
    })
  })
})

describe('PBKDF2 参数验证', () => {
  const validParams = {
    password: 'password',
    salt: new Uint8Array([1, 2, 3, 4]),
    iterations: 100000,
    hash: 'SHA-256',
    keyLength: 32,
  }

  describe('validatePbkdf2Params', () => {
    test('有效参数应返回 valid=true', () => {
      const result = validatePbkdf2Params(validParams)
      expect(result.valid).toBe(true)
    })

    test('null 密码应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, password: null })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('空密码应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, password: '' })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_PASSWORD)
    })

    test('null 盐值应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, salt: null })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SALT)
    })

    test('空盐值应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, salt: new Uint8Array([]) })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SALT)
    })

    test('迭代次数为0应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, iterations: 0 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ITERATIONS)
    })

    test('迭代次数为负数应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, iterations: -1 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ITERATIONS)
    })

    test('非整数迭代次数应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, iterations: 1000.5 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ITERATIONS)
    })

    test('无效哈希算法应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, hash: 'INVALID' })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.UNSUPPORTED_ALGORITHM)
    })

    test('密钥长度为0应返回无效', () => {
      const result = validatePbkdf2Params({ ...validParams, keyLength: 0 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_KEY_LENGTH)
    })
  })

  describe('checkWeakPbkdf2Params', () => {
    test('低迭代次数应返回警告', () => {
      const warnings = checkWeakPbkdf2Params({ iterations: 1000, hash: 'SHA-256' })
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0].type).toBe('weak_iterations')
    })

    test('高迭代次数不应返回警告', () => {
      const warnings = checkWeakPbkdf2Params({ iterations: 1000000, hash: 'SHA-256' })
      expect(warnings.length).toBe(0)
    })
  })
})

describe('scrypt 参数验证', () => {
  const validParams = {
    password: 'password',
    salt: new Uint8Array([1, 2, 3, 4]),
    N: 32768,
    r: 8,
    p: 1,
    keyLength: 32,
  }

  describe('validateScryptParams', () => {
    test('有效参数应返回 valid=true', () => {
      const result = validateScryptParams(validParams)
      expect(result.valid).toBe(true)
    })

    test('N 不是 2 的幂应返回无效', () => {
      const result = validateScryptParams({ ...validParams, N: 1000 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCRYPT_PARAMS)
    })

    test('N 小于等于 1 应返回无效', () => {
      const result = validateScryptParams({ ...validParams, N: 1 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCRYPT_PARAMS)
    })

    test('r 为 0 应返回无效', () => {
      const result = validateScryptParams({ ...validParams, r: 0 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCRYPT_PARAMS)
    })

    test('p 为 0 应返回无效', () => {
      const result = validateScryptParams({ ...validParams, p: 0 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCRYPT_PARAMS)
    })
  })

  describe('checkWeakScryptParams', () => {
    test('低 N 值应返回警告', () => {
      const warnings = checkWeakScryptParams({ N: 1024, r: 8 })
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0].type).toBe('weak_n')
    })

    test('低 r 值应返回警告', () => {
      const warnings = checkWeakScryptParams({ N: 65536, r: 1 })
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0].type).toBe('weak_r')
    })

    test('强参数不应返回警告', () => {
      const warnings = checkWeakScryptParams({ N: 65536, r: 8 })
      expect(warnings.length).toBe(0)
    })
  })
})

describe('Argon2 参数验证', () => {
  const validParams = {
    password: 'password',
    salt: new Uint8Array([1, 2, 3, 4]),
    memory: 12288,
    iterations: 3,
    parallelism: 1,
    keyLength: 32,
    type: 'id',
  }

  describe('validateArgon2Params', () => {
    test('有效参数应返回 valid=true', () => {
      const result = validateArgon2Params(validParams)
      expect(result.valid).toBe(true)
    })

    test('内存过小应返回无效', () => {
      const result = validateArgon2Params({ ...validParams, memory: 4 })
      expect(result.valid).toBe(false)
    })

    test('迭代次数为0应返回无效', () => {
      const result = validateArgon2Params({ ...validParams, iterations: 0 })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ITERATIONS)
    })

    test('无效类型应返回无效', () => {
      const result = validateArgon2Params({ ...validParams, type: 'invalid' })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.UNSUPPORTED_ALGORITHM)
    })
  })

  describe('checkWeakArgon2Params', () => {
    test('低内存应返回警告', () => {
      const warnings = checkWeakArgon2Params({ memory: 1024, iterations: 3 })
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0].type).toBe('weak_memory')
    })

    test('低迭代次数应返回警告', () => {
      const warnings = checkWeakArgon2Params({ memory: 12288, iterations: 1 })
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0].type).toBe('weak_iterations')
    })

    test('强参数不应返回警告', () => {
      const warnings = checkWeakArgon2Params({ memory: 12288, iterations: 3 })
      expect(warnings.length).toBe(0)
    })
  })
})

describe('constants 模块', () => {
  test('ALGORITHMS 应包含所有算法', () => {
    expect(ALGORITHMS.PBKDF2).toBe('pbkdf2')
    expect(ALGORITHMS.SCRYPT).toBe('scrypt')
    expect(ALGORITHMS.ARGON2).toBe('argon2')
  })

  test('OWASP_RECOMMENDATIONS 应包含 PBKDF2 推荐', () => {
    expect(OWASP_RECOMMENDATIONS.PBKDF2.SHA256.iterations).toBeGreaterThan(0)
  })

  test('WEAK_PARAMETER_THRESHOLDS 应包含 PBKDF2 阈值', () => {
    expect(WEAK_PARAMETER_THRESHOLDS.PBKDF2.SHA256.minIterations).toBeGreaterThan(0)
  })

  test('DEFAULT_PARAMS 应包含合理的默认值', () => {
    expect(DEFAULT_PARAMS.PBKDF2.iterations).toBeGreaterThan(0)
    expect(DEFAULT_PARAMS.PBKDF2.keyLength).toBeGreaterThan(0)
  })
})
