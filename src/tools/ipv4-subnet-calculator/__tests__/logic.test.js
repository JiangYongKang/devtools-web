import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
} from '../logic/errors.js'
import {
  parseIPv4,
  parseOctet,
  octetsToInt,
  intToOctets,
  intToDotted,
  octetsToDotted,
  prefixToMaskInt,
  prefixToMaskDotted,
  maskIntToPrefix,
  maskDottedToPrefix,
  isPrefixValid,
  validatePrefixOrMask,
  buildBinaryRows,
  getHostCount,
  getHostRange,
  buildWarnings,
  calculateSubnetSplits,
  buildDerivedInput,
  intTo8BitBinary,
  EXAMPLES,
} from '../logic/index.js'

describe('errors module', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.INVALID_IPV4).toBe('INVALID_IPV4')
      expect(ERROR_CODES.INVALID_MASK).toBe('INVALID_MASK')
      expect(ERROR_CODES.NON_CONTIGUOUS_MASK).toBe('NON_CONTIGUOUS_MASK')
      expect(ERROR_CODES.PREFIX_OUT_OF_RANGE).toBe('PREFIX_OUT_OF_RANGE')
      expect(ERROR_CODES.CONFLICTING_INPUT).toBe('CONFLICTING_INPUT')
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('should have messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('getErrorMessage', () => {
    test('should return correct message for known error codes', () => {
      expect(getErrorMessage(ERROR_CODES.INVALID_IPV4)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_IPV4])
      expect(getErrorMessage(ERROR_CODES.NON_CONTIGUOUS_MASK)).toBe(ERROR_MESSAGES[ERROR_CODES.NON_CONTIGUOUS_MASK])
    })

    test('should return default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('should create error object with correct code and default message', () => {
      const result = createError(ERROR_CODES.INVALID_IPV4)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_IPV4)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_IPV4])
    })

    test('should create error object with custom message', () => {
      const customMessage = 'Custom error message'
      const result = createError(ERROR_CODES.INVALID_IPV4, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_IPV4)
      expect(result.errorMessage).toBe(customMessage)
    })
  })
})

describe('basic IP conversion functions', () => {
  describe('parseOctet', () => {
    test('should parse valid octets', () => {
      expect(parseOctet('0')).toBe(0)
      expect(parseOctet('255')).toBe(255)
      expect(parseOctet('128')).toBe(128)
      expect(parseOctet('  10  ')).toBe(10)
    })

    test('should return null for invalid octets', () => {
      expect(parseOctet('-1')).toBeNull()
      expect(parseOctet('256')).toBeNull()
      expect(parseOctet('abc')).toBeNull()
      expect(parseOctet('')).toBeNull()
      expect(parseOctet(null)).toBeNull()
      expect(parseOctet('12.5')).toBeNull()
    })
  })

  describe('parseIPv4', () => {
    test('should parse valid IPv4 addresses', () => {
      const result = parseIPv4('192.168.1.1')
      expect(result.error).toBeUndefined()
      expect(result.octets).toEqual([192, 168, 1, 1])
      expect(result.int).toBe(0xc0a80101)
    })

    test('should parse edge case addresses', () => {
      const result1 = parseIPv4('0.0.0.0')
      expect(result1.error).toBeUndefined()
      expect(result1.octets).toEqual([0, 0, 0, 0])

      const result2 = parseIPv4('255.255.255.255')
      expect(result2.error).toBeUndefined()
      expect(result2.octets).toEqual([255, 255, 255, 255])
    })

    test('should return error for invalid IPv4', () => {
      expect(parseIPv4('').error).toBeDefined()
      expect(parseIPv4(null).error).toBeDefined()
      expect(parseIPv4('192.168.1').error).toBeDefined()
      expect(parseIPv4('192.168.1.1.1').error).toBeDefined()
      expect(parseIPv4('192.168.1.256').error).toBeDefined()
      expect(parseIPv4('abc.def.ghi.jkl').error).toBeDefined()
    })
  })

  describe('octetsToInt / intToOctets', () => {
    test('should convert octets to int and back', () => {
      const octets = [192, 168, 1, 100]
      const intVal = octetsToInt(octets)
      expect(intVal).toBe(0xc0a80164)
      expect(intToOctets(intVal)).toEqual(octets)
    })

    test('should handle zero and max values', () => {
      expect(octetsToInt([0, 0, 0, 0])).toBe(0)
      expect(intToOctets(0)).toEqual([0, 0, 0, 0])

      expect(octetsToInt([255, 255, 255, 255])).toBe(0xffffffff)
      expect(intToOctets(0xffffffff)).toEqual([255, 255, 255, 255])
    })
  })

  describe('intToDotted / octetsToDotted', () => {
    test('should convert to dotted notation', () => {
      expect(intToDotted(0xc0a80101)).toBe('192.168.1.1')
      expect(octetsToDotted([10, 0, 0, 1])).toBe('10.0.0.1')
    })
  })
})

