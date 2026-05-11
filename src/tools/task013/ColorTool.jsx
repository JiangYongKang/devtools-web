import { useCallback, useState } from 'react'
import {
  NOTATIONS,
  normalizeColor,
  convertColor,
  convertBatch,
  escapeHtml,
} from './logic/colorUtils'
import './ColorTool.css'

const MODES = {
  PARSE: 'parse',
  SINGLE: 'single',
  BATCH: 'batch',
}

const TARGET_OPTIONS = [
  { id: NOTATIONS.HEX, name: 'HEX' },
  { id: NOTATIONS.RGB, name: 'RGB' },
  { id: NOTATIONS.RGBA, name: 'RGBA' },
  { id: NOTATIONS.HSL, name: 'HSL' },
  { id: NOTATIONS.HSLA, name: 'HSLA' },
]

export default function ColorTool() {
  const [mode, setMode] = useState(MODES.SINGLE)
  const [singleInput, setSingleInput] = useState('')
  const [targetNotation, setTargetNotation] = useState(NOTATIONS.HEX)
  const [batchInput, setBatchInput] = useState('')
  const [failFast, setFailFast] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [singleResult, setSingleResult] = useState(null)
  const [batchResult, setBatchResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

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

  const handleParse = useCallback(() => {
    const result = normalizeColor(singleInput)
    setParseResult(result)
    setSingleResult(null)
    setBatchResult(null)
  }, [singleInput])

  const handleConvertSingle = useCallback(() => {
    const result = convertColor(singleInput, {
      targetNotation,
    })
    setSingleResult(result)
    setParseResult(null)
    setBatchResult(null)
  }, [singleInput, targetNotation])

  const handleConvertBatch = useCallback(() => {
    const lines = batchInput.split('\n').filter(line => line.trim() !== '')
    const result = convertBatch(lines, {
      targetNotation,
      failFast,
    })
    setBatchResult(result)
    setParseResult(null)
    setSingleResult(null)
  }, [batchInput, targetNotation, failFast])

  const handleClear = useCallback(() => {
    setSingleInput('')
    setBatchInput('')
    setParseResult(null)
    setSingleResult(null)
    setBatchResult(null)
  }, [])

  const getNotationLabel = (notation) => {
    switch (notation) {
      case NOTATIONS.HEX: return 'HEX'
      case NOTATIONS.RGB: return 'RGB'
      case NOTATIONS.RGBA: return 'RGBA'
      case NOTATIONS.HSL: return 'HSL'
      case NOTATIONS.HSLA: return 'HSLA'
      default: return notation
    }
  }

  const formatError = (result) => {
    if (!result || result.valid) return null
    return (
      <div className="error-box">
        <strong>解析失败</strong>
        <p>错误代码: <code>{result.errorCode}</code></p>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(result.errorMessage) }} />
      </div>
    )
  }

  const renderColorPreview = (rgb) => {
    if (!rgb) return null
    const { r, g, b, a } = rgb
    const style = {
      backgroundColor: a !== null ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`,
    }
    return <div className="color-preview" style={style} />
  }

  const renderParseResult = () => {
    if (!parseResult) return null
    
    if (!parseResult.valid) {
      return formatError(parseResult)
    }

    return (
      <div className="result-panel">
        <div className="result-header">
          <h3>解析结果</h3>
          {renderColorPreview(parseResult.rgb)}
        </div>
        
        <div className="result-meta">
          <div className="meta-item">
            <span className="meta-label">有效:</span>
            <span className="meta-value success">是</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">原始格式:</span>
            <span className="meta-value">{getNotationLabel(parseResult.notation)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">标准化:</span>
            <code className="meta-code">{parseResult.normalizedColor}</code>
          </div>
        </div>

        <div className="result-sections">
          {parseResult.hex && (
            <div className="result-section">
              <h4>HEX</h4>
              <div className="result-row">
                <span className="result-label">值:</span>
                <code className="result-value">{parseResult.hex.value}</code>
                <button 
                  className="copy-small-btn"
                  onClick={() => handleCopy(parseResult.hex.value, 'HEX')}
                >
                  复制
                </button>
              </div>
              <div className="result-row">
                <span className="result-label">R:</span>
                <span>{parseResult.hex.r}</span>
                <span className="result-label">G:</span>
                <span>{parseResult.hex.g}</span>
                <span className="result-label">B:</span>
                <span>{parseResult.hex.b}</span>
                {parseResult.hex.a !== null && (
                  <>
                    <span className="result-label">A:</span>
                    <span>{parseResult.hex.a}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {parseResult.rgb && (
            <div className="result-section">
              <h4>RGB</h4>
              <div className="result-row">
                <span className="result-label">值:</span>
                <code className="result-value">
                  {parseResult.rgb.a !== null && parseResult.rgb.a < 1
                    ? `rgba(${parseResult.rgb.r}, ${parseResult.rgb.g}, ${parseResult.rgb.b}, ${parseResult.rgb.a})`
                    : `rgb(${parseResult.rgb.r}, ${parseResult.rgb.g}, ${parseResult.rgb.b})`
                  }
                </code>
                <button 
                  className="copy-small-btn"
                  onClick={() => handleCopy(
                    parseResult.rgb.a !== null && parseResult.rgb.a < 1
                      ? `rgba(${parseResult.rgb.r}, ${parseResult.rgb.g}, ${parseResult.rgb.b}, ${parseResult.rgb.a})`
                      : `rgb(${parseResult.rgb.r}, ${parseResult.rgb.g}, ${parseResult.rgb.b})`,
                    'RGB'
                  )}
                >
                  复制
                </button>
              </div>
              <div className="result-row">
                <span className="result-label">R:</span>
                <span>{parseResult.rgb.r}</span>
                <span className="result-label">G:</span>
                <span>{parseResult.rgb.g}</span>
                <span className="result-label">B:</span>
                <span>{parseResult.rgb.b}</span>
                {parseResult.rgb.a !== null && (
                  <>
                    <span className="result-label">A:</span>
                    <span>{parseResult.rgb.a}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {parseResult.hsl && (
            <div className="result-section">
              <h4>HSL</h4>
              <div className="result-row">
                <span className="result-label">值:</span>
                <code className="result-value">
                  {parseResult.hsl.a !== null && parseResult.hsl.a < 1
                    ? `hsla(${parseResult.hsl.h}, ${parseResult.hsl.s}%, ${parseResult.hsl.l}%, ${parseResult.hsl.a})`
                    : `hsl(${parseResult.hsl.h}, ${parseResult.hsl.s}%, ${parseResult.hsl.l}%)`
                  }
                </code>
                <button 
                  className="copy-small-btn"
                  onClick={() => handleCopy(
                    parseResult.hsl.a !== null && parseResult.hsl.a < 1
                      ? `hsla(${parseResult.hsl.h}, ${parseResult.hsl.s}%, ${parseResult.hsl.l}%, ${parseResult.hsl.a})`
                      : `hsl(${parseResult.hsl.h}, ${parseResult.hsl.s}%, ${parseResult.hsl.l}%)`,
                    'HSL'
                  )}
                >
                  复制
                </button>
              </div>
              <div className="result-row">
                <span className="result-label">H:</span>
                <span>{parseResult.hsl.h}°</span>
                <span className="result-label">S:</span>
                <span>{parseResult.hsl.s}%</span>
                <span className="result-label">L:</span>
                <span>{parseResult.hsl.l}%</span>
                {parseResult.hsl.a !== null && (
                  <>
                    <span className="result-label">A:</span>
                    <span>{parseResult.hsl.a}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSingleResult = () => {
    if (!singleResult) return null
    
    if (!singleResult.valid) {
      return formatError(singleResult)
    }

    return (
      <div className="result-panel">
        <div className="result-header">
          <h3>转换结果</h3>
          {renderColorPreview(singleResult.rgb)}
        </div>

        <div className="converted-result">
          <div className="converted-label">转换结果</div>
          <code className="converted-value">{singleResult.convertedColor}</code>
          <button 
            className="copy-btn"
            onClick={() => handleCopy(singleResult.convertedColor, '转换结果')}
          >
            复制
          </button>
        </div>

        <div className="result-meta">
          <div className="meta-item">
            <span className="meta-label">原始值:</span>
            <code className="meta-code">{singleResult.originalColor}</code>
          </div>
          <div className="meta-item">
            <span className="meta-label">原始格式:</span>
            <span className="meta-value">{getNotationLabel(singleResult.originalNotation)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">目标格式:</span>
            <span className="meta-value">{getNotationLabel(singleResult.targetNotation)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">标准化:</span>
            <code className="meta-code">{singleResult.normalizedColor}</code>
          </div>
        </div>

        <div className="result-sections">
          <div className="result-section">
            <h4>HEX</h4>
            <div className="result-row">
              <span className="result-label">值:</span>
              <code className="result-value">{singleResult.hex.value}</code>
              <button 
                className="copy-small-btn"
                onClick={() => handleCopy(singleResult.hex.value, 'HEX')}
              >
                复制
              </button>
            </div>
          </div>

          <div className="result-section">
            <h4>RGB</h4>
            <div className="result-row">
              <span className="result-label">R:</span>
              <span>{singleResult.rgb.r}</span>
              <span className="result-label">G:</span>
              <span>{singleResult.rgb.g}</span>
              <span className="result-label">B:</span>
              <span>{singleResult.rgb.b}</span>
              {singleResult.rgb.a !== null && (
                <>
                  <span className="result-label">A:</span>
                  <span>{singleResult.rgb.a}</span>
                </>
              )}
            </div>
          </div>

          <div className="result-section">
            <h4>HSL</h4>
            <div className="result-row">
              <span className="result-label">H:</span>
              <span>{singleResult.hsl.h}°</span>
              <span className="result-label">S:</span>
              <span>{singleResult.hsl.s}%</span>
              <span className="result-label">L:</span>
              <span>{singleResult.hsl.l}%</span>
              {singleResult.hsl.a !== null && (
                <>
                  <span className="result-label">A:</span>
                  <span>{singleResult.hsl.a}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderBatchResult = () => {
    if (!batchResult) return null

    return (
      <div className="result-panel">
        <div className="result-header">
          <h3>批量转换结果</h3>
          <div className={`batch-status ${batchResult.allSuccess ? 'success' : 'partial'}`}>
            {batchResult.allSuccess ? '全部成功' : '部分失败'}
          </div>
        </div>

        <div className="batch-stats">
          <div className="stat-item">
            <span className="stat-label">总数:</span>
            <span className="stat-value">{batchResult.totalCount}</span>
          </div>
          <div className="stat-item success">
            <span className="stat-label">成功:</span>
            <span className="stat-value">{batchResult.successCount}</span>
          </div>
          <div className="stat-item error">
            <span className="stat-label">失败:</span>
            <span className="stat-value">{batchResult.failureCount}</span>
          </div>
        </div>

        {batchResult.errorCode && (
          <div className="error-box">
            <strong>批量转换失败</strong>
            <p>错误代码: <code>{batchResult.errorCode}</code></p>
            <p dangerouslySetInnerHTML={{ __html: escapeHtml(batchResult.errorMessage) }} />
          </div>
        )}

        {batchResult.items.length > 0 && (
          <div className="batch-items">
            {batchResult.items.map((item) => (
              <div 
                key={item.index} 
                className={`batch-item ${item.valid ? 'success' : 'error'}`}
              >
                <div className="batch-item-header">
                  <span className="batch-index">#{item.index + 1}</span>
                  <span className={`batch-indicator ${item.valid ? 'success' : 'error'}`}>
                    {item.valid ? '✓' : '✗'}
                  </span>
                </div>
                
                <div className="batch-item-input">
                  <span className="label">输入:</span>
                  <code>{item.input || '(空)'}</code>
                </div>

                {item.valid ? (
                  <>
                    <div className="batch-item-output">
                      <span className="label">输出:</span>
                      <code className="success">{item.convertedColor}</code>
                      <button 
                        className="copy-small-btn"
                        onClick={() => handleCopy(item.convertedColor, `项目 ${item.index + 1}`)}
                      >
                        复制
                      </button>
                    </div>
                    <div className="batch-item-format">
                      <span>{getNotationLabel(item.originalNotation)} → {getNotationLabel(item.targetNotation)}</span>
                    </div>
                  </>
                ) : (
                  <div className="batch-item-error">
                    <span className="error-code">[{item.errorCode}]</span>
                    <span dangerouslySetInnerHTML={{ __html: escapeHtml(item.errorMessage) }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {batchResult.allSuccess && batchResult.items.length > 0 && (
          <div className="batch-actions">
            <button 
              className="copy-btn"
              onClick={() => handleCopy(
                batchResult.items.map(i => i.convertedColor).join('\n'),
                '全部结果'
              )}
            >
              复制全部结果
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="color-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>操作模式</h2>
        <div className="mode-switch">
          <button
            className={`mode-btn ${mode === MODES.PARSE ? 'active' : ''}`}
            onClick={() => setMode(MODES.PARSE)}
          >
            解析校验
          </button>
          <button
            className={`mode-btn ${mode === MODES.SINGLE ? 'active' : ''}`}
            onClick={() => setMode(MODES.SINGLE)}
          >
            单值转换
          </button>
          <button
            className={`mode-btn ${mode === MODES.BATCH ? 'active' : ''}`}
            onClick={() => setMode(MODES.BATCH)}
          >
            批量转换
          </button>
        </div>
      </section>

      {mode !== MODES.BATCH && (
        <section className="tool-section">
          <h2>颜色输入</h2>
          <div className="form-group full-width">
            <label htmlFor="color-input">输入颜色值</label>
            <input
              id="color-input"
              type="text"
              className="color-input"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              placeholder="例如: #ff0000, rgb(255, 0, 0), hsl(0, 100%, 50%)"
            />
          </div>

          {mode === MODES.SINGLE && (
            <div className="options-panel">
              <div className="options-row">
                <div className="option-group">
                  <label htmlFor="target-notation">目标格式</label>
                  <select
                    id="target-notation"
                    value={targetNotation}
                    onChange={(e) => setTargetNotation(e.target.value)}
                  >
                    {TARGET_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={mode === MODES.PARSE ? handleParse : handleConvertSingle}
              disabled={!singleInput.trim()}
            >
              {mode === MODES.PARSE ? '解析' : '转换'}
            </button>
            <button className="secondary-btn" onClick={handleClear}>
              清除
            </button>
          </div>

          {mode === MODES.PARSE && renderParseResult()}
          {mode === MODES.SINGLE && renderSingleResult()}
        </section>
      )}

      {mode === MODES.BATCH && (
        <section className="tool-section">
          <h2>批量输入</h2>
          
          <div className="options-panel">
            <div className="options-row">
              <div className="option-group">
                <label htmlFor="batch-target-notation">目标格式</label>
                <select
                  id="batch-target-notation"
                  value={targetNotation}
                  onChange={(e) => setTargetNotation(e.target.value)}
                >
                  {TARGET_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={failFast}
                    onChange={(e) => setFailFast(e.target.checked)}
                  />
                  遇到错误立即停止
                </label>
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="batch-input">每行一个颜色值</label>
            <textarea
              id="batch-input"
              className="batch-textarea"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="#ff0000
rgb(0, 255, 0)
hsl(240, 100%, 50%)
rgba(255, 128, 0, 0.5)
#00ffff80"
              rows={6}
            />
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleConvertBatch}
              disabled={!batchInput.trim()}
            >
              批量转换
            </button>
            <button className="secondary-btn" onClick={handleClear}>
              清除
            </button>
          </div>

          {renderBatchResult()}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li><strong>纯前端实现：</strong>所有处理均在浏览器本地执行，不向任何后端服务器发送数据。</li>
          <li><strong>支持格式：</strong>
            <ul>
              <li><strong>HEX:</strong> #fff, #ffffff, #ffff, #ffffffff</li>
              <li><strong>RGB/RGBA:</strong> rgb(255, 0, 0), rgba(255, 0, 0, 0.5)</li>
              <li><strong>HSL/HSLA:</strong> hsl(0, 100%, 50%), hsla(0, 100%, 50%, 0.5)</li>
            </ul>
          </li>
          <li><strong>解析校验：</strong>验证颜色格式是否有效，显示所有格式的标准化表示。</li>
          <li><strong>单值转换：</strong>将单个颜色值转换为指定目标格式。</li>
          <li><strong>批量转换：</strong>支持多行输入，每行一个颜色，可选择遇到错误是否立即停止。</li>
          <li><strong>错误处理：</strong>对非法颜色、越界值和批量失败项给出明确反馈。</li>
        </ul>
      </div>
    </div>
  )
}
