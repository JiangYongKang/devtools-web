import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FLAGS,
  MAX_MATCH_COUNT,
  MAX_PATTERN_LENGTH,
  MAX_TEXT_LENGTH,
  compileRegex,
  escapeHtml,
  executeRegexWithTimeout,
  buildHighlightedHtml,
  validateInputs,
  formatMatchInfo,
} from './regexUtils'
import './RegexTool.css'

const DEBOUNCE_DELAY_MS = 300

const QUICK_EXAMPLES = [
  {
    label: '邮箱',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    text: '联系我们：support@example.com 或 admin@test.org',
  },
  {
    label: '手机号',
    pattern: '1[3-9]\\d{9}',
    text: '客服电话：13812345678，备用：15987654321',
  },
  {
    label: 'URL',
    pattern: 'https?://[\\w\\-._~:/?#[\\]@!$&\'()*+,;=%]+',
    text: '访问 https://example.com/path?name=test 或 http://localhost:3000',
  },
  {
    label: '日期',
    pattern: '\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}',
    text: '活动日期：2024-01-15 到 2024/12/31',
  },
  {
    label: 'IP地址',
    pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',
    text: '服务器地址：192.168.1.1 和 10.0.0.1',
  },
]

export default function RegexTool() {
  const [pattern, setPattern] = useState('')
  const [text, setText] = useState('')
  const [selectedFlags, setSelectedFlags] = useState(
    FLAGS.filter((f) => f.default).map((f) => f.id),
  )
  const [compileError, setCompileError] = useState(null)
  const [matchError, setMatchError] = useState(null)
  const [matches, setMatches] = useState([])
  const [matchCount, setMatchCount] = useState(0)
  const [hasMoreMatches, setHasMoreMatches] = useState(false)
  const [highlightedHtml, setHighlightedHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [runAt, setRunAt] = useState(null)

  const debounceTimerRef = useRef(null)

  const flagsString = useMemo(() => {
    return selectedFlags.join('')
  }, [selectedFlags])

  const toggleFlag = useCallback((flagId) => {
    setSelectedFlags((prev) => {
      if (prev.includes(flagId)) {
        if (prev.length === 1 && flagId === 'g') return prev
        return prev.filter((id) => id !== flagId)
      }
      return [...prev, flagId]
    })
  }, [])

  const applyExample = useCallback((example) => {
    setPattern(example.pattern)
    setText(example.text)
  }, [])

  const clearAll = useCallback(() => {
    setPattern('')
    setText('')
    setCompileError(null)
    setMatchError(null)
    setMatches([])
    setMatchCount(0)
    setHasMoreMatches(false)
    setHighlightedHtml('')
    setWarnings([])
    setRunAt(null)
  }, [])

  const executeMatch = useCallback(async () => {
    setMatchError(null)
    setMatches([])
    setMatchCount(0)
    setHasMoreMatches(false)
    setHighlightedHtml('')

    const inputWarnings = validateInputs(pattern, text)
    setWarnings(inputWarnings)

    if (!pattern) {
      return
    }

    const compileResult = compileRegex(pattern, flagsString)
    if (compileResult.error) {
      setCompileError(compileResult.error)
      return
    }
    setCompileError(null)

    if (!text) {
      return
    }

    setLoading(true)
    try {
      const result = await executeRegexWithTimeout(compileResult.regex, text)
      setMatches(result.matches)
      setMatchCount(result.matchCount)
      setHasMoreMatches(result.hasMoreMatches || false)
      setHighlightedHtml(buildHighlightedHtml(text, result.matches))
      setRunAt(Date.now())
    } catch (err) {
      setMatchError(err?.message || '匹配失败')
    } finally {
      setLoading(false)
    }
  }, [pattern, text, flagsString])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (!pattern && !text) {
      setMatches([])
      setMatchCount(0)
      setHighlightedHtml('')
      setCompileError(null)
      setMatchError(null)
      setWarnings([])
      return
    }
    debounceTimerRef.current = setTimeout(() => {
      executeMatch()
    }, DEBOUNCE_DELAY_MS)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [pattern, text, selectedFlags, executeMatch])

  const renderStatusIndicator = () => {
    if (compileError) {
      return (
        <span className="status-indicator error">
          <span className="status-dot" />
          <span>编译错误</span>
        </span>
      )
    }
    if (matchError) {
      return (
        <span className="status-indicator error">
          <span className="status-dot" />
          <span>匹配失败</span>
        </span>
      )
    }
    if (loading) {
      return (
        <span className="status-indicator info">
          <span className="status-dot" />
          <span>匹配中...</span>
        </span>
      )
    }
    if (!pattern || !text) {
      return (
        <span className="status-indicator info">
          <span className="status-dot" />
          <span>等待输入</span>
        </span>
      )
    }
    if (matchCount === 0) {
      return (
        <span className="status-indicator warning">
          <span className="status-dot" />
          <span>无匹配</span>
        </span>
      )
    }
    return (
      <span className="status-indicator success">
        <span className="status-dot" />
        <span>匹配成功</span>
      </span>
    )
  }

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err) }} />
      </div>
    )
  }

  const renderWarnings = () => {
    if (warnings.length === 0) return null
    return (
      <div className="warning-hints">
        {warnings.map((w, i) => (
          <div key={i} className="warning-hint">
            {escapeHtml(w.message)}
          </div>
        ))}
      </div>
    )
  }

  const formattedMatches = useMemo(() => {
    return matches.map((m, i) => formatMatchInfo(m, i))
  }, [matches])

  return (
    <div className="regex-tool">
      <section className="tool-section">
        <h2>正则表达式</h2>

        <div className="form-group full-width">
          <label htmlFor="regex-pattern">
            表达式
          </label>
          <div className="regex-pattern-row">
            <span className="regex-prefix">/</span>
            <input
              id="regex-pattern"
              type="text"
              className={`regex-pattern-input ${compileError ? 'error' : ''}`}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="例如：\d+ 或 [a-zA-Z]+"
              spellCheck={false}
              autoComplete="off"
            />
            <span className="regex-suffix">/{flagsString}</span>
          </div>
        </div>

        <div className="form-group">
          <label>修饰符（Flags）</label>
          <div className="regex-flags-row">
            {FLAGS.map((flag) => (
              <label key={flag.id} className="regex-flag-label" title={flag.description}>
                <input
                  type="checkbox"
                  checked={selectedFlags.includes(flag.id)}
                  onChange={() => toggleFlag(flag.id)}
                />
                <span>{flag.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>快速示例</label>
          <div className="quick-examples">
            {QUICK_EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                className="quick-example-btn"
                onClick={() => applyExample(example)}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="regex-text">样本文本</label>
          <textarea
            id="regex-text"
            className="regex-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴或输入要匹配的文本..."
            spellCheck={false}
          />
        </div>

        <div className="action-row">
          <button className="secondary-btn" onClick={clearAll}>
            清除
          </button>
        </div>

        {renderWarnings()}
        {renderErrorBox(compileError || matchError)}
      </section>

      <section className="tool-section result-section">
        <div className="result-header-row">
          <h2>匹配结果</h2>
          {renderStatusIndicator()}
        </div>
        {highlightedHtml ? (
          <>
            <div className="result-meta-row">
              <span dangerouslySetInnerHTML={{
                __html: `匹配数：<code>${matchCount}</code>`,
              }} />
              <span dangerouslySetInnerHTML={{
                __html: `显示数：<code>${Math.min(matchCount, MAX_MATCH_COUNT)}</code>`,
              }} />
              {runAt && (
                <span dangerouslySetInnerHTML={{
                  __html: `时间：<code>${new Date(runAt).toLocaleTimeString()}</code>`,
                }} />
              )}
            </div>
            {hasMoreMatches && (
              <div className="has-more-hint">
                匹配项超过 {MAX_MATCH_COUNT} 个，仅显示前 {MAX_MATCH_COUNT} 个的高亮和详情
              </div>
            )}
            <div
              className="highlighted-text"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
            {formattedMatches.length > 0 && (
              <>
                <h3 className="match-details-title">匹配详情</h3>
                <div className="match-list">
                  {formattedMatches.map((match) => (
                    <div key={match.index} className="match-item">
                      <div className="match-item-header">
                        <span>
                          匹配 <strong>#{match.index + 1}</strong>
                          <span> · </span>
                          <span>位置 <strong>{match.position}</strong></span>
                          <span> · </span>
                          <span>长度 <strong>{match.length}</strong></span>
                        </span>
                        <span>
                          [{match.position} - {match.end}]
                        </span>
                      </div>
                      <div className="match-item-body">
                        <div className="match-item-text">
                          {escapeHtml(match.matchedText)}
                        </div>
                        {(match.captureGroups.length > 0 || match.namedGroups.length > 0) && (
                          <div className="match-groups">
                            {match.captureGroups.map((group) => (
                              <div key={group.index} className="match-group-row">
                                <span className="match-group-label">${group.index}</span>
                                <span className={`match-group-value ${group.value === '(未匹配)' ? 'empty' : ''}`}>
                                  {escapeHtml(group.value)}
                                </span>
                              </div>
                            ))}
                            {match.namedGroups.map((group) => (
                              <div key={group.name} className="match-group-row">
                                <span className="match-group-label">${group.name}</span>
                                <span className={`match-group-value ${group.value === '(未匹配)' ? 'empty' : ''}`}>
                                  {escapeHtml(group.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {pattern && text && !compileError && !matchError && (
              <div className="empty-state">
                <p>表达式在样本文本中 <strong>未找到匹配</strong></p>
                <p>尝试调整正则表达式或使用快速示例</p>
              </div>
            )}
            {(!pattern || !text) && (
              <div className="empty-state">
                <p>请输入正则表达式和样本文本</p>
                <p>输入后将自动执行匹配</p>
              </div>
            )}
          </>
        )}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li><strong>纯前端实现：</strong>所有匹配操作均在浏览器本地执行，不向任何服务器发送数据</li>
          <li><strong>实时匹配：</strong>输入后自动执行匹配（{DEBOUNCE_DELAY_MS}ms 防抖），无需手动点击</li>
          <li><strong>超时保护：</strong>复杂表达式可能导致回溯，超过 {Math.floor(2000 / 1000)}s 将自动中止并提示</li>
          <li><strong>结果限制：</strong>最多显示 {MAX_MATCH_COUNT} 个匹配项详情，避免性能问题</li>
          <li><strong>XSS 防护：</strong>所有用户输入、错误信息与结果均经转义后展示</li>
        </ul>
        <h3>输入建议</h3>
        <ul>
          <li>正则表达式建议不超过 {MAX_PATTERN_LENGTH} 字符</li>
          <li>样本文本建议不超过 {MAX_TEXT_LENGTH} 字符，避免页面卡顿</li>
          <li>避免在量词（<code>*</code>、<code>+</code>、<code>{'{'}n,{'}'}</code>）后使用复杂的环视结构</li>
        </ul>
      </div>
    </div>
  )
}
