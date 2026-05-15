import {
  RISK_FLAGS,
  OPEN_STRATEGY,
  URL_SCHEMES,
  DEFAULT_OPTIONS,
  HASH_PREFIX_LENGTH,
} from './constants.js'
import {
  emptyInputError,
  invalidUrlError,
  urlTooLongError,
} from './errors.js'

function hasControlCharacters(str) {
  return /[\x00-\x1F\x7F]/.test(str)
}

function hasAbnormalDoubleSlash(urlString) {
  const protocolEndIndex = urlString.indexOf('://')
  if (protocolEndIndex === -1) {
    return /\/\//.test(urlString)
  }
  const afterProtocol = urlString.substring(protocolEndIndex + 3)
  return /\/\//.test(afterProtocol)
}

function isPunycode(hostname) {
  return hostname.includes('xn--')
}

function isIPv6Literal(hostname) {
  return hostname.startsWith('[') && hostname.endsWith(']')
}

function hasUserCredentials(url) {
  return url.username !== '' || url.password !== ''
}

function isStandardPort(port, protocol) {
  if (!port) return true
  const portNum = parseInt(port, 10)
  if (protocol === URL_SCHEMES.HTTP) return portNum === 80
  if (protocol === URL_SCHEMES.HTTPS) return portNum === 443
  return false
}

function hasUtmParams(searchParams, utmParamsList) {
  for (const param of utmParamsList) {
    if (searchParams.has(param)) {
      return true
    }
  }
  return false
}

function hasOAuthState(searchParams) {
  return searchParams.has('state') && searchParams.get('state').length > 10
}

function hashPrefix(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(HASH_PREFIX_LENGTH, '0').substring(0, HASH_PREFIX_LENGTH)
}

function detectOpenStrategy(scheme, schemeWhitelist) {
  if (scheme === URL_SCHEMES.HTTP || scheme === URL_SCHEMES.HTTPS) {
    return OPEN_STRATEGY.EXTERNAL_BLANK
  }
  if (scheme === URL_SCHEMES.MAILTO || scheme === URL_SCHEMES.TEL) {
    return OPEN_STRATEGY.DESKTOP_DEEPLINK
  }
  if (schemeWhitelist.includes(scheme)) {
    return OPEN_STRATEGY.DESKTOP_DEEPLINK
  }
  return OPEN_STRATEGY.MOBILE_UNIVERSAL
}

function formatHostForDisplay(hostname, punycodeToUnicode) {
  if (isIPv6Literal(hostname)) {
    const ipv6 = hostname.substring(1, hostname.length - 1)
    return { displayHost: hostname, asciiHost: hostname, ipv6Address: ipv6 }
  }

  const asciiHost = hostname.toLowerCase()
  const unicodeHost = punycodeToUnicode ? punycodeToUnicode(asciiHost) : asciiHost

  return {
    displayHost: unicodeHost,
    asciiHost: asciiHost,
    isIdn: asciiHost !== unicodeHost || isPunycode(asciiHost),
  }
}

function summarizePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/'
  }
  const parts = pathname.split('/').filter(p => p)
  if (parts.length <= 3) {
    return pathname
  }
  return `/${parts[0]}/${parts[1]}/.../${parts[parts.length - 1]}`
}

function stripUtmParams(searchParams, utmParamsList) {
  const newParams = new URLSearchParams(searchParams)
  for (const param of utmParamsList) {
    newParams.delete(param)
  }
  return newParams
}

function buildCanonicalUrl(url, strippedParams = null) {
  const params = strippedParams || url.searchParams
  const searchStr = params.toString()
  const search = searchStr ? `?${searchStr}` : ''
  const hash = url.hash

  let canonical = ''

  if (url.protocol === URL_SCHEMES.MAILTO || url.protocol === URL_SCHEMES.TEL) {
    canonical = `${url.protocol}${url.pathname}${search}`
  } else {
    canonical = `${url.protocol}//${url.hostname.toLowerCase()}`
    if (url.port && !isStandardPort(url.port, url.protocol)) {
      canonical += `:${url.port}`
    }
    canonical += url.pathname || '/'
    canonical += search
    canonical += hash
  }

  return canonical
}

