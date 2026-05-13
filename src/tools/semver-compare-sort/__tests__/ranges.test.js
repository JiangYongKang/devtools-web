import { describe, test, expect } from 'vitest'
import {
  parseRange,
  satisfiesRange,
  findMaxInRange,
  findMinInRange,
} from '../logic/ranges.js'
import { parseVersion } from '../logic/semver.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('parseRange', () => {
  describe('caret operator (^)', () => {
    test('should parse ^1.2.3 for major > 0', () => {
      const result = parseRange('^1.2.3')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('^')
      expect(result.minVersion.major).toBe(1)
      expect(result.minVersion.minor).toBe(2)
      expect(result.minVersion.patch).toBe(3)
      expect(result.maxVersion.major).toBe(2)
      expect(result.maxVersion.minor).toBe(0)
      expect(result.maxVersion.patch).toBe(0)
    })

    test('should parse ^0.2.3 for major = 0', () => {
      const result = parseRange('^0.2.3')
      expect(result.valid).toBe(true)
      expect(result.maxVersion.major).toBe(0)
      expect(result.maxVersion.minor).toBe(3)
      expect(result.maxVersion.patch).toBe(0)
    })

    test('should parse ^0.0.3 for major = 0 and minor = 0', () => {
      const result = parseRange('^0.0.3')
      expect(result.valid).toBe(true)
      expect(result.maxVersion.major).toBe(0)
      expect(result.maxVersion.minor).toBe(0)
      expect(result.maxVersion.patch).toBe(4)
    })
  })

  describe('tilde operator (~)', () => {
    test('should parse ~1.2.3', () => {
      const result = parseRange('~1.2.3')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('~')
      expect(result.maxVersion.minor).toBe(3)
      expect(result.maxVersion.patch).toBe(0)
    })
  })

  describe('comparison operators', () => {
    test('should parse >1.0.0', () => {
      const result = parseRange('>1.0.0')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('>')
      expect(result.minVersion).not.toBeNull()
      expect(result.maxVersion).toBeNull()
    })

    test('should parse >=1.0.0', () => {
      const result = parseRange('>=1.0.0')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('>=')
    })

    test('should parse <1.0.0', () => {
      const result = parseRange('<1.0.0')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('<')
      expect(result.minVersion).toBeNull()
      expect(result.maxVersion).not.toBeNull()
    })

    test('should parse <=1.0.0', () => {
      const result = parseRange('<=1.0.0')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('<=')
    })

    test('should parse =1.0.0', () => {
      const result = parseRange('=1.0.0')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('=')
    })

    test('should default to equals when no operator', () => {
      const result = parseRange('1.0.0')
      expect(result.valid).toBe(true)
      expect(result.operator).toBe('=')
    })
  })

  describe('invalid ranges', () => {
    test('should reject empty range', () => {
      const result = parseRange('')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_RANGE)
    })

    test('should reject null range', () => {
      const result = parseRange(null)
      expect(result.valid).toBe(false)
    })

    test('should reject invalid version in range', () => {
      const result = parseRange('^invalid')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_RANGE)
    })
  })
})

describe('satisfiesRange', () => {
  describe('caret range', () => {
    test('should satisfy ^1.2.3', () => {
      const range = parseRange('^1.2.3')
      expect(satisfiesRange(parseVersion('1.2.3'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.2.5'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.3.0'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.99.99'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('2.0.0'), range).satisfies).toBe(false)
      expect(satisfiesRange(parseVersion('1.2.2'), range).satisfies).toBe(false)
    })
  })

  describe('tilde range', () => {
    test('should satisfy ~1.2.3', () => {
      const range = parseRange('~1.2.3')
      expect(satisfiesRange(parseVersion('1.2.3'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.2.5'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.2.99'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.3.0'), range).satisfies).toBe(false)
    })
  })

  describe('comparison ranges', () => {
    test('should satisfy >1.0.0', () => {
      const range = parseRange('>1.0.0')
      expect(satisfiesRange(parseVersion('1.0.1'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.0.0'), range).satisfies).toBe(false)
      expect(satisfiesRange(parseVersion('0.9.9'), range).satisfies).toBe(false)
    })

    test('should satisfy >=1.0.0', () => {
      const range = parseRange('>=1.0.0')
      expect(satisfiesRange(parseVersion('1.0.0'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('2.0.0'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('0.9.9'), range).satisfies).toBe(false)
    })

    test('should satisfy <1.0.0', () => {
      const range = parseRange('<1.0.0')
      expect(satisfiesRange(parseVersion('0.9.9'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.0.0'), range).satisfies).toBe(false)
    })

    test('should satisfy <=1.0.0', () => {
      const range = parseRange('<=1.0.0')
      expect(satisfiesRange(parseVersion('1.0.0'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('0.9.9'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.0.1'), range).satisfies).toBe(false)
    })

    test('should satisfy =1.0.0', () => {
      const range = parseRange('=1.0.0')
      expect(satisfiesRange(parseVersion('1.0.0'), range).satisfies).toBe(true)
      expect(satisfiesRange(parseVersion('1.0.1'), range).satisfies).toBe(false)
    })
  })

  describe('invalid inputs', () => {
    test('should not satisfy with invalid version', () => {
      const range = parseRange('^1.0.0')
      const invalidVersion = parseVersion('invalid')
      expect(satisfiesRange(invalidVersion, range).satisfies).toBe(false)
      expect(satisfiesRange(invalidVersion, range).reason).toBe('invalid_version')
    })

    test('should not satisfy with invalid range', () => {
      const invalidRange = parseRange('^invalid')
      const version = parseVersion('1.0.0')
      expect(satisfiesRange(version, invalidRange).satisfies).toBe(false)
      expect(satisfiesRange(version, invalidRange).reason).toBe('invalid_range')
    })
  })
})

describe('findMaxInRange', () => {
  test('should find max version in range', () => {
    const versions = [
      parseVersion('1.0.0'),
      parseVersion('1.2.3'),
      parseVersion('1.5.0'),
      parseVersion('2.0.0'),
    ]
    const range = parseRange('^1.0.0')

    const result = findMaxInRange(versions, range)
    expect(result).not.toBeNull()
    expect(result.major).toBe(1)
    expect(result.minor).toBe(5)
    expect(result.patch).toBe(0)
  })

  test('should return null when no version satisfies', () => {
    const versions = [parseVersion('0.5.0'), parseVersion('0.9.0')]
    const range = parseRange('^1.0.0')

    const result = findMaxInRange(versions, range)
    expect(result).toBeNull()
  })
})

describe('findMinInRange', () => {
  test('should find min version in range', () => {
    const versions = [
      parseVersion('1.0.0'),
      parseVersion('1.2.3'),
      parseVersion('1.5.0'),
      parseVersion('2.0.0'),
    ]
    const range = parseRange('^1.0.0')

    const result = findMinInRange(versions, range)
    expect(result).not.toBeNull()
    expect(result.major).toBe(1)
    expect(result.minor).toBe(0)
    expect(result.patch).toBe(0)
  })
})
