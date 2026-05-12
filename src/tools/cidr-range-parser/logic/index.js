import { ERROR_CODES, createError } from './errors.js'
import {
  parseCidr,
  parseRange,
  parseIpList,
  findCoveringCidr,
  splitRangeIntoCidrs,
  generateAddressList,
  probeIpInRange,
  probeIpInCidr,
} from './cidrUtils.js'

const EXAMPLES = {
  cidrBasic: '192.168.1.0/24',
  cidrSmall: '10.0.0.0/8',
  cidr32: '8.8.8.8/32',
  cidr31: '10.0.0.0/31',
  rangeExact: '192.168.1.0-192.168.1.255',
  rangePartial: '192.168.1.100-192.168.1.150',
  rangeMultiple: '10.0.0.1-10.0.0.255',
  ipList: '192.168.1.1\n192.168.1.5\n192.168.1.10\n192.168.1.100',
}

const RFC3021_NOTE =
  '/31 前缀（RFC 3021）用于点到点链路，仅包含 2 个可用地址，无网络地址和广播地址的区分，两个地址均可作为主机地址使用。'

const SINGLE_HOST_NOTE = '/32 前缀表示单个主机地址，网络地址、广播地址和主机地址为同一地址。'

function processCidr(cidrStr, options = {}) {
  const { enumeratePolicy = 'sample', sampleSize = 10 } = options
  const warnings = []

  const cidrResult = parseCidr(cidrStr)
  if (cidrResult.error) {
    return {
      success: false,
      errorCode: cidrResult.error.errorCode,
      errorMessage: cidrResult.error.errorMessage,
      warnings,
    }
  }

  if (cidrResult.isRFC3021) {
    warnings.push({
      type: 'info',
      code: 'RFC3021',
      message: RFC3021_NOTE,
    })
  }
  if (cidrResult.isSingleHost) {
    warnings.push({
      type: 'info',
      code: 'SINGLE_HOST',
      message: SINGLE_HOST_NOTE,
    })
  }

  const enumeration = generateAddressList(
    cidrResult.networkInt,
    cidrResult.broadcastInt,
    enumeratePolicy,
    sampleSize
  )

  let enumerationPreview
  let errorCode = null
  let errorMessage = null

  if (enumeration.type === 'full') {
    enumerationPreview = enumeration
  } else {
    enumerationPreview = enumeration
    errorCode = ERROR_CODES.ENUMERATION_LIMIT_EXCEEDED
    errorMessage =
      `地址数量 (${enumeration.totalCount.toString()}) 超过枚举限制，已启用智能展示策略。`
  }

  return {
    success: true,
    mode: 'cidr',
    derivedNetwork: cidrResult.network,
    prefix: cidrResult.prefix,
    addressTotal: cidrResult.totalAddresses,
    usableHosts: cidrResult.usableHosts,
    mask: cidrResult.mask,
    maskBinary: cidrResult.maskBinary,
    network: cidrResult.network,
    networkBinary: cidrResult.networkBinary,
    broadcast: cidrResult.broadcast,
    broadcastBinary: cidrResult.broadcastBinary,
    firstHost: cidrResult.firstHost,
    lastHost: cidrResult.lastHost,
    enumerationPreview,
    aggregatedCidrProposal: [],
    probeResult: null,
    warnings,
    errorCode,
    errorMessage,
    cidrInfo: cidrResult,
  }
}

function processRange(rangeStartStr, rangeEndStr, options = {}) {
  const { enumeratePolicy = 'sample', sampleSize = 10 } = options
  const warnings = []

  const rangeStr = `${rangeStartStr}-${rangeEndStr}`
  const rangeResult = parseRange(rangeStr)

  if (rangeResult.error) {
    return {
      success: false,
      mode: 'range',
      errorCode: rangeResult.error.errorCode,
      errorMessage: rangeResult.error.errorMessage,
      warnings,
    }
  }

  const coveringCidr = findCoveringCidr(rangeResult.startInt, rangeResult.endInt)
  const splitCidrs = splitRangeIntoCidrs(rangeResult.startInt, rangeResult.endInt)

  const aggregatedCidrProposal = []

  if (coveringCidr.error) {
    warnings.push({
      type: 'warning',
      code: 'NO_SINGLE_CIDR',
      message: '该 IP 范围无法用单一 CIDR 精确覆盖，以下提供多个 CIDR 的拆分方案。',
    })
  } else {
    aggregatedCidrProposal.push({
      ...coveringCidr,
      type: 'covering',
      description: coveringCidr.isExact
        ? '精确覆盖的最小 CIDR'
        : '可覆盖该范围的最小超网（可能包含额外地址）',
    })
  }

  splitCidrs.forEach((cidr, index) => {
    aggregatedCidrProposal.push({
      ...cidr,
      type: 'split',
      description: `拆分方案 ${index + 1}（精确覆盖的一部分）`,
    })
  })

  const enumeration = generateAddressList(
    rangeResult.startInt,
    rangeResult.endInt,
    enumeratePolicy,
    sampleSize
  )

  const totalAddresses = rangeResult.endInt - rangeResult.startInt + 1n

  let enumerationPreview
  let errorCode = null
  let errorMessage = null

  if (enumeration.type === 'full') {
    enumerationPreview = enumeration
  } else {
    enumerationPreview = enumeration
    errorCode = ERROR_CODES.ENUMERATION_LIMIT_EXCEEDED
    errorMessage =
      `地址数量 (${enumeration.totalCount.toString()}) 超过枚举限制，已启用智能展示策略。`
  }

  const derivedNetwork = coveringCidr.error ? null : coveringCidr.network
  const prefix = coveringCidr.error ? null : coveringCidr.prefix

  return {
    success: true,
    mode: 'range',
    derivedNetwork,
    prefix,
    addressTotal: totalAddresses,
    rangeStart: rangeResult.start,
    rangeStartInt: rangeResult.startInt,
    rangeEnd: rangeResult.end,
    rangeEndInt: rangeResult.endInt,
    enumerationPreview,
    aggregatedCidrProposal,
    probeResult: null,
    warnings,
    errorCode: coveringCidr.error ? coveringCidr.error.errorCode : errorCode,
    errorMessage: coveringCidr.error ? coveringCidr.error.errorMessage : errorMessage,
  }
}

