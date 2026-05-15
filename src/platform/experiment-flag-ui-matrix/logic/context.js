import { DEFAULT_BUCKET_COUNT, SSR_LOADING_STATE } from './constants.js'
import { isInRolloutBucket, getVariant } from './bucketing.js'
import { resolveFlagValue, resolveConflicts } from './rules.js'

/**
 * 功能开关与实验上下文核心类
 * 整合规则引擎、分桶算法、强制覆盖等功能
 */
class FeatureContext {
  /**
   * 构造函数
   * @param {Object} config - 配置对象 { flags, experiments, rules, userContext, cacheControl }
   */
  constructor(config = {}) {
    this.flags = config.flags || {}
    this.experiments = config.experiments || {}
    this.rules = config.rules || []
    this.overrides = {}
    this.userContext = config.userContext || {}
    this.loadingState = SSR_LOADING_STATE.IDLE
    this.lastUpdated = null
    this.cacheControl = config.cacheControl || null
  }

  /**
   * 设置用户上下文（增量更新）
   * @param {Object} context - 用户上下文属性
   */
  setUserContext(context) {
    this.userContext = { ...this.userContext, ...context }
  }

  /**
   * 获取当前用户上下文副本
   * @returns {Object} 用户上下文副本
   */
  getUserContext() {
    return { ...this.userContext }
  }

  /**
   * 设置功能开关或实验的强制覆盖值
   * @param {string} flagKey - 功能开关键名或实验键名（格式：experiment:${name}）
   * @param {*} value - 覆盖值
   */
  setOverride(flagKey, value) {
    this.overrides[flagKey] = value
  }

  /**
   * 移除指定键的强制覆盖
   * @param {string} flagKey - 功能开关键名
   */
  removeOverride(flagKey) {
    delete this.overrides[flagKey]
  }

  /**
   * 清除所有强制覆盖
   */
  clearOverrides() {
    this.overrides = {}
  }

  /**
   * 获取所有强制覆盖的副本
   * @returns {Object} 强制覆盖副本
   */
  getOverrides() {
    return { ...this.overrides }
  }

  /**
   * 评估单个功能开关的值
   * @param {string} flagKey - 功能开关键名
   * @param {Object|null} context - 可选的额外上下文（与当前用户上下文合并）
   * @returns {Object} 评估结果 { key, value, source, matchedRule, evaluation }
   */
  evaluateFlag(flagKey, context = null) {
    const evalContext = context ? { ...this.userContext, ...context } : this.userContext

    if (this.overrides[flagKey] !== undefined) {
      return {
        key: flagKey,
        value: this.overrides[flagKey],
        source: 'override',
        matchedRule: null,
        evaluation: null,
      }
    }

    const flagDefinition = this.flags[flagKey]
    if (!flagDefinition) {
      return {
        key: flagKey,
        value: null,
        source: 'undefined',
        matchedRule: null,
        evaluation: null,
      }
    }

    const flagRules = flagDefinition.rules || this.rules
    const defaultValue = flagDefinition.defaultValue ?? null

    const result = resolveFlagValue(flagKey, flagRules, evalContext, defaultValue)

    return {
      key: flagKey,
      value: result.value,
      source: result.isDefault ? 'default' : 'rule',
      matchedRule: result.matchedRule,
      evaluation: result.evaluation,
    }
  }

  /**
   * 批量评估所有功能开关
   * @param {Object|null} context - 可选的额外上下文
   * @returns {Object} 所有功能开关的评估结果，键为 flagKey
   */
  evaluateAllFlags(context = null) {
    const results = {}
    for (const flagKey of Object.keys(this.flags)) {
      results[flagKey] = this.evaluateFlag(flagKey, context)
    }
    return results
  }

