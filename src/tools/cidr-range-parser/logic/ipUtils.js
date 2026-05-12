import { ERROR_CODES, createError } from './errors.js'

const MAX_IP_INT = 4294967295n

function isValidIpOctet(octet) {
  const num = Number(octet)
  return Number.isInteger(num) && num >= 0 && num <= 255
}

function parseIp(ipStr) {
  if (!ipStr || typeof ipStr !== 'string') {
    return { error: createError(ERROR_CODES.INVALID_IP) }
  }

  const trimmed = ipStr.trim()
  const parts = trimmed.split('.')

  if (parts.length !== 4) {
    return { error: createError(ERROR_CODES.INVALID_IP) }
  }

  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || !isValidIpOctet(part)) {
      return { error: createError(ERROR_CODES.INVALID_IP) }
    }
  }

  const octets = parts.map(Number)

  const intValue =
    BigInt(octets[0]) * 16777216n +
    BigInt(octets[1]) * 65536n +
    BigInt(octets[2]) * 256n +
    BigInt(octets[3])

  return {
    octets,
    intValue,
    formatted: trimmed,
  }
}

function intToIp(intValue) {
  if (intValue < 0n || intValue > MAX_IP_INT) {
    return null
  }

  const octet3 = Number(intValue & 0xFFn)
  const octet2 = Number((intValue >> 8n) & 0xFFn)
  const octet1 = Number((intValue >> 16n) & 0xFFn)
  const octet0 = Number((intValue >> 24n) & 0xFFn)

  return `${octet0}.${octet1}.${octet2}.${octet3}`
}

function intToOctets(intValue) {
  if (intValue < 0n || intValue > MAX_IP_INT) {
    return null
  }

  return [
    Number((intValue >> 24n) & 0xFFn),
    Number((intValue >> 16n) & 0xFFn),
    Number((intValue >> 8n) & 0xFFn),
    Number(intValue & 0xFFn),
  ]
}

function octetsToBinaryString(octets) {
  return octets.map((octet) => octet.toString(2).padStart(8, '0')).join('.')
}

function intToBinaryString(intValue) {
  const octets = intToOctets(intValue)
  return octets ? octetsToBinaryString(octets) : null
}

function countSetBits(n) {
  let count = 0n
  let value = BigInt(n)
  while (value > 0n) {
    count += value & 1n
    value >>= 1n
  }
  return Number(count)
}

function prefixToMaskInt(prefix) {
  if (prefix < 0 || prefix > 32) {
    return null
  }
  if (prefix === 0) {
    return 0n
  }
  return (0xFFFFFFFFn << (32n - BigInt(prefix))) & 0xFFFFFFFFn
}

function maskIntToPrefix(maskInt) {
  return countSetBits(maskInt)
}

function maskIntToIp(maskInt) {
  return intToIp(maskInt)
}

function maskIntToBinaryString(maskInt) {
  return intToBinaryString(maskInt)
}

function networkAddressInt(ipInt, maskInt) {
  return ipInt & maskInt
}

function broadcastAddressInt(ipInt, maskInt) {
  return ipInt | (~maskInt & 0xFFFFFFFFn)
}

function addressCountInt(prefix) {
  if (prefix < 0 || prefix > 32) {
    return 0n
  }
  return 1n << (32n - BigInt(prefix))
}

function isInRange(ipInt, startInt, endInt) {
  return ipInt >= startInt && ipInt <= endInt
}

function isInCidr(ipInt, networkInt, broadcastInt) {
  return ipInt >= networkInt && ipInt <= broadcastInt
}

export {
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
}