function processIpList(ipListStr, options = {}) {
  const { enumeratePolicy = 'sample', sampleSize = 10 } = options
  const warnings = []

  const listResult = parseIpList(ipListStr)

  if (listResult.error) {
    return {
      success: false,
      mode: 'ipList',
      errorCode: listResult.error.errorCode,
      errorMessage: listResult.error.errorMessage,
      warnings,
    }
  }

  if (listResult.parseErrors && listResult.parseErrors.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'PARSE_ERRORS',
      message: `解析过程中发现 ${listResult.parseErrors.length} 个无效 IP 地址，已忽略。`,
      details: listResult.parseErrors,
    })
  }

  const coveringCidr = findCoveringCidr(listResult.startInt, listResult.endInt)
  const splitCidrs = splitRangeIntoCidrs(listResult.startInt, listResult.endInt)

  const aggregatedCidrProposal = []

  if (coveringCidr.error) {
    warnings.push({
      type: 'warning',
      code: 'NO_SINGLE_CIDR',
      message: '这些 IP 地址无法用单一 CIDR 精确覆盖，以下提供多个 CIDR 的拆分方案。',
    })
  } else {
    aggregatedCidrProposal.push({
      ...coveringCidr,
      type: 'covering',
      description: coveringCidr.isExact
        ? '精确覆盖所有 IP 的最小 CIDR'
        : '可覆盖所有 IP 的最小超网（可能包含额外地址）',
    })
  }

  splitCidrs.forEach((cidr, index) => {
    aggregatedCidrProposal.push({
      ...cidr,
      type: 'split',
      description: `拆分方案 ${index + 1}（精确覆盖范围的一部分）`,
    })
  })

  const enumeration = generateAddressList(
    listResult.startInt,
    listResult.endInt,
    enumeratePolicy,
    sampleSize
  )

  const totalAddresses = listResult.endInt - listResult.startInt + 1n

  let enumerationPreview
  let errorCode = null
  let errorMessage = null

  if (enumeration.type === 'full') {
    enumerationPreview = enumeration
  } else {
    enumerationPreview = enumeration
    errorCode = ERROR_CODES.ENUMERATION_LIMIT_EXCEEDED
    errorMessage =
      `地址数量 (${enumeration.totalCount.toString()}) 超过枚举限制，已启用智能展示策略。`
  }

  const derivedNetwork = coveringCidr.error ? null : coveringCidr.network
  const prefix = coveringCidr.error ? null : coveringCidr.prefix

  return {
    success: true,
    mode: 'ipList',
    derivedNetwork,
    prefix,
    addressTotal: totalAddresses,
    inputCount: listResult.totalCount,
    rangeStart: listResult.start,
    rangeStartInt: listResult.startInt,
    rangeEnd: listResult.end,
    rangeEndInt: listResult.endInt,
    enumerationPreview,
    aggregatedCidrProposal,
    probeResult: null,
    warnings,
    errorCode: coveringCidr.error ? coveringCidr.error.errorCode : errorCode,
    errorMessage: coveringCidr.error ? coveringCidr.error.errorMessage : errorMessage,
  }
}

function processProbe(probeIpStr, currentResult) {
  if (!currentResult || !currentResult.success) {
    return {
      success: false,
      errorCode: ERROR_CODES.EMPTY_INPUT,
      errorMessage: '请先解析 CIDR 或 IP 范围',
    }
  }

  if (currentResult.mode === 'cidr' && currentResult.cidrInfo) {
    const probeResult = probeIpInCidr(probeIpStr, currentResult.cidrInfo)

    if (probeResult.error) {
      return {
        ...currentResult,
        probeResult: {
          success: false,
          ...probeResult.error,
        },
      }
    }

    return {
      ...currentResult,
      probeResult: {
        success: true,
        ...probeResult,
      },
    }
  }

  if (currentResult.rangeStartInt !== undefined && currentResult.rangeEndInt !== undefined) {
    const probeResult = probeIpInRange(
      probeIpStr,
      currentResult.rangeStartInt,
      currentResult.rangeEndInt
    )

    if (probeResult.error) {
      return {
        ...currentResult,
        probeResult: {
          success: false,
          ...probeResult.error,
        },
      }
    }

    return {
      ...currentResult,
      probeResult: {
        success: true,
        ...probeResult,
      },
    }
  }

  return {
    ...currentResult,
    probeResult: {
      success: false,
      errorCode: ERROR_CODES.EMPTY_INPUT,
      errorMessage: '无法探测：当前没有有效的 CIDR 或 IP 范围',
    },
  }
}

export {
  EXAMPLES,
  RFC3021_NOTE,
  SINGLE_HOST_NOTE,
  processCidr,
  processRange,
  processIpList,
  processProbe,
}
