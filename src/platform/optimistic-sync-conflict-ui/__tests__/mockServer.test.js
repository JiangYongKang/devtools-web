import { describe, it, expect, beforeEach } from 'vitest'
import { createMockServer, MockServer, generateRevision } from '../logic/index.js'

const TEST_DATA = [
  { id: 'item_1', title: '测试项目1', status: 'todo', priority: 'high' },
  { id: 'item_2', title: '测试项目2', status: 'in_progress', priority: 'medium' },
]

describe('Mock Server 测试', () => {
  let server

  beforeEach(() => {
    server = createMockServer(TEST_DATA, {
      networkDelayMs: 0,
      conflictProbability: 0,
      errorRate5xx: 0,
      timeoutRate: 0,
    })
  })

  describe('初始化', () => {
    it('正确初始化数据', () => {
      const item = server.getItem('item_1')
      expect(item).toEqual(TEST_DATA[0])
      expect(server.getRevision('item_1')).toBeDefined()
    })

    it('正确获取所有项目', () => {
      const items = server.getAllItems()
      expect(items).toHaveLength(2)
    })
  })

  describe('数据获取', () => {
    it('fetchItem 正确获取项目', async () => {
      const result = await server.fetchItem('item_1')
      expect(result.status).toBe(200)
      expect(result.data).toEqual(TEST_DATA[0])
      expect(result.headers.ETag).toBeDefined()
    })

    it('fetchAll 正确获取所有项目', async () => {
      const result = await server.fetchAll()
      expect(result.status).toBe(200)
      expect(result.data).toHaveLength(2)
    })

    it('If-None-Match 匹配时返回 304', async () => {
      const revision = server.getRevision('item_1')
      const result = await server.fetchItem('item_1', revision)
      expect(result.status).toBe(304)
    })
  })

  describe('数据更新', () => {
    it('成功更新项目', async () => {
      const changes = { title: '更新后的标题', status: 'done' }
      const baseRevision = server.getRevision('item_1')
      const result = await server.updateItem('item_1', changes, baseRevision)

      expect(result.status).toBe(200)
      expect(result.data.title).toBe('更新后的标题')
      expect(result.data.status).toBe('done')
      expect(result.headers.ETag).not.toBe(baseRevision)
    })

    it('If-Match 不匹配时返回 412 冲突', async () => {
      const changes = { title: '本地修改' }
      const wrongRevision = 'wrong_revision'

      await expect(server.updateItem('item_1', changes, wrongRevision))
        .rejects.toMatchObject({ code: 'CONFLICT_412' })
    })

    it('检测到远程变更后产生冲突', async () => {
      server.simulateRemoteEdit('item_1', 'user_2')
      const baseRevision = server.getRevision('item_1')
      const changes = { title: '本地修改' }
      const result = await server.updateItem('item_1', changes, baseRevision)
      expect(result.status).toBe(200)
    })
  })

  describe('冲突概率控制', () => {
    it('冲突概率 100% 时总是产生冲突', async () => {
      server.setOption('conflictProbability', 1)
      const baseRevision = server.getRevision('item_1')
      const changes = { title: '测试冲突' }

      try {
        await server.updateItem('item_1', changes, baseRevision)
      } catch (error) {
        expect(error.code).toBe('CONFLICT_412')
      }
    })

    it('冲突概率 0% 时从不产生冲突', async () => {
      server.setOption('conflictProbability', 0)
      const baseRevision = server.getRevision('item_1')
      const changes = { title: '无冲突测试' }

      const result = await server.updateItem('item_1', changes, baseRevision)
      expect(result.status).toBe(200)
    })
  })

  describe('远程编辑模拟', () => {
    it('simulateRemoteEdit 修改服务器数据', async () => {
      const originalTitle = server.getItem('item_1').title

      const result = await server.simulateRemoteEdit('item_1', 'user_2')
      expect(result).toBeDefined()
      expect(server.getItem('item_1').title).not.toBe(originalTitle)
    })

    it('forceConflict 强制修改服务器数据', () => {
      const originalTitle = server.getItem('item_1').title
      server.forceConflict('item_1')
      expect(server.getItem('item_1').title).not.toBe(originalTitle)
    })
  })

  describe('请求统计', () => {
    it('正确记录请求日志', async () => {
      expect(server.getStatistics().totalRequests).toBe(0)

      await server.fetchItem('item_1')
      expect(server.getStatistics().totalRequests).toBe(1)
      expect(server.getStatistics().successCount).toBe(1)
    })

    it('reset 清空请求日志', async () => {
      await server.fetchItem('item_1')
      expect(server.getStatistics().totalRequests).toBe(1)

      server.reset()
      expect(server.getStatistics().totalRequests).toBe(0)
    })
  })

  describe('可配置参数', () => {
    it('正确设置网络延迟', () => {
      server.setOption('networkDelayMs', 500)
      expect(server.options.networkDelayMs).toBe(500)
    })

    it('setOptions 批量设置选项', () => {
      server.setOptions({
        networkDelayMs: 100,
        conflictProbability: 0.5,
      })
      expect(server.options.networkDelayMs).toBe(100)
      expect(server.options.conflictProbability).toBe(0.5)
    })
  })

  describe('并发场景模拟', () => {
    it('模拟多个用户同时编辑', async () => {
      const baseRevision = server.getRevision('item_1')
      
      const server2 = createMockServer(TEST_DATA, {
        networkDelayMs: 0,
        conflictProbability: 0,
        errorRate5xx: 0,
        timeoutRate: 0,
      })
      await server2.updateItem('item_1', { title: '用户A修改' }, server2.getRevision('item_1'))
      
      server.forceConflict('item_1')
      const finalRevision = server.getRevision('item_1')
      expect(finalRevision).not.toBe(baseRevision)
    })
  })
})
