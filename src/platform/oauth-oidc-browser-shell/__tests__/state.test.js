import { ERROR_CODES, STATE } from '../logic/constants'
import {
    clearOAuthParams,
    consumeState,
    generateState,
    getStoredState,
    storeOAuthParams,
    validateState,
} from '../logic/storage'

describe('State 管理模块测试', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearOAuthParams()
  })

  describe('generateState', () => {
    it('应该生成指定长度的 state', () => {
      const state = generateState(32)
      expect(state).toHaveLength(32)
    })

    it('应该使用默认长度生成 state', () => {
      const state = generateState()
      expect(state).toHaveLength(STATE.DEFAULT_LENGTH)
    })

    it('每次调用应该生成不同的 state', () => {
      const state1 = generateState()
      const state2 = generateState()
      expect(state1).not.toBe(state2)
    })

    it('应该只包含安全的字符', () => {
      const state = generateState()
      const validChars = /^[A-Za-z0-9\-._~]+$/
      expect(validChars.test(state)).toBe(true)
    })
  })

  describe('storeOAuthParams', () => {
    it('应该正确存储 state 和相关参数', () => {
      const testState = 'test-state-123'
      storeOAuthParams({
        state: testState,
        nonce: 'test-nonce',
        codeVerifier: 'test-verifier',
        clientId: 'test-client',
        redirectUri: 'https://example.com/callback',
        scope: 'openid profile',
      })

      const storedState = getStoredState()
      expect(storedState).toBeDefined()
      expect(storedState.value).toBe(testState)
      expect(storedState.createdAt).toBeDefined()
      expect(storedState.ttl).toBe(STATE.DEFAULT_TTL_MS)
      expect(storedState.consumed).toBe(false)
    })
  })

  describe('validateState', () => {
    it('应该验证正确的 state', () => {
      const testState = 'test-state-123'
      storeOAuthParams({ state: testState })
      const result = validateState(testState)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该拒绝不存在的 state', () => {
      const result = validateState('non-existent-state')
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.STATE_MISMATCH)
    })

    it('应该拒绝不匹配的 state', () => {
      storeOAuthParams({ state: 'correct-state' })
      const result = validateState('wrong-state')
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.STATE_MISMATCH)
    })

    it('应该拒绝已消费的 state', () => {
      const testState = 'test-state-123'
      storeOAuthParams({ state: testState })
      consumeState()
      const result = validateState(testState)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.STATE_CONSUMED)
    })

    it('应该拒绝过期的 state', () => {
      const testState = 'test-state-123'
      storeOAuthParams({ state: testState })
      const storedState = getStoredState()
      storedState.createdAt = Date.now() - STATE.DEFAULT_TTL_MS - 1000
      sessionStorage.setItem('oauth_state', JSON.stringify(storedState))
      const result = validateState(testState)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.STATE_EXPIRED)
    })
  })

  describe('consumeState', () => {
    it('应该将 state 标记为已消费', () => {
      const testState = 'test-state-123'
      storeOAuthParams({ state: testState })
      let storedState = getStoredState()
      expect(storedState.consumed).toBe(false)
      consumeState()
      storedState = getStoredState()
      expect(storedState.consumed).toBe(true)
    })
  })

  describe('clearOAuthParams', () => {
    it('应该清除所有 OAuth 相关参数', () => {
      storeOAuthParams({
        state: 'test-state',
        nonce: 'test-nonce',
        codeVerifier: 'test-verifier',
        clientId: 'test-client',
        redirectUri: 'https://example.com/callback',
        scope: 'openid',
      })
      expect(getStoredState()).not.toBeNull()
      clearOAuthParams()
      expect(getStoredState()).toBeNull()
    })
  })

  describe('自定义存储键名', () => {
    it('应该支持自定义存储键名', () => {
      const customKey = 'my_custom_state_key'
      const testState = 'custom-state-123'
      storeOAuthParams({ state: testState }, { STATE: customKey })
      const retrievedState = getStoredState(customKey)
      expect(retrievedState.value).toBe(testState)
    })
  })
})