describe('prefix and mask conversion', () => {
  describe('prefixToMaskInt / prefixToMaskDotted', () => {
    test('should convert prefix to mask', () => {
      expect(prefixToMaskInt(8)).toBe(0xff000000)
      expect(prefixToMaskInt(16)).toBe(0xffff0000)
      expect(prefixToMaskInt(24)).toBe(0xffffff00)
      expect(prefixToMaskInt(32)).toBe(0xffffffff)
      expect(prefixToMaskInt(0)).toBe(0)

      expect(prefixToMaskDotted(24)).toBe('255.255.255.0')
      expect(prefixToMaskDotted(16)).toBe('255.255.0.0')
      expect(prefixToMaskDotted(8)).toBe('255.0.0.0')
    })
  })

  describe('maskIntToPrefix', () => {
    test('should convert valid contiguous masks to prefix', () => {
      expect(maskIntToPrefix(0xff000000)).toBe(8)
      expect(maskIntToPrefix(0xffff0000)).toBe(16)
      expect(maskIntToPrefix(0xffffff00)).toBe(24)
      expect(maskIntToPrefix(0xffffffc0)).toBe(26)
      expect(maskIntToPrefix(0xffffffff)).toBe(32)
      expect(maskIntToPrefix(0)).toBe(0)
    })

    test('should return -1 for non-contiguous masks', () => {
      expect(maskIntToPrefix(0xff00ff00)).toBe(-1)
      expect(maskIntToPrefix(0x00ffffff)).toBe(-1)
      expect(maskIntToPrefix(0x55555555)).toBe(-1)
    })
  })

  describe('maskDottedToPrefix', () => {
    test('should convert dotted mask to prefix', () => {
      expect(maskDottedToPrefix('255.255.255.0').prefix).toBe(24)
      expect(maskDottedToPrefix('255.255.0.0').prefix).toBe(16)
      expect(maskDottedToPrefix('255.255.255.252').prefix).toBe(30)
    })

    test('should return error for invalid mask format', () => {
      expect(maskDottedToPrefix('abc').error).toBeDefined()
      expect(maskDottedToPrefix('256.0.0.0').error).toBeDefined()
    })

    test('should return error for non-contiguous mask', () => {
      const result = maskDottedToPrefix('255.0.255.0')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.NON_CONTIGUOUS_MASK)
    })
  })

  describe('isPrefixValid', () => {
    test('should validate prefix range', () => {
      expect(isPrefixValid(1)).toBe(true)
      expect(isPrefixValid(24)).toBe(true)
      expect(isPrefixValid(32)).toBe(true)
      expect(isPrefixValid(0)).toBe(false)
      expect(isPrefixValid(33)).toBe(false)
      expect(isPrefixValid('abc')).toBe(false)
      expect(isPrefixValid(24.5)).toBe(false)
    })
  })
})

