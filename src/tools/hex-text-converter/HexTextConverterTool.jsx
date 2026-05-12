import { useCallback, useEffect, useState, useRef } from 'react'
import {
  hexToText,
  textToHex,
  getHexStats,
  getTextStats,
  MAX_INPUT_SIZE,
} from './logic/converter.js'
import './HexTextConverterTool.css'

const EXAMPLES = {
  ascii: {
    mode: 'hexToText',
    hex: '48656c6c6f20576f726c64',
    text: 'Hello World',
    label: 'ASCII 示例',
  },
  utf8Chinese: {
    mode: 'hexToText',
    hex: 'e4bda0e5a5bde4b896e7958c',
    text: '你好世界',
    label: '含中文 UTF-8',
  },
  withSeparator: {
    mode: 'hexToText',
    hex: '48 65 6C 6C 6F 20 57 6F 72 6C 64',
    text: 'Hello World',
    label: '带空格分隔符',
    separator: 'space',
  },
  invalidChars: {
    mode: 'hexToText',
    hex: '48656c6c6f20Xyz56f726c64',
    text: '',
    label: '非法字符示例',
  },
  oddLength: {
    mode: 'hexToText',
    hex: '48656c6c6f20576f726c',
    text: '',
    label: '奇数长度示例',
  },
  invalidUtf8: {
    mode: 'hexToText',
    hex: 'c328',
    text: '',
    label: '无效 UTF-8 序列',
  },
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function HexTextConverterTool() {
  const [activeTab, setActiveTab] = useState('hexToText')
  
  const [hexInput, setHexInput] = useState('')
  const [textInput, setTextInput] = useState('')
  
  const [hexSeparator, setHexSeparator] = useState('none')
  const [utf8Mode, setUtf8Mode] = useState('strict')
  const [showLatin1, setShowLatin1] = useState(false)
  
  const [textSeparator, setTextSeparator] = useState('none')
  const [outputUpperCase, setOutputUpperCase] = useState(false)
  
  const [hexResult, setHexResult] = useState(null)
  const [textResult, setTextResult] = useState(null)
  
  const [hexStats, setHexStats] = useState({ rawLength: 0, cleanLength: 0, byteCount: 0, invalidCharCount: 0, hasInvalidChars: false, isOddLength: false })
  const [textStats, setTextStats] = useState({ charCount: 0, byteCount: 0 })
  
  const [copyStatus, setCopyStatus] = useState(null)
  
  const debounceRef = useRef(null)

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

  const convertHexToText = useCallback(() => {
    if (!hexInput.trim()) {
      setHexResult(null)
      return
    }
    
    const result = hexToText({
      hex: hexInput,
      separator: hexSeparator,
      utf8Mode,
      showLatin1,
    })
    
    setHexResult(result)
  }, [hexInput, hexSeparator, utf8Mode, showLatin1])

  const convertTextToHex = useCallback(() => {
    const result = textToHex({
      text: textInput,
      separator: textSeparator,
      upperCase: outputUpperCase,
    })
    
    setTextResult(result)
  }, [textInput, textSeparator, outputUpperCase])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      if (activeTab === 'hexToText') {
        convertHexToText()
      } else {
        convertTextToHex()
      }
    }, 150)
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [activeTab, hexInput, textInput, hexSeparator, textSeparator, utf8Mode, showLatin1, outputUpperCase, convertHexToText, convertTextToHex])

  useEffect(() => {
    setHexStats(getHexStats(hexInput, hexSeparator))
  }, [hexInput, hexSeparator])

  useEffect(() => {
    setTextStats(getTextStats(textInput))
  }, [textInput])

  const handleLoadExample = useCallback((exampleKey) => {
    const example = EXAMPLES[exampleKey]
    if (!example) return
    
    setActiveTab(example.mode)
    if (example.mode === 'hexToText') {
      setHexInput(example.hex)
      setTextInput('')
      if (example.separator) {
        setHexSeparator(example.separator)
      }
    } else {
      setTextInput(example.text)
      setHexInput('')
    }
  }, [])

  const handleClearHex = useCallback(() => {
    setHexInput('')
    setHexResult(null)
  }, [])

  const handleClearText = useCallback(() => {
    setTextInput('')
    setTextResult(null)
  }, [])

  const handleSwap = useCallback(() => {
    if (activeTab === 'hexToText') {
      if (hexResult && hexResult.text) {
        setTextInput(hexResult.text)
      }
      setActiveTab('textToHex')
    } else {
      if (textResult && textResult.hex) {
        setHexInput(textResult.hex)
      }
      setActiveTab('hexToText')
    }
  }, [activeTab, hexResult, textResult])

  const renderError = (result) => {
    if (!result || result.errorCode === null) return null
    
    return (
      <div className="error-box">
        <strong>转换失败</strong>
        <p>{result.errorMessage}</p>
        <div className="error-code">错误码：{result.errorCode}</div>
        {result.context?.invalidChars && result.context.invalidChars.length > 0 && (
          <div className="error-details">
            <p>非法字符位置：</p>
            <code>
              {result.context.invalidChars.slice(0, 5).map((c, i) => (
                <span key={i} className="error-char">
                  位置 {c.displayPosition}: '{c.char}'
                </span>
              ))}
              {result.context.invalidChars.length > 5 && (
                <span>... 共 {result.context.invalidChars.length} 处</span>
              )}
            </code>
          </div>
        )}
      </div>
    )
  }

  const renderHexToTextResult = () => {
    if (!hexResult) return null
    
    if (!hexResult.success) {
      return renderError(hexResult)
    }
    
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">解码结果（UTF-8）</span>
          <button
            className="copy-btn"
            onClick={() => handleCopy(hexResult.text, '解码结果')}
          >
            复制
          </button>
        </div>
        <pre className="result-value">{hexResult.text}</pre>
        <div className="result-info">
          <div className="info-item">
            <span className="info-label">字节数</span>
            <code>{hexResult.byteCount}</code>
          </div>
          <div className="info-item">
            <span className="info-label">十六进制长度</span>
            <code>{hexResult.hexLength} 字符</code>
          </div>
          {hexResult.hadUtf8Error && (
            <div className="info-item warning">
              <span className="info-label">UTF-8 警告</span>
              <code>包含替代字符（�）</code>
            </div>
          )}
        </div>
        
        {hexResult.latin1View && (
          <>
            <div className="result-divider" />
            <div className="result-header">
              <span className="result-label">Latin-1 视图对照</span>
            </div>
            <pre className="result-value secondary">{hexResult.latin1View}</pre>
          </>
        )}
      </div>
    )
  }

  const renderTextToHexResult = () => {
    if (!textResult) return null
    
    if (!textResult.success) {
      return renderError(textResult)
    }
    
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">编码结果</span>
          <button
            className="copy-btn"
            onClick={() => handleCopy(textResult.hex, '编码结果')}
          >
            复制
          </button>
        </div>
        <pre className="result-value">{textResult.hex}</pre>
        <div className="result-info">
          <div className="info-item">
            <span className="info-label">字符数</span>
            <code>{textResult.charCount}</code>
          </div>
          <div className="info-item">
            <span className="info-label">字节数</span>
            <code>{textResult.byteCount}</code>
          </div>
          <div className="info-item">
            <span className="info-label">十六进制长度</span>
            <code>{textResult.hex.length} 字符</code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hex-text-converter">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'hexToText' ? 'active' : ''}`}
          onClick={() => setActiveTab('hexToText')}
        >
          十六进制 → 文本
        </button>
        <button
          className={`tab-btn ${activeTab === 'textToHex' ? 'active' : ''}`}
          onClick={() => setActiveTab('textToHex')}
        >
          文本 → 十六进制
        </button>
      </div>

      <div className="examples-section">
        <h3>示例</h3>
        <div className="examples-grid">
          {Object.entries(EXAMPLES).map(([key, example]) => (
            <button
              key={key}
              className="example-btn"
              onClick={() => handleLoadExample(key)}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'hexToText' && (
        <section className="tool-section">
          <h2>十六进制解码为文本</h2>
          
          <div className="form-group full-width">
            <label htmlFor="hex-input">输入十六进制串</label>
            <textarea
              id="hex-input"
              className="input-textarea"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="例如：48656c6c6f20576f726c64"
              spellCheck={false}
            />
            <div className="input-stats">
              <span>原始长度：{hexStats.rawLength} 字符</span>
              <span>有效十六进制：{hexStats.cleanLength} 字符</span>
              <span>字节数：{Math.floor(hexStats.byteCount)}</span>
              {hexStats.hasInvalidChars && (
                <span className="warning-text">非法字符：{hexStats.invalidCharCount} 处</span>
              )}
              {hexStats.isOddLength && (
                <span className="warning-text">长度为奇数</span>
              )}
            </div>
          </div>

          <div className="options-section">
            <h3>解码选项</h3>
            <div className="options-grid">
              <div className="option-item option-input">
                <label htmlFor="hex-separator">输入分隔符</label>
                <select
                  id="hex-separator"
                  value={hexSeparator}
                  onChange={(e) => setHexSeparator(e.target.value)}
                >
                  <option value="none">无空格</option>
                  <option value="space">空格</option>
                  <option value="colon">冒号</option>
                </select>
              </div>
              
              <div className="option-item option-input">
                <label htmlFor="utf8-mode">UTF-8 策略</label>
                <select
                  id="utf8-mode"
                  value={utf8Mode}
                  onChange={(e) => setUtf8Mode(e.target.value)}
                >
                  <option value="strict">严格模式（失败时报错）</option>
                  <option value="replace">替换模式（用 � 替代）</option>
                </select>
              </div>
              
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={showLatin1}
                  onChange={(e) => setShowLatin1(e.target.checked)}
                />
                <span>显示 Latin-1 视图</span>
              </label>
            </div>
          </div>

          <div className="action-row">
            <button
              className="secondary-btn"
              onClick={handleSwap}
            >
              ⇄ 交换
            </button>
            <button
              className="secondary-btn"
              onClick={handleClearHex}
            >
              清空
            </button>
          </div>

          {renderHexToTextResult()}
        </section>
      )}

      {activeTab === 'textToHex' && (
        <section className="tool-section">
          <h2>文本编码为十六进制</h2>
          
          <div className="form-group full-width">
            <label htmlFor="text-input">输入文本</label>
            <textarea
              id="text-input"
              className="input-textarea"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="例如：Hello World"
              spellCheck={false}
            />
            <div className="input-stats">
              <span>字符数：{textStats.charCount}</span>
              <span>UTF-8 字节数：{textStats.byteCount}</span>
            </div>
          </div>

          <div className="options-section">
            <h3>编码选项</h3>
            <div className="options-grid">
              <div className="option-item option-input">
                <label htmlFor="text-separator">输出分隔符</label>
                <select
                  id="text-separator"
                  value={textSeparator}
                  onChange={(e) => setTextSeparator(e.target.value)}
                >
                  <option value="none">无空格</option>
                  <option value="space">空格</option>
                  <option value="colon">冒号</option>
                </select>
              </div>
              
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={outputUpperCase}
                  onChange={(e) => setOutputUpperCase(e.target.checked)}
                />
                <span>输出大写</span>
              </label>
            </div>
          </div>

          <div className="action-row">
            <button
              className="secondary-btn"
              onClick={handleSwap}
            >
              ⇄ 交换
            </button>
            <button
              className="secondary-btn"
              onClick={handleClearText}
            >
              清空
            </button>
          </div>

          {renderTextToHexResult()}
        </section>
      )}

      <div className="notes-section">
        <h3>使用说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有编解码均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>十六进制格式：</strong>
            <ul>
              <li>支持 0-9、a-f、A-F 字符</li>
              <li>可选输入分隔符：无空格、空格、冒号</li>
              <li>奇数长度会明确报错，不会静默截断</li>
            </ul>
          </li>
          <li>
            <strong>文本编码：</strong>
            <ul>
              <li>默认使用 UTF-8 字节语义</li>
              <li>可选择 Latin-1 视图对照</li>
              <li>UTF-8 解码支持严格模式和替换模式</li>
            </ul>
          </li>
          <li>
            <strong>体量限制：</strong>单页输入上限为 {formatSize(MAX_INPUT_SIZE)}，超限时会明确报错，不会静默损坏二进制语义。
          </li>
          <li>
            <strong>大体量处理：</strong>采用输入节流策略（150ms 延迟），避免频繁计算阻塞 UI。
          </li>
          <li>
            <strong>错误处理：</strong>
            <ul>
              <li>空输入：<code>EMPTY_VALUE</code></li>
              <li>非法字符：<code>INVALID_HEX_CHAR</code>（含位置信息）</li>
              <li>奇数长度：<code>ODD_LENGTH</code></li>
              <li>无效 UTF-8：<code>INVALID_UTF8</code></li>
              <li>体量超限：<code>INPUT_TOO_LARGE</code></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  )
}
