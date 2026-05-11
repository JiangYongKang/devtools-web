import { useCallback, useState } from 'react'
import { jsonToYaml, yamlToJson } from './logic/converter.js'
import {
  INDENT_STYLES,
  INDENT_WIDTHS,
  QUOTE_STYLES,
  INLINE_STYLES,
  KEY_ORDERS,
  DEFAULT_MAX_NESTING_DEPTH,
  formatBytes,
  formatErrorLocation,
  escapeHtml,
} from './logic/index.js'
import './YamlJsonTool.css'

const DIRECTIONS = {
  JSON_TO_YAML: 'jsonToYaml',
  YAML_TO_JSON: 'yamlToJson',
}

const INDENT_STYLE_OPTIONS = INDENT_STYLES.map(s => ({
  id: s,
  name: s === 'tab' ? 'Tab' : '空格',
}))

const INDENT_WIDTH_OPTIONS = INDENT_WIDTHS.map(w => ({
  id: String(w),
  name: `${w} 空格`,
}))

const QUOTE_STYLE_OPTIONS = [
  { id: 'none', name: '自动' },
  { id: 'single', name: '单引号' },
  { id: 'double', name: '双引号' },
]

const INLINE_STYLE_OPTIONS = [
  { id: 'min', name: '简洁' },
  { id: 'standard', name: '标准' },
  { id: 'max', name: '展开' },
]

const KEY_ORDER_OPTIONS = [
  { id: 'preserve', name: '保持原有顺序' },
  { id: 'alphabetical', name: '按字母排序' },
]

const SAMPLE_JSON = `{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "isActive": true,
  "tags": ["developer", "designer"],
  "address": {
    "city": "Beijing",
    "country": "China"
  }
}`

const SAMPLE_YAML = `name: John Doe
age: 30
email: john@example.com
isActive: true
tags:
  - developer
  - designer
address:
  city: Beijing
  country: China`

