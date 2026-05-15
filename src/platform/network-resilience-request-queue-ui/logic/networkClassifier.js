import { NETWORK_STATES, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

/**
 * 网络状态分类器 - 根据快照信息将网络分为三态
 *
 * 评分规则:
 * - navigator.onLine = false: +50 Offline
 * - 2G/slow-2g: +25 Degraded
 * - 3G: +15 Degraded, +10 Online
 * - 4G: +25 Online
 * - 高 RTT (> 阈值): +20 Degraded
 * - 低带宽 (< 0.5Mbps): +15 Degraded
 * - 启用省流量模式: +10 Degraded
 * - 页面隐藏: +10 Degraded
 * - 长时间无交互: +5 Degraded
 *
 * @param {Object} snapshot - 网络快照
 * @param {boolean} snapshot.navigatorOnLine - navigator.onLine 状态
 * @param {Object} snapshot.connection - navigator.connection 对象
 * @param {number} snapshot.rttEstimateMs - 实际测量的 RTT (毫秒)
 * @param {string} snapshot.visibilityState - 页面可见性状态
 * @param {number} snapshot.lastUserInteractionMs - 上次用户交互时间戳
 * @param {number} snapshot.degradedRttThresholdMs - Degraded 状态 RTT 阈值
 * @param {number} snapshot.nowMs - 当前时间戳
 * @returns {Object} 分类结果 { state: string, confidence: number, confidenceBreakdown: Object }
 */
const classifyNetwork = (snapshot) => {
  const {
    navigatorOnLine,
    connection,
    rttEstimateMs,
    visibilityState,
    lastUserInteractionMs,
    degradedRttThresholdMs,
    nowMs,
  } = snapshot

  const confidenceScores = {
    [NETWORK_STATES.ONLINE]: 0,
    [NETWORK_STATES.OFFLINE]: 0,
    [NETWORK_STATES.DEGRADED]: 0,
  }

  if (!navigatorOnLine) {
    confidenceScores[NETWORK_STATES.OFFLINE] += 50
  } else {
    confidenceScores[NETWORK_STATES.ONLINE] += 30
  }

  if (connection) {
    const { effectiveType, downlink, rtt, saveData } = connection

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      confidenceScores[NETWORK_STATES.DEGRADED] += 25
    } else if (effectiveType === '3g') {
      confidenceScores[NETWORK_STATES.DEGRADED] += 15
      confidenceScores[NETWORK_STATES.ONLINE] += 10
    } else if (effectiveType === '4g') {
      confidenceScores[NETWORK_STATES.ONLINE] += 25
    }

    if (rtt !== undefined && rtt > degradedRttThresholdMs) {
      confidenceScores[NETWORK_STATES.DEGRADED] += 20
    } else if (rtt !== undefined && rtt <= degradedRttThresholdMs) {
      confidenceScores[NETWORK_STATES.ONLINE] += 10
    }

    if (downlink !== undefined && downlink < 0.5) {
      confidenceScores[NETWORK_STATES.DEGRADED] += 15
    } else if (downlink !== undefined && downlink >= 1) {
      confidenceScores[NETWORK_STATES.ONLINE] += 10
    }

    if (saveData) {
      confidenceScores[NETWORK_STATES.DEGRADED] += 10
    }
  }

  if (rttEstimateMs !== undefined && rttEstimateMs > 0) {
    if (rttEstimateMs > degradedRttThresholdMs) {
      confidenceScores[NETWORK_STATES.DEGRADED] += 20
    } else if (rttEstimateMs <= degradedRttThresholdMs / 2) {
      confidenceScores[NETWORK_STATES.ONLINE] += 15
    }
  }

  if (visibilityState === 'hidden') {
    confidenceScores[NETWORK_STATES.DEGRADED] += 10
  }

  if (lastUserInteractionMs !== undefined && nowMs !== undefined) {
    const timeSinceInteraction = nowMs - lastUserInteractionMs
    if (timeSinceInteraction > 5 * 60 * 1000) {
      confidenceScores[NETWORK_STATES.DEGRADED] += 5
    }
  }

  if (confidenceScores[NETWORK_STATES.OFFLINE] >= 50) {
    return {
      state: NETWORK_STATES.OFFLINE,
      confidence: confidenceScores[NETWORK_STATES.OFFLINE],
      confidenceBreakdown: confidenceScores,
    }
  }

  if (confidenceScores[NETWORK_STATES.DEGRADED] >= 35) {
    return {
      state: NETWORK_STATES.DEGRADED,
      confidence: confidenceScores[NETWORK_STATES.DEGRADED],
      confidenceBreakdown: confidenceScores,
    }
  }

  return {
    state: NETWORK_STATES.ONLINE,
    confidence: confidenceScores[NETWORK_STATES.ONLINE],
    confidenceBreakdown: confidenceScores,
  }
}

/**
 * 采集网络状态快照
 * 包含 navigator.onLine、connection 信息、visibilityState、健康检查 RTT 等
 * @param {Object} options - 配置选项
 * @param {string} options.healthCheckUrl - 健康检查 URL (HEAD 请求)
 * @param {number} options.healthCheckTimeoutMs - 健康检查超时 (毫秒)
 * @param {number} options.degradedRttThresholdMs - Degraded 状态 RTT 阈值
 * @returns {Object} 网络快照对象
 * @throws {Error} CORS 失败或网络错误时抛出 OBSERVATION_FAILED 错误
 */
const takeNetworkSnapshot = async (options = {}) => {
  const { healthCheckUrl, healthCheckTimeoutMs, degradedRttThresholdMs } = options

  const snapshot = {
    navigatorOnLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connection: typeof navigator !== 'undefined' && navigator.connection
      ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData,
        }
      : null,
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'visible',
    lastUserInteractionMs: null,
    rttEstimateMs: null,
    degradedRttThresholdMs,
    nowMs: Date.now(),
  }

  if (healthCheckUrl) {
    try {
      const startTime = Date.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), healthCheckTimeoutMs)

      await fetch(healthCheckUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      snapshot.rttEstimateMs = Date.now() - startTime
    } catch (error) {
      if (error.name === 'AbortError') {
        snapshot.rttEstimateMs = healthCheckTimeoutMs + 1
      } else if (error.message.includes('Failed to fetch')) {
        throw createError(
          ERROR_CODES.OBSERVATION_FAILED,
          '健康检查请求失败，可能是 CORS 限制或网络问题',
          { url: healthCheckUrl }
        )
      }
    }
  }

  return snapshot
}

export {
  classifyNetwork,
  takeNetworkSnapshot,
}
