import { HEADER_NAMES, LINK_REL, WARNING_CODE } from './constants'
import { InvalidDateError, InvalidLinkHeaderError, InvalidWarningHeaderError } from './errors'

export function parseHttpDate(dateString) {
  if (!dateString) {
    return null
  }
  
  const trimmed = dateString.trim()
  
  const timestamp = Date.parse(trimmed)
  if (isNaN(timestamp)) {
    throw new InvalidDateError(dateString)
  }
  
  return new Date(timestamp)
}

export function parseDeprecationHeader(value) {
  if (!value) {
    return null
  }
  
  const trimmed = value.trim()
  
  try {
    const date = parseHttpDate(trimmed)
    if (date) {
      return { type: 'date', value: date }
    }
  } catch (e) {
  }
  
  const versionMatch = trimmed.match(/^["']?([^"']+)["']?$/)
  if (versionMatch) {
    return { type: 'version', value: versionMatch[1] }
  }
  
  return { type: 'raw', value: trimmed }
}

export function parseSunsetHeader(value) {
  if (!value) {
    return null
  }
  return parseHttpDate(value.trim())
}

export function parseLinkHeader(value) {
  if (!value) {
    return []
  }
  
  const results = []
  const parts = splitByComma(value)
  
  for (const part of parts) {
    const link = parseSingleLink(part.trim())
    if (link) {
      results.push(link)
    }
  }
  
  return results
}

function splitByComma(str) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '"') {
      inQuotes = !inQuotes
      current += char
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  if (current.trim()) {
    result.push(current.trim())
  }
  
  return result
}

function parseSingleLink(linkStr) {
  const urlMatch = linkStr.match(/^<([^>]+)>/)
  if (!urlMatch) {
    throw new InvalidLinkHeaderError(linkStr)
  }
  
  const url = urlMatch[1]
  const params = {}
  
  const paramStr = linkStr.substring(urlMatch[0].length)
  const paramMatches = paramStr.matchAll(/;\s*([^=]+)(?:=\s*("([^"]*)"|([^";\s]+)))?/g)
  
  for (const match of paramMatches) {
    const key = match[1].trim().toLowerCase()
    const value = match[3] || match[4] || ''
    params[key] = value
  }
  
  return { url, params }
}

export function parseWarningHeader(value) {
  if (!value) {
    return []
  }
  
  const results = []
  const parts = splitByComma(value)
  
  for (const part of parts) {
    const warning = parseSingleWarning(part.trim())
    if (warning) {
      results.push(warning)
    }
  }
  
  return results
}

function parseSingleWarning(warningStr) {
  const match = warningStr.match(/^(\d+)\s+([^\s]+)\s+"([^"]*)"(?:\s+"([^"]*)")?$/)
  if (!match) {
    throw new InvalidWarningHeaderError(warningStr)
  }
  
  const [, codeStr, agent, text, dateStr] = match
  const code = parseInt(codeStr, 10)
  
  return {
    code,
    agent,
    text,
    date: dateStr ? parseHttpDate(dateStr) : null,
  }
}

export function getDeprecationLinks(links) {
  return links.filter(link => link.params.rel === LINK_REL.DEPRECATION)
}

export function getSunsetLinks(links) {
  return links.filter(link => link.params.rel === LINK_REL.SUNSET)
}

export function parseHeadersFromObject(headers) {
  const result = {}
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    try {
      switch (lowerKey) {
        case HEADER_NAMES.DEPRECATION:
          result.deprecation = parseDeprecationHeader(value)
          break
        case HEADER_NAMES.SUNSET:
          result.sunset = parseSunsetHeader(value)
          break
        case HEADER_NAMES.SUNSET_DATE:
          result.sunsetDate = parseSunsetHeader(value)
          break
        case HEADER_NAMES.LINK:
          result.links = parseLinkHeader(value)
          break
        case HEADER_NAMES.WARNING:
          result.warnings = parseWarningHeader(value)
          break
      }
    } catch (e) {
      console.warn(`解析头 ${key} 失败:`, e)
    }
  }
  
  return result
}

export function parseHeadersFromFetchResponse(response) {
  const headers = {}
  
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  return parseHeadersFromObject(headers)
}

export function parseHeadersFromText(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) {
    return {}
  }
  
  const headers = {}
  const startIndex = lines[0].includes('HTTP/') ? 1 : 0
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      headers[key] = value
    }
  }
  
  return parseHeadersFromObject(headers)
}

export function parseAllHeaders(input) {
  if (input instanceof Response) {
    return parseHeadersFromFetchResponse(input)
  }
  
  if (typeof input === 'string') {
    return parseHeadersFromText(input)
  }
  
  if (input && typeof input === 'object') {
    return parseHeadersFromObject(input)
  }
  
  return {}
}
