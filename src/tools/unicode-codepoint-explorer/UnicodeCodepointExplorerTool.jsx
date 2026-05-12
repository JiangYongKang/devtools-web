import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { processText } from './logic/index.js'
import { getCategoryDescription } from './logic/statistics.js'
import './UnicodeCodepointExplorerTool.css'

const EXAMPLES = [
  {
    label: 'Emoji 组合',
    text: '👨‍👩‍👧‍👦 😀 🏳️‍🌈',
    description: '包含 Emoji 和 ZWJ 组合序列',
  },
  {
    label: '组合字符',
    text: 'à́ é̂ ï̈',
    description: '包含组合标记字符序列',
  },
  {
    label: '中英文混排',
    text: 'Hello World 你好世界 こんにちは',
    description: '包含 ASCII、CJK 和日文',
  },
  {
    label: 'RTL 文本',
    text: 'שלום עולם مرحبا بالعالم',
    description: '希伯来语和阿拉伯语 RTL 文本',
  },
  {
    label: '转义序列',
    text: '\\u0041 \\u0065 U+1F600 \\n',
    description: '包含 Unicode 转义和 U+ 表示法',
  },
  {
    label: '控制字符',
    text: 'A\tB\nC\rD',
    description: '包含制表符、换行符等控制字符',
  },
]

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

function isPrintableCharacter(codePoint) {
  if (codePoint >= 0x20 && codePoint <= 0x7E) return true
  if (codePoint >= 0xA0 && codePoint <= 0xD7FF) return true
  if (codePoint >= 0xE000 && codePoint <= 0xFFFD) return true
  if (codePoint >= 0x10000 && codePoint <= 0x10FFFF) return true
  return false
}

function formatGlyphForDisplay(scalar) {
  if (!scalar.glyphVisible) {
    return ''
  }
  if (!isPrintableCharacter(scalar.codePoint)) {
    return ''
  }
  if (scalar.isSurrogate) {
    return ''
  }
  return scalar.glyph
}