describe('validatePrefixOrMask', () => {
  test('should validate with prefix only', () => {
    const result = validatePrefixOrMask({ prefixLengthOrNull: 24, maskDottedOrNull: null })
    expect(result.error).toBeUndefined()
    expect(result.hasPrefix).toBe(true)
    expect(result.prefix).toBe(24)
    expect(result.maskDotted).toBe('255.255.255.0')
  })

  test('should validate with mask only', () => {
    const result = validatePrefixOrMask({ prefixLengthOrNull: null, maskDottedOrNull: '255.255.0.0' })
    expect(result.error).toBeUndefined()
    expect(result.hasPrefix).toBe(true)
    expect(result.prefix).toBe(16)
  })

  test('should validate with matching prefix and mask', () => {
    const result = validatePrefixOrMask({ prefixLengthOrNull: 16, maskDottedOrNull: '255.255.0.0' })
    expect(result.error).toBeUndefined()
    expect(result.prefix).toBe(16)
  })

  test('should return error for conflicting prefix and mask', () => {
    const result = validatePrefixOrMask({ prefixLengthOrNull: 24, maskDottedOrNull: '255.255.0.0' })
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.CONFLICTING_INPUT)
  })

  test('should return error for out of range prefix', () => {
    const result1 = validatePrefixOrMask({ prefixLengthOrNull: 0, maskDottedOrNull: null })
    expect(result1.error).toBeDefined()
    expect(result1.error.errorCode).toBe(ERROR_CODES.PREFIX_OUT_OF_RANGE)

    const result2 = validatePrefixOrMask({ prefixLengthOrNull: 33, maskDottedOrNull: null })
    expect(result2.error).toBeDefined()
  })

  test('should return hasPrefix false when neither provided', () => {
    const result = validatePrefixOrMask({ prefixLengthOrNull: null, maskDottedOrNull: null })
    expect(result.error).toBeUndefined()
    expect(result.hasPrefix).toBe(false)
  })
})

describe('host count and range', () => {
  describe('getHostCount', () => {
    test('should calculate host counts correctly', () => {
      expect(getHostCount(24).toString()).toBe('254')
      expect(getHostCount(16).toString()).toBe('65534')
      expect(getHostCount(8).toString()).toBe('16777214')
      expect(getHostCount(30).toString()).toBe('2')
      expect(getHostCount(31).toString()).toBe('2')
      expect(getHostCount(32).toString()).toBe('1')
    })
  })

  describe('getHostRange', () => {
    test('should get host range for normal network', () => {
      const range = getHostRange({ networkInt: 0xc0a80100, broadcastInt: 0xc0a801ff, prefix: 24 })
      expect(range.firstHostInt).toBe(0xc0a80101)
      expect(range.lastHostInt).toBe(0xc0a801fe)
    })

    test('should get host range for /31 network', () => {
      const range = getHostRange({ networkInt: 0x0a010202, broadcastInt: 0x0a010203, prefix: 31 })
      expect(range.firstHostInt).toBe(0x0a010202)
      expect(range.lastHostInt).toBe(0x0a010203)
    })

    test('should get host range for /32 network', () => {
      const range = getHostRange({ networkInt: 0x08080808, broadcastInt: 0x08080808, prefix: 32 })
      expect(range.firstHostInt).toBe(0x08080808)
      expect(range.lastHostInt).toBe(0x08080808)
    })
  })
})

