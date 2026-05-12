import { useCallback, useEffect, useRef, useState } from 'react'
import { processGitignorePatterns } from './logic/index.js'
import {
  EXAMPLE_CASES,
  MAX_PATTERNS,
  MAX_PATTERN_LENGTH,
  PATTERN_SUBSET_DECLARATION,
} from './logic/constants.js'
import './GitignorePatternExplainerTool.css'

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

function getTypeClass(type) {
  switch (type) {
    case 'negation':
      return 'type-negation'
    case 'directory':
      return 'type-directory'
    case 'comment':
      return 'type-comment'
    case 'empty':
      return 'type-empty'
    default:
      return 'type-file'
  }
}

function getTypeLabel(type) {
  switch (type) {
    case 'negation':
      return '否定'
    case 'directory':
      return '目录'
    case 'comment':
      return '注释'
    case 'empty':
      return '空行'
    default:
      return '文件'
  }
}

export default function GitignorePatternExplainerTool() {
  const [rawText, setRawText] = useState('')
  const [result, setResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [showMatching, setShowMatching] = useState(true)
  const debounceRef = useRef(null)

  const handleProcess = useCallback(() => {
    const processed = processGitignorePatterns({
      rawText,
      enableMatching: showMatching,
    })
    setResult(processed)
  }, [rawText, showMatching])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (rawText) {
        handleProcess()
      } else {
        setResult(null)
      }
    }, 300)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [rawText, showMatching, handleProcess])

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
    setRawText(example.patterns)
    setResult(null)
  }, [])

  const handleClear = useCallback(() => {
    setRawText('')
    setResult(null)
  }, [])

  const handleProcessNow = useCallback(() => {
    handleProcess()
  }, [handleProcess])

  const getEffectivePatternCount = () => {
    const lines = rawText.split(/\r?\n/)
    return lines.filter((line) => line.trim().length > 0 && !line.trim().startsWith('#')).length
  }

  const renderErrorBox = () => {
    if (!result?.errorCode) return null
    return (
      <div className="error-box">
        <strong>处理错误</strong>
        <p>{result.errorMessage}</p>
        <div className="error-code">错误码：{result.errorCode}</div>
      </div>
    )
  }

  const renderSummary = () => {
    if (!result?.summary) return null
    const { summary } = result

    return (
      <div className="summary-section">
        <h3>概览</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">有效模式</span>
            <span className="summary-value">{summary.validPatterns}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">注释行</span>
            <span className="summary-value">{summary.commentLines}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">空行</span>
            <span className="summary-value">{summary.emptyLines}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">否定模式</span>
            <span className="summary-value">{summary.negationPatterns}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">目录模式</span>
            <span className="summary-value">{summary.directoryPatterns}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">根目录限定</span>
            <span className="summary-value">{summary.anchoredPatterns}</span>
          </div>
        </div>
        {summary.warnings.length > 0 && (
          <div className="warnings-box">
            <strong>⚠️ 警告</strong>
            <ul>
              {summary.warnings.map((warning, idx) => (
                <li key={idx}>{warning.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const renderExplanations = () => {
    if (!result?.explanations) return null

    return (
      <div className="explanations-section">
        <div className="section-header">
          <h3>模式解释</h3>
          {rawText && (
            <div className="action-buttons">
              <button
                className="copy-btn"
                onClick={() => handleCopy(rawText, '原始模式')}
              >
                复制原始模式
              </button>
            </div>
          )}
        </div>
        <div className="pattern-list">
          {result.explanations.map((explanation, idx) => (
            <div key={idx} className={`pattern-item ${getTypeClass(explanation.type)}`}>
              <div className="pattern-header">
                <span className="pattern-number">第 {explanation.lineNumber} 行</span>
                <span className={`pattern-badge ${getTypeClass(explanation.type)}`}>
                  {getTypeLabel(explanation.type)}
                </span>
                <code className="pattern-text">{escapeHtml(explanation.rawPattern || '(空)')}</code>
              </div>

              {explanation.type !== 'empty' && (
                <div className="pattern-body">
                  <div className="pattern-summary">
                    <strong>{explanation.summary}</strong>
                  </div>
                  {explanation.details && (
                    <p className="pattern-details">{explanation.details}</p>
                  )}

                  {explanation.segments && explanation.segments.length > 0 && (
                    <div className="pattern-segments">
                      <h4>分段解析</h4>
                      <div className="segments-grid">
                        {explanation.segments.map((segment, sIdx) => (
                          <div key={sIdx} className="segment-item">
                            <code className="segment-symbol">{segment.symbol}</code>
                            <div className="segment-info">
                              <div className="segment-explanation">{segment.explanation}</div>
                              {segment.examples && segment.examples.length > 0 && (
                                <ul className="segment-examples">
                                  {segment.examples.map((example, eIdx) => (
                                    <li key={eIdx}>{example}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {explanation.warnings && explanation.warnings.length > 0 && (
                    <div className="pattern-warnings">
                      {explanation.warnings.map((warning, wIdx) => (
                        <div key={wIdx} className="warning-item">
                          ⚠️ {warning.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMatchingResults = () => {
    if (!showMatching || !result?.matchingResults || result.matchingResults.length === 0) {
      return null
    }

    return (
      <div className="matching-section">
        <h3>路径匹配预览</h3>
        <div className="matching-disclaimer">
          ⚠️ 以下为基于本工具子集的简化匹配结果，与实际 Git 可能存在差异。
          假设：路径从仓库根开始，使用正斜杠（/）作为分隔符。
        </div>
        <div className="matching-list">
          {result.matchingResults.map((matchResult, idx) => (
            <div
              key={idx}
              className={`matching-item ${matchResult.shouldIgnore ? 'ignored' : 'not-ignored'}`}
            >
              <div className="matching-header">
                <span className={`matching-badge ${matchResult.shouldIgnore ? 'ignored' : 'not-ignored'}`}>
                  {matchResult.shouldIgnore ? '被忽略' : '未忽略'}
                </span>
                <code className="matching-path">{escapeHtml(matchResult.testPath)}</code>
              </div>
              <div className="matching-details">
                {matchResult.matches
                  .filter((m) => m.matched)
                  .map((m, mIdx) => (
                    <div key={mIdx} className="matching-rule">
                      <span className={`matching-rule-type ${m.isNegative ? 'negation' : ''}`}>
                        {m.isNegative ? '取消匹配' : '匹配'}
                      </span>
                      <code>{escapeHtml(m.pattern)}</code>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSubsetDeclaration = () => (
    <div className="subset-section">
      <h3>{PATTERN_SUBSET_DECLARATION.title}</h3>
      <div className="subset-grid">
        <div className="subset-column">
          <h4>✅ 支持的功能</h4>
          <table className="subset-table">
            <thead>
              <tr>
                <th>符号</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {PATTERN_SUBSET_DECLARATION.features.map((feature, idx) => (
                <tr key={idx}>
                  <td><code>{escapeHtml(feature.symbol)}</code></td>
                  <td>{feature.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="subset-column">
          <h4>❌ 不支持的功能</h4>
          <ul className="not-supported-list">
            {PATTERN_SUBSET_DECLARATION.notSupported.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )

  const renderDisclaimer = () => (
    <div className="disclaimer">
      <h4>⚠️ 差异声明</h4>
      <p>
        本工具提供的解释基于常见的 .gitignore 语法约定，但与真实 Git 版本的行为可能存在以下差异：
      </p>
      <ul>
        <li>
          Git 的实际行为可能因版本、操作系统、配置等因素略有不同。
        </li>
        <li>
          本工具的路径匹配预览为简化实现，不处理所有边界情况（如符号链接、嵌套否定等）。
        </li>
        <li>
          若需验证真实 Git 行为，请在实际仓库中使用 <code>git check-ignore</code> 命令。
        </li>
      </ul>
    </div>
  )

  return (
    <div className="gitignore-explainer-tool">
      {copyStatus && (
        <div className={`tool-toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>.gitignore 模式解释器</h2>

        <div className="form-group full-width">
          <label htmlFor="raw-text">
            输入 .gitignore 模式（支持单行或多行）
          </label>
          <textarea
            id="raw-text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`例如：
*.log
node_modules/
!important.log
**/*.tmp`}
            spellCheck={false}
          />
          <div className="input-stats">
            <span>有效模式：{getEffectivePatternCount()} / {MAX_PATTERNS}</span>
            <span>单条最大长度：{MAX_PATTERN_LENGTH} 字符</span>
          </div>
        </div>

        <div className="options-row">
          <label className="option-item">
            <input
              type="checkbox"
              checked={showMatching}
              onChange={(e) => setShowMatching(e.target.checked)}
            />
            <span>启用路径匹配预览</span>
          </label>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleProcessNow}
            disabled={!rawText.trim()}
          >
            立即解析
          </button>
          {rawText && (
            <button className="secondary-btn" onClick={handleClear}>
              清除
            </button>
          )}
        </div>

        <div className="examples-section">
          <h3>示例（点击填入）</h3>
          <div className="examples-grid">
            {EXAMPLE_CASES.map((example, idx) => (
              <button
                key={idx}
                className="example-btn"
                onClick={() => handleLoadExample(example)}
                title={example.description}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {renderErrorBox()}
      {result && !result.errorCode && (
        <>
          {renderSummary()}
          {renderExplanations()}
          {renderMatchingResults()}
        </>
      )}
      {renderSubsetDeclaration()}
      {renderDisclaimer()}
    </div>
  )
}
