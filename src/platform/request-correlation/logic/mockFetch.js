async function mockFetch(url, options = {}) {
  const {
    delay = 100,
    status = 200,
    statusText = 'OK',
    responseData = null,
    failWith = null,
  } = options.mock || {}

  await new Promise((resolve) => setTimeout(resolve, delay))

  if (failWith === 'NETWORK') {
    const error = new TypeError('Failed to fetch')
    error.name = 'TypeError'
    error.errorCode = 'NETWORK'
    throw error
  }

  if (failWith === 'CORS') {
    const error = new Error('CORS preflight failed')
    error.errorCode = 'CORS_PREFLIGHT_FAILED'
    throw error
  }

  const headers = {}
  const requestHeaders = options.headers || {}
  for (const [key, value] of Object.entries(requestHeaders)) {
    headers[key] = value
  }

  const body = responseData !== null
    ? JSON.stringify(responseData || {
        url,
        method: options.method || 'GET',
        headers,
      })
    : null

  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Map(Object.entries(headers)),
    url,
    json: async () => responseData !== null ? responseData : {
      url,
      method: options.method || 'GET',
      headers,
    },
    text: async () => body || '',
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${status}`)
    error.status = status
    error.response = response
    throw error
  }

  return response
}

function createMockHttpClient(baseOptions = {}) {
  const {
    interceptors = [],
  } = baseOptions

  async function request(url, options = {}) {
    let config = {
      url,
      init: { ...options },
      options: {},
    }

    for (const interceptor of interceptors) {
      if (interceptor.request) {
        config = await interceptor.request(config)
      }
    }

    let response

    try {
      response = await mockFetch(config.url, config.init)

      for (const interceptor of interceptors) {
        if (interceptor.response) {
          response = interceptor.response(response, config)
        }
      }

      return response
    } catch (error) {
      for (const interceptor of interceptors) {
        if (interceptor.error) {
          interceptor.error(error, config)
        }
      }

      throw error
    }
  }

  function get(url, options = {}) {
    return request(url, { ...options, method: 'GET' })
  }

  function post(url, body, options = {}) {
    return request(url, {
      ...options,
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    })
  }

  return {
    request,
    get,
    post,
  }
}

export {
  mockFetch,
  createMockHttpClient,
}