export default function UnicodeCodepointExplorerTool() {
  const [sourceText, setSourceText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [iterationIndex, setIterationIndex] = useState(-1)
  const [preferHexBytes, setPreferHexBytes] = useState(true)
  const [copyStatus, setCopyStatus] = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [showOnlyMatches, setShowOnlyMatches] = useState(false)
  
  const tableContainerRef = useRef(null)
  const rowRefs = useRef(new Map())
  
  const result = useMemo(() => {
    return processText({
      sourceText,
      searchQuery,
      preferHexBytes,
    })
  }, [sourceText, searchQuery, preferHexBytes])
  
  const {
    scalars = [],
    statistics,
    hydrationWarnings = [],
    errorCode,
    errorMessage,
    matches = [],
    matchCount = 0,
    codePointCount = 0,
  } = result
  
  const displayedScalars = useMemo(() => {
    if (!showOnlyMatches || matches.length === 0) {
      return scalars
    }
    return scalars.filter((_, idx) => matches.includes(idx))
  }, [scalars, matches, showOnlyMatches])
  
  const currentMatchIndex = useMemo(() => {
    if (iterationIndex < 0 || matches.length === 0) return -1
    const normalizedIndex = ((iterationIndex % matches.length) + matches.length) % matches.length
    return matches[normalizedIndex]
  }, [iterationIndex, matches])
  
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
    setSourceText(example.text)
    setIterationIndex(-1)
    setSelectedIndices(new Set())
  }, [])
  
  const handleClear = useCallback(() => {
    setSourceText('')
    setSearchQuery('')
    setIterationIndex(-1)
    setSelectedIndices(new Set())
    setShowOnlyMatches(false)
  }, [])
  
  const handleToggleSelect = useCallback((index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])
  
  const handleSelectAll = useCallback(() => {
    if (selectedIndices.size === displayedScalars.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(displayedScalars.map(s => s.index)))
    }
  }, [selectedIndices.size, displayedScalars])
  
  const handleCopySelected = useCallback(() => {
    if (selectedIndices.size === 0) return
    
    const selectedScalars = scalars.filter(s => selectedIndices.has(s.index))
    const lines = selectedScalars.map(s => 
      `${s.codePointHex}\t${s.glyph || '-'}\t${s.name || '-'}\t${s.category || '-'}\t${s.block || '-'}\tUTF-8: ${s.utf8Hex}\tUTF-16: ${s.utf16Hex}`
    )
    const text = lines.join('\n')
    handleCopy(text, `选中的 ${selectedIndices.size} 个码点`)
  }, [selectedIndices, scalars, handleCopy])
  
  const handleCopyAll = useCallback(() => {
    if (scalars.length === 0) return
    
    const lines = scalars.map(s => 
      `${s.codePointHex}\t${s.glyph || '-'}\t${s.name || '-'}\t${s.category || '-'}\t${s.block || '-'}\tUTF-8: ${s.utf8Hex}\tUTF-16: ${s.utf16Hex}`
    )
    const text = lines.join('\n')
    handleCopy(text, `全部 ${scalars.length} 个码点`)
  }, [scalars, handleCopy])
  
  const handleCopyScalar = useCallback((scalar) => {
    const text = `${scalar.codePointHex}\t${scalar.glyph || '-'}\t${scalar.name || '-'}\t${scalar.category || '-'}\t${scalar.block || '-'}\tUTF-8: ${scalar.utf8Hex}\tUTF-16: ${scalar.utf16Hex}`
    handleCopy(text, `码点 ${scalar.codePointHex}`)
  }, [handleCopy])
  
  const handleNextMatch = useCallback(() => {
    if (matches.length === 0) return
    const nextIndex = iterationIndex < 0 ? 0 : iterationIndex + 1
    setIterationIndex(nextIndex)
  }, [matches.length, iterationIndex])
  
  const handlePrevMatch = useCallback(() => {
    if (matches.length === 0) return
    const prevIndex = iterationIndex <= 0 ? matches.length - 1 : iterationIndex - 1
    setIterationIndex(prevIndex)
  }, [matches.length, iterationIndex])
  
  useEffect(() => {
    if (currentMatchIndex >= 0 && rowRefs.current.has(currentMatchIndex)) {
      const row = rowRefs.current.get(currentMatchIndex)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentMatchIndex])
  
  const renderErrorBox = () => {
    if (!errorCode) return null
    return (
      <div className="error-box">
        <div className="error-code">
          <span className="error-label">错误码</span>
          <code>{escapeHtml(errorCode)}</code>
        </div>
        <p>{escapeHtml(errorMessage)}</p>
      </div>
    )
  }
  
  const renderWarnings = () => {
    if (hydrationWarnings.length === 0) return null
    return (
      <div className="warnings-box">
        <strong>警告：</strong>
        {hydrationWarnings.map((w, idx) => (
          <span key={idx} className="warning-item">
            {idx > 0 && <span className="warning-sep">| </span>}
            {escapeHtml(w)}
          </span>
        ))}
      </div>
    )
  }
  
  const renderStatistics = () => {
    if (!statistics) return null
    return (
      <div className="statistics-section">
        <h3>统计摘要</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">总码点数</span>
            <span className="stat-value">{statistics.totalCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">ASCII</span>
            <span className="stat-value">{statistics.asciiCount} ({statistics.asciiPercentage}%)</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">非 ASCII</span>
            <span className="stat-value">{statistics.nonAsciiCount} ({statistics.nonAsciiPercentage}%)</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">BMP</span>
            <span className="stat-value">{statistics.bmpCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">补充平面</span>
            <span className="stat-value">{statistics.supplementaryCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">代理项</span>
            <span className="stat-value">{statistics.surrogateCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">可打印</span>
            <span className="stat-value">{statistics.printableCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">控制字符</span>
            <span className="stat-value">{statistics.controlCount}</span>
          </div>
        </div>
        
        {statistics.topCategories.length > 0 && (
          <div className="stats-subsection">
            <h4>主要类别分布</h4>
            <div className="category-list">
              {statistics.topCategories.map((cat, idx) => (
                <span key={idx} className="category-badge">
                  <code>{escapeHtml(cat.category)}</code>
                  <span className="category-desc">{escapeHtml(cat.description)}</span>
                  <span className="category-count">{cat.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        
        {statistics.topBlocks.length > 0 && (
          <div className="stats-subsection">
            <h4>主要区块分布</h4>
            <div className="block-list">
              {statistics.topBlocks.map((block, idx) => (
                <span key={idx} className="block-badge">
                  {escapeHtml(block.block)}
                  <span className="block-count">{block.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  const renderTableRow = (scalar) => {
    const isMatch = matches.includes(scalar.index)
    const isCurrentMatch = currentMatchIndex === scalar.index
    const isSelected = selectedIndices.has(scalar.index)
    const glyph = formatGlyphForDisplay(scalar)
    
    return (
      <tr
        key={scalar.index}
        ref={el => rowRefs.current.set(scalar.index, el)}
        className={`codepoint-row ${isMatch ? 'match' : ''} ${isCurrentMatch ? 'current-match' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => handleToggleSelect(scalar.index)}
      >
        <td className="row-checkbox" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelect(scalar.index)}
          />
        </td>
        <td className="col-index">{scalar.index + 1}</td>
        <td className="col-glyph">
          <span className="glyph-display" title={escapeHtml(scalar.glyph || scalar.name || '')}>
            {glyph || <span className="glyph-placeholder">�</span>}
          </span>
        </td>
        <td className="col-codepoint">
          <code>{scalar.codePointHex}</code>
          <span className="codepoint-dec">({scalar.codePoint})</span>
        </td>
        <td className="col-name">{escapeHtml(scalar.name || '-')}</td>
        <td className="col-category">
          {scalar.category ? (
            <span className="category-tag" title={escapeHtml(getCategoryDescription(scalar.category))}>
              {escapeHtml(scalar.category)}
            </span>
          ) : '-'}
        </td>
        <td className="col-block">{escapeHtml(scalar.block || '-')}</td>
        <td className="col-utf8">
          <code className="hex-bytes">{scalar.utf8Hex}</code>
          <span className="byte-count">({scalar.utf8ByteCount}B)</span>
        </td>
        <td className="col-utf16">
          <code className="hex-bytes">{scalar.utf16Hex}</code>
          <span className="unit-count">({scalar.utf16UnitCount})</span>
        </td>
        <td className="col-bmp">
          <span className={`bmp-badge ${scalar.isInBMP ? 'in-bmp' : 'out-bmp'}`}>
            {scalar.isInBMP ? 'BMP' : 'Supp'}
          </span>
          {scalar.isSurrogate && <span className="surrogate-badge">Surrogate</span>}
          {scalar.utf16UnitCount > 1 && <span className="surrogate-pair-badge">代理对</span>}
        </td>
        <td className="col-actions" onClick={e => e.stopPropagation()}>
          <button
            className="copy-btn small"
            onClick={() => handleCopyScalar(scalar)}
            title="复制此码点信息"
          >
            复制
          </button>
        </td>
      </tr>
    )
  }
  
  return (
    <div className="unicode-codepoint-explorer">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}
      
      <section className="tool-section">
        <h2>Unicode 码点探索器</h2>
        
        <div className="examples-section">
          <label>示例</label>
          <div className="example-buttons">
            {EXAMPLES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                className="example-btn"
                onClick={() => handleLoadExample(example)}
                title={example.description}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="form-group full-width">
          <label htmlFor="source-text">输入文本</label>
          <textarea
            id="source-text"
            className="source-textarea"
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value)
              setIterationIndex(-1)
            }}
            placeholder={
              '输入要解析的文本，支持：\n' +
              '• 普通字符或短文\n' +
              '• Unicode 转义：\\u0041, \\U0001F600, \\x41\n' +
              '• 码点表示：U+1F600, U+41\n' +
              '• 其他转义：\\n, \\t, \\r'
            }
            spellCheck={false}
          />
          <div className="input-hint">
            输入将以纯文本方式处理，自动解析转义序列和码点表示法
          </div>
        </div>
        
        <div className="search-section">
          <div className="form-group">
            <label htmlFor="search-query">搜索</label>
            <input
              id="search-query"
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIterationIndex(-1)
              }}
              placeholder="搜索码点、名称、区块、类别..."
            />
          </div>
          
          <div className="search-controls">
            <button
              type="button"
              className="secondary-btn small"
              onClick={handlePrevMatch}
              disabled={matches.length === 0}
              title="上一个匹配"
            >
              ← 上一个
            </button>
            <span className="match-count">
              {matches.length > 0 
                ? `匹配 ${(iterationIndex < 0 ? 0 : (iterationIndex % matches.length) + 1)} / ${matches.length}`
                : '无匹配'}
            </span>
            <button
              type="button"
              className="secondary-btn small"
              onClick={handleNextMatch}
              disabled={matches.length === 0}
              title="下一个匹配"
            >
              下一个 →
            </button>
            {matches.length > 0 && (
              <label className="show-only-matches-label">
                <input
                  type="checkbox"
                  checked={showOnlyMatches}
                  onChange={(e) => setShowOnlyMatches(e.target.checked)}
                />
                仅显示匹配
              </label>
            )}
          </div>
        </div>
        
        <div className="options-section">
          <label className="option-item">
            <input
              type="checkbox"
              checked={preferHexBytes}
              onChange={(e) => setPreferHexBytes(e.target.checked)}
            />
            <span>十六进制字节显示</span>
          </label>
        </div>
        
        <div className="action-row">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleClear}
          >
            清除
          </button>
          {scalars.length > 0 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleSelectAll}
            >
              {selectedIndices.size === scalars.length ? '取消全选' : '全选'}
            </button>
          )}
          {selectedIndices.size > 0 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleCopySelected}
            >
              复制选中 ({selectedIndices.size})
            </button>
          )}
          {scalars.length > 0 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleCopyAll}
            >
              复制全部 ({scalars.length})
            </button>
          )}
        </div>
        
        {renderErrorBox()}
        {renderWarnings()}
      </section>
      
      {scalars.length > 0 && (
        <>
          {renderStatistics()}
          
          <section className="tool-section table-section">
            <div className="table-header">
              <h3>码点详情</h3>
            </div>
            
            <div className="table-container" ref={tableContainerRef}>
              <table className="codepoint-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIndices.size === displayedScalars.length && displayedScalars.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="col-index">#</th>
                    <th className="col-glyph">字符</th>
                    <th className="col-codepoint">码点</th>
                    <th className="col-name">名称</th>
                    <th className="col-category">类别</th>
                    <th className="col-block">区块</th>
                    <th className="col-utf8">UTF-8</th>
                    <th className="col-utf16">UTF-16</th>
                    <th className="col-bmp">平面</th>
                    <th className="col-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedScalars.map(scalar => renderTableRow(scalar))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      
      {codePointCount === 0 && sourceText.length > 0 && !errorCode && (
        <div className="empty-state">
          <p>解析完成，但未产生有效码点</p>
        </div>
      )}
      
      {sourceText.length === 0 && (
        <div className="empty-state">
          <p>请输入文本或点击上方示例开始探索</p>
        </div>
      )}
      
      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解析和编码转换均在浏览器本地执行，不发送任何数据到服务器。
          </li>
          <li>
            <strong>支持的输入格式：</strong>
            <ul>
              <li>普通字符和多语言文本</li>
              <li>Unicode 转义序列：<code>\\uXXXX</code>（4位）、<code>\\UXXXXXXXX</code>（8位）</li>
              <li>码点表示法：<code>U+XXXX</code>、<code>U+XXXXX</code></li>
              <li>其他转义：<code>\\n</code>、<code>\\t</code>、<code>\\r</code>、<code>\\xXX</code>、八进制等</li>
            </ul>
          </li>
          <li>
            <strong>搜索功能：</strong>支持按码点（如 U+41）、十进制值（如 65）、名称、区块、类别搜索。
          </li>
          <li>
            <strong>代理对处理：</strong>自动识别并正确解析 UTF-16 代理对（emoji 等补充平面字符）。
          </li>
          <li>
            <strong>组合字符：</strong>支持组合标记序列，每个组合标记作为独立码点展示。
          </li>
          <li>
            <strong>字符属性：</strong>提供区块推断和类别推断，未知字符稳定降级显示。
          </li>
        </ul>
      </div>
    </div>
  )
}