describe('buildDerivedInput - main calculation', () => {
  test('should calculate network for 192.168.1.100/24', () => {
    const result = buildDerivedInput({
      addressDotted: '192.168.1.100',
      prefixLengthOrNull: 24,
      maskDottedOrNull: null,
    })

    expect(result.errorCode).toBeNull()
    expect(result.networkAddress).toBe('192.168.1.0')
    expect(result.broadcastAddress).toBe('192.168.1.255')
    expect(result.firstHost).toBe('192.168.1.1')
    expect(result.lastHost).toBe('192.168.1.254')
    expect(result.maskDotted).toBe('255.255.255.0')
    expect(result.wildcardMask).toBe('0.0.0.255')
    expect(result.prefix).toBe(24)
    expect(result.hostCount.toString()).toBe('254')
  })

  test('should calculate network using dotted mask', () => {
    const result = buildDerivedInput({
      addressDotted: '10.5.6.7',
      maskDottedOrNull: '255.0.0.0',
      prefixLengthOrNull: null,
    })

    expect(result.errorCode).toBeNull()
    expect(result.networkAddress).toBe('10.0.0.0')
    expect(result.prefix).toBe(8)
  })

  test('should handle /31 network', () => {
    const result = buildDerivedInput({
      addressDotted: '10.1.2.3',
      prefixLengthOrNull: 31,
    })

    expect(result.errorCode).toBeNull()
    expect(result.firstHost).toBe('10.1.2.2')
    expect(result.lastHost).toBe('10.1.2.3')
    expect(result.hostCount.toString()).toBe('2')
  })

  test('should handle /32 network', () => {
    const result = buildDerivedInput({
      addressDotted: '8.8.8.8',
      prefixLengthOrNull: 32,
    })

    expect(result.errorCode).toBeNull()
    expect(result.networkAddress).toBe('8.8.8.8')
    expect(result.broadcastAddress).toBe('8.8.8.8')
    expect(result.firstHost).toBe('8.8.8.8')
    expect(result.lastHost).toBe('8.8.8.8')
    expect(result.hostCount.toString()).toBe('1')
  })

  test('should return error for invalid IP', () => {
    const result = buildDerivedInput({
      addressDotted: '256.1.1.1',
      prefixLengthOrNull: 24,
    })
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_IPV4)
  })

  test('should return error for non-contiguous mask', () => {
    const result = buildDerivedInput({
      addressDotted: '192.168.1.1',
      maskDottedOrNull: '255.0.255.0',
    })
    expect(result.errorCode).toBe(ERROR_CODES.NON_CONTIGUOUS_MASK)
  })

  test('should return error for prefix out of range', () => {
    const result = buildDerivedInput({
      addressDotted: '192.168.1.1',
      prefixLengthOrNull: 33,
    })
    expect(result.errorCode).toBe(ERROR_CODES.PREFIX_OUT_OF_RANGE)
  })

  test('should return error when no prefix or mask provided', () => {
    const result = buildDerivedInput({
      addressDotted: '192.168.1.1',
      prefixLengthOrNull: null,
      maskDottedOrNull: null,
    })
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })
})

describe('buildBinaryRows', () => {
  test('should build binary rows with correct network/host separation at octet boundary', () => {
    const rows = buildBinaryRows({
      addressOctets: [192, 168, 1, 100],
      maskOctets: [255, 255, 255, 0],
      networkOctets: [192, 168, 1, 0],
      broadcastOctets: [192, 168, 1, 255],
      prefix: 24,
    })

    expect(rows.length).toBe(4)
    expect(rows[0].label).toBe('地址')
    expect(rows[0].octetDetails[0].networkPart.length).toBe(8)
    expect(rows[0].octetDetails[3].networkPart.length).toBe(0)
    expect(rows[0].octetDetails[3].hostPart.length).toBe(8)
  })

  test('should build binary rows with correct separation at mid-octet', () => {
    const rows = buildBinaryRows({
      addressOctets: [192, 168, 1, 100],
      maskOctets: [255, 255, 255, 192],
      networkOctets: [192, 168, 1, 64],
      broadcastOctets: [192, 168, 1, 127],
      prefix: 26,
    })

    expect(rows[0].octetDetails[3].networkPart.length).toBe(2)
    expect(rows[0].octetDetails[3].hostPart.length).toBe(6)
  })
})