  /**
   * 评估单个实验的变体分配
   * @param {string} experimentName - 实验名称
   * @param {Object|null} context - 可选的额外上下文
   * @returns {Object} 实验结果 { name, variant, bucket, source, payload }
   */
  evaluateExperiment(experimentName, context = null) {
    const evalContext = context ? { ...this.userContext, ...context } : this.userContext
    const userId = evalContext.userId || 'anonymous'

    const experiment = this.experiments[experimentName]
    if (!experiment) {
      return {
        name: experimentName,
        variant: null,
        bucket: null,
        source: 'undefined',
        payload: null,
      }
    }

    if (experiment.enabled === false) {
      return {
        name: experimentName,
        variant: null,
        bucket: null,
        source: 'disabled',
        payload: null,
      }
    }

    const overrideKey = `experiment:${experimentName}`
    if (this.overrides[overrideKey] !== undefined) {
      const variantOverride = this.overrides[overrideKey]
      const variant = experiment.variants?.find((v) => v.name === variantOverride)
      return {
        name: experimentName,
        variant: variantOverride,
        bucket: null,
        source: 'override',
        payload: variant?.payload || null,
      }
    }

    if (experiment.rolloutPercentage !== undefined) {
      const isInBucket = isInRolloutBucket(
        userId,
        experimentName,
        experiment.rolloutPercentage,
        DEFAULT_BUCKET_COUNT
      )
      if (!isInBucket) {
        return {
          name: experimentName,
          variant: null,
          bucket: null,
          source: 'rollout_excluded',
          payload: null,
        }
      }
    }

    if (experiment.variants && experiment.variants.length > 0) {
      const variantResult = getVariant(userId, experimentName, experiment.variants)
      return {
        name: experimentName,
        variant: variantResult.name,
        bucket: variantResult.bucket,
        source: 'bucketing',
        payload: variantResult.payload,
      }
    }

    return {
      name: experimentName,
      variant: null,
      bucket: null,
      source: 'no_variants',
      payload: null,
    }
  }

  /**
   * 批量评估所有实验
   * @param {Object|null} context - 可选的额外上下文
   * @returns {Object} 所有实验的评估结果，键为 experimentName
   */
  evaluateAllExperiments(context = null) {
    const results = {}
    for (const experimentName of Object.keys(this.experiments)) {
      results[experimentName] = this.evaluateExperiment(experimentName, context)
    }
    return results
  }

  /**
   * 解决规则冲突并返回胜出规则
   * @param {Object|null} context - 可选的额外上下文
   * @returns {Object} 冲突解决结果 { winner, all, conflicts? }
   */
  resolveRuleConflicts(context = null) {
    const evalContext = context ? { ...this.userContext, ...context } : this.userContext
    return resolveConflicts(this.rules, evalContext)
  }

  /**
   * 更新配置（增量更新）
   * @param {Object} newConfig - 新配置 { flags, experiments, rules, cacheControl }
   */
  updateConfig(newConfig) {
    this.flags = newConfig.flags || this.flags
    this.experiments = newConfig.experiments || this.experiments
    this.rules = newConfig.rules || this.rules
    this.lastUpdated = Date.now()
    if (newConfig.cacheControl) {
      this.cacheControl = newConfig.cacheControl
    }
  }

  /**
   * 序列化为 JSON 对象
   * @returns {Object} 可序列化的上下文对象
   */
  toJSON() {
    return {
      flags: this.flags,
      experiments: this.experiments,
      rules: this.rules,
      overrides: this.overrides,
      userContext: this.userContext,
      loadingState: this.loadingState,
      lastUpdated: this.lastUpdated,
      cacheControl: this.cacheControl,
    }
  }

  /**
   * 从 JSON 对象反序列化为 FeatureContext 实例
   * @param {Object} json - JSON 对象
   * @returns {FeatureContext} FeatureContext 实例
   */
  static fromJSON(json) {
    const context = new FeatureContext(json)
    context.overrides = json.overrides || {}
    context.loadingState = json.loadingState || SSR_LOADING_STATE.IDLE
    context.lastUpdated = json.lastUpdated
    context.cacheControl = json.cacheControl
    return context
  }
}

/**
 * 创建 FeatureContext 实例的工厂函数
 * @param {Object} config - 配置对象
 * @returns {FeatureContext} FeatureContext 实例
 */
function createFeatureContext(config = {}) {
  return new FeatureContext(config)
}

export {
  FeatureContext,
  createFeatureContext,
}
