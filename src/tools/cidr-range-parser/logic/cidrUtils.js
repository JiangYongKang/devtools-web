import {
    createError,
    ERROR_CODES,
    isValidPrefix,
} from './errors.js'
import {
    addressCountInt,
    broadcastAddressInt,
    intToBinaryString,
    intToIp,
    intToOctets,
    isInCidr,
    maskIntToBinaryString,
    maskIntToIp,
    networkAddressInt,
    parseIp,
    prefixToMaskInt
} from './ipUtils.js'

const CIDR_REGEX = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/([0-9]|[1-2][0-9]|3[0-2])$/
const RANGE_REGEX = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*[-–]\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/

function parseCidr(cidrStr) {
  if (!cidrStr || typeof cidrStr !== 'string') {
    return { error: createError(ERROR_CODES.INVALID_CIDR) }
  }

  const trimmed = cidrStr.trim()
  const match = trimmed.match(CIDR_REGEX)

  if (!match) {
    return { error: createError(ERROR_CODES.INVALID_CIDR) }
  }

  const ipStr = match[1]
  const prefixStr = match[2]

  const ipResult = parseIp(ipStr)
  if (ipResult.error) {
    return { error: createError(ERROR_CODES.INVALID_CIDR) }
  }

  const prefix = Number(prefixStr)
  if (!isValidPrefix(prefix)) {
    return { error: createError(ERROR_CODES.INVALID_PREFIX) }
  }

  const maskInt = prefixToMaskInt(prefix)
  const networkInt = networkAddressInt(ipResult.intValue, maskInt)
  const broadcastInt = broadcastAddressInt(ipResult.intValue, maskInt)
  const totalAddresses = addressCountInt(prefix)

  let firstHostInt, lastHostInt, usableHosts

  if (prefix === 32) {
    firstHostInt = networkInt
    lastHostInt = networkInt
    usableHosts = 1n
  } else if (prefix === 31) {
    firstHostInt = networkInt
    lastHostInt = broadcastInt
    usableHosts = 2n
  } else {
    firstHostInt = networkInt + 1n
    lastHostInt = broadcastInt - 1n
    usableHosts = totalAddresses - 2n
  }

  return {
    original: trimmed,
    ip: ipResult.formatted,
    ipInt: ipResult.intValue,
    prefix,
    maskInt,
    mask: maskIntToIp(maskInt),
    maskBinary: maskIntToBinaryString(maskInt),
    network: intToIp(networkInt),
    networkInt,
    networkOctets: intToOctets(networkInt),
    networkBinary: intToBinaryString(networkInt),
    broadcast: intToIp(broadcastInt),
    broadcastInt,
    broadcastOctets: intToOctets(broadcastInt),
    broadcastBinary: intToBinaryString(broadcastInt),
    firstHost: intToIp(firstHostInt),
    firstHostInt,
    lastHost: intToIp(lastHostInt),
    lastHostInt,
    totalAddresses,
    usableHosts,
    isRFC3021: prefix === 31,
    isSingleHost: prefix === 32,
  }
}

function parseRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return { error: createError(ERROR_CODES.INVALID_IP) }
  }

  const trimmed = rangeStr.trim()
  const match = trimmed.match(RANGE_REGEX)

  if (!match) {
    return { error: createError(ERROR_CODES.INVALID_IP) }
  }

  const startResult = parseIp(match[1])
  const endResult = parseIp(match[2])

  if (startResult.error || endResult.error) {
    return { error: createError(ERROR_CODES.INVALID_IP) }
  }

  if (startResult.intValue > endResult.intValue) {
    return { error: createError(ERROR_CODES.RANGE_NOT_ORDERED) }
  }

  return {
    start: startResult.formatted,
    startInt: startResult.intValue,
    end: endResult.formatted,
    endInt: endResult.intValue,
  }
}

function parseIpList(ipListStr) {
  if (!ipListStr || typeof ipListStr !== 'string') {
    return { error: createError(ERROR_CODES.EMPTY_INPUT) }
  }

  const lines = ipListStr.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { error: createError(ERROR_CODES.EMPTY_INPUT) }
  }

  const ips = []
  const errors = []

  lines.forEach((line, index) => {
    const result = parseIp(line)
    if (result.error) {
      errors.push({ line: index + 1, value: line, error: result.error })
    } else {
      ips.push(result)
    }
  })

  if (ips.length === 0) {
    return { error: createError(ERROR_CODES.INVALID_IP) }
  }

  const sortedIps = [...ips].sort((a, b) => (a.intValue < b.intValue ? -1 : a.intValue > b.intValue ? 1 : 0))
  const startInt = sortedIps[0].intValue
  const endInt = sortedIps[sortedIps.length - 1].intValue

  return {
    ips: sortedIps,
    startInt,
    endInt,
    start: sortedIps[0].formatted,
    end: sortedIps[sortedIps.length - 1].formatted,
    totalCount: ips.length,
    parseErrors: errors,
  }
}

function findSmallestCommonPrefix(a, b) {
  let prefix = 0
  let mask = 0x80000000n

  while (mask > 0n) {
    if ((a & mask) !== (b & mask)) {
      break
    }
    prefix++
    mask >>= 1n
  }

  return prefix
}