describe('buildWarnings', () => {
  test('should detect loopback address', () => {
    const warnings = buildWarnings({ addressInt: 0x7f000001, prefix: 8 })
    expect(warnings.some(w => w.code === 'LOOPBACK')).toBe(true)
  })

  test('should detect private network addresses', () => {
    const w1 = buildWarnings({ addressInt: 0x0a000001, prefix: 8 })
    expect(w1.some(w => w.code === 'PRIVATE_NETWORK')).toBe(true)

    const w2 = buildWarnings({ addressInt: 0xac100001, prefix: 12 })
    expect(w2.some(w => w.code === 'PRIVATE_NETWORK')).toBe(true)

    const w3 = buildWarnings({ addressInt: 0xc0a80001, prefix: 16 })
    expect(w3.some(w => w.code === 'PRIVATE_NETWORK')).toBe(true)
  })

  test('should detect link local addresses', () => {
    const warnings = buildWarnings({ addressInt: 0xa9fe0102, prefix: 16 })
    expect(warnings.some(w => w.code === 'LINK_LOCAL')).toBe(true)
  })

  test('should detect special prefixes', () => {
    const w30 = buildWarnings({ addressInt: 0xc0a80100, prefix: 30 })
    expect(w30.some(w => w.code === 'PREFIX_30')).toBe(true)

    const w31 = buildWarnings({ addressInt: 0x0a010202, prefix: 31 })
    expect(w31.some(w => w.code === 'PREFIX_31')).toBe(true)

    const w32 = buildWarnings({ addressInt: 0x08080808, prefix: 32 })
    expect(w32.some(w => w.code === 'PREFIX_32')).toBe(true)
  })
})

describe('calculateSubnetSplits', () => {
  test('should calculate subnet splits from /24 to /26', () => {
    const result = calculateSubnetSplits({
      networkInt: 0xc0a80100,
      currentPrefix: 24,
      targetPrefix: 26,
    })

    expect(result).not.toBeNull()
    expect(result.subnetCount).toBe(4)
    expect(result.newPrefix).toBe(26)
    expect(result.subnets.length).toBe(4)
    expect(result.subnets[0].network).toBe('192.168.1.0')
    expect(result.subnets[0].broadcast).toBe('192.168.1.63')
    expect(result.subnets[1].network).toBe('192.168.1.64')
    expect(result.subnets[3].network).toBe('192.168.1.192')
  })

  test('should return null for invalid target prefix', () => {
    expect(calculateSubnetSplits({ networkInt: 0, currentPrefix: 24, targetPrefix: 24 })).toBeNull()
    expect(calculateSubnetSplits({ networkInt: 0, currentPrefix: 24, targetPrefix: 20 })).toBeNull()
    expect(calculateSubnetSplits({ networkInt: 0, currentPrefix: 24, targetPrefix: 33 })).toBeNull()
  })
})

describe('EXAMPLES', () => {
  test('should have all examples with valid structure', () => {
    expect(Array.isArray(EXAMPLES)).toBe(true)
    expect(EXAMPLES.length).toBeGreaterThan(0)
    EXAMPLES.forEach((example) => {
      expect(example.id).toBeDefined()
      expect(example.name).toBeDefined()
      expect(example.address).toBeDefined()
      expect(example.prefix).toBeDefined()
    })
  })

  test('should have private network examples', () => {
    expect(EXAMPLES.some(e => e.id === 'private-10')).toBe(true)
    expect(EXAMPLES.some(e => e.id === 'private-172')).toBe(true)
    expect(EXAMPLES.some(e => e.id === 'private-192')).toBe(true)
  })

  test('should have special case examples', () => {
    expect(EXAMPLES.some(e => e.id === 'loopback')).toBe(true)
    expect(EXAMPLES.some(e => e.id === 'link-local')).toBe(true)
    expect(EXAMPLES.some(e => e.id === 'slash31')).toBe(true)
    expect(EXAMPLES.some(e => e.id === 'slash32')).toBe(true)
  })
})

describe('intTo8BitBinary', () => {
  test('should convert to 8-bit binary string', () => {
    expect(intTo8BitBinary(0)).toBe('00000000')
    expect(intTo8BitBinary(255)).toBe('11111111')
    expect(intTo8BitBinary(192)).toBe('11000000')
    expect(intTo8BitBinary(128)).toBe('10000000')
    expect(intTo8BitBinary(1)).toBe('00000001')
  })
})
