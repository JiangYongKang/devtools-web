import { selectPreloadCandidates, createPreloadStrategy, shouldPreloadOnTrigger } from '../logic'

describe('selectPreloadCandidates', () => {
  it('空历史应该返回空数组', () => {
    const candidates = selectPreloadCandidates([])
    expect(candidates).toEqual([])
  })

  it('应该根据频率和最近度计算得分', () => {
    const navHistory = [
      { toolId: 'tool-a', frequency: 5 },
      { toolId: 'tool-b', frequency: 3 },
      { toolId: 'tool-c', frequency: 1 },
    ]

    const candidates = selectPreloadCandidates(navHistory)
    expect(candidates.length).toBe(2)
    expect(candidates[0].toolId).toBe('tool-b')
    expect(candidates[1].toolId).toBe('tool-c')
  })

  it('应该排除当前浏览的工具（历史第一条）', () => {
    const navHistory = [
      { toolId: 'tool-a', frequency: 5 },
      { toolId: 'tool-b', frequency: 3 },
    ]

    const candidates = selectPreloadCandidates(navHistory)
    const toolIds = candidates.map((c) => c.toolId)
    expect(toolIds).not.toContain('tool-a')
  })

  it('应该受 maxCandidates 配置限制', () => {
    const navHistory = [
      { toolId: 'tool-a', frequency: 1 },
      { toolId: 'tool-b', frequency: 1 },
      { toolId: 'tool-c', frequency: 1 },
      { toolId: 'tool-d', frequency: 1 },
      { toolId: 'tool-e', frequency: 1 },
    ]

    const candidates = selectPreloadCandidates(navHistory, { maxCandidates: 2 })
    expect(candidates.length).toBe(2)
  })

  it('应该根据得分正确分配优先级', () => {
    const navHistory = Array.from({ length: 10 }, (_, i) => ({
      toolId: `tool-${i}`,
      frequency: 10 - i,
    }))

    const candidates = selectPreloadCandidates(navHistory)
    candidates.forEach((c) => {
      expect(c.priority).toBeDefined()
    })
  })
})

describe('createPreloadStrategy', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('timeout 策略', () => {
    it('应该返回包含 schedule 和 cancel 方法的对象', () => {
      const strategy = createPreloadStrategy('timeout')
      expect(typeof strategy.schedule).toBe('function')
      expect(typeof strategy.cancel).toBe('function')
    })

    it('schedule 应该在延迟后执行回调', () => {
      const strategy = createPreloadStrategy('timeout')
      const callback = jest.fn()

      strategy.schedule(callback, { delay: 100 })
      expect(callback).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalled()
    })

    it('cancel 应该取消已调度的回调', () => {
      const strategy = createPreloadStrategy('timeout')
      const callback = jest.fn()

      const id = strategy.schedule(callback, { delay: 100 })
      strategy.cancel(id)

      jest.advanceTimersByTime(100)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('默认策略 (idle-callback)', () => {
    it('应该使用 requestIdleCallback 当可用时', () => {
      const mockRequestIdleCallback = jest.fn((cb) => {
        cb()
        return 1
      })
      const mockCancelIdleCallback = jest.fn()
      window.requestIdleCallback = mockRequestIdleCallback
      window.cancelIdleCallback = mockCancelIdleCallback

      const strategy = createPreloadStrategy('idle-callback')
      const callback = jest.fn()
      strategy.schedule(callback)

      expect(mockRequestIdleCallback).toHaveBeenCalled()
      expect(callback).toHaveBeenCalled()

      delete window.requestIdleCallback
      delete window.cancelIdleCallback
    })

    it('在不支持 requestIdleCallback 时应该回退到 setTimeout', () => {
      const strategy = createPreloadStrategy('idle-callback')
      const callback = jest.fn()

      strategy.schedule(callback)
      expect(callback).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalled()
    })
  })
})

describe('shouldPreloadOnTrigger', () => {
  it('默认配置应该允许 hover 和 focus', () => {
    expect(shouldPreloadOnTrigger('hover')).toBe(true)
    expect(shouldPreloadOnTrigger('focus')).toBe(true)
  })

  it('应该可以自定义启用的触发器', () => {
    const config = { enabledTriggers: ['hover'] }
    expect(shouldPreloadOnTrigger('hover', config)).toBe(true)
    expect(shouldPreloadOnTrigger('focus', config)).toBe(false)
  })

  it('空配置应该返回 false', () => {
    expect(shouldPreloadOnTrigger('hover', { enabledTriggers: [] })).toBe(false)
  })
})
