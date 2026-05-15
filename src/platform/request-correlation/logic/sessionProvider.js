import {
  createError,
  wrapError,
} from './errors.js'

function createMemorySessionProvider(initialSessionId = null) {
  let sessionId = initialSessionId

  return {
    getSessionId: async () => {
      return sessionId
    },
    setSessionId: (id) => {
      sessionId = id
      return sessionId
    },
    clearSessionId: () => {
      sessionId = null
    },
  }
}

function createLocalStorageSessionProvider(options = {}) {
  const {
    storageKey = 'x_session_id',
    autoGenerate = true,
    idGenerator,
  } = options

  function getStorage() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null
    } catch {
      return null
    }
  }

  return {
    getSessionId: async () => {
      const storage = getStorage()
      if (!storage) {
        return autoGenerate && idGenerator ? idGenerator() : null
      }

      try {
        let id = storage.getItem(storageKey)
        if (!id && autoGenerate && idGenerator) {
          id = idGenerator()
          storage.setItem(storageKey, id)
        }
        return id
      } catch (error) {
        throw wrapError(
          error,
          'SESSION_PROVIDER_ERROR',
          { operation: 'getSessionId', storageKey }
        )
      }
    },
    setSessionId: (id) => {
      const storage = getStorage()
      if (!storage) {
        throw createError(
          'SESSION_PROVIDER_ERROR',
          'localStorage 不可用',
          { operation: 'setSessionId', storageKey }
        )
      }

      try {
        storage.setItem(storageKey, id)
        return id
      } catch (error) {
        throw wrapError(
          error,
          'SESSION_PROVIDER_ERROR',
          { operation: 'setSessionId', storageKey }
        )
      }
    },
    clearSessionId: () => {
      const storage = getStorage()
      if (!storage) {
        return
      }

      try {
        storage.removeItem(storageKey)
      } catch (error) {
        throw wrapError(
          error,
          'SESSION_PROVIDER_ERROR',
          { operation: 'clearSessionId', storageKey }
        )
      }
    },
  }
}

function createNoopSessionProvider() {
  return {
    getSessionId: async () => null,
    setSessionId: () => null,
    clearSessionId: () => {},
  }
}

export {
  createMemorySessionProvider,
  createLocalStorageSessionProvider,
  createNoopSessionProvider,
}
