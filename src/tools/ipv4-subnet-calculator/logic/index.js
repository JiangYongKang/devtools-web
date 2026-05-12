import {
  ERROR_CODES,
  createError,
} from './errors.js'

function isInteger(num) {
  return typeof num === 'number' && Number.isFinite(num) && Math.floor(num) === num
}

function parseOctet(str) {
  if (str == null) return null
  const trimmed = String(str).trim()
  if (trimmed === '') return null
  if (!/^\d+$/.test(trimmed)) return null
  const num = Number(trimmed)
  if (!isInteger(num)) return null
  if (num < 0 || num > 255) return null
  return num
}

function parseIPv4(dotted) {
  if (dotted == null) return { error: createError(ERROR_CODES.INVALID_IPV4) }
  const str = String(dotted).trim()
  if (str === '') return { error: createError(ERROR_CODES.INVALID_IPV4) }
  const parts = str.split('.')
  if (parts.length !== 4) return { error: createError(ERROR_CODES.INVALID_IPV4) }
  const octets = parts.map(parseOctet)
  if (octets.some((o) => o == null)) return { error: createError(ERROR_CODES.INVALID_IPV4) }
  return { octets, int: octetsToInt(octets) }
}

function octetsToInt(octets) {
  let result = 0
  for (let i = 0; i < 4; i++) {
    result = (result << 8) | (octets[i] & 0xff)
  }
  return result >>> 0
}

function intToOctets(intValue) {
  const val = intValue >>> 0
  return [
    (val >>> 24) & 0xff,
    (val >>> 16) & 0xff,
    (val >>> 8) & 0xff,
    val & 0xff,
  ]
}

function octetsToDotted(octets) {
  return octets.join('.')
}

function intToDotted(intValue) {
  return octetsToDotted(intToOctets(intValue))
}

function prefixToMaskInt(prefix) {
  if (prefix === 0) return 0
  if (prefix === 32) return 0xffffffff
  return (0xffffffff << (32 - prefix)) >>> 0
}

function prefixToMaskDotted(prefix) {
  return intToDotted(prefixToMaskInt(prefix))
}

function maskIntToPrefix(maskInt) {
  const m = maskInt >>> 0
  if (m === 0) return 0
  if (m === 0xffffffff) return 32
  let count = 0
  let temp = m
  while ((temp & 0x80000000) !== 0) {
    count++
    temp = (temp << 1) >>> 0
  }
  const reconstructedMask = prefixToMaskInt(count)
  if (reconstructedMask !== m) return -1
  return count
}

function maskDottedToPrefix(dotted) {
  const parsed = parseIPv4(dotted)
  if (parsed.error) return { error: createError(ERROR_CODES.INVALID_MASK) }
  const prefix = maskIntToPrefix(parsed.int)
  if (prefix < 0) return { error: createError(ERROR_CODES.NON_CONTIGUOUS_MASK) }
  return { prefix, maskInt: parsed.int, octets: parsed.octets }
}

function isPrefixValid(prefix) {
  const num = Number(prefix)
  return isInteger(num) && num >= 1 && num <= 32
}

function validatePrefixOrMask({ prefixLengthOrNull, maskDottedOrNull }) {
  const hasPrefix = prefixLengthOrNull != null && prefixLengthOrNull !== ''
  const hasMask = maskDottedOrNull != null && String(maskDottedOrNull).trim() !== ''

  let resolvedPrefix = null
  let resolvedMaskInt = null
  let resolvedMaskDotted = null

  if (hasPrefix) {
    const prefix = Number(prefixLengthOrNull)
    if (!isPrefixValid(prefix)) {
      return { error: createError(ERROR_CODES.PREFIX_OUT_OF_RANGE) }
    }
    resolvedPrefix = prefix
    resolvedMaskInt = prefixToMaskInt(prefix)
    resolvedMaskDotted = prefixToMaskDotted(prefix)
  }

  if (hasMask) {
    const maskResult = maskDottedToPrefix(maskDottedOrNull)
    if (maskResult.error) {
      return { error: maskResult.error }
    }
    if (resolvedPrefix != null && resolvedPrefix !== maskResult.prefix) {
      return { error: createError(ERROR_CODES.CONFLICTING_INPUT) }
    }
    resolvedPrefix = maskResult.prefix
    resolvedMaskInt = maskResult.maskInt
    resolvedMaskDotted = octetsToDotted(maskResult.octets)
  }

  return {
    hasPrefix: resolvedPrefix != null,
    prefix: resolvedPrefix,
    maskInt: resolvedMaskInt,
    maskDotted: resolvedMaskDotted,
  }
}

