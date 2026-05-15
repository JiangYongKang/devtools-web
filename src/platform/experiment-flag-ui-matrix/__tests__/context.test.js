import { describe, it, expect, beforeEach } from 'vitest'
import { createFeatureContext, FeatureContext, VARIANT_TYPES } from '../logic/index.js'

describe('FeatureContext', () => {
  const testConfig = {
    flags: {
      darkMode: {
        defaultValue: false,
        description: '深色模式',
      },
      newCheckout: {
        defaultValue: false,
        description: '新版结账流程',
      },
    },
    experiments: {
      pricingTest: {
        enabled: true,
        name: '定价测试',
        rolloutPercentage: 100,
        variants: [
          { name: VARIANT_TYPES.CONTROL, weight: 50, payload: { price: 99 } },
          { name: VARIANT_TYPES.VARIANT_A, weight: 50, payload: { price: 79 } },
        ],
      },
      disabledExp: {
        enabled: false,
        name: '已禁用实验',
        variants: [{ name: VARIANT_TYPES.CONTROL, weight: 100 }],
      },
    },
    rules: [
      {
        id: 'rule1',
        name: '员工规则',
        priority: 100,
        when: { operator: 'endsWith', attribute: 'user.email', value: '@company.com' },
        then: { darkMode: true, newCheckout: true },
      },
      {
        id: 'rule2',
        name: 'VIP 规则',
        priority: 80,
        when: { operator: 'equals', attribute: 'user.tier', value: 'vip' },
        then: { newCheckout: true },
      },
    ],
  }

  describe('createFeatureContext', () => {
    it('创建 FeatureContext 实例', () => {
      const context = createFeatureContext(testConfig)
      expect(context).toBeInstanceOf(FeatureContext)
    })

    it('空配置也能创建实例', () => {
      const context = createFeatureContext({})
      expect(context).toBeInstanceOf(FeatureContext)
    })
  })

  describe('用户上下文管理', () => {
    let context

    beforeEach(() => {
      context = createFeatureContext(testConfig)
    })

    it('setUserContext 设置用户上下文', () => {
      context.setUserContext({ userId: 'user-001' })
      const userContext = context.getUserContext()
      expect(userContext.userId).toBe('user-001')
    })

    it('getUserContext 返回副本', () => {
      context.setUserContext({ userId: 'user-001' })
      const userContext = context.getUserContext()
      userContext.userId = 'hacked'
      expect(context.getUserContext().userId).toBe('user-001')
    })
  })

  describe('功能标志评估 (evaluateFlag)', () => {
    let context

    beforeEach(() => {
      context = createFeatureContext(testConfig)
    })

    it('未定义标志返回 null', () => {
      const result = context.evaluateFlag('unknownFlag')
      expect(result.value).toBeNull()
      expect(result.source).toBe('undefined')
    })

    it('没有匹配规则时返回默认值', () => {
      context.setUserContext({ user: { email: 'user@test.com', tier: 'normal' } })
      const result = context.evaluateFlag('darkMode')
      expect(result.value).toBe(false)
      expect(result.source).toBe('default')
    })

    it('匹配规则时返回规则值', () => {
      context.setUserContext({ user: { email: 'employee@company.com', tier: 'normal' } })
      const result = context.evaluateFlag('darkMode')
      expect(result.value).toBe(true)
      expect(result.source).toBe('rule')
      expect(result.matchedRule).toBeDefined()
    })

    it('覆盖优先级最高', () => {
      context.setUserContext({ user: { email: 'employee@company.com', tier: 'normal' } })
      context.setOverride('darkMode', false)
      const result = context.evaluateFlag('darkMode')
      expect(result.value).toBe(false)
      expect(result.source).toBe('override')
    })
  })

  describe('evaluateAllFlags', () => {
    it('评估所有标志', () => {
      const context = createFeatureContext(testConfig)
      const results = context.evaluateAllFlags()
      expect(Object.keys(results)).toEqual(expect.arrayContaining(['darkMode', 'newCheckout']))
    })
  })

  describe('实验评估 (evaluateExperiment)', () => {
    let context

    beforeEach(() => {
      context = createFeatureContext(testConfig)
    })

    it('未定义实验返回 null', () => {
      const result = context.evaluateExperiment('unknownExp')
      expect(result.variant).toBeNull()
      expect(result.source).toBe('undefined')
    })

    it('已禁用的实验返回 null', () => {
      const result = context.evaluateExperiment('disabledExp')
      expect(result.variant).toBeNull()
      expect(result.source).toBe('disabled')
    })

    it('根据权重分配变体', () => {
      context.setUserContext({ userId: 'user-001' })
      const result = context.evaluateExperiment('pricingTest')
      expect(['control', 'variant_a']).toContain(result.variant)
      expect(result.source).toBe('bucketing')
      expect(result.payload).toBeDefined()
    })

    it('实验覆盖优先级最高', () => {
      context.setOverride('experiment:pricingTest', VARIANT_TYPES.VARIANT_A)
      const result = context.evaluateExperiment('pricingTest')
      expect(result.variant).toBe(VARIANT_TYPES.VARIANT_A)
      expect(result.source).toBe('override')
    })
  })

  describe('覆盖管理 (Overrides)', () => {
    let context

    beforeEach(() => {
      context = createFeatureContext(testConfig)
    })

    it('setOverride 设置覆盖值', () => {
      context.setOverride('darkMode', true)
      expect(context.evaluateFlag('darkMode').value).toBe(true)
    })

    it('removeOverride 移除覆盖', () => {
      context.setOverride('darkMode', true)
      context.removeOverride('darkMode')
      expect(context.evaluateFlag('darkMode').source).not.toBe('override')
    })

    it('clearOverrides 清除所有覆盖', () => {
      context.setOverride('darkMode', true)
      context.setOverride('newCheckout', true)
      context.clearOverrides()
      const overrides = context.getOverrides()
      expect(Object.keys(overrides).length).toBe(0)
    })

    it('getOverrides 返回副本', () => {
      context.setOverride('darkMode', true)
      const overrides = context.getOverrides()
      overrides.darkMode = false
      expect(context.getOverrides().darkMode).toBe(true)
    })
  })

  describe('规则冲突解决', () => {
    it('高优先级规则胜出', () => {
      const context = createFeatureContext(testConfig)
      context.setUserContext({ user: { email: 'emp@company.com', tier: 'vip' } })
      const result = context.resolveRuleConflicts()
      expect(result.winner.rule.priority).toBe(100)
    })
  })

  describe('配置更新', () => {
    it('updateConfig 更新配置', () => {
      const context = createFeatureContext(testConfig)
      const newConfig = {
        flags: { newFlag: { defaultValue: true } },
        experiments: {},
        rules: [],
      }
      context.updateConfig(newConfig)
      const result = context.evaluateFlag('newFlag')
      expect(result.value).toBe(true)
    })
  })

  describe('序列化与反序列化', () => {
    it('toJSON 序列化配置', () => {
      const context = createFeatureContext(testConfig)
      context.setOverride('darkMode', true)
      const json = context.toJSON()
      expect(json.flags).toBeDefined()
      expect(json.experiments).toBeDefined()
      expect(json.overrides.darkMode).toBe(true)
    })

    it('fromJSON 反序列化恢复状态', () => {
      const original = createFeatureContext(testConfig)
      original.setOverride('darkMode', true)
      const json = original.toJSON()

      const restored = FeatureContext.fromJSON(json)
      expect(restored.evaluateFlag('darkMode').value).toBe(true)
      expect(restored.evaluateFlag('darkMode').source).toBe('override')
    })
  })
})