export default function YamlJsonTool() {
  const [direction, setDirection] = useState(DIRECTIONS.JSON_TO_YAML)
  const [input, setInput] = useState(SAMPLE_JSON)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

  const [indentStyle, setIndentStyle] = useState('space')
  const [indentWidth, setIndentWidth] = useState(2)
  const [quoteStyle, setQuoteStyle] = useState('none')
  const [inlineStyle, setInlineStyle] = useState('standard')
  const [keyOrder, setKeyOrder] = useState('preserve')
  const [maxNestingDepth, setMaxNestingDepth] = useState(DEFAULT_MAX_NESTING_DEPTH)

  const handleDirectionChange = useCallback((newDirection) => {
    setDirection(newDirection)
    if (result?.success) {
      setInput(result.output)
    } else if (newDirection === DIRECTIONS.JSON_TO_YAML) {
      setInput(SAMPLE_JSON)
    } else {
      setInput(SAMPLE_YAML)
    }
    setResult(null)
    setError(null)
  }, [result])

  const handleConvert = useCallback(() => {
    const options = {
      indentStyle,
      indentWidth,
      quoteStyle,
      inlineStyle,
      keyOrder,
      maxNestingDepth,
    }

    let conversionResult
    if (direction === DIRECTIONS.JSON_TO_YAML) {
      conversionResult = jsonToYaml(input, options)
    } else {
      conversionResult = yamlToJson(input, options)
    }

    if (conversionResult.success) {
      setResult(conversionResult)
      setError(null)
    } else {
      setError(conversionResult)
      setResult(null)
    }
  }, [input, direction, indentStyle, indentWidth, quoteStyle, inlineStyle, keyOrder, maxNestingDepth])

  const handleClear = useCallback(() => {
    setInput('')
    setResult(null)
    setError(null)
  }, [])

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

  const handleSwap = useCallback(() => {
    const newDirection = direction === DIRECTIONS.JSON_TO_YAML
      ? DIRECTIONS.YAML_TO_JSON
      : DIRECTIONS.JSON_TO_YAML
    handleDirectionChange(newDirection)
  }, [direction, handleDirectionChange])

  const inputLabel = direction === DIRECTIONS.JSON_TO_YAML ? 'JSON 输入' : 'YAML 输入'
  const outputLabel = direction === DIRECTIONS.JSON_TO_YAML ? 'YAML 输出' : 'JSON 输出'

  return (
    <div className="yaml-json-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>转换方向</h2>
        <div className="direction-switch">
          <button
            className={`direction-btn ${direction === DIRECTIONS.JSON_TO_YAML ? 'active' : ''}`}
            onClick={() => handleDirectionChange(DIRECTIONS.JSON_TO_YAML)}
          >
            JSON → YAML
          </button>
          <button className="swap-btn" onClick={handleSwap} title="交换方向">
            ⇄
          </button>
          <button
            className={`direction-btn ${direction === DIRECTIONS.YAML_TO_JSON ? 'active' : ''}`}
            onClick={() => handleDirectionChange(DIRECTIONS.YAML_TO_JSON)}
          >
            YAML → JSON
          </button>
        </div>
      </section>

      <section className="tool-section">
        <h2>转换参数</h2>
        <div className="options-panel">
          <div className="options-row">
            <div className="option-group">
              <label htmlFor="indent-style">缩进风格</label>
              <select
                id="indent-style"
                value={indentStyle}
                onChange={(e) => setIndentStyle(e.target.value)}
              >
                {INDENT_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            {indentStyle === 'space' && (
              <div className="option-group">
                <label htmlFor="indent-width">缩进宽度</label>
                <select
                  id="indent-width"
                  value={String(indentWidth)}
                  onChange={(e) => setIndentWidth(parseInt(e.target.value, 10))}
                >
                  {INDENT_WIDTH_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="option-group">
              <label htmlFor="quote-style">引号风格</label>
              <select
                id="quote-style"
                value={quoteStyle}
                onChange={(e) => setQuoteStyle(e.target.value)}
              >
                {QUOTE_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            <div className="option-group">
              <label htmlFor="inline-style">行内风格</label>
              <select
                id="inline-style"
                value={inlineStyle}
                onChange={(e) => setInlineStyle(e.target.value)}
              >
                {INLINE_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            <div className="option-group">
              <label htmlFor="key-order">键顺序</label>
              <select
                id="key-order"
                value={keyOrder}
                onChange={(e) => setKeyOrder(e.target.value)}
              >
                {KEY_ORDER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            <div className="option-group">
              <label htmlFor="max-depth">最大嵌套深度</label>
              <input
                id="max-depth"
                type="number"
                min="1"
                max="1000"
                value={maxNestingDepth}
                onChange={(e) => setMaxNestingDepth(parseInt(e.target.value, 10) || DEFAULT_MAX_NESTING_DEPTH)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="tool-section two-column">
        <div className="column">
          <div className="column-header">
            <h3>{inputLabel}</h3>
          </div>
          <textarea
            className="code-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`输入 ${direction === DIRECTIONS.JSON_TO_YAML ? 'JSON' : 'YAML'} 内容...`}
            spellCheck={false}
          />
        </div>

        <div className="column">
          <div className="column-header">
            <h3>{outputLabel}</h3>
            {result?.success && (
              <button
                className="copy-btn"
                onClick={() => handleCopy(result.output, outputLabel)}
              >
                复制
              </button>
            )}
          </div>
          {result?.success ? (
            <pre
              className="code-output"
              dangerouslySetInnerHTML={{ __html: escapeHtml(result.output) }}
            />
          ) : (
            <div className="placeholder-output">
              <span>转换结果将显示在这里</span>
            </div>
          )}
        </div>
      </section>

      <div className="action-row">
        <button
          className="primary-btn"
          onClick={handleConvert}
          disabled={!input.trim()}
        >
          转换
        </button>
        <button className="secondary-btn" onClick={handleClear}>
          清除
        </button>
      </div>

      {result?.success && (
        <section className="tool-section stats-section">
          <h2>处理统计</h2>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">输出字节数</span>
              <span className="stat-value">{formatBytes(result.processedBytes)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">嵌套深度</span>
              <span className="stat-value">{result.nestingDepth}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">版本</span>
              <span className="stat-value">{result.version}</span>
            </div>
          </div>
        </section>
      )}

      {error && (
        <section className="tool-section error-section">
          <h2>转换错误</h2>
          <div className="error-box">
            <div className="error-header">
              <strong className="error-code" dangerouslySetInnerHTML={{ __html: escapeHtml(error.errorCode) }} />
              <span className="error-message" dangerouslySetInnerHTML={{ __html: escapeHtml(error.errorMessage) }} />
            </div>
            {formatErrorLocation(error) && (
              <div className="error-location">
                <span className="location-label">位置：</span>
                <span className="location-value" dangerouslySetInnerHTML={{ __html: escapeHtml(formatErrorLocation(error)) }} />
              </div>
            )}
            {error.line !== null && error.line !== undefined && (
              <div className="error-snippet">
                <span className="snippet-label">提示：</span>
                <span className="snippet-value">
                  请检查第 {error.line} 行附近的语法是否正确
                  {error.column !== null && error.column !== undefined && `（第 ${error.column} 列）`}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li><strong>纯前端实现：</strong>所有处理均在浏览器本地执行，不向任何后端服务器发送数据。</li>
          <li><strong>双向转换：</strong>支持 JSON → YAML 和 YAML → JSON 双向转换，可随时切换方向。</li>
          <li><strong>参数配置：</strong>
            <ul>
              <li><strong>缩进风格：</strong>可选择空格或 Tab 缩进，空格模式下可配置 2/4/8 空格宽度。</li>
              <li><strong>引号风格：</strong>自动根据内容选择引号，或强制使用单引号/双引号。</li>
              <li><strong>键顺序：</strong>保持原有顺序或按字母排序输出。</li>
            </ul>
          </li>
          <li><strong>错误定位：</strong>解析失败时会显示错误代码、消息以及具体的行列位置，帮助快速定位问题。</li>
          <li><strong>安全限制：</strong>最大支持 1MB 输入内容，嵌套深度可配置。</li>
        </ul>
      </div>
    </div>
  )
}