function intTo8BitBinary(intValue) {
  const bits = []
  let val = intValue & 0xff
  for (let i = 0; i < 8; i++) {
    bits.unshift((val & 1) ? '1' : '0')
    val = val >>> 1
  }
  return bits.join('')
}

function buildBinaryRows({
  addressOctets,
  maskOctets,
  networkOctets,
  broadcastOctets,
  prefix,
}) {
  const networkBitsRemaining = prefix
  const rows = [
    { label: '地址', octets: addressOctets },
    { label: '掩码', octets: maskOctets },
    { label: '网络', octets: networkOctets },
    { label: '广播', octets: broadcastOctets },
  ]

  return rows.map((row) => {
    let bitsUsed = 0
    const octetDetails = row.octets.map((octet, idx) => {
      const bitsInThisOctet = Math.min(8, Math.max(0, networkBitsRemaining - bitsUsed))
      const binary = intTo8BitBinary(octet)
      const networkPart = binary.slice(0, bitsInThisOctet)
      const hostPart = binary.slice(bitsInThisOctet)
      bitsUsed += 8
      return {
        octet,
        binary,
        networkPart,
        hostPart,
      }
    })
    return {
      label: row.label,
      octetDetails,
      dotted: octetsToDotted(row.octets),
    }
  })
}

function getHostCount(prefix) {
  if (prefix >= 32) return 1n
  if (prefix === 31) return 2n
  const bits = 32 - prefix
  return (1n << BigInt(bits)) - 2n
}

function getHostRange({ networkInt, broadcastInt, prefix }) {
  if (prefix >= 32) {
    return { firstHostInt: networkInt, lastHostInt: networkInt }
  }
  if (prefix === 31) {
    return { firstHostInt: networkInt, lastHostInt: broadcastInt }
  }
  return { firstHostInt: networkInt + 1, lastHostInt: broadcastInt - 1 }
}

function buildWarnings({ addressInt, prefix, addressDotted }) {
  const warnings = []
  const firstOctet = (addressInt >>> 24) & 0xff

  if (firstOctet === 127) {
    warnings.push({
      level: 'info',
      code: 'LOOPBACK',
      message: '该地址属于回环地址段（127.0.0.0/8），用于本机回环测试，不可用于外部网络。',
    })
  }

  if (firstOctet === 0) {
    warnings.push({
      level: 'warning',
      code: 'ZERO_PREFIX',
      message: '0.x.x.x 前缀在现代网络中已废弃，该段作为特殊用途保留。',
    })
  }

  if (
    firstOctet === 10 ||
    (firstOctet === 172 && ((addressInt >>> 16) & 0xff) >= 16 && ((addressInt >>> 16) & 0xff) <= 31) ||
    (firstOctet === 192 && ((addressInt >>> 16) & 0xff) === 168)
  ) {
    warnings.push({
      level: 'info',
      code: 'PRIVATE_NETWORK',
      message: '该地址属于私网地址段，仅在内网有效，不可在公网路由。',
    })
  }

  if (firstOctet === 169 && ((addressInt >>> 16) & 0xff) === 254) {
    warnings.push({
      level: 'info',
      code: 'LINK_LOCAL',
      message: '该地址属于链路本地地址段（169.254.0.0/16），用于本地链路自动配置。',
    })
  }

  if (firstOctet >= 224 && firstOctet <= 239) {
    warnings.push({
      level: 'info',
      code: 'MULTICAST',
      message: '该地址属于多播地址段（224.0.0.0/4），用于组播通信。',
    })
  }

  if (prefix === 32) {
    warnings.push({
      level: 'info',
      code: 'PREFIX_32',
      message: '/32 表示单主机路由，网络地址、广播地址与主机地址相同。',
    })
  } else if (prefix === 31) {
    warnings.push({
      level: 'info',
      code: 'PREFIX_31',
      message: '/31 常用于点到点链路，仅包含两个可用主机地址。',
    })
  } else if (prefix === 30) {
    warnings.push({
      level: 'info',
      code: 'PREFIX_30',
      message: '/30 包含两个可用主机地址，常用于广域网链路。',
    })
  }

  return warnings
}

