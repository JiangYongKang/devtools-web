import {
  OAuthUiError,
  createError,
  isOAuthError,
  getErrorByCode,
  mapCallbackError,
  getAllErrorCodes,
  getErrorMetadata,
} from '../logic/errors'
import { ERROR_CODES, ERROR_MESSAGES, ERROR_RECOVERY_SUGGESTIONS } from '../logic/constants'

describe('错误处理模块测试', () => {
  describe('OAuthUiError 类', () => {
    it('应该创建具有正确属性的错误对象', () => {
      const errorCode = ERROR_CODES.STATE_MISMATCH
      const error = new OAuthUiError(errorCode)
      expect(error.name).toBe('OAuthUiError')
      expect(error.errorCode).toBe(errorCode)
      expect(error.message).toBe(ERROR_MESSAGES[errorCode])
      expect(error.recoverySuggestion).toBe(ERROR_RECOVERY_SUGGESTIONS[errorCode])
      expect(error.timestamp).toBeDefined()
    })

    it('应该包含自定义详情对象', () => {
      const details = { reason: 'test', value: 'abc123' }
      const error = new OAuthUiError(ERROR_CODES.STATE_MISMATCH, details)
      expect(error.details).toEqual(details)
    })

    it('toJSON 方法应该返回正确的序列化对象', () => {
      const error = new OAuthUiError(ERROR_CODES.MISSING_CODE)
      const json = error.toJSON()
      expect(json.name).toBe('OAuthUiError')
      expect(json.errorCode).toBe(ERROR_CODES.MISSING_CODE)
      expect(json.message).toBeDefined()
      expect(json.recoverySuggestion).toBeDefined()
      expect(json.timestamp).toBeDefined()
    })
  })

  describe('createError 函数', () => {
    it('应该创建 OAuthUiError 实例', () => {
      const error = createError(ERROR_CODES.CANCELED)
      expect(error instanceof OAuthUiError).toBe(true)
      expect(error.errorCode).toBe(ERROR_CODES.CANCELED)
    })

    it('应该正确传递详情参数', () => {
      const details = { error: 'access_denied', error_description: 'User canceled' }
      const error = createError(ERROR_CODES.CANCELED, details)
      expect(error.details).toEqual(details)
    })
  })

  describe('isOAuthError 函数', () => {
    it('应该正确识别 OAuthUiError 实例', () => {
      const error = createError(ERROR_CODES.STATE_MISMATCH)
      expect(isOAuthError(error)).toBe(true)
    })

    it('应该正确识别非 OAuthUiError 实例', () => {
      expect(isOAuthError(new Error('普通错误'))).toBe(false)
      expect(isOAuthError(null)).toBe(false)
      expect(isOAuthError(undefined)).toBe(false)
      expect(isOAuthError({})).toBe(false)
      expect(isOAuthError('字符串')).toBe(false)
    })
  })

  describe('getErrorByCode 函数', () => {
    it('应该根据错误码返回正确的错误对象', () => {
      const error = getErrorByCode(ERROR_CODES.INVALID_CONFIG)
      expect(error).toBeDefined()
      expect(error.errorCode).toBe(ERROR_CODES.INVALID_CONFIG)
    })

    it('对于未知错误码应该返回 null', () => {
      const error = getErrorByCode('UNKNOWN_ERROR_CODE')
      expect(error).toBeNull()
    })
  })

  describe('mapCallbackError 函数', () => {
    it('应该将 access_denied 映射为 CANCELED 错误', () => {
      const params = {
        error: 'access_denied',
        error_description: 'User denied access',
      }
      const error = mapCallbackError(params)
      expect(error).toBeDefined()
      expect(error.errorCode).toBe(ERROR_CODES.CANCELED)
      expect(error.details.error_description).toBe('User denied access')
    })

    it('应该将 server_error 映射为 SERVER_ERROR 错误', () => {
      const params = {
        error: 'server_error',
        error_description: 'Internal server error',
      }
      const error = mapCallbackError(params)
      expect(error).toBeDefined()
      expect(error.errorCode).toBe(ERROR_CODES.SERVER_ERROR)
      expect(error.details.error_description).toBe('Internal server error')
    })

    it('应该将 invalid_scope 映射为 INVALID_SCOPE 错误', () => {
      const params = {
        error: 'invalid_scope',
        error_description: 'Invalid scope requested',
      }
      const error = mapCallbackError(params)
      expect(error).toBeDefined()
      expect(error.errorCode).toBe(ERROR_CODES.INVALID_SCOPE)
    })

    it('应该将未知错误类型映射为 IDP_ERROR', () => {
      const params = {
        error: 'some_unknown_error',
        error_description: 'Unknown error',
      }
      const error = mapCallbackError(params)
      expect(error).toBeDefined()
      expect(error.errorCode).toBe(ERROR_CODES.IDP_ERROR)
    })

    it('对于无错误参数应该返回 null', () => {
      const error = mapCallbackError({ code: 'auth_code_123' })
      expect(error).toBeNull()
    })
  })

  describe('getAllErrorCodes 函数', () => {
    it('应该返回所有错误码列表', () => {
      const codes = getAllErrorCodes()
      expect(Array.isArray(codes)).toBe(true)
      expect(codes).toContain(ERROR_CODES.STATE_MISMATCH)
      expect(codes).toContain(ERROR_CODES.MISSING_CODE)
      expect(codes).toContain(ERROR_CODES.CANCELED)
      expect(codes).toContain(ERROR_CODES.INVALID_CONFIG)
    })
  })

  describe('getErrorMetadata 函数', () => {
    it('应该返回正确的错误元数据', () => {
      const metadata = getErrorMetadata(ERROR_CODES.STATE_MISMATCH)
      expect(metadata.code).toBe(ERROR_CODES.STATE_MISMATCH)
      expect(metadata.message).toBe(ERROR_MESSAGES[ERROR_CODES.STATE_MISMATCH])
      expect(metadata.recoverySuggestion).toBe(
        ERROR_RECOVERY_SUGGESTIONS[ERROR_CODES.STATE_MISMATCH]
      )
    })
  })

  describe('错误码完整性测试', () => {
    it('所有 ERROR_CODES 应该有对应的 ERROR_MESSAGES', () => {
      Object.values(ERROR_CODES).forEach((errorCode) => {
        expect(ERROR_MESSAGES[errorCode]).toBeDefined()
        expect(typeof ERROR_MESSAGES[errorCode]).toBe('string')
        expect(ERROR_MESSAGES[errorCode].length).toBeGreaterThan(0)
      })
    })

    it('所有 ERROR_CODES 应该有对应的 ERROR_RECOVERY_SUGGESTIONS', () => {
      Object.values(ERROR_CODES).forEach((errorCode) => {
        expect(ERROR_RECOVERY_SUGGESTIONS[errorCode]).toBeDefined()
        expect(typeof ERROR_RECOVERY_SUGGESTIONS[errorCode]).toBe('string')
      })
    })
  })

  describe('错误码定义验证', () => {
    it('应该包含所有必需的错误码', () => {
      const expectedErrorCodes = [
        'STATE_MISMATCH',
        'MISSING_CODE',
        'CANCELED',
        'INVALID_CONFIG',
        'STORAGE_NOT_AVAILABLE',
        'STATE_EXPIRED',
        'STATE_CONSUMED',
        'WELL_KNOWN_PARSE_FAILED',
        'INVALID_CODE_VERIFIER',
        'MISSING_NONCE',
      ]
      expectedErrorCodes.forEach((code) => {
        expect(ERROR_CODES[code]).toBeDefined()
      })
    })

    it('错误码值应该是唯一的', () => {
      const codes = Object.values(ERROR_CODES)
      const uniqueCodes = new Set(codes)
      expect(codes.length).toBe(uniqueCodes.size)
    })
  })
})
