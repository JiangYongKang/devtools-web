import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isValidPrefix,
} from '../logic/errors.js'
import {
  MAX_IP_INT,
  isValidIpOctet,
  parseIp,
  intToIp,
  intToOctets,
  octetsToBinaryString,
  intToBinaryString,
  countSetBits,
  prefixToMaskInt,
  maskIntToPrefix,
  maskIntToIp,
  maskIntToBinaryString,
  networkAddressInt,
  broadcastAddressInt,
  addressCountInt,
  isInRange,
  isInCidr,
} from '../logic/ipUtils.js'
import {
  CIDR_REGEX,
  RANGE_REGEX,
  parseCidr,
  parseRange,
  parseIpList,
  findSmallestCommonPrefix,
  findCoveringCidr,
  splitRangeIntoCidrs,
  generateAddressList,
  probeIpInRange,
  probeIpInCidr,
} from '../logic/cidrUtils.js'
import {
  EXAMPLES,
  RFC3021_NOTE,
  SINGLE_HOST_NOTE,
  processCidr,
  processRange,
  processIpList,
  processProbe,
} from '../logic/index.js'

describe('errors module', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.INVALID_CIDR).toBe('INVALID_CIDR')
      expect(ERROR_CODES.RANGE_NOT_ORDERED).toBe('RANGE_NOT_ORDERED')
      expect(ERROR_CODES.NO_SINGLE_CIDR_AGGREGATE).toBe('NO_SINGLE_CIDR_AGGREGATE')
      expect(ERROR_CODES.ENUMERATION_LIMIT_EXCEEDED).toBe('ENUMERATION_LIMIT_EXCEEDED')
      expect(ERROR_CODES.INVALID_IP).toBe('INVALID_IP')
      expect(ERROR_CODES.INVALID_PREFIX).toBe('INVALID_PREFIX')
      expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
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
      expect(getErrorMessage(ERROR_CODES.INVALID_CIDR)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_CIDR])
      expect(getErrorMessage(ERROR_CODES.RANGE_NOT_ORDERED)).toBe(ERROR_MESSAGES[ERROR_CODES.RANGE_NOT_ORDERED])
    })

    test('should return default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('should create error object with correct code and default message', () => {
      const result = createError(ERROR_CODES.INVALID_CIDR)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_CIDR)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_CIDR])
    })

    test('should create error object with custom message', () => {
      const customMessage = 'Custom error message'
      const result = createError(ERROR_CODES.INVALID_CIDR, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_CIDR)
      expect(result.errorMessage).toBe(customMessage)
    })
  })

  describe('isValidPrefix', () => {
    test('should return true for valid prefix values', () => {
      expect(isValidPrefix(0)).toBe(true)
      expect(isValidPrefix(16)).toBe(true)
      expect(isValidPrefix(24)).toBe(true)
      expect(isValidPrefix(32)).toBe(true)
    })

    test('should return true for valid prefix as string', () => {
      expect(isValidPrefix('24')).toBe(true)
      expect(isValidPrefix('16')).toBe(true)
    })

    test('should return false for prefix less than 0', () => {
      expect(isValidPrefix(-1)).toBe(false)
    })

    test('should return false for prefix greater than 32', () => {
      expect(isValidPrefix(33)).toBe(false)
      expect(isValidPrefix(100)).toBe(false)
    })

    test('should return false for non-integer prefix', () => {
      expect(isValidPrefix(24.5)).toBe(false)
    })

    test('should return false for invalid string prefix', () => {
      expect(isValidPrefix('abc')).toBe(false)
    })
  })
})

