import { useCallback, useEffect, useMemo, useState } from 'react'
import './ExperimentFlagUIMatrix.css'
import {
  createFeatureContext,
  CONFIG_SCENARIOS,
  UI_COMPONENT_MATRIX,
  SAMPLE_USER_CONTEXTS,
  VARIANT_TYPES,
  setMockScenario,
  setUseCache,
  fetchFeatureConfig,
  SSR_LOADING_STATE,
} from './logic/index.js'

function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-line short" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line" />
      <div className="skeleton-line medium" />
    </div>
  )
}

function VariantMatrix({ components }) {
  return (
    <table className="matrix-table">
      <thead>
        <tr>
          <th>组件</th>
          <th>
            <span className="variant-tag control">Control</span> 基线
          </th>
          <th>
            <span className="variant-tag variant_a">Variant A</span> 方案 A
          </th>
          <th>
            <span className="variant-tag variant_b">Variant B</span> 方案 B
          </th>
        </tr>
      </thead>
      <tbody>
        {components.map((component) => (
          <tr key={component.id}>
            <td>
              <div className="component-name">{component.name}</div>
              <div className="component-desc">{component.description}</div>
            </td>
            {Object.values(VARIANT_TYPES).map((variant) => {
              const variantData = component.variants[variant]
              if (!variantData) {
                return <td key={variant}>-</td>
              }
              return (
                <td key={variant}>
                  <div className="variant-preview">
                    {variant === VARIANT_TYPES.CONTROL && variantData.style === 'standard' && (
                      <span style={{ fontSize: '0.8125rem' }}>标准样式</span>
                    )}
                    {variant === VARIANT_TYPES.VARIANT_A && variantData.style === 'highlight' && (
                      <span
                        style={{
                          color: '#0d6efd',
                          fontWeight: '600',
                          fontSize: '0.8125rem',
                        }}
                      >
                        高亮样式
                      </span>
                    )}
                    {variant === VARIANT_TYPES.VARIANT_B && variantData.style === 'premium' && (
                      <span
                        style={{
                          color: '#198754',
                          fontWeight: '600',
                          fontSize: '0.8125rem',
                        }}
                      >
                        高级样式
                      </span>
                    )}
                    {variantData.price && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>
                        {variantData.price}
                      </span>
                    )}
                    {variantData.layout && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        布局: {variantData.layout}
                      </span>
                    )}
                    {variantData.items && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        菜单项: {variantData.items.length}
                      </span>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RuleCard({ rule, evaluation, isMatched, hasConflict }) {
  const formatCondition = (when) => {
    if (!when) return ''
    return `${when.attribute} ${when.operator} ${JSON.stringify(when.value)}`
  }

  return (
    <div className={`rule-card ${isMatched ? 'matched' : ''} ${hasConflict ? 'conflict' : ''}`}>
      <div className="rule-header">
        <span className="rule-name">{rule.name}</span>
        <span className="rule-priority">优先级: {rule.priority}</span>
      </div>
      <div className="rule-description">{rule.description}</div>
      <div className="rule-condition">{formatCondition(rule.when)}</div>
      <div className={`rule-result ${isMatched ? 'matched' : 'not-matched'}`}>
        {isMatched ? '✓ 条件匹配' : '✗ 条件不匹配'}
        {evaluation && evaluation.actual !== undefined && (
          <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
            (实际值: {JSON.stringify(evaluation.actual)})
          </span>
        )}
      </div>
      {isMatched && rule.then && (
        <div className="experiment-payload">
          设置: {JSON.stringify(rule.then)}
        </div>
      )}
    </div>
  )
}

function FlagCard({ flagKey, result }) {
  const getValueClass = (value) => {
    if (value === true) return 'true'
    if (value === false) return 'false'
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    return typeof value
  }

  const formatValue = (value) => {
    if (value === true) return '✓ 启用'
    if (value === false) return '✗ 禁用'
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    return String(value)
  }

  return (
    <div className="flag-card">
      <div className="flag-name">{flagKey}</div>
      <div className={`flag-value ${getValueClass(result.value)}`}>
        {formatValue(result.value)}
      </div>
      <div className={`flag-source ${result.source}`}>
        来源: {result.source === 'override' ? '强制覆盖' : result.source === 'rule' ? '规则匹配' : result.source === 'undefined' ? '未定义' : '默认值'}
      </div>
    </div>
  )
}

function ExperimentCard({ experimentName, result }) {
  const getVariantLabel = (variant) => {
    if (!variant) return '未分配'
    switch (variant) {
      case VARIANT_TYPES.CONTROL:
        return 'Control (对照组)'
      case VARIANT_TYPES.VARIANT_A:
        return 'Variant A (方案 A)'
      case VARIANT_TYPES.VARIANT_B:
        return 'Variant B (方案 B)'
      default:
        return variant
    }
  }

  return (
    <div className={`experiment-card ${result.source === 'disabled' ? 'disabled' : ''}`}>
      <div className="experiment-name">{experimentName}</div>
      <div className="experiment-variant">
        <span
          className={`variant-tag ${
            result.variant === VARIANT_TYPES.CONTROL
              ? 'control'
              : result.variant === VARIANT_TYPES.VARIANT_A
              ? 'variant_a'
              : 'variant_b'
          }`}
        >
          {result.variant || 'N/A'}
        </span>
        {getVariantLabel(result.variant)}
      </div>
      {result.bucket !== null && (
        <div className="experiment-bucket">分桶编号: {result.bucket}</div>
      )}
      <div className="experiment-bucket">
        来源:{' '}
        {result.source === 'bucketing'
          ? '分桶分配'
          : result.source === 'override'
          ? '强制覆盖'
          : result.source === 'disabled'
          ? '实验已关闭'
          : result.source === 'rollout_excluded'
          ? '未在放量范围内'
          : result.source}
      </div>
      {result.payload && (
        <div className="experiment-payload">{JSON.stringify(result.payload, null, 2)}</div>
      )}
    </div>
  )
}

function ExperimentFlagUIMatrix() {
  const [loadingState, setLoadingState] = useState(SSR_LOADING_STATE.IDLE)
  const [featureContext, setFeatureContext] = useState(null)
  const [selectedScenario, setSelectedScenario] = useState(CONFIG_SCENARIOS.GRADUAL_ROLLOUT)
  const [selectedUserContext, setSelectedUserContext] = useState(0)
  const [use304Cache, setUse304Cache] = useState(false)
  const [lastFetchStatus, setLastFetchStatus] = useState(null)
  const [overrides, setOverrides] = useState({})

  const fetchConfig = useCallback(async (scenario, forceFetch = false) => {
    setLoadingState(SSR_LOADING_STATE.LOADING)
    setMockScenario(scenario)
    setUseCache(use304Cache)

    try {
      const response = await fetchFeatureConfig({
        forceFetch,
        ifNoneMatch: forceFetch ? null : lastFetchStatus?.etag,
      })

      setLastFetchStatus({
        status: response.status,
        etag: response.headers?.etag,
      })

      if (response.status === 304) {
        setLoadingState(SSR_LOADING_STATE.READY)
        return
      }

      const config = response.body
      const context = createFeatureContext({
        flags: config.flags,
        experiments: config.experiments,
        rules: config.rules,
        userContext: SAMPLE_USER_CONTEXTS[selectedUserContext]?.context || {},
      })

      Object.keys(overrides).forEach((key) => {
        context.setOverride(key, overrides[key])
      })

      setFeatureContext(context)
      setLoadingState(SSR_LOADING_STATE.READY)
    } catch {
      setLoadingState(SSR_LOADING_STATE.ERROR)
    }
  }, [use304Cache, selectedUserContext, lastFetchStatus, overrides])

  const { flagResults, experimentResults, ruleEvaluations } = useMemo(() => {
    if (!featureContext) {
      return { flagResults: {}, experimentResults: {}, ruleEvaluations: [] }
    }

    const userContext = SAMPLE_USER_CONTEXTS[selectedUserContext]?.context || {}
    featureContext.setUserContext(userContext)

    Object.keys(overrides).forEach((key) => {
      featureContext.setOverride(key, overrides[key])
    })

    const flags = featureContext.evaluateAllFlags()
    const experiments = featureContext.evaluateAllExperiments()
    const conflictResult = featureContext.resolveRuleConflicts()

    return {
      flagResults: flags,
      experimentResults: experiments,
      ruleEvaluations: conflictResult.all || [],
    }
  }, [featureContext, selectedUserContext, overrides])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig(selectedScenario)
  }, [selectedScenario])

  const handleScenarioChange = (scenario) => {
    setSelectedScenario(scenario)
    setOverrides({})
  }

  const handleFlagOverride = (flagKey, value) => {
    const newValue = value === '' ? null : value === 'true' ? true : value === 'false' ? false : value
    setOverrides((prev) => {
      const next = { ...prev }
      if (newValue === null || newValue === undefined) {
        delete next[flagKey]
      } else {
        next[flagKey] = newValue
      }
      return next
    })
  }

  const handleExperimentOverride = (experimentName, variant) => {
    const key = `experiment:${experimentName}`
    setOverrides((prev) => {
      const next = { ...prev }
      if (!variant) {
        delete next[key]
      } else {
        next[key] = variant
      }
      return next
    })
  }

  const handleClearOverrides = () => {
    setOverrides({})
  }

  return (
    <div className="experiment-flag-ui-matrix">
      <section className="tool-section">
        <div className="demo-header">
          <h2>功能开关与实验矩阵</h2>
          <p>
            展示组件在不同变体下的渲染效果，支持用户分桶、规则引擎匹配、强制覆盖验收，以及紧急关停后的 304 缓存模拟
          </p>
        </div>

        <div className="scenario-switcher">
          {[
            { id: CONFIG_SCENARIOS.GRADUAL_ROLLOUT, name: '灰度放量', desc: '新功能按用户分桶逐步开放' },
            { id: CONFIG_SCENARIOS.EMERGENCY_SHUTDOWN, name: '紧急关停', desc: '所有实验立即关闭，回归基线' },
            { id: CONFIG_SCENARIOS.LAYERED_EXPERIMENT, name: '分层实验', desc: '多层并行实验，正交流量分配' },
          ].map((scenario) => (
            <button
              key={scenario.id}
              className={`scenario-btn ${selectedScenario === scenario.id ? 'active' : ''}`}
              onClick={() => handleScenarioChange(scenario.id)}
            >
              <h4>{scenario.name}</h4>
              <p>{scenario.desc}</p>
            </button>
          ))}
        </div>

        <div className="cache-toggle">
          <input
            type="checkbox"
            id="cache-toggle"
            checked={use304Cache}
            onChange={(e) => setUse304Cache(e.target.checked)}
          />
          <label htmlFor="cache-toggle">
            启用 304 缓存模拟 {lastFetchStatus?.status === 304 && '(已命中缓存)'}
          </label>
          {lastFetchStatus && (
            <span
              className={`status-badge ${
                lastFetchStatus.status === 304 ? 'disabled' : 'enabled'
              }`}
            >
              HTTP {lastFetchStatus.status}
            </span>
          )}
        </div>

        <div className="user-context-panel">
          <div className="user-context-header">
            <h3>用户上下文</h3>
            <div className="user-context-selector">
              <select
                value={selectedUserContext}
                onChange={(e) => setSelectedUserContext(Number(e.target.value))}
              >
                {SAMPLE_USER_CONTEXTS.map((ctx, idx) => (
                  <option key={idx} value={idx}>
                    {ctx.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="user-context-editor">
            {JSON.stringify(SAMPLE_USER_CONTEXTS[selectedUserContext]?.context || {}, null, 2)}
          </div>
        </div>

        <div className="action-row">
          <button
            className="demo-btn"
            onClick={() => fetchConfig(selectedScenario, true)}
            disabled={loadingState === SSR_LOADING_STATE.LOADING}
          >
            🔄 重新拉取配置
          </button>
          <button className="demo-btn secondary" onClick={handleClearOverrides}>
            清除所有覆盖
          </button>
        </div>
      </section>

      {loadingState === SSR_LOADING_STATE.LOADING ? (
        <section className="tool-section">
          <LoadingSkeleton />
        </section>
      ) : (
        <>
          <section className="tool-section">
            <h3>UI 组件变体矩阵</h3>
            <p className="hint">展示各组件在 Control / Variant A / Variant B 下的渲染效果</p>
            <VariantMatrix components={UI_COMPONENT_MATRIX} featureContext={featureContext} />
          </section>

          <section className="tool-section">
            <h3>强制覆盖控制</h3>
            <p className="hint">直接设置功能开关和实验变体，用于验收测试</p>

            <div className="override-controls">
              {Object.keys(flagResults).map((flagKey) => (
                <div key={flagKey} className="override-item">
                  <label>{flagKey}</label>
                  <select
                    value={overrides[flagKey] ?? ''}
                    onChange={(e) => handleFlagOverride(flagKey, e.target.value)}
                  >
                    <option value="">自动</option>
                    <option value="true">启用 (true)</option>
                    <option value="false">禁用 (false)</option>
                  </select>
                  {overrides[flagKey] !== undefined && (
                    <span className="status-badge override">已覆盖</span>
                  )}
                </div>
              ))}

              {Object.keys(experimentResults).map((experimentName) => (
                <div key={experimentName} className="override-item">
                  <label>{experimentName}</label>
                  <select
                    value={overrides[`experiment:${experimentName}`] ?? ''}
                    onChange={(e) => handleExperimentOverride(experimentName, e.target.value)}
                  >
                    <option value="">自动分配</option>
                    <option value={VARIANT_TYPES.CONTROL}>Control</option>
                    <option value={VARIANT_TYPES.VARIANT_A}>Variant A</option>
                    <option value={VARIANT_TYPES.VARIANT_B}>Variant B</option>
                  </select>
                  {overrides[`experiment:${experimentName}`] !== undefined && (
                    <span className="status-badge override">已覆盖</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="tool-section">
            <h3>功能开关评估结果</h3>
            <div className="flag-results">
              {Object.entries(flagResults).map(([key, result]) => (
                <FlagCard key={key} flagKey={key} result={result} />
              ))}
            </div>
          </section>

          <section className="tool-section">
            <h3>实验分桶结果</h3>
            <div className="experiment-results">
              {Object.entries(experimentResults).map(([key, result]) => (
                <ExperimentCard key={key} experimentName={key} result={result} />
              ))}
            </div>
          </section>

          <section className="tool-section">
            <h3>规则匹配链路</h3>
            <p className="hint">
              显示当前用户上下文命中的规则，以及优先级冲突情况
            </p>
            <div className="rules-list">
              {ruleEvaluations.map((evaluation, idx) => (
                <RuleCard
                  key={idx}
                  rule={evaluation.rule}
                  evaluation={evaluation.evaluation}
                  isMatched={evaluation.matched}
                  hasConflict={evaluation.isConflict}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default ExperimentFlagUIMatrix
