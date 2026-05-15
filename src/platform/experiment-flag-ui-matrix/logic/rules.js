import { RULE_OPERATORS, MAX_RULE_NESTING, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

/**
 * 递归评估单个条件表达式
 * @param {Object} condition - 条件对象 { operator, attribute, value } 或 { operator, conditions }
 * @param {Object} context - 用户上下文对象
 * @param {number} depth - 当前递归深度，用于防止栈溢出
 * @returns {Object} 评估结果 { value, attribute, operator, expected, actual, conditions? }
 * @throws {FeatureFlagError} 当条件无效或嵌套过深时抛出错误
 */
function evaluateCondition(condition, context, depth = 0) {
  if (depth > MAX_RULE_NESTING) {
    throw createError(ERROR_CODES.RULE_EVALUATION_ERROR, '规则嵌套深度超过限制')
  }

  if (!condition || typeof condition !== 'object') {
    throw createError(ERROR_CODES.RULE_EVALUATION_ERROR, '条件必须是对象')
  }

  const { operator, attribute, value } = condition

  if (operator === RULE_OPERATORS.AND || operator === RULE_OPERATORS.OR) {
    const conditions = condition.conditions || []
    if (!Array.isArray(conditions)) {
      throw createError(ERROR_CODES.RULE_EVALUATION_ERROR, '逻辑操作符需要 conditions 数组')
    }

    if (conditions.length === 0) {
      return {
        value: operator === RULE_OPERATORS.AND,
        operator,
        attribute: null,
        expected: null,
        actual: null,
      }
    }

    const results = conditions.map((c) => evaluateCondition(c, context, depth + 1))

    if (operator === RULE_OPERATORS.AND) {
      return {
        value: results.every((r) => r.value),
        operator,
        conditions: results,
      }
    }
    return {
      value: results.some((r) => r.value),
      operator,
      conditions: results,
    }
  }

  const contextValue = getNestedValue(context, attribute)
  const result = compareValues(operator, contextValue, value)

  return {
    value: result,
    attribute,
    operator,
    expected: value,
    actual: contextValue,
  }
}

/**
 * 根据路径获取对象的嵌套属性值
 * @param {Object} obj - 目标对象
 * @param {string} path - 点分隔的属性路径，如 "user.profile.age"
 * @returns {*} 属性值，路径不存在时返回 undefined
 */
function getNestedValue(obj, path) {
  if (!path) return undefined
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }

  return current
}

/**
 * 使用指定操作符比较两个值
 * @param {string} operator - 比较操作符，见 RULE_OPERATORS
 * @param {*} actual - 实际值（来自用户上下文）
 * @param {*} expected - 期望值（来自规则配置）
 * @returns {boolean} 比较结果
 * @throws {FeatureFlagError} 当操作符未知时抛出错误
 */
function compareValues(operator, actual, expected) {
  switch (operator) {
    case RULE_OPERATORS.EQUALS:
      return actual === expected

    case RULE_OPERATORS.NOT_EQUALS:
      return actual !== expected

    case RULE_OPERATORS.GREATER_THAN:
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected

    case RULE_OPERATORS.LESS_THAN:
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected

    case RULE_OPERATORS.IN:
      return Array.isArray(expected) && expected.includes(actual)

    case RULE_OPERATORS.NOT_IN:
      return Array.isArray(expected) && !expected.includes(actual)

    case RULE_OPERATORS.CONTAINS:
      return typeof actual === 'string' && actual.includes(expected)

    case RULE_OPERATORS.NOT_CONTAINS:
      return typeof actual === 'string' && !actual.includes(expected)

    case RULE_OPERATORS.STARTS_WITH:
      return typeof actual === 'string' && actual.startsWith(expected)

    case RULE_OPERATORS.ENDS_WITH:
      return typeof actual === 'string' && actual.endsWith(expected)

    default:
      throw createError(ERROR_CODES.RULE_EVALUATION_ERROR, `未知的操作符: ${operator}`)
  }
}

/**
 * 批量评估所有规则的匹配状态
 * @param {Array} rules - 规则数组，每个规则包含 when 条件
 * @param {Object} context - 用户上下文
 * @returns {Array} 规则评估结果 { rule, matched, evaluation, error? }
 * @throws {FeatureFlagError} 当 rules 不是数组时抛出错误
 */
function evaluateRules(rules, context) {
  if (!Array.isArray(rules)) {
    throw createError(ERROR_CODES.RULE_EVALUATION_ERROR, '规则必须是数组')
  }

  const results = []

  for (const rule of rules) {
    try {
      const conditionResult = evaluateCondition(rule.when, context)

      results.push({
        rule,
        matched: conditionResult.value,
        evaluation: conditionResult,
      })
    } catch (error) {
      results.push({
        rule,
        matched: false,
        error: error.message,
      })
    }
  }

  return results
}

/**
 * 根据规则解析功能开关的值
 * @param {string} flagKey - 功能开关键名
 * @param {Array} rules - 规则数组
 * @param {Object} context - 用户上下文
 * @param {*} defaultValue - 默认值，无匹配规则时使用
 * @returns {Object} 解析结果 { value, matchedRule, evaluation, isDefault? }
 */
function resolveFlagValue(flagKey, rules, context, defaultValue = null) {
  const matchedRules = evaluateRules(rules, context)

  for (const matched of matchedRules) {
    if (matched.matched && matched.rule.then?.[flagKey] !== undefined) {
      return {
        value: matched.rule.then[flagKey],
        matchedRule: matched.rule,
        evaluation: matched.evaluation,
      }
    }
  }

  return {
    value: defaultValue,
    matchedRule: null,
    evaluation: null,
    isDefault: true,
  }
}

/**
 * 获取规则的优先级数值
 * @param {Object} rule - 规则对象
 * @returns {number} 优先级数值，默认为 0
 */
function getRulePriority(rule) {
  return rule.priority ?? 0
}

/**
 * 按优先级从高到低排序规则
 * @param {Array} rules - 规则数组
 * @returns {Array} 排序后的规则数组
 */
function sortRulesByPriority(rules) {
  return [...rules].sort((a, b) => getRulePriority(b) - getRulePriority(a))
}

/**
 * 解决规则冲突并返回胜出规则
 * @param {Array} rules - 规则数组
 * @param {Object} context - 用户上下文
 * @returns {Object} 冲突解决结果 { winner, all, conflicts? }
 */
function resolveConflicts(rules, context) {
  const sortedRules = sortRulesByPriority(rules)
  const evaluations = []

  for (const rule of sortedRules) {
    try {
      const result = evaluateCondition(rule.when, context)
      evaluations.push({
        rule,
        matched: result.value,
        evaluation: result,
      })
    } catch (error) {
      evaluations.push({
        rule,
        matched: false,
        error: error.message,
      })
    }
  }

  const matchedEvaluations = evaluations.filter((e) => e.matched)

  if (matchedEvaluations.length === 0) {
    return { winner: null, all: evaluations }
  }

  if (matchedEvaluations.length === 1) {
    return { winner: matchedEvaluations[0], all: evaluations }
  }

  return {
    winner: matchedEvaluations[0],
    all: evaluations,
    conflicts: matchedEvaluations.slice(1),
  }
}

export {
  evaluateCondition,
  evaluateRules,
  resolveFlagValue,
  getRulePriority,
  sortRulesByPriority,
  resolveConflicts,
}
