import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './LinearRegressionWorkbench.css'
import {
  olsRegression,
  standardizedResiduals,
  flagOutliers,
  leverage,
  cookDistance,
  durbinWatson,
  predictionInterval,
  confidenceBand,
  mean,
} from './logic/ols.js'
import {
  parseData,
  exportPredictionsCSV,
  coefficientTableMarkdown,
  EXAMPLES,
} from './logic/data.js'

export default function LinearRegressionWorkbench() {
  const [dataInput, setDataInput] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [regressionResult, setRegressionResult] = useState(null)
  const [confidenceLevel, setConfidenceLevel] = useState(0.95)
  const [outlierThreshold, setOutlierThreshold] = useState(2)
  const [useWeights, setUseWeights] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('plots')
  const [customX, setCustomX] = useState('')

  const scatterCanvasRef = useRef(null)
  const residualCanvasRef = useRef(null)
  const histCanvasRef = useRef(null)

  const predictions = useMemo(() => {
    if (!regressionResult) return { xMean: null, custom: null }
    const xMeanPi = predictionInterval(regressionResult, regressionResult.xMean, confidenceLevel)
    const xVal = parseFloat(customX)
    const customPi = !isNaN(xVal) ? predictionInterval(regressionResult, xVal, confidenceLevel) : null
    return { xMean: xMeanPi, custom: customPi, customXNum: xVal }
  }, [regressionResult, confidenceLevel, customX])

  const diagnosis = useMemo(() => {
    if (!regressionResult || !parsedData) return null
    const x = parsedData.data.map((d) => d.x)
    const lev = leverage(x)
    const cook = cookDistance(regressionResult.residuals, lev, regressionResult.residualStdError)
    const stdRes = standardizedResiduals(regressionResult.residuals)
    const outliers = flagOutliers(regressionResult.residuals, outlierThreshold)
    const dw = durbinWatson(regressionResult.residuals)

    return { leverage: lev, cookDistance: cook, standardizedResiduals: stdRes, outliers, durbinWatson: dw }
  }, [regressionResult, parsedData, outlierThreshold])

  const handleCopy = useCallback(async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      document.body.appendChild(textarea)
      try {
        textarea.select()
        document.execCommand('copy')
        setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
      } catch {
        setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误'}` })
      }
      document.body.removeChild(textarea)
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const handleLoadExample = useCallback((example) => {
    const text = example.data.map((d) => `${d.x},${d.y}`).join('\n')
    setDataInput(text)
    setUseWeights(false)
    runAnalysis(text, false)
  }, [])

  const runAnalysis = useCallback((text, withWeights) => {
    const parseResult = parseData(text)
    if (!parseResult.ok) {
      setParsedData(null)
      setRegressionResult(null)
      setParseError(parseResult.error)
      return
    }

    setParseError(null)
    setParsedData(parseResult)

    const x = parseResult.data.map((d) => d.x)
    const y = parseResult.data.map((d) => d.y)
    const weights = withWeights ? parseResult.data.map((d) => d.w) : null

    if (parseResult.validCount < 2) {
      setRegressionResult(null)
      setParseError('有效数据不足 2 行，无法拟合回归模型。请至少提供 2 组不同的 (x, y) 数据。')
      return
    }

    const allSameX = x.every((v) => v === x[0])
    if (allSameX) {
      setRegressionResult(null)
      setParseError('所有 x 值相同（共线），无法估计斜率。回归要求 x 存在变异。')
      return
    }

    try {
      const result = olsRegression(x, y, weights)
      setRegressionResult(result)
    } catch (err) {
      setRegressionResult(null)
      setParseError(err.message)
    }
  }, [])

  const handleAnalyze = useCallback(() => {
    runAnalysis(dataInput, useWeights)
  }, [dataInput, useWeights, runAnalysis])

  const handleClear = useCallback(() => {
    setDataInput('')
    setParsedData(null)
    setRegressionResult(null)
    setParseError(null)
  }, [])

  useEffect(() => {
    if (!regressionResult || !parsedData || !scatterCanvasRef.current) return
    drawScatterPlot(scatterCanvasRef.current, parsedData.data, regressionResult, diagnosis.outliers, confidenceLevel)
  }, [regressionResult, parsedData, diagnosis, confidenceLevel])

  useEffect(() => {
    if (!regressionResult || !parsedData || !residualCanvasRef.current) return
    drawResidualPlot(residualCanvasRef.current, regressionResult.fitted, regressionResult.residuals, diagnosis.outliers)
  }, [regressionResult, diagnosis])

  useEffect(() => {
    if (!regressionResult || !histCanvasRef.current) return
    drawResidualHistogram(histCanvasRef.current, regressionResult.residuals)
  }, [regressionResult])

  return (
    <div className="linear-regression-workbench">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>线性回归工作台</h2>
        <p className="tool-description">
          粘贴两列（x, y）或三列（x, y, w）数据进行普通最小二乘（OLS）或加权最小二乘（WLS）回归分析。
          支持置信区间估计、残差诊断、异常点检测与影响分析。
        </p>
      </section>

      <section className="tool-section">
        <h3>示例数据集</h3>
        <div className="examples-row">
          {Object.values(EXAMPLES).map((example) => (
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
        <h3>数据输入</h3>
        <div className="data-input">
          <textarea
            className="data-textarea"
            value={dataInput}
            onChange={(e) => {
              const text = e.target.value
              setDataInput(text)
              if (text.trim()) {
                runAnalysis(text, useWeights)
              } else {
                setParsedData(null)
                setRegressionResult(null)
                setParseError(null)
              }
            }}
            placeholder={
              '粘贴 CSV/TSV 数据，每行包含 x 和 y 值（可选第三列为权重），例如：\n\n1, 2.5\n2, 4.1\n3, 5.8\n4, 7.2\n...'
            }
            spellCheck={false}
          />
        </div>
        <div className="action-row">
          <button className="primary-btn" onClick={handleAnalyze} disabled={!dataInput.trim()}>
            分析数据
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
            disabled={!dataInput && !parsedData && !parseError}
          >
            清除
          </button>
          <div className="config-options">
            <label>
              <input
                type="checkbox"
                checked={useWeights}
                onChange={(e) => setUseWeights(e.target.checked)}
              />
              使用权重列
            </label>
            <label>
              置信水平：
              <select
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
              >
                <option value={0.90}>90%</option>
                <option value={0.95}>95%</option>
                <option value={0.99}>99%</option>
              </select>
            </label>
            <label>
              异常点阈值：
              <input
                type="number"
                value={outlierThreshold}
                min={1}
                max={5}
                step={0.5}
                style={{ width: 60 }}
                onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </div>
      </section>

      {parseError && (
        <section className="tool-section">
          <div className="error-box">
            <strong>无法执行回归</strong>
            <p>{parseError}</p>
          </div>
        </section>
      )}

      {parsedData && !regressionResult && (parsedData.invalidRows.length > 0 || parsedData.missingRows.length > 0) && (
        <section className="tool-section">
          <div className="warning-box">
            <strong>数据质量提示</strong>
            {parsedData.invalidRows.length > 0 && (
              <p>
                发现 {parsedData.invalidRows.length} 行非数值数据，已自动跳过。
                第 {parsedData.invalidRows.slice(0, 5).map((r) => r.row).join(', ')}
                {parsedData.invalidRows.length > 5 ? '...' : ''} 行
              </p>
            )}
            {parsedData.missingRows.length > 0 && (
              <p>
                发现 {parsedData.missingRows.length} 行数据缺失，已自动跳过。
                第 {parsedData.missingRows.slice(0, 5).join(', ')}
                {parsedData.missingRows.length > 5 ? '...' : ''} 行
              </p>
            )}
            <p>
              共 {parsedData.rowCount} 行输入，{parsedData.validCount} 行有效数据用于分析
            </p>
          </div>
        </section>
      )}

      {!regressionResult && !parseError && dataInput.trim() && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>准备就绪</h3>
            <p>点击「分析数据」按钮执行回归分析</p>
          </div>
        </section>
      )}

      {!regressionResult && !parseError && !dataInput.trim() && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>等待输入</h3>
            <p>粘贴数据或点击上方示例按钮开始使用</p>
          </div>
        </section>
      )}

      {regressionResult && parsedData && (
        <>
          <section className="tool-section">
            <h3>回归结果摘要</h3>
            <div className="results-grid">
              <div className="stats-card">
                <h4>系数估计</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">截距 β₀</span>
                    <span className="stat-value">{regressionResult.intercept.toFixed(4)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">斜率 β₁</span>
                    <span className="stat-value">{regressionResult.slope.toFixed(4)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">截距标准误</span>
                    <span className="stat-value">{regressionResult.interceptStdError.toFixed(4)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">斜率标准误</span>
                    <span className="stat-value">{regressionResult.slopeStdError.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              <div className="stats-card">
                <h4>模型拟合</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">R²</span>
                    <span className="stat-value">{(regressionResult.rSquared * 100).toFixed(2)}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">调整 R²</span>
                    <span className="stat-value">{(regressionResult.adjustedRSquared * 100).toFixed(2)}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">残差标准误</span>
                    <span className="stat-value">{regressionResult.residualStdError.toFixed(4)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">样本量 n</span>
                    <span className="stat-value">{regressionResult.n}</span>
                  </div>
                </div>
              </div>
              {predictions.xMean && (
                <div className="stats-card">
                  <h4>预测区间</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">x̄（均值）</span>
                      <span className="stat-value">{regressionResult.xMean.toFixed(4)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">ŷ at x̄</span>
                      <span className="stat-value">{predictions.xMean.fit.toFixed(4)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{Math.round(confidenceLevel * 100)}% 下限</span>
                      <span className="stat-value">{predictions.xMean.lower.toFixed(4)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{Math.round(confidenceLevel * 100)}% 上限</span>
                      <span className="stat-value">{predictions.xMean.upper.toFixed(4)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: 13, color: '#4a5568', display: 'flex', alignItems: 'center', gap: 8 }}>
                      自定义 x：
                      <input
                        type="number"
                        value={customX}
                        onChange={(e) => setCustomX(e.target.value)}
                        placeholder="输入 x 值"
                        style={{ width: 100, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13 }}
                      />
                    </label>
                    {predictions.custom && (
                      <div className="stats-grid" style={{ marginTop: 8 }}>
                        <div className="stat-item">
                          <span className="stat-label">ŷ</span>
                          <span className="stat-value">{predictions.custom.fit.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">{Math.round(confidenceLevel * 100)}% 下限</span>
                          <span className="stat-value">{predictions.custom.lower.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">{Math.round(confidenceLevel * 100)}% 上限</span>
                          <span className="stat-value">{predictions.custom.upper.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">半宽</span>
                          <span className="stat-value">{predictions.custom.margin.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="tool-section">
            <h3>可视化</h3>
            <div className="charts-container">
              <div className="chart-wrapper">
                <h4>散点图与回归线</h4>
                <canvas ref={scatterCanvasRef} className="chart-canvas" />
              </div>
              <div className="chart-wrapper">
                <h4>残差 vs 拟合值</h4>
                <canvas ref={residualCanvasRef} className="chart-canvas" />
              </div>
              <div className="chart-wrapper">
                <h4>残差直方图</h4>
                <canvas ref={histCanvasRef} className="chart-canvas" />
              </div>
            </div>
          </section>

          <section className="tool-section">
            <h3>诊断与导出</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
              {['plots', 'diagnosis', 'influence', 'export'].map((tab) => (
                <button
                  key={tab}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: activeTab === tab ? '#3182ce' : 'transparent',
                    color: activeTab === tab ? 'white' : '#4a5568',
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'plots' ? '数据表格' : tab === 'diagnosis' ? '诊断指标' : tab === 'influence' ? '影响分析' : '导出'}
                </button>
              ))}
            </div>

            {activeTab === 'plots' && (
              <div className="outlier-list">
                <div className="outlier-row header">
                  <span>行号</span>
                  <span>x</span>
                  <span>y</span>
                  <span>标准化残差</span>
                </div>
                {parsedData.data.map((d, i) => (
                  <div key={i} className={`outlier-row ${diagnosis.outliers[i] ? 'outlier' : ''}`}>
                    <span>{i + 1}</span>
                    <span>{d.x.toFixed(3)}</span>
                    <span>{d.y.toFixed(3)}</span>
                    <span>{diagnosis.standardizedResiduals[i].toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'diagnosis' && (
              <div>
                <div className="diagnosis-grid" style={{ marginBottom: 16 }}>
                  <div className="diagnosis-item">
                    <h4>Durbin-Watson 统计量</h4>
                    <div className="diagnosis-value">{diagnosis.durbinWatson.toFixed(4)}</div>
                    <div className="diagnosis-note">
                      DW ≈ 2 表示无自相关；&lt; 2 可能正自相关；&gt; 2 可能负自相关
                      <br />
                      <em>（单变量回归仅供教学演示）</em>
                    </div>
                  </div>
                  <div className="diagnosis-item">
                    <h4>异常点数量</h4>
                    <div className="diagnosis-value">
                      {diagnosis.outliers.filter(Boolean).length} / {regressionResult.n}
                    </div>
                    <div className="diagnosis-note">
                      |标准化残差| &gt; {outlierThreshold} 被标记为异常点
                    </div>
                  </div>
                  <div className="diagnosis-item">
                    <h4>多重共线性</h4>
                    <div className="diagnosis-value">—</div>
                    <div className="diagnosis-note">
                      当前为单变量回归，VIF 不适用
                      <br />
                      <em>（多变量时会计算 VIF）</em>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'influence' && (
              <div>
                <div style={{ marginBottom: 12, fontSize: 13, color: '#718096' }}>
                  杠杆值阈值：{(2 * 2 / regressionResult.n).toFixed(3)}（2p/n） | Cook 距离阈值：0.5 或 1.0
                </div>
                <table className="leverage-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>观测</th>
                      <th>x</th>
                      <th>杠杆值</th>
                      <th>Cook 距离</th>
                      <th>残差</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.data.map((d, i) => {
                      const highLeverage = diagnosis.leverage[i] > 2 * 2 / regressionResult.n
                      const highCook = diagnosis.cookDistance[i] > 0.5
                      let rowClass = ''
                      if (highCook) rowClass = 'high-cook'
                      else if (highLeverage) rowClass = 'high-leverage'
                      return (
                        <tr key={i} className={rowClass}>
                          <td style={{ textAlign: 'left' }}>{i + 1}</td>
                          <td>{d.x.toFixed(2)}</td>
                          <td>{diagnosis.leverage[i].toFixed(4)}</td>
                          <td>{diagnosis.cookDistance[i].toFixed(4)}</td>
                          <td>{regressionResult.residuals[i].toFixed(4)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'export' && (
              <div>
                <div className="section-divider">系数表 Markdown</div>
                <pre className="markdown-output">{coefficientTableMarkdown(regressionResult)}</pre>
                <div className="action-row">
                  <button
                    className="primary-btn"
                    onClick={() => handleCopy(coefficientTableMarkdown(regressionResult), '系数表')}
                  >
                    复制 Markdown
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      handleCopy(exportPredictionsCSV(parsedData.data, regressionResult), '预测 CSV')
                    }
                  >
                    复制预测 CSV
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <section className="tool-section">
        <h3>说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>数据格式：</strong>支持 CSV、TSV 或空格分隔，每行至少两列（x, y），可选第三列为权重。
          </li>
          <li>
            <strong>OLS 计算：</strong>使用闭式解 β = (X'X)⁻¹X'y，结果与 R、Python statsmodels 等主流统计软件一致。
          </li>
          <li>
            <strong>加权最小二乘：</strong>勾选「使用权重列」后，第三列数据作为权重，适用于异方差情形。
          </li>
          <li>
            <strong>异常点：</strong>标准化残差绝对值超过阈值的观测被标记为异常点，可根据需要调整阈值。
          </li>
          <li>
            <strong>影响分析：</strong>杠杆值衡量 x 的极端程度，Cook 距离衡量单个观测对回归的整体影响。
          </li>
        </ul>
      </section>
    </div>
  )
}

function drawScatterPlot(canvas, data, regression, outliers, confidenceLevel) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const xValues = data.map((d) => d.x)
  const yValues = data.map((d) => d.y)
  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1
  const xPad = xRange * 0.1
  const yPad = yRange * 0.1

  const scaleX = (x) => padding.left + ((x - (xMin - xPad)) / (xRange + xPad * 2)) * plotWidth
  const scaleY = (y) => height - padding.bottom - ((y - (yMin - yPad)) / (yRange + yPad * 2)) * plotHeight

  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const x = padding.left + (i / 5) * plotWidth
    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, height - padding.bottom)
    ctx.stroke()
    const y = height - padding.bottom - (i / 5) * plotHeight
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  const x = data.map((d) => d.x)
  const xBand = []
  for (let xi = xMin - xPad; xi <= xMax + xPad; xi += (xRange + xPad * 2) / 100) {
    xBand.push(xi)
  }
  const band = confidenceBand(regression, xBand, confidenceLevel)

  ctx.fillStyle = 'rgba(66, 153, 225, 0.15)'
  ctx.beginPath()
  ctx.moveTo(scaleX(band[0].x), scaleY(band[0].upper))
  for (let i = 1; i < band.length; i++) {
    ctx.lineTo(scaleX(band[i].x), scaleY(band[i].upper))
  }
  for (let i = band.length - 1; i >= 0; i--) {
    ctx.lineTo(scaleX(band[i].x), scaleY(band[i].lower))
  }
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#3182ce'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(scaleX(xMin - xPad), scaleY(regression.intercept + regression.slope * (xMin - xPad)))
  ctx.lineTo(scaleX(xMax + xPad), scaleY(regression.intercept + regression.slope * (xMax + xPad)))
  ctx.stroke()

  data.forEach((d, i) => {
    ctx.beginPath()
    ctx.arc(scaleX(d.x), scaleY(d.y), outliers[i] ? 6 : 4, 0, Math.PI * 2)
    ctx.fillStyle = outliers[i] ? '#e53e3e' : '#2d3748'
    ctx.fill()
    if (outliers[i]) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  })

  ctx.fillStyle = '#4a5568'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    const xVal = xMin - xPad + (i / 5) * (xRange + xPad * 2)
    ctx.fillText(xVal.toFixed(1), padding.left + (i / 5) * plotWidth, height - 10)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const yVal = yMin - yPad + (i / 5) * (yRange + yPad * 2)
    ctx.fillText(yVal.toFixed(1), padding.left - 8, height - padding.bottom - (i / 5) * plotHeight + 4)
  }
}

function drawResidualPlot(canvas, fitted, residuals, outliers) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const fMin = Math.min(...fitted)
  const fMax = Math.max(...fitted)
  const rMin = Math.min(...residuals)
  const rMax = Math.max(...residuals)
  const fRange = fMax - fMin || 1
  const rRange = rMax - rMin || 1
  const fPad = fRange * 0.1
  const rPad = Math.max(rRange * 0.1, Math.abs(rMin) * 0.1, rMax * 0.1)

  const scaleF = (f) => padding.left + ((f - (fMin - fPad)) / (fRange + fPad * 2)) * plotWidth
  const scaleR = (r) => height - padding.bottom - ((r - (rMin - rPad)) / (rRange + rPad * 2)) * plotHeight

  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const x = padding.left + (i / 5) * plotWidth
    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, height - padding.bottom)
    ctx.stroke()
    const y = height - padding.bottom - (i / 5) * plotHeight
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  ctx.strokeStyle = '#a0aec0'
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(padding.left, scaleR(0))
  ctx.lineTo(width - padding.right, scaleR(0))
  ctx.stroke()
  ctx.setLineDash([])

  fitted.forEach((f, i) => {
    ctx.beginPath()
    ctx.arc(scaleF(f), scaleR(residuals[i]), outliers[i] ? 6 : 4, 0, Math.PI * 2)
    ctx.fillStyle = outliers[i] ? '#e53e3e' : '#38a169'
    ctx.fill()
  })

  ctx.fillStyle = '#4a5568'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    const fVal = fMin - fPad + (i / 5) * (fRange + fPad * 2)
    ctx.fillText(fVal.toFixed(2), padding.left + (i / 5) * plotWidth, height - 10)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const rVal = rMin - rPad + (i / 5) * (rRange + rPad * 2)
    ctx.fillText(rVal.toFixed(2), padding.left - 8, height - padding.bottom - (i / 5) * plotHeight + 4)
  }
}

function drawResidualHistogram(canvas, residuals) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const n = residuals.length
  const bins = Math.max(Math.ceil(Math.sqrt(n)), 8)
  const rMin = Math.min(...residuals)
  const rMax = Math.max(...residuals)
  const rRange = rMax - rMin || 1
  const binWidth = rRange / bins

  const counts = Array(bins).fill(0)
  residuals.forEach((r) => {
    let bin = Math.floor((r - rMin) / binWidth)
    if (bin >= bins) bin = bins - 1
    if (bin < 0) bin = 0
    counts[bin]++
  })

  const maxCount = Math.max(...counts)

  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = height - padding.bottom - (i / 5) * plotHeight
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  const barWidth = plotWidth / bins - 2
  ctx.fillStyle = '#805ad5'
  counts.forEach((count, i) => {
    const barHeight = (count / maxCount) * plotHeight
    ctx.fillRect(padding.left + i * (plotWidth / bins) + 1, height - padding.bottom - barHeight, barWidth, barHeight)
  })

  const meanR = mean(residuals)
  ctx.strokeStyle = '#e53e3e'
  ctx.setLineDash([4, 4])
  const meanX = padding.left + ((meanR - rMin) / rRange) * plotWidth
  ctx.beginPath()
  ctx.moveTo(meanX, padding.top)
  ctx.lineTo(meanX, height - padding.bottom)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#4a5568'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    const rVal = rMin + (i / 5) * rRange
    ctx.fillText(rVal.toFixed(2), padding.left + (i / 5) * plotWidth, height - 10)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const cVal = Math.round((i / 5) * maxCount)
    ctx.fillText(String(cVal), padding.left - 8, height - padding.bottom - (i / 5) * plotHeight + 4)
  }
}
