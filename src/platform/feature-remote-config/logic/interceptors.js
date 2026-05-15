function createFeatureFetchInterceptor({ getSnapshot }) {
  return function featureInterceptor(request) {
    const snapshot = typeof getSnapshot === 'function' ? getSnapshot() : getSnapshot

    if (!snapshot || !snapshot.snapshot) {
      return request
    }

    const flags = snapshot.snapshot
    const modifiedRequest = { ...request }

    if (flags.api_base_url && flags.api_base_url.value) {
      const baseURL = flags.api_base_url.value
      const url = request.url

      if (url && typeof url === 'string' && !url.startsWith('http')) {
        const normalizedBase = baseURL.endsWith('/') ? baseURL : baseURL + '/'
        const normalizedPath = url.startsWith('/') ? url.slice(1) : url
        modifiedRequest.url = normalizedBase + normalizedPath
      }
    }

    const extraHeaders = {}

    if (flags.feature_toggle_header && flags.feature_toggle_header.value) {
      extraHeaders['X-Feature-Toggle'] = String(flags.feature_toggle_header.value)
    }

    if (flags.experiment_id && flags.experiment_id.value) {
      extraHeaders['X-Experiment-Id'] = String(flags.experiment_id.value)
    }

    if (flags.user_cohort && flags.user_cohort.value) {
      extraHeaders['X-User-Cohort'] = String(flags.user_cohort.value)
    }

    if (Object.keys(extraHeaders).length > 0) {
      modifiedRequest.headers = {
        ...(request.headers || {}),
        ...extraHeaders,
      }
    }

    return modifiedRequest
  }
}

function createBaseURLSwitchInterceptor({ getSnapshot, baseURLFlagKey = 'api_base_url' }) {
  return function baseURLInterceptor(request) {
    const snapshot = typeof getSnapshot === 'function' ? getSnapshot() : getSnapshot

    if (!snapshot || !snapshot.snapshot) {
      return request
    }

    const flag = snapshot.snapshot[baseURLFlagKey]

    if (!flag || !flag.value) {
      return request
    }

    const baseURL = flag.value
    const url = request.url

    if (url && typeof url === 'string' && !url.startsWith('http')) {
      const normalizedBase = baseURL.endsWith('/') ? baseURL : baseURL + '/'
      const normalizedPath = url.startsWith('/') ? url.slice(1) : url

      return {
        ...request,
        url: normalizedBase + normalizedPath,
      }
    }

    return request
  }
}

function createHeaderInterceptor({ getSnapshot, headerMappings = [] }) {
  return function headerInterceptor(request) {
    const snapshot = typeof getSnapshot === 'function' ? getSnapshot() : getSnapshot

    if (!snapshot || !snapshot.snapshot) {
      return request
    }

    const flags = snapshot.snapshot
    const extraHeaders = {}

    for (const mapping of headerMappings) {
      const { flagKey, headerName, defaultValue } = mapping
      const flag = flags[flagKey]

      if (flag && flag.value !== undefined && flag.value !== null) {
        extraHeaders[headerName] = String(flag.value)
      } else if (defaultValue !== undefined) {
        extraHeaders[headerName] = String(defaultValue)
      }
    }

    if (Object.keys(extraHeaders).length === 0) {
      return request
    }

    return {
      ...request,
      headers: {
        ...(request.headers || {}),
        ...extraHeaders,
      },
    }
  }
}

function createEnvironmentSwitchInterceptor({ getSnapshot, environments }) {
  return function environmentInterceptor(request) {
    const snapshot = typeof getSnapshot === 'function' ? getSnapshot() : getSnapshot

    if (!snapshot) {
      return request
    }

    const environment = snapshot.environment || 'dev'
    const envConfig = environments[environment]

    if (!envConfig) {
      return request
    }

    const modifiedRequest = { ...request }

    if (envConfig.baseURL) {
      const url = request.url
      if (url && typeof url === 'string' && !url.startsWith('http')) {
        const normalizedBase = envConfig.baseURL.endsWith('/')
          ? envConfig.baseURL
          : envConfig.baseURL + '/'
        const normalizedPath = url.startsWith('/') ? url.slice(1) : url
        modifiedRequest.url = normalizedBase + normalizedPath
      }
    }

    if (envConfig.headers) {
      modifiedRequest.headers = {
        ...(request.headers || {}),
        ...envConfig.headers,
      }
    }

    return modifiedRequest
  }
}

export {
  createFeatureFetchInterceptor,
  createBaseURLSwitchInterceptor,
  createHeaderInterceptor,
  createEnvironmentSwitchInterceptor,
}
