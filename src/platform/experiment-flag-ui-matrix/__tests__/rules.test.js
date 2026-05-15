import { describe, expect, it } from 'vitest'
import {
    evaluateCondition,
    evaluateRules,
    getRulePriority,
    resolveConflicts,
    resolveFlagValue,
    sortRulesByPriority,
} from '../logic/index.js'

describe('规则引擎 (Rules)', () => {
  describe('evaluateCondition', () => {
    const context = {
      user: {
        email: 'test@company.com',
        tier: 'vip',
        region: 'US',
        age: 25,
      },
      device: {
        type: 'mobile',
      },
    }

    it('equals 操作符正确匹配', () => {
      const condition = { operator: 'equals', attribute: 'user.tier', value: 'vip' }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('equals 操作符不匹配', () => {
      const condition = { operator: 'equals', attribute: 'user.tier', value: 'normal' }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(false)
    })

    it('notEquals 操作符正确匹配', () => {
      const condition = { operator: 'notEquals', attribute: 'user.tier', value: 'normal' }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('greaterThan 操作符正确匹配', () => {
      const condition = { operator: 'greaterThan', attribute: 'user.age', value: 18 }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('greaterThan 操作符不匹配', () => {
      const condition = { operator: 'greaterThan', attribute: 'user.age', value: 30 }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(false)
    })

    it('lessThan 操作符正确匹配', () => {
      const condition = { operator: 'lessThan', attribute: 'user.age', value: 30 }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('in 操作符正确匹配', () => {
      const condition = { operator: 'in', attribute: 'user.region', value: ['US', 'CA', 'UK'] }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('in 操作符不匹配', () => {
      const condition = { operator: 'in', attribute: 'user.region', value: ['CN', 'JP'] }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(false)
    })

    it('notIn 操作符正确匹配', () => {
      const condition = { operator: 'notIn', attribute: 'user.region', value: ['CN', 'JP'] }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('contains 操作符正确匹配', () => {
      const condition = { operator: 'contains', attribute: 'user.email', value: '@company.com' }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('contains 操作符不匹配', () => {
      const condition = { operator: 'contains', attribute: 'user.email', value: '@other.com' }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(false)
    })

    it('startsWith 操作符正确匹配', () => {
      const condition = { operator: 'startsWith', attribute: 'user.email', value: 'test@' }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('endsWith 操作符正确匹配', () => {
      const condition = { operator: 'endsWith', attribute: 'user.email', value: '@company.com' }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('and 操作符正确匹配', () => {
      const condition = {
        operator: 'and',
        conditions: [
          { operator: 'equals', attribute: 'user.tier', value: 'vip' },
          { operator: 'equals', attribute: 'device.type', value: 'mobile' },
        ],
      }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('and 操作符部分不匹配', () => {
      const condition = {
        operator: 'and',
        conditions: [
          { operator: 'equals', attribute: 'user.tier', value: 'vip' },
          { operator: 'equals', attribute: 'device.type', value: 'desktop' },
        ],
      }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(false)
    })

    it('or 操作符正确匹配', () => {
      const condition = {
        operator: 'or',
        conditions: [
          { operator: 'equals', attribute: 'user.tier', value: 'normal' },
          { operator: 'equals', attribute: 'device.type', value: 'mobile' },
        ],
      }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('or 操作符全部不匹配', () => {
      const condition = {
        operator: 'or',
        conditions: [
          { operator: 'equals', attribute: 'user.tier', value: 'normal' },
          { operator: 'equals', attribute: 'device.type', value: 'desktop' },
        ],
      }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(false)
    })

    it('空 conditions 的 and 返回 true', () => {
      const condition = { operator: 'and', conditions: [] }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(true)
    })

    it('空 conditions 的 or 返回 false', () => {
      const condition = { operator: 'or', conditions: [] }
      const result = evaluateCondition(condition, context)
      expect(result.value).toBe(false)
    })
  })

  describe('evaluateRules', () => {
    const context = {
      user: { email: 'test@company.com', tier: 'vip' },
    }

    const rules = [
      {
        id: 'rule1',
        name: '员工规则',
        when: { operator: 'endsWith', attribute: 'user.email', value: '@company.com' },
        then: { flagA: true },
        priority: 100,
      },
      {
        id: 'rule2',
        name: 'VIP 规则',
        when: { operator: 'equals', attribute: 'user.tier', value: 'vip' },
        then: { flagB: true },
        priority: 80,
      },
      {
        id: 'rule3',
        name: '不匹配规则',
        when: { operator: 'equals', attribute: 'user.tier', value: 'normal' },
        then: { flagC: true },
        priority: 50,
      },
    ]

    it('正确评估所有规则的匹配状态', () => {
      const results = evaluateRules(rules, context)
      expect(results.length).toBe(3)
      expect(results[0].matched).toBe(true)
      expect(results[1].matched).toBe(true)
      expect(results[2].matched).toBe(false)
    })

    it('返回规则的评估详情', () => {
      const results = evaluateRules(rules, context)
      expect(results[0].rule.id).toBe('rule1')
      expect(results[0].evaluation.actual).toBe('test@company.com')
    })
  })

  describe('resolveFlagValue', () => {
    const context = {
      user: { email: 'test@company.com', tier: 'vip' },
    }

    const rules = [
      {
        id: 'rule1',
        name: '员工规则',
        when: { operator: 'endsWith', attribute: 'user.email', value: '@company.com' },
        then: { darkMode: true, newUI: true },
        priority: 100,
      },
      {
        id: 'rule2',
        name: 'VIP 规则',
        when: { operator: 'equals', attribute: 'user.tier', value: 'vip' },
        then: { premiumFeature: true, newUI: true },
        priority: 80,
      },
    ]

    it('返回第一个匹配规则的值', () => {
      const result = resolveFlagValue('darkMode', rules, context, false)
      expect(result.value).toBe(true)
      expect(result.matchedRule).toBeDefined()
    })

    it('没有匹配规则时返回默认值', () => {
      const result = resolveFlagValue('unknownFlag', rules, context, 'default')
      expect(result.value).toBe('default')
      expect(result.isDefault).toBe(true)
    })

    it('按规则顺序匹配（先定义的规则优先）', () => {
      const result = resolveFlagValue('newUI', rules, context, false)
      expect(result.matchedRule.id).toBe('rule1')
    })
  })

  describe('getRulePriority', () => {
    it('返回规则的优先级', () => {
      expect(getRulePriority({ priority: 100 })).toBe(100)
    })

    it('未设置优先级时返回 0', () => {
      expect(getRulePriority({})).toBe(0)
    })
  })

  describe('sortRulesByPriority', () => {
    const rules = [
      { id: 'low', priority: 10 },
      { id: 'high', priority: 100 },
      { id: 'medium', priority: 50 },
    ]

    it('按优先级降序排序', () => {
      const sorted = sortRulesByPriority(rules)
      expect(sorted[0].id).toBe('high')
      expect(sorted[1].id).toBe('medium')
      expect(sorted[2].id).toBe('low')
    })

    it('不修改原数组', () => {
      const originalOrder = rules.map((r) => r.id)
      sortRulesByPriority(rules)
      expect(rules.map((r) => r.id)).toEqual(originalOrder)
    })
  })

  describe('resolveConflicts', () => {
    const context = {
      user: { email: 'test@company.com', tier: 'vip' },
    }

    const conflictingRules = [
      {
        id: 'ruleA',
        name: '高优先级规则',
        when: { operator: 'endsWith', attribute: 'user.email', value: '@company.com' },
        then: { feature: 'A' },
        priority: 100,
      },
      {
        id: 'ruleB',
        name: '低优先级规则',
        when: { operator: 'equals', attribute: 'user.tier', value: 'vip' },
        then: { feature: 'B' },
        priority: 80,
      },
      {
        id: 'ruleC',
        name: '不匹配规则',
        when: { operator: 'equals', attribute: 'user.tier', value: 'normal' },
        then: { feature: 'C' },
        priority: 50,
      },
    ]

    it('高优先级规则胜出', () => {
      const result = resolveConflicts(conflictingRules, context)
      expect(result.winner.rule.id).toBe('ruleA')
    })

    it('返回所有规则的评估结果', () => {
      const result = resolveConflicts(conflictingRules, context)
      expect(result.all.length).toBe(3)
    })

    it('标识冲突规则', () => {
      const result = resolveConflicts(conflictingRules, context)
      const matchedRules = result.all.filter((r) => r.matched)
      expect(matchedRules.length).toBe(2)
    })

    it('没有匹配规则时 winner 为 null', () => {
      const emptyContext = { user: { email: 'other@test.com', tier: 'premium' } }
      const result = resolveConflicts(conflictingRules, emptyContext)
      expect(result.winner).toBeNull()
    })
  })
})