function maskSensitiveParams(searchParams) {
  const masked = new URLSearchParams(searchParams)
  if (masked.has('state') && masked.get('state').length > 10) {
    const state = masked.get('state')
    const prefix = hashPrefix(state)
    masked.set('state', `[HASH:${prefix}...]`)
  }
  if (masked.has('code')) {
    masked.set('code', '[REDACTED]')
  }
  if (masked.has('token')) {
    masked.set('token', '[REDACTED]')
  }
  return masked
}

function parseShareLink(rawInput, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const trimmedInput = rawInput.trim()

  if (!trimmedInput) {
    throw emptyInputError()
  }

  if (trimmedInput.length > config.maxUrlLength) {
    throw urlTooLongError(trimmedInput.length, config.maxUrlLength)
  }

  const riskFlags = []

  if (hasControlCharacters(trimmedInput)) {
    riskFlags.push({ ...RISK_FLAGS.CONTROL_CHARACTERS })
  }
  if (hasAbnormalDoubleSlash(trimmedInput)) {
    riskFlags.push({ ...RISK_FLAGS.DOUBLE_SLASH_ABNORMAL })
  }

  let url
  try {
    url = new URL(trimmedInput)
  } catch (e) {
    throw invalidUrlError(trimmedInput)
  }

  if (hasUserCredentials(url)) {
    riskFlags.push({ ...RISK_FLAGS.USER_CREDENTIALS })
  }

  if (isPunycode(url.hostname)) {
    riskFlags.push({ ...RISK_FLAGS.PUNYCODE })
  }

  if (isIPv6Literal(url.hostname)) {
    riskFlags.push({ ...RISK_FLAGS.IPV6_LITERAL })
  }

  if (url.port && !isStandardPort(url.port, url.protocol)) {
    riskFlags.push({ ...RISK_FLAGS.SUSPICIOUS_PORT })
  }

  if (!config.schemeWhitelist.includes(url.protocol)) {
    riskFlags.push({ ...RISK_FLAGS.UNKNOWN_SCHEME })
  }

  if (trimmedInput.length > config.maxUrlLength * 0.8) {
    riskFlags.push({ ...RISK_FLAGS.LONG_URL })
  }

  if (hasUtmParams(url.searchParams, config.utmParams)) {
    riskFlags.push({ ...RISK_FLAGS.UTM_TAGS })
  }

  if (hasOAuthState(url.searchParams)) {
    riskFlags.push({ ...RISK_FLAGS.OAUTH_STATE })
  }

  const hostInfo = formatHostForDisplay(url.hostname, config.punycodeToUnicode)

  const canonical = buildCanonicalUrl(url)

  const strippedParams = stripUtmParams(url.searchParams, config.utmParams)
  const strippedUtm = buildCanonicalUrl(url, strippedParams)

  const openStrategy = detectOpenStrategy(url.protocol, config.schemeWhitelist)

  const queryKeys = Array.from(url.searchParams.keys())
  const maskedParams = maskSensitiveParams(url.searchParams)

  return {
    raw: trimmedInput,
    canonical,
    strippedUtm,
    displayHost: hostInfo.displayHost,
    asciiHost: hostInfo.asciiHost,
    isIdn: hostInfo.isIdn,
    protocol: url.protocol,
    pathSummary: summarizePath(url.pathname),
    fullPath: url.pathname,
    queryCount: queryKeys.length,
    queryKeys,
    maskedParams: maskedParams.toString(),
    fragment: url.hash || null,
    riskFlags,
    openStrategy,
    port: url.port || null,
    hasCredentials: hasUserCredentials(url),
  }
}

export {
  parseShareLink,
  hasControlCharacters,
  hasAbnormalDoubleSlash,
  isPunycode,
  isIPv6Literal,
  hasUserCredentials,
  isStandardPort,
  hasUtmParams,
  hasOAuthState,
  hashPrefix,
  stripUtmParams,
  buildCanonicalUrl,
  summarizePath,
  maskSensitiveParams,
  detectOpenStrategy,
}