describe('ipUtils module', () => {
  describe('isValidIpOctet', () => {
    test('should return true for valid octet values', () => {
      expect(isValidIpOctet(0)).toBe(true)
      expect(isValidIpOctet(128)).toBe(true)
      expect(isValidIpOctet(255)).toBe(true)
    })

    test('should return false for invalid octet values', () => {
      expect(isValidIpOctet(-1)).toBe(false)
      expect(isValidIpOctet(256)).toBe(false)
      expect(isValidIpOctet(500)).toBe(false)
    })

    test('should handle string inputs', () => {
      expect(isValidIpOctet('192')).toBe(true)
      expect(isValidIpOctet('256')).toBe(false)
    })
  })

  describe('parseIp', () => {
    test('should parse valid IP address', () => {
      const result = parseIp('192.168.1.1')
      expect(result.error).toBeUndefined()
      expect(result.octets).toEqual([192, 168, 1, 1])
      expect(result.intValue).toBe(3232235777n)
    })

    test('should return error for invalid IP format', () => {
      expect(parseIp('192.168.1').error).toBeDefined()
      expect(parseIp('192.168.1.1.1').error).toBeDefined()
      expect(parseIp('abc.def.ghi.jkl').error).toBeDefined()
    })

    test('should return error for invalid octet values', () => {
      expect(parseIp('192.168.1.256').error).toBeDefined()
      expect(parseIp('192.168.300.1').error).toBeDefined()
    })

    test('should return error for null or undefined', () => {
      expect(parseIp(null).error).toBeDefined()
      expect(parseIp(undefined).error).toBeDefined()
    })
  })

  describe('intToIp', () => {
    test('should convert integer to IP address', () => {
      expect(intToIp(3232235777n)).toBe('192.168.1.1')
      expect(intToIp(0n)).toBe('0.0.0.0')
      expect(intToIp(4294967295n)).toBe('255.255.255.255')
    })

    test('should return null for out of range values', () => {
      expect(intToIp(-1n)).toBeNull()
      expect(intToIp(4294967296n)).toBeNull()
    })
  })

  describe('intToOctets', () => {
    test('should convert integer to octets', () => {
      expect(intToOctets(3232235777n)).toEqual([192, 168, 1, 1])
    })
  })

  describe('octetsToBinaryString', () => {
    test('should convert octets to binary string', () => {
      expect(octetsToBinaryString([192, 168, 1, 1])).toBe('11000000.10101000.00000001.00000001')
    })
  })

  describe('intToBinaryString', () => {
    test('should convert integer to binary string', () => {
      expect(intToBinaryString(3232235777n)).toBe('11000000.10101000.00000001.00000001')
    })
  })

  describe('countSetBits', () => {
    test('should count set bits correctly', () => {
      expect(countSetBits(0n)).toBe(0)
      expect(countSetBits(1n)).toBe(1)
      expect(countSetBits(3n)).toBe(2)
      expect(countSetBits(0xFFFFFFFFn)).toBe(32)
    })
  })

  describe('prefixToMaskInt', () => {
    test('should convert prefix to mask integer', () => {
      expect(prefixToMaskInt(24)).toBe(0xFFFFFF00n)
      expect(prefixToMaskInt(16)).toBe(0xFFFF0000n)
      expect(prefixToMaskInt(0)).toBe(0n)
      expect(prefixToMaskInt(32)).toBe(0xFFFFFFFFn)
    })

    test('should return null for invalid prefix', () => {
      expect(prefixToMaskInt(33)).toBeNull()
      expect(prefixToMaskInt(-1)).toBeNull()
    })
  })

  describe('maskIntToPrefix', () => {
    test('should convert mask integer to prefix', () => {
      expect(maskIntToPrefix(0xFFFFFF00n)).toBe(24)
      expect(maskIntToPrefix(0xFFFF0000n)).toBe(16)
      expect(maskIntToPrefix(0n)).toBe(0)
      expect(maskIntToPrefix(0xFFFFFFFFn)).toBe(32)
    })
  })

  describe('maskIntToIp', () => {
    test('should convert mask integer to IP', () => {
      expect(maskIntToIp(0xFFFFFF00n)).toBe('255.255.255.0')
      expect(maskIntToIp(0xFFFF0000n)).toBe('255.255.0.0')
    })
  })

  describe('maskIntToBinaryString', () => {
    test('should convert mask integer to binary string', () => {
      expect(maskIntToBinaryString(0xFFFFFF00n)).toBe('11111111.11111111.11111111.00000000')
    })
  })

  describe('networkAddressInt', () => {
    test('should calculate network address', () => {
      const ipInt = 3232235777n
      const maskInt = 0xFFFFFF00n
      expect(networkAddressInt(ipInt, maskInt)).toBe(3232235776n)
    })
  })

  describe('broadcastAddressInt', () => {
    test('should calculate broadcast address', () => {
      const ipInt = 3232235777n
      const maskInt = 0xFFFFFF00n
      expect(broadcastAddressInt(ipInt, maskInt)).toBe(3232236031n)
    })
  })

  describe('addressCountInt', () => {
    test('should calculate address count', () => {
      expect(addressCountInt(24)).toBe(256n)
      expect(addressCountInt(16)).toBe(65536n)
      expect(addressCountInt(32)).toBe(1n)
    })

    test('should return 0 for invalid prefix', () => {
      expect(addressCountInt(33)).toBe(0n)
    })
  })

  describe('isInRange', () => {
    test('should check if IP is in range', () => {
      const startInt = 3232235777n
      const endInt = 3232236030n
      expect(isInRange(3232235850n, startInt, endInt)).toBe(true)
      expect(isInRange(3232235776n, startInt, endInt)).toBe(false)
    })
  })

  describe('isInCidr', () => {
    test('should check if IP is in CIDR range', () => {
      const networkInt = 3232235776n
      const broadcastInt = 3232236031n
      expect(isInCidr(3232235850n, networkInt, broadcastInt)).toBe(true)
      expect(isInCidr(3232236032n, networkInt, broadcastInt)).toBe(false)
    })
  })
})

