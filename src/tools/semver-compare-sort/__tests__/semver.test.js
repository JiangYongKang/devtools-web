import { describe, test, expect } from 'vitest'
import {
  parseVersion,
  compareVersions,
  comparePrerelease,
  compareBuild,
} from '../logic/semver.js'
import { ERROR_CODES, MAX_SAFE_INTEGER } from '../logic/errors.js'

describe('parseVersion', () => {
  describe('basic parsing', () => {
    test('should parse simple semver', () => {
      const result = parseVersion('1.2.3')
      expect(result.valid).toBe(true)
      expect(result.major).toBe(1)
      expect(result.minor).toBe(2)
      expect(result.patch).toBe(3)
      expect(result.normalized).toBe('1.2.3')
    })

    test('should parse with v prefix', () => {
      const result = parseVersion('v1.2.3')
      expect(result.valid).toBe(true)
      expect(result.major).toBe(1)
      expect(result.hasV).toBe(true)
      expect(result.normalized).toBe('1.2.3')
    })

    test('should parse with prerelease', () => {
      const result = parseVersion('1.2.3-alpha.1')
      expect(result.valid).toBe(true)
      expect(result.prerelease).toBe('alpha.1')
      expect(result.prereleaseTokens.length).toBe(2)
      expect(result.prereleaseTokens[0].type).toBe('alpha')
      expect(result.prereleaseTokens[0].value).toBe('alpha')
      expect(result.prereleaseTokens[1].type).toBe('numeric')
      expect(result.prereleaseTokens[1].value).toBe(1)
    })

    test('should parse with build metadata', () => {
      const result = parseVersion('1.2.3+build.123')
      expect(result.valid).toBe(true)
      expect(result.build).toBe('build.123')
      expect(result.buildTokens).toEqual(['build', '123'])
    })

    test('should parse with both prerelease and build', () => {
      const result = parseVersion('1.2.3-beta.2+sha.abc123')
      expect(result.valid).toBe(true)
      expect(result.prerelease).toBe('beta.2')
      expect(result.build).toBe('sha.abc123')
      expect(result.normalized).toBe('1.2.3-beta.2+sha.abc123')
    })

    test('should parse version 0', () => {
      const result = parseVersion('0.0.0')
      expect(result.valid).toBe(true)
      expect(result.major).toBe(0)
      expect(result.minor).toBe(0)
      expect(result.patch).toBe(0)
    })

    test('should strip leading spaces', () => {
      const result = parseVersion('  2.3.4  ')
      expect(result.valid).toBe(true)
      expect(result.major).toBe(2)
    })
  })

  describe('invalid versions', () => {
    test('should reject empty string', () => {
      const result = parseVersion('')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_VERSION_SEGMENT)
    })

    test('should reject null', () => {
      const result = parseVersion(null)
      expect(result.valid).toBe(false)
    })

    test('should reject non-version text', () => {
      const result = parseVersion('not-a-version')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_SEMVER)
    })

    test('should reject 2-segment version', () => {
      const result = parseVersion('1.2')
      expect(result.valid).toBe(false)
    })

    test('should reject 4-segment version', () => {
      const result = parseVersion('1.2.3.4')
      expect(result.valid).toBe(false)
    })

    test('should reject leading zeros', () => {
      const result = parseVersion('1.02.3')
      expect(result.valid).toBe(false)
    })

    test('should reject invalid prerelease format', () => {
      const result = parseVersion('1.2.3-!!invalid')
      expect(result.valid).toBe(false)
    })

    test('should reject invalid build metadata', () => {
      const result = parseVersion('1.2.3+!!invalid')
      expect(result.valid).toBe(false)
    })

    test('should reject number too large', () => {
      const largeNum = MAX_SAFE_INTEGER + 1
      const result = parseVersion(`${largeNum}.0.0`)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.VERSION_NUMBER_TOO_LARGE)
    })
  })
})

