import { describe, test, expect } from 'vitest'
import {
  normalizeHosts,
  detectModule,
  extractTaskSummary,
  extractTaskList,
  buildPlay,
  buildNotifyEdges,
  parsePlaybook,
} from '../logic/parser.js'
import { DEPLOY_WITH_HANDLER, VARS_AND_NOTIFY } from '../logic/examples.js'

describe('normalizeHosts', () => {
  test('字符串逗号分隔', () => {
    expect(normalizeHosts('web, db, cache')).toEqual(['web', 'db', 'cache'])
  })

  test('列表原样输出', () => {
    expect(normalizeHosts(['a', 'b'])).toEqual(['a', 'b'])
  })

  test('null 返回空', () => {
    expect(normalizeHosts(null)).toEqual([])
  })
})

describe('detectModule', () => {
  test('识别 yum 模块', () => {
    expect(detectModule({ name: 'x', yum: { name: 'n' } })).toBe('yum')
  })

  test('识别 action 字段', () => {
    expect(detectModule({ action: 'template' })).toBe('template')
  })

  test('纯元数据返回 null', () => {
    expect(detectModule({ name: 'only-meta', when: 'true' })).toBeNull()
  })
})

describe('extractTaskSummary', () => {
  test('字符串 notify 转为数组', () => {
    const s = extractTaskSummary({ name: 't', command: 'echo hi', notify: 'restart' }, 0)
    expect(s.notify).toEqual(['restart'])
  })

  test('数组 notify 原样保留', () => {
    const s = extractTaskSummary({ name: 't', debug: {}, notify: ['a', 'b'] }, 0)
    expect(s.notify).toEqual(['a', 'b'])
  })
})

describe('buildNotifyEdges', () => {
  test('task 命中 handler 产生边', () => {
    const tasks = [
      { index: 0, name: 'do-a', notify: ['restart'] },
      { index: 1, name: 'do-b', notify: ['missing'] },
    ]
    const handlers = [{ index: 0, name: 'restart' }]
    const edges = buildNotifyEdges(tasks, handlers, 'tasks')
    expect(edges).toHaveLength(1)
    expect(edges[0].from).toBe('do-a')
    expect(edges[0].to).toBe('restart')
  })
})

describe('parsePlaybook', () => {
  test('空字符串返回错误', () => {
    const r = parsePlaybook('   ')
    expect(r.ok).toBe(false)
    expect(r.error.line).toBe(1)
  })

  test('YAML 语法错误行列定位', () => {
    const r = parsePlaybook('-\n  hosts: all\n  tasks:\n   - name: bad\n      debug: msg=oops\n')
    expect(r.ok).toBe(false)
    expect(typeof r.error.line).toBe('number')
    expect(typeof r.error.col).toBe('number')
  })

  test('部署示例可解析，含 handler notify 边', () => {
    const r = parsePlaybook(DEPLOY_WITH_HANDLER)
    expect(r.ok).toBe(true)
    const plays = r.result.plays
    expect(plays).toHaveLength(1)
    expect(plays[0].hosts).toEqual(['webservers'])
    expect(plays[0].become).toBe(true)
    expect(plays[0].tasks).toHaveLength(3)
    expect(plays[0].handlers).toHaveLength(1)
    expect(r.result.notifyEdges.length).toBeGreaterThanOrEqual(1)
    const edge = r.result.notifyEdges.find((e) => e.notifyName === 'restart nginx')
    expect(edge).toBeDefined()
  })

  test('多 notify 示例多条边', () => {
    const r = parsePlaybook(VARS_AND_NOTIFY)
    expect(r.ok).toBe(true)
    expect(r.result.notifyEdges.length).toBeGreaterThanOrEqual(2)
  })
})
