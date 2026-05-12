import { useCallback, useEffect, useRef, useState } from 'react'
import {
  validateJSON,
  formatJSONContent,
  minifyJSONContent,
  generateDiagnosticReport,
} from './logic/index.js'
import { EXAMPLES } from './logic/constants.js'
import {
  MAX_SAFE_INPUT_SIZE,
  MAX_NESTING_DEPTH,
  LARGE_TEXT_THRESHOLD,
  ERROR_CODES,
} from './logic/errors.js'
import './JsonSyntaxCheckTool.css'

const DEBOUNCE_DELAY = 250

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default function JsonSyntaxCheckTool() {
  const [inputText, setInputText] = useState('')
  const [validationResult, setValidationResult] = useState(null)
  const [previewMode, setPreviewMode] = useState('formatted')
  const [formattedText, setFormattedText] = useState(null)
  const [minifiedText, setMinifiedText] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const textareaRef = useRef(null)
  const debounceTimeoutRef = useRef(null)

  const runValidation = useCallback((text) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    const isLarge = text.length > LARGE_TEXT_THRESHOLD
    if (isLarge) {
      setIsProcessing(true)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const result = validateJSON(text)
      setValidationResult(result)

      if (result.valid) {
        const formatResult = formatJSONContent(text)
        const minifyResult = minifyJSONContent(text)
        setFormattedText(formatResult.formatted)
        setMinifiedText(minifyResult.minified)
      } else {
        setFormattedText(null)
        setMinifiedText(null)
      }

      setIsProcessing(false)
    }, isLarge ? 500 : DEBOUNCE_DELAY)
  }, [])

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value
    setInputText(newText)
    runValidation(newText)
  }, [runValidation])

  const handleApplyExample = useCallback((exampleText) => {
    setInputText(exampleText)
    runValidation(exampleText)
  }, [runValidation])

  const handleClear = useCallback(() => {
    setInputText('')
    setValidationResult(null)
    setFormattedText(null)
    setMinifiedText(null)
  }, [])

  const handleCopy = useCallback(async (content, label) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
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

  const handleJumpToError = useCallback(() => {
    if (!validationResult?.error?.details?.position || !textareaRef.current) return
    const { offset } = validationResult.error.details.position
    const textarea = textareaRef.current
    textarea.focus()
    textarea.setSelectionRange(offset, offset + 1)
    textarea.scrollTop = 0
    const lines = inputText.substring(0, offset).split('\n')
    const lineHeight = 20
    textarea.scrollTop = (lines.length - 5) * lineHeight
  }, [validationResult, inputText])

  const handleCopyDiagnostics = useCallback(() => {
    if (!validationResult) return
    const report = generateDiagnosticReport(validationResult)
    handleCopy(report, '诊断信息')
  }, [validationResult, handleCopy])

  const hasLargeInput = inputText.length > MAX_SAFE_INPUT_SIZE

  const renderErrorContext = (context) => {
    if (!context || !Array.isArray(context)) return null
    return (
      <div className="error-context">
        {context.map((line, idx) => (
          <div key={idx} className={line.isErrorLine ? 'error-line' : ''}>
            <span className="line-number">{String(line.lineNumber).padStart(3, ' ')}</span>
            <span dangerouslySetInnerHTML={{ __html: escapeHtml(line.content || '') }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="json-syntax-check">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>JSON 语法校验器</h2>

        <div className="standard-notice">
          <h4>⚠️ JSON 标准声明</h4>
          <ul>
            <li>本工具严格遵循 ECMA-404 / RFC 8259 JSON 标准，使用浏览器原生 <code>JSON.parse</code> 进行校验</li>
            <li><strong>不支持</strong>：单引号字符串、尾逗号（trailing comma）、注释（<code>//</code> 或 <code>/* */</code>）</li>
            <li>字符串必须使用双引号</li>
            <li>数值不支持前导零（如 <code>0123</code>）和八进制/十六进制字面量</li>
            <li>top-level 必须是 object、array、string、number、true、false 或 null</li>
          </ul>
        </div>

        <div className="form-group">
          <label>输入 JSON 文本</label>
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              value={inputText}
              onChange={handleTextChange}
              placeholder="在此粘贴或输入要校验的 JSON 文本..."
              spellCheck={false}
            />
          </div>
          <div className="meta-info">
            <span>字符数: {inputText.length}</span>
            {inputText.length > LARGE_TEXT_THRESHOLD && (
              <span style={{ color: '#f59e0b' }}>大体量文档，已启用节流模式</span>
            )}
          </div>
        </div>

        {hasLargeInput && (
          <div className="warning-banner">
            ⚠️ 输入文本过大（超过 10MB），可能导致性能问题
          </div>
        )}

        <div className="form-group">
          <label>示例数据</label>
          <div className="example-buttons">
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.VALID_OBJECT_ARRAY)}
            >
              ✅ 合法对象数组
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.ERROR_TRAILING_COMMA)}
            >
              ❌ 尾逗号错误
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.ERROR_MISSING_QUOTE)}
            >
              ❌ 缺引号错误
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.ERROR_SINGLE_QUOTE)}
            >
              ❌ 单引号错误
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.ERROR_UNTERMINATED_STRING)}
            >
              ❌ 未闭合字符串
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.ERROR_INVALID_NUMBER)}
            >
              ❌ 无效数字
            </button>
          </div>
        </div>

        <div className="action-row">
          <button className="secondary-btn" onClick={handleClear}>
            清空
          </button>
        </div>
      </section>

      {isProcessing && (
        <section className="tool-section">
          <div className="info-banner">
            ⏳ 正在处理大文档，请稍候...
          </div>
        </section>
      )}

      {validationResult && (
        <>
          {validationResult.valid && validationResult.result ? (
            <section className="tool-section">
              <div className="success-box">
                <h3>✅ JSON 语法合法</h3>
                <div className="meta-info">
                  <span>嵌套深度: {validationResult.result.depth}</span>
                  <span>字符数: {validationResult.result.characterCount}</span>
                </div>
              </div>

              <div className="form-group">
                <label>预览</label>
                <div className="mode-buttons">
                  <button
                    type="button"
                    className={`mode-btn ${previewMode === 'formatted' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('formatted')}
                  >
                    格式化
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${previewMode === 'minified' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('minified')}
                  >
                    紧凑
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      const content = previewMode === 'formatted' ? formattedText : minifiedText
                      handleCopy(content, previewMode === 'formatted' ? '格式化JSON' : '紧凑JSON')
                    }}
                  >
                    复制
                  </button>
                </div>
                <textarea
                  className="preview-textarea"
                  value={previewMode === 'formatted' ? (formattedText || '') : (minifiedText || '')}
                  readOnly
                  spellCheck={false}
                />
              </div>
            </section>
          ) : (
            <section className="tool-section">
              <div className="error-box">
                <h3>❌ JSON 语法错误</h3>
                <div className="error-code">
                  <span className="error-label">错误码</span>
                  <code>{validationResult.errorCode}</code>
                </div>
                <p>{validationResult.error?.message}</p>

                {validationResult.error?.details?.position && (
                  <>
                    <div className="error-position">
                      位置: 第 {validationResult.error.details.position.line} 行,
                      第 {validationResult.error.details.position.column} 列
                      (偏移 {validationResult.error.details.position.offset})
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={handleJumpToError}
                      >
                        跳转错误位置
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleCopyDiagnostics}
                      >
                        复制诊断信息
                      </button>
                    </div>

                    {validationResult.error.details.context && (
                      <div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
                          错误上下文 (高亮行为问题行):
                        </p>
                        {renderErrorContext(validationResult.error.details.context)}
                      </div>
                    )}
                  </>
                )}

                {validationResult.error?.details?.nativeMessage && (
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
                    原生错误信息: {validationResult.error.details.nativeMessage}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {!validationResult && (
        <section className="tool-section">
          <div className="empty-state">
            请输入或粘贴 JSON 文本开始校验
          </div>
        </section>
      )}

      <section className="notes-section">
        <h4>📖 算法说明与限制</h4>
        <ul>
          <li>
            <strong>校验方式：</strong>使用浏览器原生 <code>JSON.parse</code> 进行严格校验，
            解析成功即视为合法 JSON。
          </li>
          <li>
            <strong>错误定位：</strong>解析错误时优先从原生错误信息中提取位置（position/line），
            若不可用则进行启发式扫描定位。行号和列号基于 UTF-16 单元计算，与 textarea 行为一致。
          </li>
          <li>
            <strong>错误类型识别：</strong>根据错误信息和上下文自动识别常见错误，如尾逗号、
            单引号、未闭合字符串、无效数字等。
          </li>
          <li>
            <strong>大小限制：</strong>
            <ul>
              <li>超过 100KB：自动启用节流（500ms 延迟），避免频繁计算阻塞 UI</li>
              <li>超过 10MB：直接拒绝处理，给出 <code>INPUT_TOO_LARGE</code> 错误</li>
            </ul>
          </li>
          <li>
            <strong>深度限制：</strong>嵌套深度超过 1000 层时给出 <code>DEPTH_TOO_DEEP</code> 错误。
          </li>
          <li>
            <strong>空输入：</strong>空字符串或仅空白字符视为 <code>EMPTY_INPUT</code> 错误。
          </li>
          <li>
            <strong>防 XSS：</strong>所有输出均进行 HTML 转义，确保仅安全展示文本内容。
          </li>
          <li>
            <strong>错误码约定：</strong>
            <ul>
              <li><code>EMPTY_INPUT</code>：输入为空或仅空白字符</li>
              <li><code>INPUT_TOO_LARGE</code>：输入超过 10MB 安全上限</li>
              <li><code>DEPTH_TOO_DEEP</code>：嵌套深度超过 1000 层</li>
              <li><code>SYNTAX_ERROR</code>：JSON 语法错误</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  )
}
