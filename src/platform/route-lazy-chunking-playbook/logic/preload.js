import { PRELOAD_PRIORITY, PRELOAD_TRIGGERS } from './constants'

export function selectPreloadCandidates(navHistory, config = {}) {
  const {
    maxCandidates = 3,
    historyWeight = 0.6,
    recencyWeight = 0.4,
  } = config

  if (navHistory.length === 0) return []

  const toolScores = new Map()

  navHistory.forEach((entry, index) => {
    const recency = 1 - (index / navHistory.length)
    const currentScore = toolScores.get(entry.toolId) || 0
    toolScores.set(
      entry.toolId,
      currentScore + (entry.frequency || 1) * historyWeight + recency * recencyWeight
    )
  })

  const currentTool = navHistory[0]?.toolId
  if (currentTool) {
    toolScores.delete(currentTool)
  }

  return Array.from(toolScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCandidates)
    .map(([toolId, score]) => ({
      toolId,
      score,
      priority: score > 0.8 ? PRELOAD_PRIORITY.HIGH : score > 0.5 ? PRELOAD_PRIORITY.MEDIUM : PRELOAD_PRIORITY.LOW,
    }))
}

export function createPreloadStrategy(strategyType = 'idle-callback') {
  switch (strategyType) {
    case 'idle-callback':
      return {
        schedule: (callback, options = {}) => {
          const { timeout = 2000 } = options
          if ('requestIdleCallback' in window) {
            return window.requestIdleCallback(callback, { timeout })
          }
          return setTimeout(callback, 100)
        },
        cancel: (id) => {
          if ('cancelIdleCallback' in window) {
            window.cancelIdleCallback(id)
          } else {
            clearTimeout(id)
          }
        },
      }
    case 'timeout':
      return {
        schedule: (callback, options = {}) => {
          const { delay = 500 } = options
          return setTimeout(callback, delay)
        },
        cancel: (id) => clearTimeout(id),
      }
    default:
      return createPreloadStrategy('idle-callback')
  }
}

export function shouldPreloadOnTrigger(trigger, config = {}) {
  const { enabledTriggers = [PRELOAD_TRIGGERS.HOVER, PRELOAD_TRIGGERS.FOCUS] } = config
  return enabledTriggers.includes(trigger)
}
