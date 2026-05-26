import { describe, test, expect } from 'vitest'
import { EXAMPLES, DEPLOY_WITH_HANDLER, WHEN_CONDITIONAL_TASKS, VARS_AND_NOTIFY } from '../logic/examples.js'
import { parsePlaybook } from '../logic/parser.js'

describe('示例 YAML', () => {
  test('三组示例均存在且非空', () => {
    expect(EXAMPLES).toHaveLength(3)
    for (const e of EXAMPLES) {
      expect(e.yaml.trim().length).toBeGreaterThan(10)
    }
  })

  test('三组示例均可被解析', () => {
    for (const e of EXAMPLES) {
      const r = parsePlaybook(e.yaml)
      expect(r.ok).toBe(true)
      expect(r.result.plays.length).toBeGreaterThan(0)
    }
  })

  test('when 示例含 when 条件字段', () => {
    const r = parsePlaybook(WHEN_CONDITIONAL_TASKS)
    expect(r.ok).toBe(true)
    const tasks = r.result.plays[0].tasks
    expect(tasks.some((t) => t.when != null)).toBe(true)
  })

  test('vars_notify 示例 handler 至少 2 个', () => {
    const r = parsePlaybook(VARS_AND_NOTIFY)
    expect(r.ok).toBe(true)
    expect(r.result.plays[0].handlers.length).toBeGreaterThanOrEqual(2)
  })

  test('deploy_handler 示例含 restart nginx 边', () => {
    const r = parsePlaybook(DEPLOY_WITH_HANDLER)
    expect(r.ok).toBe(true)
    const edge = r.result.notifyEdges.find((e) => e.notifyName === 'restart nginx')
    expect(edge).toBeDefined()
  })
})
