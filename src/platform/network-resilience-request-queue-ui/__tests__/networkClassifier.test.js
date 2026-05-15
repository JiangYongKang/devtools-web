import { classifyNetwork } from '../logic/networkClassifier'
import { NETWORK_STATES } from '../logic/constants'

describe('classifyNetwork', () => {
  const baseSnapshot = {
    navigatorOnLine: true,
    connection: null,
    rttEstimateMs: undefined,
    visibilityState: 'visible',
    lastUserInteractionMs: Date.now(),
    degradedRttThresholdMs: 1000,
    nowMs: Date.now(),
  }

  describe('离线状态检测', () => {
    const testCases = [
      {
        description: 'navigator.onLine = false 应检测为离线',
        snapshot: { ...baseSnapshot, navigatorOnLine: false },
        expectedState: NETWORK_STATES.OFFLINE,
      },
    ]

    testCases.forEach(({ description, snapshot, expectedState }) => {
      test(description, () => {
        const result = classifyNetwork(snapshot)
        expect(result.state).toBe(expectedState)
      })
    })
  })

  describe('降级状态检测', () => {
    const testCases = [
      {
        description: '2G 网络应检测为降级',
        snapshot: {
          ...baseSnapshot,
          connection: { effectiveType: '2g', downlink: 0.1, rtt: 2000 },
        },
        expectedState: NETWORK_STATES.DEGRADED,
      },
      {
        description: 'slow-2g 网络应检测为降级',
        snapshot: {
          ...baseSnapshot,
          connection: { effectiveType: 'slow-2g', downlink: 0.05, rtt: 3000 },
        },
        expectedState: NETWORK_STATES.DEGRADED,
      },
      {
        description: '高 RTT 估算值应检测为降级',
        snapshot: {
          ...baseSnapshot,
          rttEstimateMs: 2500,
        },
        expectedState: NETWORK_STATES.DEGRADED,
      },
    ]

    testCases.forEach(({ description, snapshot, expectedState }) => {
      test(description, () => {
        const result = classifyNetwork(snapshot)
        expect(result.state).toBe(expectedState)
      })
    })
  })

  describe('在线状态检测', () => {
    const testCases = [
      {
        description: '4G 网络应检测为在线',
        snapshot: {
          ...baseSnapshot,
          connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
        },
        expectedState: NETWORK_STATES.ONLINE,
      },
      {
        description: '低 RTT 估算值应检测为在线',
        snapshot: {
          ...baseSnapshot,
          rttEstimateMs: 100,
        },
        expectedState: NETWORK_STATES.ONLINE,
      },
    ]

    testCases.forEach(({ description, snapshot, expectedState }) => {
      test(description, () => {
        const result = classifyNetwork(snapshot)
        expect(result.state).toBe(expectedState)
      })
    })
  })

  describe('置信度计算', () => {
    test('离线状态应有高置信度', () => {
      const result = classifyNetwork({ ...baseSnapshot, navigatorOnLine: false })
      expect(result.confidence).toBeGreaterThanOrEqual(50)
    })

    test('4G + 低 RTT 应有高置信度', () => {
      const result = classifyNetwork({
        ...baseSnapshot,
        connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
        rttEstimateMs: 80,
      })
      expect(result.confidence).toBeGreaterThanOrEqual(40)
    })

    test('应返回置信度分解明细', () => {
      const result = classifyNetwork(baseSnapshot)
      expect(result.confidenceBreakdown).toBeDefined()
      expect(result.confidenceBreakdown[NETWORK_STATES.ONLINE]).toBeDefined()
    })
  })
})
