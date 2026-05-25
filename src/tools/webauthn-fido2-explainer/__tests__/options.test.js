import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  PUBLIC_KEY_ALGORITHMS,
  AUTHENTICATOR_ATTACHMENTS,
  USER_VERIFICATION_REQUIREMENTS,
  RESIDENT_KEY_REQUIREMENTS,
  ATTESTATION_CONVEYANCE_PREFERENCES,
  createRegistrationOptions,
  createAuthenticationOptions,
  createCredentialDescriptor,
  PASSKEY_REGISTRATION_TEMPLATE,
  PASSKEY_AUTHENTICATION_TEMPLATE,
} from '../logic/options.js'

describe('WebAuthn 选项生成', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'example.com',
      },
    })
    const mockCrypto = {
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i % 256
        }
        return arr
      },
    }
    vi.stubGlobal('crypto', mockCrypto)
  })

  describe('常量定义', () => {
    test('PUBLIC_KEY_ALGORITHMS 包含常用算法', () => {
      expect(PUBLIC_KEY_ALGORITHMS.length).toBeGreaterThan(0)
      expect(PUBLIC_KEY_ALGORITHMS.find(a => a.alg === -7)).toBeDefined()
      expect(PUBLIC_KEY_ALGORITHMS.find(a => a.alg === -257)).toBeDefined()
    })

    test('AUTHENTICATOR_ATTACHMENTS 包含两种挂载方式', () => {
      expect(AUTHENTICATOR_ATTACHMENTS.length).toBe(2)
      expect(AUTHENTICATOR_ATTACHMENTS.find(a => a.value === 'platform')).toBeDefined()
      expect(AUTHENTICATOR_ATTACHMENTS.find(a => a.value === 'cross-platform')).toBeDefined()
    })

    test('USER_VERIFICATION_REQUIREMENTS 包含三种选项', () => {
      expect(USER_VERIFICATION_REQUIREMENTS.length).toBe(3)
      expect(USER_VERIFICATION_REQUIREMENTS.find(r => r.value === 'required')).toBeDefined()
      expect(USER_VERIFICATION_REQUIREMENTS.find(r => r.value === 'preferred')).toBeDefined()
      expect(USER_VERIFICATION_REQUIREMENTS.find(r => r.value === 'discouraged')).toBeDefined()
    })

    test('RESIDENT_KEY_REQUIREMENTS 包含三种选项', () => {
      expect(RESIDENT_KEY_REQUIREMENTS.length).toBe(3)
    })

    test('ATTESTATION_CONVEYANCE_PREFERENCES 包含四种选项', () => {
      expect(ATTESTATION_CONVEYANCE_PREFERENCES.length).toBe(4)
    })

    test('PASSKEY_REGISTRATION_TEMPLATE 包含必要字段', () => {
      expect(PASSKEY_REGISTRATION_TEMPLATE.rpName).toBeDefined()
      expect(PASSKEY_REGISTRATION_TEMPLATE.userName).toBeDefined()
      expect(PASSKEY_REGISTRATION_TEMPLATE.userDisplayName).toBeDefined()
      expect(PASSKEY_REGISTRATION_TEMPLATE.residentKey).toBe('required')
      expect(PASSKEY_REGISTRATION_TEMPLATE.requireResidentKey).toBe(true)
    })

    test('PASSKEY_AUTHENTICATION_TEMPLATE 包含必要字段', () => {
      expect(PASSKEY_AUTHENTICATION_TEMPLATE.userVerification).toBeDefined()
      expect(PASSKEY_AUTHENTICATION_TEMPLATE.allowCredentials).toBeDefined()
    })
  })

  describe('createRegistrationOptions', () => {
    test('使用默认参数创建注册选项', () => {
      const options = createRegistrationOptions()

      expect(options.publicKey).toBeDefined()
      expect(options.publicKey.rp).toBeDefined()
      expect(options.publicKey.rp.name).toBe('示例应用')
      expect(options.publicKey.rp.id).toBe('example.com')
      expect(options.publicKey.user).toBeDefined()
      expect(options.publicKey.user.name).toBe('user@example.com')
      expect(options.publicKey.user.displayName).toBe('示例用户')
      expect(options.publicKey.user.id).toBeDefined()
      expect(options.publicKey.challenge).toBeDefined()
      expect(options.publicKey.pubKeyCredParams).toBeDefined()
      expect(options.publicKey.pubKeyCredParams.length).toBeGreaterThan(0)
      expect(options.publicKey.timeout).toBe(60000)
      expect(options.publicKey.attestation).toBe('none')
      expect(options.publicKey.authenticatorSelection).toBeDefined()
    })

    test('使用自定义参数创建注册选项', () => {
      const options = createRegistrationOptions({
        rpName: '我的应用',
        rpId: 'app.example.com',
        userName: 'test@example.com',
        userDisplayName: '测试用户',
        userId: 'custom-user-id',
        challenge: 'custom-challenge',
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
        requireResidentKey: true,
        attestation: 'direct',
        timeout: 120000,
      })

      expect(options.publicKey.rp.name).toBe('我的应用')
      expect(options.publicKey.rp.id).toBe('app.example.com')
      expect(options.publicKey.user.name).toBe('test@example.com')
      expect(options.publicKey.user.displayName).toBe('测试用户')
      expect(options.publicKey.user.id).toBe('custom-user-id')
      expect(options.publicKey.challenge).toBe('custom-challenge')
      expect(options.publicKey.authenticatorSelection.authenticatorAttachment).toBe('platform')
      expect(options.publicKey.authenticatorSelection.userVerification).toBe('required')
      expect(options.publicKey.authenticatorSelection.residentKey).toBe('required')
      expect(options.publicKey.authenticatorSelection.requireResidentKey).toBe(true)
      expect(options.publicKey.attestation).toBe('direct')
      expect(options.publicKey.timeout).toBe(120000)
    })

    test('authenticatorAttachment 为空时不包含在选项中', () => {
      const options = createRegistrationOptions({
        authenticatorAttachment: '',
      })

      expect(options.publicKey.authenticatorSelection.authenticatorAttachment).toBeUndefined()
    })

    test('pubKeyCredParams 包含正确的格式', () => {
      const options = createRegistrationOptions()
      options.publicKey.pubKeyCredParams.forEach(param => {
        expect(param.type).toBe('public-key')
        expect(typeof param.alg).toBe('number')
      })
    })
  })

  describe('createAuthenticationOptions', () => {
    test('使用默认参数创建认证选项', () => {
      const options = createAuthenticationOptions()

      expect(options.publicKey).toBeDefined()
      expect(options.publicKey.rpId).toBe('example.com')
      expect(options.publicKey.challenge).toBeDefined()
      expect(options.publicKey.userVerification).toBe('preferred')
      expect(options.publicKey.timeout).toBe(60000)
      expect(options.publicKey.allowCredentials).toEqual([])
    })

    test('使用自定义参数创建认证选项', () => {
      const allowCredentials = [
        { type: 'public-key', id: 'cred1', transports: ['usb'] },
      ]
      const options = createAuthenticationOptions({
        rpId: 'app.example.com',
        challenge: 'auth-challenge',
        userVerification: 'required',
        timeout: 90000,
        allowCredentials,
      })

      expect(options.publicKey.rpId).toBe('app.example.com')
      expect(options.publicKey.challenge).toBe('auth-challenge')
      expect(options.publicKey.userVerification).toBe('required')
      expect(options.publicKey.timeout).toBe(90000)
      expect(options.publicKey.allowCredentials).toEqual(allowCredentials)
    })
  })

  describe('createCredentialDescriptor', () => {
    test('创建凭证描述符', () => {
      const credentialId = 'test-credential-id'
      const descriptor = createCredentialDescriptor(credentialId)

      expect(descriptor.type).toBe('public-key')
      expect(descriptor.id).toBe(credentialId)
      expect(descriptor.transports).toBeDefined()
      expect(descriptor.transports.length).toBeGreaterThan(0)
    })

    test('使用自定义传输方式', () => {
      const credentialId = 'test-credential-id'
      const transports = ['usb', 'nfc']
      const descriptor = createCredentialDescriptor(credentialId, transports)

      expect(descriptor.transports).toEqual(transports)
    })
  })
})
