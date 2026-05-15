import { useCallback, useEffect, useRef } from 'react'
import { createPreloadStrategy, shouldPreloadOnTrigger } from './logic'

export function usePreload(manifest, config = {}) {
  const preloadStrategy = useRef(createPreloadStrategy(config.strategy))
  const preloadIds = useRef(new Map())
  const loadedChunks = useRef(new Set())

  const preloadTool = useCallback((toolId) => {
    const tool = manifest[toolId]
    if (!tool || loadedChunks.current.has(toolId)) return

    loadedChunks.current.add(toolId)

    const id = preloadStrategy.current.schedule(() => {
      tool.loader().catch(() => {
        loadedChunks.current.delete(toolId)
      })
    }, config.scheduleOptions)

    preloadIds.current.set(toolId, id)
  }, [manifest, config.scheduleOptions])

  const cancelPreload = useCallback((toolId) => {
    const id = preloadIds.current.get(toolId)
    if (id) {
      preloadStrategy.current.cancel(id)
      preloadIds.current.delete(toolId)
    }
  }, [])

  const createPreloadHandlers = useCallback((toolId) => {
    return {
      onMouseEnter: () => {
        if (shouldPreloadOnTrigger('hover', config)) {
          preloadTool(toolId)
        }
      },
      onFocus: () => {
        if (shouldPreloadOnTrigger('focus', config)) {
          preloadTool(toolId)
        }
      },
      onMouseLeave: () => {
        if (config.cancelOnLeave) {
          cancelPreload(toolId)
        }
      },
      onBlur: () => {
        if (config.cancelOnBlur) {
          cancelPreload(toolId)
        }
      },
    }
  }, [preloadTool, cancelPreload, config])

  useEffect(() => {
    return () => {
      preloadIds.current.forEach((id) => {
        preloadStrategy.current.cancel(id)
      })
    }
  }, [])

  return {
    preloadTool,
    cancelPreload,
    createPreloadHandlers,
    isPreloaded: (toolId) => loadedChunks.current.has(toolId),
  }
}

export default usePreload
