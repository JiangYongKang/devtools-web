import { QueuePersistence } from '../logic/persistence'

describe('QueuePersistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('存储与加载', () => {
    test('启用时应保存队列到 localStorage', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: true,
      })

      const queue = [
        { id: '1', url: '/api/test', method: 'GET', headers: { Authorization: 'secret' } },
      ]

      persistence.save(queue)

      const stored = localStorage.getItem('test_queue')
      expect(stored).toBeDefined()
    })

    test('禁用时不应保存队列', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: false,
      })

      const queue = [{ id: '1', url: '/api/test' }]
      persistence.save(queue)

      const stored = localStorage.getItem('test_queue')
      expect(stored).toBeNull()
    })

    test('应加载已保存的队列', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: true,
      })

      const queue = [
        { id: '1', url: '/api/test', method: 'GET' },
        { id: '2', url: '/api/another', method: 'POST' },
      ]

      persistence.save(queue)
      const loaded = persistence.load()

      expect(loaded).toBeDefined()
      expect(loaded.queue).toHaveLength(2)
      expect(loaded.savedAt).toBeDefined()
    })
  })

  describe('敏感信息脱敏', () => {
    test('保存时应脱敏敏感请求头', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: true,
        sensitiveHeaders: ['authorization', 'x-api-key'],
      })

      const queue = [
        {
          id: '1',
          url: '/api/test',
          headers: {
            'Authorization': 'Bearer secret-token',
            'X-API-Key': 'api-key-123',
            'Content-Type': 'application/json',
          },
        },
      ]

      persistence.save(queue)
      const loaded = persistence.load()

      expect(loaded.queue[0].headers['Authorization']).toBe('***REDACTED***')
      expect(loaded.queue[0].headers['X-API-Key']).toBe('***REDACTED***')
      expect(loaded.queue[0].headers['Content-Type']).toBe('application/json')
    })
  })

  describe('大小限制', () => {
    test('超过大小限制时应抛出错误', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: true,
        maxSizeBytes: 50,
      })

      const largeQueue = [
        { id: '1', url: '/api/very/long/url/that/exceeds/size/limit', data: 'x'.repeat(1000) },
      ]

      expect(() => persistence.save(largeQueue)).toThrow()
    })
  })

  describe('清除', () => {
    test('应清除已保存的队列', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: true,
      })

      persistence.save([{ id: '1' }])
      expect(localStorage.getItem('test_queue')).toBeDefined()

      persistence.clear()
      expect(localStorage.getItem('test_queue')).toBeNull()
    })
  })

  describe('启用/禁用', () => {
    test('应在运行时切换启用状态', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: false,
      })

      expect(persistence.isEnabled()).toBe(false)

      persistence.setEnabled(true)
      expect(persistence.isEnabled()).toBe(true)

      persistence.setEnabled(false)
      expect(persistence.isEnabled()).toBe(false)
    })
  })

  describe('大小估算', () => {
    test('应返回已存储数据的大小', () => {
      const persistence = new QueuePersistence({
        storageKey: 'test_queue',
        enabled: true,
      })

      expect(persistence.getStoredSize()).toBe(0)

      persistence.save([{ id: '1', url: '/api/test' }])
      expect(persistence.getStoredSize()).toBeGreaterThan(0)
    })
  })
})
