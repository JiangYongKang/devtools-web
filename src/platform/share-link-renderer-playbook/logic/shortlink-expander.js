import { DEFAULT_OPTIONS } from './constants.js'
import {
  expandTimeoutError,
  expandCORSError,
  expandFailedError,
  maxRedirectsError,
} from './errors.js'

function isShortlinkDomain(hostname, shortlinkDomains) {
  return shortlinkDomains.some(domain =>
    hostname === domain || hostname.endsWith(`.${domain}`)
  )
}

async function expandShortlink(url, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let currentUrl = url
  let redirectCount = 0
  const redirectHistory = []

  while (redirectCount < config.maxRedirects) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.expandTimeout)

    try {
      redirectHistory.push({
        url: currentUrl,
        attempt: redirectCount + 1,
      })

      const response = await fetch(currentUrl, {
        method: 'HEAD',
        mode: 'cors',
        redirect: 'manual',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.type === 'opaqueredirect' || response.status === 0) {
        throw expandCORSError(new URL(currentUrl).hostname)
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location')
        if (location) {
          const nextUrl = new URL(location, currentUrl).href
          currentUrl = nextUrl
          redirectCount++
          continue
        }
      }

      return {
        finalUrl: currentUrl,
        redirectCount,
        redirectHistory,
        status: response.status,
        statusText: response.statusText,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw expandTimeoutError(config.expandTimeout)
      }

      if (error.message && error.message.includes('CORS')) {
        throw expandCORSError(new URL(currentUrl).hostname)
      }

      if (error.message && error.message.includes('Failed to fetch')) {
        throw expandCORSError(new URL(currentUrl).hostname)
      }

      throw expandFailedError(error.message)
    }
  }

  throw maxRedirectsError(config.maxRedirects)
}

async function tryExpandShortlink(url, options = {}) {
  try {
    const result = await expandShortlink(url, options)
    return {
      success: true,
      ...result,
    }
  } catch (error) {
    return {
      success: false,
      error: error.toJSON ? error.toJSON() : { message: error.message },
    }
  }
}

export {
  isShortlinkDomain,
  expandShortlink,
  tryExpandShortlink,
}