describe('cidrUtils module', () => {
  describe('CIDR_REGEX', () => {
    test('should match valid CIDR notation', () => {
      expect('192.168.1.0/24').toMatch(CIDR_REGEX)
      expect('10.0.0.0/8').toMatch(CIDR_REGEX)
      expect('8.8.8.8/32').toMatch(CIDR_REGEX)
    })

    test('should not match invalid CIDR notation', () => {
      expect('192.168.1.0').not.toMatch(CIDR_REGEX)
      expect('192.168.1.0/33').not.toMatch(CIDR_REGEX)
      expect('abc/24').not.toMatch(CIDR_REGEX)
    })
  })

  describe('parseCidr', () => {
    test('should parse valid CIDR', () => {
      const result = parseCidr('192.168.1.0/24')
      expect(result.error).toBeUndefined()
      expect(result.network).toBe('192.168.1.0')
      expect(result.broadcast).toBe('192.168.1.255')
      expect(result.totalAddresses).toBe(256n)
      expect(result.usableHosts).toBe(254n)
    })

    test('should handle /32 single host', () => {
      const result = parseCidr('8.8.8.8/32')
      expect(result.error).toBeUndefined()
      expect(result.isSingleHost).toBe(true)
      expect(result.totalAddresses).toBe(1n)
      expect(result.usableHosts).toBe(1n)
    })

    test('should handle /31 RFC3021', () => {
      const result = parseCidr('10.0.0.0/31')
      expect(result.error).toBeUndefined()
      expect(result.isRFC3021).toBe(true)
      expect(result.totalAddresses).toBe(2n)
      expect(result.usableHosts).toBe(2n)
    })

    test('should return error for invalid CIDR', () => {
      expect(parseCidr('192.168.1.0').error).toBeDefined()
      expect(parseCidr('192.168.1.0/33').error).toBeDefined()
      expect(parseCidr('abc/24').error).toBeDefined()
    })
  })

  describe('parseRange', () => {
    test('should parse valid range', () => {
      const result = parseRange('192.168.1.1-192.168.1.100')
      expect(result.error).toBeUndefined()
      expect(result.start).toBe('192.168.1.1')
      expect(result.end).toBe('192.168.1.100')
    })

    test('should return error for unordered range', () => {
      const result = parseRange('192.168.1.100-192.168.1.1')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(ERROR_CODES.RANGE_NOT_ORDERED)
    })

    test('should return error for invalid format', () => {
      expect(parseRange('invalid').error).toBeDefined()
    })
  })

  describe('parseIpList', () => {
    test('should parse valid IP list', () => {
      const result = parseIpList('192.168.1.1\n192.168.1.5\n192.168.1.10')
      expect(result.error).toBeUndefined()
      expect(result.totalCount).toBe(3)
      expect(result.start).toBe('192.168.1.1')
      expect(result.end).toBe('192.168.1.10')
    })

    test('should handle some invalid IPs', () => {
      const result = parseIpList('192.168.1.1\ninvalid\n192.168.1.10')
      expect(result.error).toBeUndefined()
      expect(result.totalCount).toBe(2)
      expect(result.parseErrors.length).toBe(1)
    })

    test('should return error for all invalid IPs', () => {
      const result = parseIpList('invalid1\ninvalid2')
      expect(result.error).toBeDefined()
    })

    test('should return error for empty input', () => {
      expect(parseIpList('').error).toBeDefined()
    })
  })

  describe('findCoveringCidr', () => {
    test('should find exact covering CIDR', () => {
      const startInt = 3232235776n
      const endInt = 3232236031n
      const result = findCoveringCidr(startInt, endInt)
      expect(result.error).toBeUndefined()
      expect(result.cidr).toBe('192.168.1.0/24')
      expect(result.isExact).toBe(true)
    })

    test('should find supernet covering CIDR', () => {
      const startInt = 3232235520n
      const endInt = 3232236287n
      const result = findCoveringCidr(startInt, endInt)
      expect(result.error).toBeUndefined()
      expect(result.isExact).toBe(false)
    })

    test('should handle single IP', () => {
      const ipInt = 3232235777n
      const result = findCoveringCidr(ipInt, ipInt)
      expect(result.error).toBeUndefined()
      expect(result.prefix).toBe(32)
    })
  })

  describe('splitRangeIntoCidrs', () => {
    test('should split range into CIDRs', () => {
      const startInt = 3232235776n
      const endInt = 3232236031n
      const result = splitRangeIntoCidrs(startInt, endInt)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].cidr).toBe('192.168.1.0/24')
    })

    test('should handle non-CIDR-aligned ranges', () => {
      const startInt = 3232235600n
      const endInt = 3232235700n
      const result = splitRangeIntoCidrs(startInt, endInt)
      expect(result.length).toBeGreaterThan(1)
    })
  })

  describe('generateAddressList', () => {
    test('should generate full list for small ranges', () => {
      const result = generateAddressList(3232235776n, 3232235779n)
      expect(result.type).toBe('full')
      expect(result.addresses.length).toBe(4)
      expect(result.addresses[0]).toBe('192.168.1.0')
      expect(result.addresses[3]).toBe('192.168.1.3')
    })

    test('should generate sample list for large ranges', () => {
      const startInt = 167772160n
      const endInt = 184549375n
      const result = generateAddressList(startInt, endInt)
      expect(result.type).toBe('sample')
      expect(result.firstAddresses.length).toBe(10)
      expect(result.lastAddresses.length).toBe(10)
    })
  })

  describe('probeIpInRange', () => {
    test('should detect IP in range', () => {
      const result = probeIpInRange('192.168.1.50', 3232235776n, 3232236031n)
      expect(result.inRange).toBe(true)
      expect(result.position).toBe('middle')
    })

    test('should detect IP at start', () => {
      const result = probeIpInRange('192.168.1.0', 3232235776n, 3232236031n)
      expect(result.inRange).toBe(true)
      expect(result.position).toBe('start')
    })

    test('should detect IP outside range', () => {
      const result = probeIpInRange('192.168.2.1', 3232235520n, 3232235775n)
      expect(result.inRange).toBe(false)
    })

    test('should return error for invalid probe IP', () => {
      const result = probeIpInRange('invalid', 3232235520n, 3232235775n)
      expect(result.error).toBeDefined()
    })
  })

  describe('probeIpInCidr', () => {
    test('should detect IP in CIDR', () => {
      const cidrInfo = parseCidr('192.168.1.0/24')
      const result = probeIpInCidr('192.168.1.50', cidrInfo)
      expect(result.inCidr).toBe(true)
    })

    test('should detect network address', () => {
      const cidrInfo = parseCidr('192.168.1.0/24')
      const result = probeIpInCidr('192.168.1.0', cidrInfo)
      expect(result.inCidr).toBe(true)
      expect(result.position).toBe('network')
    })

    test('should detect broadcast address', () => {
      const cidrInfo = parseCidr('192.168.1.0/24')
      const result = probeIpInCidr('192.168.1.255', cidrInfo)
      expect(result.inCidr).toBe(true)
      expect(result.position).toBe('broadcast')
    })
  })
})