describe('compareVersions', () => {
  test('should compare major versions', () => {
    const v1 = parseVersion('1.0.0')
    const v2 = parseVersion('2.0.0')
    expect(compareVersions(v1, v2)).toBeLessThan(0)
    expect(compareVersions(v2, v1)).toBeGreaterThan(0)
  })

  test('should compare minor versions', () => {
    const v1 = parseVersion('1.1.0')
    const v2 = parseVersion('1.2.0')
    expect(compareVersions(v1, v2)).toBeLessThan(0)
  })

  test('should compare patch versions', () => {
    const v1 = parseVersion('1.0.1')
    const v2 = parseVersion('1.0.2')
    expect(compareVersions(v1, v2)).toBeLessThan(0)
  })

  test('should treat non-prerelease as greater', () => {
    const v1 = parseVersion('1.0.0')
    const v2 = parseVersion('1.0.0-alpha')
    expect(compareVersions(v1, v2)).toBeGreaterThan(0)
  })

  test('should compare prerelease by known keywords', () => {
    const alpha = parseVersion('1.0.0-alpha')
    const beta = parseVersion('1.0.0-beta')
    const rc = parseVersion('1.0.0-rc')
    const snapshot = parseVersion('1.0.0-snapshot')

    expect(compareVersions(snapshot, alpha)).toBeLessThan(0)
    expect(compareVersions(alpha, beta)).toBeLessThan(0)
    expect(compareVersions(beta, rc)).toBeLessThan(0)
  })

  test('should compare prerelease numeric identifiers', () => {
    const v1 = parseVersion('1.0.0-alpha.1')
    const v2 = parseVersion('1.0.0-alpha.2')
    expect(compareVersions(v1, v2)).toBeLessThan(0)
  })

  test('should compare prerelease length', () => {
    const v1 = parseVersion('1.0.0-alpha')
    const v2 = parseVersion('1.0.0-alpha.1')
    expect(compareVersions(v1, v2)).toBeLessThan(0)
  })

  test('should ignore build metadata by default', () => {
    const v1 = parseVersion('1.0.0+build1')
    const v2 = parseVersion('1.0.0+build2')
    expect(compareVersions(v1, v2)).toBe(0)
  })

  test('should include build metadata when requested', () => {
    const v1 = parseVersion('1.0.0+build1')
    const v2 = parseVersion('1.0.0+build2')
    expect(compareVersions(v1, v2, { includeBuild: true })).toBeLessThan(0)
  })

  test('should return 0 for equal versions', () => {
    const v1 = parseVersion('1.2.3-alpha.1+build')
    const v2 = parseVersion('1.2.3-alpha.1+build')
    expect(compareVersions(v1, v2)).toBe(0)
  })

  test('should compare numeric vs alpha in prerelease', () => {
    const v1 = parseVersion('1.0.0-1')
    const v2 = parseVersion('1.0.0-alpha')
    expect(compareVersions(v1, v2)).toBeLessThan(0)
  })
})

describe('comparePrerelease', () => {
  test('should return 0 when both have no prerelease', () => {
    expect(comparePrerelease([], [])).toBe(0)
  })

  test('should return 1 when a has no prerelease but b does', () => {
    const a = parseVersion('1.0.0')
    const b = parseVersion('1.0.0-alpha')
    expect(comparePrerelease(a.prereleaseTokens, b.prereleaseTokens)).toBe(1)
  })

  test('should return -1 when a has prerelease but b does not', () => {
    const a = parseVersion('1.0.0-alpha')
    const b = parseVersion('1.0.0')
    expect(comparePrerelease(a.prereleaseTokens, b.prereleaseTokens)).toBe(-1)
  })
})

describe('compareBuild', () => {
  test('should compare build metadata numeric tokens', () => {
    const v1 = parseVersion('1.0.0+1')
    const v2 = parseVersion('1.0.0+2')
    expect(compareBuild(v1.buildTokens, v2.buildTokens)).toBeLessThan(0)
  })

  test('should compare build metadata alpha tokens', () => {
    const v1 = parseVersion('1.0.0+a')
    const v2 = parseVersion('1.0.0+b')
    expect(compareBuild(v1.buildTokens, v2.buildTokens)).toBeLessThan(0)
  })

  test('should compare build metadata length', () => {
    const v1 = parseVersion('1.0.0+a')
    const v2 = parseVersion('1.0.0+a.1')
    expect(compareBuild(v1.buildTokens, v2.buildTokens)).toBeLessThan(0)
  })

  test('should prioritize numeric over alpha in build', () => {
    const v1 = parseVersion('1.0.0+1')
    const v2 = parseVersion('1.0.0+a')
    expect(compareBuild(v1.buildTokens, v2.buildTokens)).toBeLessThan(0)
  })
})
