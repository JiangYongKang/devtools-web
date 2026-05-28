import { useCallback, useEffect, useRef, useState } from 'react'
import './ArbitraryPrecisionCalculatorTool.css'
import {
  evaluateAllModes,
  ROUNDING_MODES,
  getDefaultConfig,
  EXAMPLES,
} from './logic/index.js'

export default function ArbitraryPrecisionCalculatorTool() {
  const [expression, setExpression] = useState('0.1 + 0.2')
  const [result, setResult] = useState(null)
  const [decimalConfig, setDecimalConfig] = useState(getDefaultConfig())
  const [toast, setToast] = useState(null)
  const debounceRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const doCalculate = useCallback((expr, config) => {
    const trimmed = expr.trim()
    if (!trimmed) {
      setResult(null)
      return
    }

    const evalResult = evaluateAllModes(trimmed, config)
    setResult(evalResult)

    if (!evalResult.success) {
      showToast('解析错误', 'error')
    }
  }, [showToast])

  const handleCalculate = useCallback(() => {
    doCalculate(expression, decimalConfig)
  }, [expression, decimalConfig, doCalculate])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = expression.trim()
    if (!trimmed) {
      setResult(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      doCalculate(expression, decimalConfig)
    }, 400)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [expression, decimalConfig, doCalculate])

  const handleLoadExample = useCallback((example) => {
    setExpression(example.expression)
  }, [])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      handleCalculate()
    }
  }, [handleCalculate])

  const handleConfigChange = useCallback((key, value) => {
    setDecimalConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const renderResultCard = (mode, label, badgeClass, data) => {
    if (!data) return null
    const hasError = !!data.error
    const isInf = data.isInfinity

    return (
      <div className={`result-card ${mode}`}>
        <div className="result-card-header">
          <span className="result-card-title">{label}</span>
          <span className={`result-card-badge ${badgeClass}`}>{mode}</span>
        </div>
        {hasError ? (
          <div className="result-value error">{data.error}</div>
        ) : (
          <>
            <div className={`result-value${isInf ? ' infinity-value' : ''}`}>
              {data.stringValue}
            </div>
            {data.issues && data.issues.length > 0 && (
              data.issues.map((issue, i) => (
                <div
                  key={i}
                  className={issue.severity === 'error' ? 'issue-error' : 'issue-warning'}
                >
                  {issue.message}
                </div>
              ))
            )}
            {data.binary && (
              <div className="binary-representation">
                <div className="binary-header">IEEE 754 双精度二进制表示:</div>
                <div className="binary-row">
                  <span className="binary-label">十六进制:</span>
                  <span className="binary-value">{data.binary.hex}</span>
                </div>
                <div className="binary-row">
                  <span className="binary-label">符号位:</span>
                  <span className="binary-value">{data.binary.sign}</span>
                </div>
                <div className="binary-row">
                  <span className="binary-label">指数:</span>
                  <span className="binary-value">{data.binary.exponent}</span>
                </div>
                <div className="binary-row">
                  <span className="binary-label">尾数:</span>
                  <span className="binary-value">{data.binary.mantissa}</span>
                </div>
              </div>
            )}
            {data.hexValue && (
              <div className="result-meta">
                <div className="result-meta-item">
                  <span>十六进制:</span>
                  <span>{data.hexValue}</span>
                </div>
                <div className="result-meta-item">
                  <span>位数:</span>
                  <span>{data.stringValue.replace('-', '').length} 位</span>
                </div>
              </div>
            )}
            {data.expValue && (
              <div className="result-meta">
                <div className="result-meta-item">
                  <span>科学计数:</span>
                  <span>{data.expValue}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="arbitrary-precision-calculator">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>高精度计算器</h2>
        <p className="tool-description">
          支持 BigInt 大整数运算、Decimal 高精度小数运算，以及 Number/BigInt/Decimal 三种模式对比求值。
        </p>
      </section>

      <section className="tool-section">
        <h3>示例</h3>
        <div className="examples-row">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              className="example-btn"
              onClick={() => handleLoadExample(example)}
              title={example.description}
            >
              <span className="example-name">{example.name}</span>
              <span className="example-desc">{example.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h3>计算</h3>

        <div className="calculator-input">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入表达式，例如: 0.1 + 0.2 或 fib(1000)"
            className={result && result.error ? 'error' : ''}
          />
          <button className="primary-btn" onClick={handleCalculate}>
            计算
          </button>
        </div>

        <div className="config-panel">
          <div className="config-group">
            <label>精度 (有效数字)</label>
            <input
              type="number"
              value={decimalConfig.precision}
              onChange={(e) => handleConfigChange('precision', Math.max(10, parseInt(e.target.value, 10)))}
              min="10"
              max="100"
            />
          </div>
          <div className="config-group">
            <label>小数位数 (scale)</label>
            <input
              type="number"
              value={decimalConfig.scale}
              onChange={(e) => handleConfigChange('scale', Math.max(0, parseInt(e.target.value, 10)))}
              min="0"
              max="50"
            />
          </div>
          <div className="config-group">
            <label>舍入模式</label>
            <select
              value={decimalConfig.roundingMode}
              onChange={(e) => handleConfigChange('roundingMode', e.target.value)}
            >
              <option value={ROUNDING_MODES.ROUND_HALF_UP}>四舍五入 (ROUND_HALF_UP)</option>
              <option value={ROUNDING_MODES.ROUND_HALF_DOWN}>五舍六入 (ROUND_HALF_DOWN)</option>
              <option value={ROUNDING_MODES.ROUND_HALF_EVEN}>银行家舍入 (ROUND_HALF_EVEN)</option>
              <option value={ROUNDING_MODES.ROUND_UP}>向上舍入 (ROUND_UP)</option>
              <option value={ROUNDING_MODES.ROUND_DOWN}>向下舍入 (ROUND_DOWN)</option>
              <option value={ROUNDING_MODES.ROUND_CEILING}>向正无穷 (ROUND_CEILING)</option>
              <option value={ROUNDING_MODES.ROUND_FLOOR}>向负无穷 (ROUND_FLOOR)</option>
            </select>
          </div>
        </div>

        {result && result.error && (
          <div className="error-display">
            {result.error}
            {result.errorPosition !== null && (
              <div className="error-position">
                位置: {result.errorPosition}
              </div>
            )}
          </div>
        )}

        {result && result.success && (
          <>
            {result.comparison && result.comparison.length > 0 && (
              <div className="comparison-notes">
                {result.comparison.map((note, i) => (
                  <div key={i} className={`comparison-note ${note.type}`}>
                    {note.message}
                  </div>
                ))}
              </div>
            )}

            <div className="results-grid">
              {renderResultCard('number', 'Number (64-bit 浮点)', 'number', result.number)}
              {renderResultCard('bigint', 'BigInt (任意精度整数)', 'bigint', result.bigint)}
              {renderResultCard('decimal', 'Decimal (高精度小数)', 'decimal', result.decimal)}
            </div>
          </>
        )}
      </section>

      <section className="tool-section">
        <h3>使用说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>运算符:</strong> +, -, *, /, %, ^ (幂)
          </li>
          <li>
            <strong>函数:</strong> min(), max(), abs(), sqrt(), gcd(), mod(), pow(), modpow(), fib()
          </li>
          <li>
            <strong>十六进制:</strong> 使用 0x 前缀，如 0xFF, 0x1A3
          </li>
          <li>
            <strong>科学计数法:</strong> 支持如 1e10, 2.5e-3 等格式
          </li>
          <li>
            <strong>斐波那契:</strong> 使用 fib(n) 如 fib(100) 计算第 n 个斐波那契数
          </li>
          <li>
            <strong>自动计算:</strong> 修改表达式或配置后自动重新求值
          </li>
        </ul>
      </section>
    </div>
  )
}
