import { useCallback, useState } from 'react'
import {
  generateUUID,
  generateNILUUID,
  isValidUUID,
  parseUUID,
  formatUUID,
} from './uuidUtils'
import './UUIDTool.css'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const FORMAT_LABELS = [
  { key: 'standard', label: '标准格式', example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' },
  { key: 'noHyphens', label: '无分隔符', example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
  { key: 'upper', label: '大写', example: 'XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX' },
  { key: 'upperNoHyphens', label: '大写无分隔符', example: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
  { key: 'braced', label: '大括号', example: '{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}' },
  { key: 'bracedUpper', label: '大括号大写', example: '{XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX}' },
  { key: 'urn', label: 'URN', example: 'urn:uuid:xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' },
  { key: 'urnUpper', label: 'URN 大写', example: 'urn:uuid:XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX' },
]

export default function UUIDTool() {
  const [activeTab, setActiveTab] = useState('generate')
  const [generatedUUID, setGeneratedUUID] = useState(null)
  const [generatedFormats, setGeneratedFormats] = useState(null)
  const [parseInput, setParseInput] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)

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

  const handleGenerate = useCallback(() => {
    const uuid = generateUUID()
    const formats = formatUUID(uuid)
    setGeneratedUUID(uuid)
    setGeneratedFormats(formats)
    setGeneratedAt(Date.now())
  }, [])

  const handleGenerateNIL = useCallback(() => {
    const uuid = generateNILUUID()
    const formats = formatUUID(uuid)
    setGeneratedUUID(uuid)
    setGeneratedFormats(formats)
    setGeneratedAt(Date.now())
  }, [])

  const handleClearGenerate = useCallback(() => {
    setGeneratedUUID(null)
    setGeneratedFormats(null)
    setGeneratedAt(null)
  }, [])

  const handleParse = useCallback(() => {
    setParseError(null)
    setParseResult(null)

    if (!parseInput.trim()) {
      setParseError({ message: '请输入要解析的 UUID' })
      return
    }

    if (!isValidUUID(parseInput)) {
      setParseError({ message: '无效的 UUID 格式，请检查输入' })
      return
    }

    const parsed = parseUUID(parseInput)
    const formats = formatUUID(parseInput)

    setParseResult({
      parsed,
      formats,
    })
  }, [parseInput])

  const handleClearParse = useCallback(() => {
    setParseInput('')
    setParseResult(null)
    setParseError(null)
  }, [])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const renderFormatList = (formats, prefix) => {
    if (!formats) return null
    return (
      <div className="format-list">
        {FORMAT_LABELS.map(({ key, label }) => (
          <div key={key} className="format-item">
            <div className="format-item-header">
              <span className="format-label">{label}</span>
              <button
                className="copy-btn small"
                onClick={() => handleCopy(formats[key], label)}
              >
                复制
              </button>
            </div>
            <pre
              className="format-value"
              id={`${prefix}-${key}`}
              dangerouslySetInnerHTML={{ __html: escapeHtml(formats[key]) }}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="uuid-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          生成 UUID
        </button>
        <button
          className={`tab-btn ${activeTab === 'parse' ? 'active' : ''}`}
          onClick={() => setActiveTab('parse')}
        >
          解析 UUID
        </button>
      </div>

      {activeTab === 'generate' && (
        <section className="tool-section">
          <h2>生成随机 UUID</h2>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleGenerate}
            >
              生成新 UUID
            </button>
            <button
              className="secondary-btn"
              onClick={handleGenerateNIL}
            >
              生成 NIL（全零）
            </button>
            {generatedUUID && (
              <button
                className="secondary-btn"
                onClick={handleClearGenerate}
              >
                清除
              </button>
            )}
          </div>

          {generatedUUID && generatedFormats && (
            <>
              <div className="result-box">
                <div className="result-header">
                  <span className="result-label">生成结果</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(generatedUUID, 'UUID')}
                  >
                    复制
                  </button>
                </div>
                <pre
                  className="result-uuid"
                  dangerouslySetInnerHTML={{ __html: escapeHtml(generatedUUID) }}
                />
                <div className="result-meta">
                  <span dangerouslySetInnerHTML={{
                    __html: `生成时间：<code>${new Date(generatedAt).toLocaleString()}</code>`,
                  }} />
                </div>
              </div>

              <div className="formats-section">
                <h3>多种格式</h3>
                {renderFormatList(generatedFormats, 'gen')}
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'parse' && (
        <section className="tool-section">
          <h2>解析 UUID</h2>

          <div className="form-group full-width">
            <label htmlFor="parse-input">输入 UUID</label>
            <textarea
              id="parse-input"
              className="uuid-textarea"
              value={parseInput}
              onChange={(e) => setParseInput(e.target.value)}
              placeholder={
                '支持多种格式：\n' +
                '• 标准：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\n' +
                '• 无分隔符：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n' +
                '• 大括号：{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}\n' +
                '• URN：urn:uuid:xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
              }
              spellCheck={false}
            />
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleParse}
              disabled={!parseInput.trim()}
            >
              解析
            </button>
            <button
              className="secondary-btn"
              onClick={handleClearParse}
            >
              清除
            </button>
          </div>

          {renderErrorBox(parseError)}

          {parseResult && (
            <>
              <div className="parse-info-box">
                <h3>解析信息</h3>
                <div className="parse-grid">
                  <div className="parse-item">
                    <span className="parse-label">标准化格式</span>
                    <pre
                      className="parse-value"
                      dangerouslySetInnerHTML={{ __html: escapeHtml(parseResult.parsed.normalized) }}
                    />
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">版本</span>
                    <code className="parse-value">{parseResult.parsed.version}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">变体</span>
                    <code className="parse-value">{escapeHtml(parseResult.parsed.variant)}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">Time Low</span>
                    <code className="parse-value">{parseResult.parsed.timeLow}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">Time Mid</span>
                    <code className="parse-value">{parseResult.parsed.timeMid}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">Time Hi & Version</span>
                    <code className="parse-value">{parseResult.parsed.timeHiAndVersion}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">Clock Seq Hi & Reserved</span>
                    <code className="parse-value">{parseResult.parsed.clockSeqHiAndReserved}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">Clock Seq Low</span>
                    <code className="parse-value">{parseResult.parsed.clockSeqLow}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">Node</span>
                    <code className="parse-value">{parseResult.parsed.node}</code>
                  </div>
                  <div className="parse-item">
                    <span className="parse-label">无分隔符（hex）</span>
                    <pre
                      className="parse-value long"
                      dangerouslySetInnerHTML={{ __html: escapeHtml(parseResult.parsed.hex) }}
                    />
                  </div>
                </div>
              </div>

              <div className="formats-section">
                <h3>多种格式</h3>
                {renderFormatList(parseResult.formats, 'parse')}
              </div>
            </>
          )}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有操作均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>随机源：</strong>优先使用浏览器原生 <code>crypto.randomUUID()</code>（密码学安全），
            降级到 <code>Math.random()</code> 兼容旧浏览器。
          </li>
          <li>
            <strong>版本支持：</strong>本工具生成版本 4（随机）UUID；
            解析支持所有版本 UUID 的格式与结构分析。
          </li>
          <li>
            <strong>解析宽松度：</strong>支持多种输入格式，包括大小写混合、带/不带连字符、
            带/不带大括号、URN 格式等。
          </li>
          <li>
            <strong>NIL UUID：</strong>提供生成全零 UUID（<code>00000000-0000-0000-0000-000000000000</code>），
            用于占位或特殊场景。
          </li>
        </ul>
      </div>
    </div>
  )
}
