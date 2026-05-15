import { SnoozeManager, InMemoryStorage, generateCurlTemplate } from '../logic/snooze-manager'
import { SNOOZE_TYPE, STORAGE_KEYS } from '../logic/constants'

describe('InMemoryStorage', () => {
  it('存储和读取数据', () => {
    const storage = new InMemoryStorage()
    storage.set(STORAGE_KEYS.SNOOZED_NOTICES, '{"test": true}')
    expect(storage.get(STORAGE_KEYS.SNOOZED_NOTICES)).toBe('{"test": true}')
  })

  it('删除数据', () => {
    const storage = new InMemoryStorage()
    storage.set(STORAGE_KEYS.SNOOZED_NOTICES, 'data')
    storage.remove(STORAGE_KEYS.SNOOZED_NOTICES)
    expect(storage.get(STORAGE_KEYS.SNOOZED_NOTICES)).toBeNull()
  })
})

describe('SnoozeManager', () => {
  let storage
  let manager

  beforeEach(() => {
    storage = new InMemoryStorage()
    manager = new SnoozeManager(storage)
  })

  describe('snoozeNotice', () => {
    it('按会话类型设置 snooze', () => {
      manager.snoozeNotice('notice-1', SNOOZE_TYPE.SESSION)
      const snoozed = manager.getSnoozedNotices()
      expect(snoozed['notice-1']).toBeDefined()
      expect(snoozed['notice-1'].type).toBe(SNOOZE_TYPE.SESSION)
    })

    it('按分钟类型设置 snooze', () => {
      manager.snoozeNotice('notice-1', SNOOZE_TYPE.MINUTES, 30)
      const snoozed = manager.getSnoozedNotices()
      expect(snoozed['notice-1']).toBeDefined()
      expect(snoozed['notice-1'].type).toBe(SNOOZE_TYPE.MINUTES)
      expect(snoozed['notice-1'].minutes).toBe(30)
    })
  })

  describe('isNoticeSnoozed', () => {
    it('对未 snooze 的通知返回 false', () => {
      expect(manager.isNoticeSnoozed('unknown')).toBe(false)
    })

    it('对会话类型 snooze 的通知返回 true', () => {
      manager.snoozeNotice('notice-1', SNOOZE_TYPE.SESSION)
      expect(manager.isNoticeSnoozed('notice-1')).toBe(true)
    })

    it('对未过期的分钟类型 snooze 返回 true', () => {
      manager.snoozeNotice('notice-1', SNOOZE_TYPE.MINUTES, 60)
      expect(manager.isNoticeSnoozed('notice-1')).toBe(true)
    })

    it('对已过期的分钟类型 snooze 返回 false', () => {
      jest.useFakeTimers()
      manager.snoozeNotice('notice-1', SNOOZE_TYPE.MINUTES, 1)
      jest.advanceTimersByTime(2 * 60 * 1000)
      expect(manager.isNoticeSnoozed('notice-1')).toBe(false)
      jest.useRealTimers()
    })
  })

  describe('unsnoozeNotice', () => {
    it('取消 snooze 状态', () => {
      manager.snoozeNotice('notice-1', SNOOZE_TYPE.SESSION)
      expect(manager.isNoticeSnoozed('notice-1')).toBe(true)
      manager.unsnoozeNotice('notice-1')
      expect(manager.isNoticeSnoozed('notice-1')).toBe(false)
    })
  })

  describe('clearExpired', () => {
    it('清理已过期的 snooze 条目', () => {
      jest.useFakeTimers()
      manager.snoozeNotice('expired', SNOOZE_TYPE.MINUTES, 1)
      manager.snoozeNotice('active', SNOOZE_TYPE.MINUTES, 60)
      jest.advanceTimersByTime(2 * 60 * 1000)
      const changed = manager.clearExpired()
      expect(changed).toBe(true)
      expect(manager.isNoticeSnoozed('expired')).toBe(false)
      expect(manager.isNoticeSnoozed('active')).toBe(true)
      jest.useRealTimers()
    })

    it('没有过期条目时返回 false', () => {
      manager.snoozeNotice('active', SNOOZE_TYPE.MINUTES, 60)
      const changed = manager.clearExpired()
      expect(changed).toBe(false)
    })
  })

  describe('filterVisibleNotices', () => {
    it('过滤掉已 snooze 的通知', () => {
      const notices = [
        { id: 'snoozed', effectiveAt: new Date() },
        { id: 'visible', effectiveAt: new Date() },
      ]
      manager.snoozeNotice('snoozed', SNOOZE_TYPE.SESSION)
      const result = manager.filterVisibleNotices(notices)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('visible')
    })
  })

  describe('resetSession', () => {
    it('清除会话类型的 snooze', () => {
      manager.snoozeNotice('session-only', SNOOZE_TYPE.SESSION)
      manager.snoozeNotice('time-based', SNOOZE_TYPE.MINUTES, 60)
      manager.resetSession()
      expect(manager.isNoticeSnoozed('session-only')).toBe(false)
      expect(manager.isNoticeSnoozed('time-based')).toBe(true)
    })

    it('清除已过期的分钟类型 snooze', () => {
      jest.useFakeTimers()
      manager.snoozeNotice('expired', SNOOZE_TYPE.MINUTES, 1)
      jest.advanceTimersByTime(2 * 60 * 1000)
      manager.resetSession()
      expect(manager.isNoticeSnoozed('expired')).toBe(false)
      jest.useRealTimers()
    })
  })

  describe('getSnoozeInfo', () => {
    it('返回 snooze 信息', () => {
      manager.snoozeNotice('notice-1', SNOOZE_TYPE.MINUTES, 30)
      const info = manager.getSnoozeInfo('notice-1')
      expect(info).toBeDefined()
      expect(info.type).toBe(SNOOZE_TYPE.MINUTES)
      expect(info.minutes).toBe(30)
    })

    it('未 snooze 时返回 null', () => {
      expect(manager.getSnoozeInfo('unknown')).toBeNull()
    })
  })
})

describe('generateCurlTemplate', () => {
  it('生成基本 GET 请求', () => {
    const result = generateCurlTemplate('https://api.example.com')
    expect(result).toContain('curl')
    expect(result).toContain('-X GET')
    expect(result).toContain('https://api.example.com')
  })

  it('包含指定的 headers', () => {
    const headers = {
      'Authorization': 'Bearer token',
      'Accept': 'application/json',
    }
    const result = generateCurlTemplate('https://api.example.com', 'GET', headers)
    expect(result).toContain('-H \'Authorization: Bearer token\'')
    expect(result).toContain('-H \'Accept: application/json\'')
  })

  it('支持自定义 HTTP 方法', () => {
    const result = generateCurlTemplate('https://api.example.com', 'POST')
    expect(result).toContain('-X POST')
  })

  it('转义 header 值中的单引号', () => {
    const headers = {
      'Authorization': "Bearer o'reilly-token",
      'X-Custom': "value with 'quotes' inside",
    }
    const result = generateCurlTemplate('https://api.example.com', 'GET', headers)
    expect(result).toContain("Bearer o'\\''reilly-token")
    expect(result).toContain("value with '\\''quotes'\\'' inside")
  })

  it('转义 URL 中的单引号', () => {
    const result = generateCurlTemplate("https://api.example.com/path?name=o'reilly")
    expect(result).toContain("https://api.example.com/path?name=o'\\''reilly")
  })
})