function calculateSubnetSplits({ networkInt, currentPrefix, targetPrefix }) {
  if (targetPrefix <= currentPrefix || targetPrefix > 32) return null
  const subnetBits = targetPrefix - currentPrefix
  const subnetCount = 1 << subnetBits
  const subnets = []
  const networkBits = targetPrefix
  const hostBits = 32 - networkBits
  const addressesPerSubnet = hostBits === 0 ? 1 : 1 << hostBits

  for (let i = 0; i < subnetCount && i < 64; i++) {
    const subnetNetworkInt = networkInt + i * addressesPerSubnet
    const subnetBroadcastInt = hostBits === 0
      ? subnetNetworkInt
      : subnetNetworkInt + (addressesPerSubnet - 1)
    const subnetRange = getHostRange({
      networkInt: subnetNetworkInt,
      broadcastInt: subnetBroadcastInt,
      prefix: targetPrefix,
    })
    subnets.push({
      index: i,
      network: intToDotted(subnetNetworkInt),
      firstHost: intToDotted(subnetRange.firstHostInt),
      lastHost: intToDotted(subnetRange.lastHostInt),
      broadcast: intToDotted(subnetBroadcastInt),
      hostCount: Number(getHostCount(targetPrefix)),
    })
  }

  return {
    subnetCount,
    newPrefix: targetPrefix,
    subnets,
    truncated: subnetCount > 64,
  }
}

function buildDerivedInput({
  addressDotted,
  maskDottedOrNull,
  prefixLengthOrNull,
  deriveMode,
}) {
  if (!addressDotted || String(addressDotted).trim() === '') {
    const err = createError(ERROR_CODES.INVALID_IPV4)
    return { errorCode: err.errorCode, errorMessage: err.errorMessage }
  }

  const addressParsed = parseIPv4(addressDotted)
  if (addressParsed.error) {
    return { errorCode: addressParsed.error.errorCode, errorMessage: addressParsed.error.errorMessage }
  }

  const validation = validatePrefixOrMask({ prefixLengthOrNull, maskDottedOrNull })
  if (validation.error) {
    return { errorCode: validation.error.errorCode, errorMessage: validation.error.errorMessage }
  }

  if (!validation.hasPrefix) {
    const err = createError(ERROR_CODES.NULL_INPUT)
    return { errorCode: err.errorCode, errorMessage: err.errorMessage }
  }

  const { prefix, maskInt, maskDotted } = validation
  const networkInt = (addressParsed.int & maskInt) >>> 0
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0

  const hostRange = getHostRange({ networkInt, broadcastInt, prefix })
  const firstHostInt = hostRange.firstHostInt
  const lastHostInt = hostRange.lastHostInt
  const hostCount = getHostCount(prefix)

  const wildcardInt = (~maskInt) >>> 0

  const binaryRows = buildBinaryRows({
    addressOctets: addressParsed.octets,
    maskOctets: intToOctets(maskInt),
    networkOctets: intToOctets(networkInt),
    broadcastOctets: intToOctets(broadcastInt),
    prefix,
  })

  const warnings = buildWarnings({
    addressInt: addressParsed.int,
    prefix,
    addressDotted,
  })

  return {
    addressInt: addressParsed.int,
    addressDotted: octetsToDotted(addressParsed.octets),
    maskDotted,
    maskInt,
    prefix,
    networkAddress: intToDotted(networkInt),
    networkInt,
    broadcastAddress: intToDotted(broadcastInt),
    broadcastInt,
    firstHost: intToDotted(firstHostInt),
    lastHost: intToDotted(lastHostInt),
    hostCount,
    wildcardMask: intToDotted(wildcardInt),
    wildcardInt,
    binaryRows,
    warnings,
    errorCode: null,
    errorMessage: null,
    deriveMode,
  }
}

const EXAMPLES = [
  {
    id: 'private-10',
    name: '私网 A 类示例',
    description: '10.0.0.0/8 段示例',
    address: '10.5.6.7',
    prefix: 8,
  },
  {
    id: 'private-172',
    name: '私网 B 类示例',
    description: '172.16.0.0/12 段示例',
    address: '172.16.128.1',
    prefix: 12,
  },
  {
    id: 'private-192',
    name: '私网 C 类示例',
    description: '192.168.0.0/16 段示例',
    address: '192.168.1.100',
    prefix: 24,
  },
  {
    id: 'loopback',
    name: '回环地址示例',
    description: '127.0.0.0/8 回网段',
    address: '127.0.0.1',
    prefix: 8,
  },
  {
    id: 'link-local',
    name: '链路本地示例',
    description: '169.254.0.0/16 段示例',
    address: '169.254.1.2',
    prefix: 16,
  },
  {
    id: 'slash31',
    name: '/31 点到点示例',
    description: '典型 WAN 点到点链路',
    address: '10.1.2.3',
    prefix: 31,
  },
  {
    id: 'slash32',
    name: '/32 单主机示例',
    description: '单主机路由',
    address: '8.8.8.8',
    prefix: 32,
  },
]

export {
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
}
