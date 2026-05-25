import { describe, test, expect } from 'vitest'
import {
  parseAuthData,
  parseFlags,
  getFlagDescriptions,
  parseCoseKeySummary,
  readUint32BE,
  decodeCborSimple,
} from '../logic/authData.js'

describe('authData parse', () => {
  describe('readUint32BE', () => {
    test('read uint32 big endian', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78])
      expect(readUint32BE(bytes, 0)).toBe(0x12345678)
    })

    test('read zero', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      expect(readUint32BE(bytes, 0)).toBe(0)
    })

    test('read max value', () => {
      const bytes = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF])
      expect(readUint32BE(bytes, 0)).toBe(0xFFFFFFFF)
    })

    test('read from offset', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x12, 0x34, 0x56, 0x78, 0x00, 0x00])
      expect(readUint32BE(bytes, 2)).toBe(0x12345678)
    })
  })

  describe('parseFlags', () => {
    test('parse UP flag', () => {
      const flags = parseFlags(0x01)
      expect(flags.userPresent).toBe(true)
      expect(flags.userVerified).toBe(false)
      expect(flags.attestedCredentialDataIncluded).toBe(false)
      expect(flags.extensionDataIncluded).toBe(false)
    })

    test('parse UV flag', () => {
      const flags = parseFlags(0x04)
      expect(flags.userPresent).toBe(false)
      expect(flags.userVerified).toBe(true)
    })

    test('parse AT flag', () => {
      const flags = parseFlags(0x40)
      expect(flags.attestedCredentialDataIncluded).toBe(true)
    })

    test('parse ED flag', () => {
      const flags = parseFlags(0x80)
      expect(flags.extensionDataIncluded).toBe(true)
    })

    test('parse combined flags', () => {
      const flags = parseFlags(0x45)
      expect(flags.userPresent).toBe(true)
      expect(flags.userVerified).toBe(true)
      expect(flags.attestedCredentialDataIncluded).toBe(true)
      expect(flags.extensionDataIncluded).toBe(false)
    })

    test('include raw flag value', () => {
      const flags = parseFlags(0x45)
      expect(flags.raw).toBe(0x45)
    })
  })

  describe('getFlagDescriptions', () => {
    test('return UP description', () => {
      const flags = parseFlags(0x01)
      const descriptions = getFlagDescriptions(flags)
      expect(descriptions).toContain('UP (user present)')
    })

    test('return UV description', () => {
      const flags = parseFlags(0x04)
      const descriptions = getFlagDescriptions(flags)
      expect(descriptions).toContain('UV (user verified)')
    })

    test('return AT description', () => {
      const flags = parseFlags(0x40)
      const descriptions = getFlagDescriptions(flags)
      expect(descriptions).toContain('AT (has credential data)')
    })

    test('return ED description', () => {
      const flags = parseFlags(0x80)
      const descriptions = getFlagDescriptions(flags)
      expect(descriptions).toContain('ED (has extension data)')
    })

    test('return multiple descriptions', () => {
      const flags = parseFlags(0x45)
      const descriptions = getFlagDescriptions(flags)
      expect(descriptions.length).toBe(3)
      expect(descriptions).toContain('UP (user present)')
      expect(descriptions).toContain('UV (user verified)')
      expect(descriptions).toContain('AT (has credential data)')
    })
  })

  describe('decodeCborSimple', () => {
    test('decode unsigned int', () => {
      const bytes = new Uint8Array([0x18, 0x2A])
      const result = decodeCborSimple(bytes, 0)
      expect(result.value).toBe(42)
    })

    test('decode negative int', () => {
      const bytes = new Uint8Array([0x20])
      const result = decodeCborSimple(bytes, 0)
      expect(result.value).toBe(-1)
    })

    test('decode byte string', () => {
      const bytes = new Uint8Array([0x44, 0x01, 0x02, 0x03, 0x04])
      const result = decodeCborSimple(bytes, 0)
      expect(result.value).toBeInstanceOf(Uint8Array)
      expect(result.value.length).toBe(4)
    })

    test('decode string', () => {
      const bytes = new Uint8Array([0x63, 0x66, 0x6F, 0x6F])
      const result = decodeCborSimple(bytes, 0)
      expect(result.value).toBe('foo')
    })

    test('decode array', () => {
      const bytes = new Uint8Array([0x83, 0x01, 0x02, 0x03])
      const result = decodeCborSimple(bytes, 0)
      expect(result.value).toEqual([1, 2, 3])
    })

    test('decode map', () => {
      const bytes = new Uint8Array([0xA2, 0x01, 0x02, 0x03, 0x04])
      const result = decodeCborSimple(bytes, 0)
      expect(result.value).toEqual({ 1: 2, 3: 4 })
    })
  })

  describe('parseCoseKeySummary', () => {
    test('parse ES256 public key (EC2)', () => {
      const coseKey = {
        1: 2,
        3: -7,
        [-1]: 1,
        [-2]: new Uint8Array([0x01, 0x02, 0x03]),
        [-3]: new Uint8Array([0x04, 0x05, 0x06]),
      }
      const result = parseCoseKeySummary(coseKey)
      expect(result.kty).toBe(2)
      expect(result.ktyName).toBe('EC2 (Elliptic Curve)')
      expect(result.alg).toBe(-7)
      expect(result.algName).toBe('ES256 (ECDSA w/ SHA-256)')
      expect(result.crv).toBe(1)
      expect(result.crvName).toBe('P-256')
      expect(result.x).toBeDefined()
      expect(result.y).toBeDefined()
    })

    test('parse EdDSA public key (OKP)', () => {
      const coseKey = {
        1: 1,
        3: -8,
        [-1]: 6,
        [-2]: new Uint8Array([0x01, 0x02, 0x03]),
      }
      const result = parseCoseKeySummary(coseKey)
      expect(result.kty).toBe(1)
      expect(result.ktyName).toBe('OKP (Octet Key Pair)')
      expect(result.alg).toBe(-8)
      expect(result.algName).toBe('EdDSA')
      expect(result.crv).toBe(6)
      expect(result.crvName).toBe('Ed25519')
      expect(result.x).toBeDefined()
    })

    test('parse RS256 public key (RSA)', () => {
      const coseKey = {
        1: 3,
        3: -257,
        [-1]: new Uint8Array([0x01, 0x02, 0x03]),
        [-2]: new Uint8Array([0x01, 0x00, 0x01]),
      }
      const result = parseCoseKeySummary(coseKey)
      expect(result.kty).toBe(3)
      expect(result.ktyName).toBe('RSA')
      expect(result.alg).toBe(-257)
      expect(result.algName).toBe('RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)')
      expect(result.n).toBeDefined()
      expect(result.e).toBeDefined()
    })
  })

  describe('parseAuthData', () => {
    test('parse minimal authData (fixed header only)', () => {
      const rpIdHash = new Uint8Array(32).fill(0xAA)
      const flags = 0x01
      const signCount = new Uint8Array([0x00, 0x00, 0x00, 0x05])
      const authDataBytes = new Uint8Array([...rpIdHash, flags, ...signCount])

      const result = parseAuthData(authDataBytes)

      expect(result.rpIdHash).toBeDefined()
      expect(result.rpIdHashHex).toBeDefined()
      expect(result.flags.userPresent).toBe(true)
      expect(result.signCount).toBe(5)
      expect(result.attestedCredentialData).toBeNull()
      expect(result.extensions).toBeNull()
    })

    test('throw error for invalid input type', () => {
      expect(() => parseAuthData(123)).toThrow('authData must be Base64URL string or Uint8Array')
      expect(() => parseAuthData(null)).toThrow('authData must be Base64URL string or Uint8Array')
    })
  })
})