function findCoveringCidr(startInt, endInt) {
  if (startInt > endInt) {
    return { error: createError(ERROR_CODES.RANGE_NOT_ORDERED) }
  }

  const rangeSize = endInt - startInt + 1n
  let prefix = 32

  while (prefix >= 0) {
    const cidrSize = addressCountInt(prefix)
    const maskInt = prefixToMaskInt(prefix)
    const networkInt = networkAddressInt(startInt, maskInt)
    const broadcastInt = broadcastAddressInt(networkInt, maskInt)

    if (networkInt <= startInt && broadcastInt >= endInt) {
      return {
        cidr: `${intToIp(networkInt)}/${prefix}`,
        network: intToIp(networkInt),
        networkInt,
        broadcast: intToIp(broadcastInt),
        broadcastInt,
        prefix,
        maskInt,
        totalAddresses: cidrSize,
        isExact: networkInt === startInt && broadcastInt === endInt,
      }
    }

    prefix--
  }

  return { error: createError(ERROR_CODES.NO_SINGLE_CIDR_AGGREGATE) }
}

function splitRangeIntoCidrs(startInt, endInt) {
  const results = []
  let currentStart = startInt

  while (currentStart <= endInt) {
    let prefix = 32

    while (prefix > 0) {
      const candidatePrefix = prefix - 1
      const maskInt = prefixToMaskInt(candidatePrefix)
      const networkInt = networkAddressInt(currentStart, maskInt)
      const broadcastInt = broadcastAddressInt(networkInt, maskInt)

      if (networkInt === currentStart && broadcastInt <= endInt) {
        prefix = candidatePrefix
      } else {
        break
      }
    }

    const maskInt = prefixToMaskInt(prefix)
    const networkInt = networkAddressInt(currentStart, maskInt)
    const broadcastInt = broadcastAddressInt(networkInt, maskInt)

    results.push({
      cidr: `${intToIp(networkInt)}/${prefix}`,
      network: intToIp(networkInt),
      networkInt,
      broadcast: intToIp(broadcastInt),
      broadcastInt,
      prefix,
      maskInt,
      totalAddresses: addressCountInt(prefix),
    })

    currentStart = broadcastInt + 1n
  }

  return results
}

function generateAddressList(networkInt, broadcastInt, policy = 'sample', sampleSize = 10) {
  const totalCount = broadcastInt - networkInt + 1n
  const maxFullList = 1024n

  if (totalCount <= maxFullList) {
    const addresses = []
    for (let i = 0n; i < totalCount; i++) {
      addresses.push(intToIp(networkInt + i))
    }
    return {
      type: 'full',
      addresses,
      totalCount,
      displayedCount: totalCount,
    }
  }

  if (policy === 'sample') {
    const firstCount = Math.min(Number(sampleSize), Number(totalCount))
    const lastCount = Math.min(Number(sampleSize), Number(totalCount) - firstCount)

    const firstAddresses = []
    for (let i = 0; i < firstCount; i++) {
      firstAddresses.push(intToIp(networkInt + BigInt(i)))
    }

    const lastAddresses = []
    for (let i = 0; i < lastCount; i++) {
      lastAddresses.push(intToIp(broadcastInt - BigInt(i)))
    }
    lastAddresses.reverse()

    return {
      type: 'sample',
      firstAddresses,
      lastAddresses,
      firstCount,
      lastCount,
      totalCount,
      displayedCount: firstCount + lastCount,
      skippedCount: totalCount - BigInt(firstCount + lastCount),
    }
  }

  return {
    type: 'range',
    start: intToIp(networkInt),
    end: intToIp(broadcastInt),
    totalCount,
  }
}

function probeIpInRange(probeIpStr, rangeStartInt, rangeEndInt) {
  const probeResult = parseIp(probeIpStr)

  if (probeResult.error) {
    return {
      inRange: false,
      error: probeResult.error,
    }
  }

  const inRange = probeResult.intValue >= rangeStartInt && probeResult.intValue <= rangeEndInt
  const position = inRange
    ? probeResult.intValue === rangeStartInt
      ? 'start'
      : probeResult.intValue === rangeEndInt
        ? 'end'
        : 'middle'
    : probeResult.intValue < rangeStartInt
      ? 'before'
      : 'after'

  return {
    inRange,
    position,
    probeIp: probeResult.formatted,
    probeIpInt: probeResult.intValue,
    rangeStart: intToIp(rangeStartInt),
    rangeEnd: intToIp(rangeEndInt),
  }
}

function probeIpInCidr(probeIpStr, cidrInfo) {
  const probeResult = parseIp(probeIpStr)

  if (probeResult.error) {
    return {
      inCidr: false,
      error: probeResult.error,
    }
  }

  const inCidr = isInCidr(probeResult.intValue, cidrInfo.networkInt, cidrInfo.broadcastInt)
  const position = inCidr
    ? probeResult.intValue === cidrInfo.networkInt
      ? 'network'
      : probeResult.intValue === cidrInfo.broadcastInt
        ? 'broadcast'
        : 'host'
    : probeResult.intValue < cidrInfo.networkInt
      ? 'before'
      : 'after'

  return {
    inCidr,
    position,
    probeIp: probeResult.formatted,
    probeIpInt: probeResult.intValue,
    cidrNetwork: cidrInfo.network,
    cidrBroadcast: cidrInfo.broadcast,
    cidrPrefix: cidrInfo.prefix,
  }
}

export {
    CIDR_REGEX, findCoveringCidr, findSmallestCommonPrefix, generateAddressList, parseCidr, parseIpList, parseRange, probeIpInCidr, probeIpInRange, RANGE_REGEX, splitRangeIntoCidrs
}