describe('index module integration', () => {
  describe('EXAMPLES', () => {
    test('should have all example values', () => {
      expect(EXAMPLES.cidrBasic).toBeDefined()
      expect(EXAMPLES.cidrSmall).toBeDefined()
      expect(EXAMPLES.cidr32).toBeDefined()
      expect(EXAMPLES.cidr31).toBeDefined()
      expect(EXAMPLES.rangeExact).toBeDefined()
      expect(EXAMPLES.rangePartial).toBeDefined()
      expect(EXAMPLES.ipList).toBeDefined()
    })
  })

  describe('processCidr', () => {
    test('should process basic CIDR', () => {
      const result = processCidr('192.168.1.0/24')
      expect(result.success).toBe(true)
      expect(result.mode).toBe('cidr')
      expect(result.derivedNetwork).toBe('192.168.1.0')
      expect(result.prefix).toBe(24)
      expect(result.addressTotal).toBe(256n)
    })

    test('should add RFC3021 warning for /31', () => {
      const result = processCidr('10.0.0.0/31')
      expect(result.success).toBe(true)
      expect(result.warnings.length).toBe(1)
      expect(result.warnings[0].code).toBe('RFC3021')
    })

    test('should add SINGLE_HOST warning for /32', () => {
      const result = processCidr('8.8.8.8/32')
      expect(result.success).toBe(true)
      expect(result.warnings.length).toBe(1)
      expect(result.warnings[0].code).toBe('SINGLE_HOST')
    })

    test('should return error for invalid CIDR', () => {
      const result = processCidr('invalid')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_CIDR)
    })

    test('should handle large prefix with enumeration limit', () => {
      const result = processCidr('10.0.0.0/8')
      expect(result.success).toBe(true)
      expect(result.errorCode).toBe(ERROR_CODES.ENUMERATION_LIMIT_EXCEEDED)
      expect(result.enumerationPreview.type).toBe('sample')
    })
  })

  describe('processRange', () => {
    test('should process exact CIDR range', () => {
      const result = processRange('192.168.1.0', '192.168.1.255')
      expect(result.success).toBe(true)
      expect(result.aggregatedCidrProposal.length).toBeGreaterThan(0)
      expect(result.aggregatedCidrProposal[0].type).toBe('covering')
      expect(result.aggregatedCidrProposal[0].isExact).toBe(true)
    })

    test('should process non-exact range', () => {
      const result = processRange('192.168.1.100', '192.168.1.150')
      expect(result.success).toBe(true)
      expect(result.aggregatedCidrProposal.length).toBeGreaterThan(1)
    })

    test('should return error for unordered range', () => {
      const result = processRange('192.168.1.255', '192.168.1.0')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.RANGE_NOT_ORDERED)
    })
  })

  describe('processIpList', () => {
    test('should process IP list', () => {
      const result = processIpList('192.168.1.1\n192.168.1.5\n192.168.1.10')
      expect(result.success).toBe(true)
      expect(result.inputCount).toBe(3)
      expect(result.aggregatedCidrProposal.length).toBeGreaterThan(0)
    })

    test('should handle some invalid IPs', () => {
      const result = processIpList('192.168.1.1\ninvalid\n192.168.1.10')
      expect(result.success).toBe(true)
      expect(result.inputCount).toBe(2)
      expect(result.warnings.length).toBe(1)
    })
  })

  describe('processProbe', () => {
    test('should probe IP in CIDR', () => {
      const cidrResult = processCidr('192.168.1.0/24')
      const result = processProbe('192.168.1.50', cidrResult)
      expect(result.probeResult.success).toBe(true)
      expect(result.probeResult.inCidr).toBe(true)
    })

    test('should probe IP in range', () => {
      const rangeResult = processRange('192.168.1.0', '192.168.1.100')
      const result = processProbe('192.168.1.50', rangeResult)
      expect(result.probeResult.success).toBe(true)
      expect(result.probeResult.inRange).toBe(true)
    })

    test('should return error without prior result', () => {
      const result = processProbe('192.168.1.1', null)
      expect(result.success).toBe(false)
    })
  })

  describe('bidirectional consistency', () => {
    test('CIDR to range and back should be consistent', () => {
      const cidrResult = processCidr('192.168.1.0/24')
      expect(cidrResult.success).toBe(true)
      expect(cidrResult.rangeStart).toBeUndefined()

      const rangeResult = processRange(cidrResult.network, cidrResult.broadcast)
      expect(rangeResult.success).toBe(true)
      expect(rangeResult.aggregatedCidrProposal[0].cidr).toBe('192.168.1.0/24')
    })

    test('probe should be consistent with CIDR calculation', () => {
      const cidrResult = processCidr('192.168.1.0/24')
      const probeIn = processProbe('192.168.1.128', cidrResult)
      const probeOut = processProbe('192.168.2.1', cidrResult)

      expect(probeIn.probeResult.inCidr).toBe(true)
      expect(probeOut.probeResult.inCidr).toBe(false)
    })
  })
})
