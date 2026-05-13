import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  processInput,
  processRangeCheck,
  generateTSV,
  generateJSON,
  generateDiff,
  MAX_LINE_COUNT,
  MAX_LINE_LENGTH,
  LARGE_LIST_THRESHOLD,
  ERROR_CODES,
  SORT_ORDER,
  PRERELEASE_KEYWORDS,
  COMMENT_PREFIX,
} from './logic/index.js'
import { EXAMPLES, SORT_KEY_OPTIONS, TIEBREAKER_OPTIONS, DELIMITER_OPTIONS, RANGE_OPERATORS } from './logic/constants.js'
import './SemverCompareSortTool.css'

const DEBOUNCE_DELAY = 250
const ROW_HEIGHT = 44

function formatNumber(n) {
  if (n == null) return '-'
  return n.toLocaleString()
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getPrereleaseTagClass(value) {
  const lower = String(value || '').toLowerCase()
  if (PRERELEASE_KEYWORDS.includes(lower)) {
    return lower
  }
  if (/^\d+$/.test(value)) {
    return 'numeric'
  }
  return 'other'
}

function renderVersionDisplay(version) {
  if (!version.valid) {
    return <span className="version-cell">{escapeHtml(version.original)}</span>
  }

  return (
    <span className="version-cell">
      <span className="major">{version.major}</span>
      <span>.</span>
      <span className="minor">{version.minor}</span>
      <span>.</span>
      <span className="patch">{version.patch}</span>
      {version.prerelease && (
        <span className="prerelease">
          <span>-{escapeHtml(version.prerelease)}</span>
        </span>
      )}
      {version.build && (
        <span className="build">
          <span>+{escapeHtml(version.build)}</span>
        </span>
      )}
    </span>
  )
}

function renderPrereleaseBar(prereleaseTokens) {
  if (!prereleaseTokens || prereleaseTokens.length === 0) {
    return <span style={{ color: 'var(--text-secondary)' }}>-</span>
  }

  return (
    <div className="prerelease-bar">
      {prereleaseTokens.map((token, idx) => {
        const tagClass = token.type === 'numeric' ? 'numeric' : getPrereleaseTagClass(token.value)
        const displayValue = token.type === 'numeric' && !token.overflow ? String(token.value) : String(token.value)
        return (
          <span key={idx} className={`prerelease-tag ${tagClass}`}>
            {escapeHtml(displayValue)}
          </span>
        )
      })}
    </div>
  )
}

export default function SemverCompareSortTool() {
  const [input, setInput] = useState('')
  const [delimiter, setDelimiter] = useState('newline')
  const [filterComments, setFilterComments] = useState(true)
  const [filterEmpty, setFilterEmpty] = useState(true)
  const [order, setOrder] = useState(SORT_ORDER.ASC)
  const [sortKey, setSortKey] = useState('strict')
  const [tiebreaker, setTiebreaker] = useState('insertion')
  const [deduplicate, setDeduplicate] = useState(false)
  const [validateOnly, setValidateOnly] = useState(false)
  const [rangeInput, setRangeInput] = useState('')
  const [showDiff, setShowDiff] = useState(false)
  const [processResult, setProcessResult] = useState(null)
  const [rangeResult, setRangeResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activeExampleKey, setActiveExampleKey] = useState(null)

  const virtualContainerRef = useRef(null)
  const debounceTimeoutRef = useRef(null)
  const [virtualScrollTop, setVirtualScrollTop] = useState(0)
  const [virtualContainerHeight, setVirtualContainerHeight] = useState(0)

  const currentTable = useMemo(() => {
    if (!processResult || !processResult.result) return null
    return validateOnly ? processResult.result.validated : processResult.result.sorted
  }, [processResult, validateOnly])

  const shouldUseVirtualScroll = useMemo(() => {
    if (!currentTable) return false
    return currentTable.length >= LARGE_LIST_THRESHOLD
  }, [currentTable])

  const virtualVisibleRange = useMemo(() => {
    if (!currentTable || !shouldUseVirtualScroll) return null
    const containerHeight = virtualContainerHeight || 500
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2
    const startIndex = Math.max(0, Math.floor(virtualScrollTop / ROW_HEIGHT) - 1)
    const endIndex = Math.min(currentTable.length, startIndex + visibleCount + 1)
    return { startIndex, endIndex, visibleCount }
  }, [currentTable, shouldUseVirtualScroll, virtualScrollTop, virtualContainerHeight])

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value)
  }, [])

  const handleRangeChange = useCallback((e) => {
    setRangeInput(e.target.value)
  }, [])

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      if (!input || input.trim().length === 0) {
        setProcessResult(null)
        setRangeResult(null)
        return
      }

      const result = processInput({
        input,
        delimiter,
        filterComments,
        filterEmpty,
        order,
        sortKey,
        tiebreaker,
        deduplicate,
        validateOnly,
      })
      setProcessResult(result)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [input, delimiter, filterComments, filterEmpty, order, sortKey, tiebreaker, deduplicate, validateOnly])

  useEffect(() => {
    if (!processResult || !processResult.result || !rangeInput || rangeInput.trim().length === 0) {
      setRangeResult(null)
      return
    }

    const result = processRangeCheck(processResult.result.validated, rangeInput, {
      includeBuild: sortKey === 'withBuild',
    })
    setRangeResult(result)
  }, [processResult, rangeInput, sortKey])

  useEffect(() => {
    const container = virtualContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setVirtualScrollTop(container.scrollTop)
    }

    const updateHeight = () => {
      setVirtualContainerHeight(container.clientHeight)
    }

    container.addEventListener('scroll', handleScroll)
    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [shouldUseVirtualScroll, currentTable])

  const handleApplyExample = useCallback((exampleKey, exampleText) => {
    setInput(exampleText)
    setActiveExampleKey(exampleKey)
  }, [])

  const handleClear = useCallback(() => {
    setInput('')
    setRangeInput('')
    setProcessResult(null)
    setRangeResult(null)
    setActiveExampleKey(null)
  }, [])

  const handleToggleValidateOnly = useCallback(() => {
    setValidateOnly((prev) => !prev)
  }, [])

  const handleToggleDiff = useCallback(() => {
    setShowDiff((prev) => !prev)
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

  const handleCopyAsTSV = useCallback(() => {
    if (!currentTable) return
    const tsv = generateTSV(currentTable)
    handleCopy(tsv, 'TSV')
  }, [currentTable, handleCopy])

  const handleCopyAsJSON = useCallback(() => {
    if (!currentTable) return
    const json = generateJSON(currentTable)
    handleCopy(json, 'JSON')
  }, [currentTable, handleCopy])

  const handleCopySortedList = useCallback(() => {
    if (!currentTable) return
    const list = currentTable.map((l) => l.parsed.normalized || l.raw).join('\n')
    handleCopy(list, '排序后的版本列表')
  }, [currentTable, handleCopy])

  const handleCopyShareUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (input) params.set('input', encodeURIComponent(input))
    if (delimiter !== 'newline') params.set('delimiter', delimiter)
    if (!filterComments) params.set('filterComments', 'false')
    if (!filterEmpty) params.set('filterEmpty', 'false')
    if (order !== SORT_ORDER.ASC) params.set('order', order)
    if (sortKey !== 'strict') params.set('sortKey', sortKey)
    if (tiebreaker !== 'insertion') params.set('tiebreaker', tiebreaker)
    if (deduplicate) params.set('deduplicate', 'true')
    if (validateOnly) params.set('validateOnly', 'true')
    if (rangeInput) params.set('range', encodeURIComponent(rangeInput))

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    handleCopy(url, '分享链接')
  }, [input, delimiter, filterComments, filterEmpty, order, sortKey, tiebreaker, deduplicate, validateOnly, rangeInput, handleCopy])

  const hasError = processResult && !processResult.success && processResult.errorCode !== ERROR_CODES.MIXED_INVALID_LINES
  const hasInvalidLines = processResult?.result?.hasInvalid
  const hasRangeError = rangeResult && !rangeResult.success

  const sortedWithRangeCheck = useMemo(() => {
    if (!rangeResult || !rangeResult.success || !currentTable) return null

    const checkMap = new Map()
    rangeResult.result.checked.forEach((c) => {
      checkMap.set(c.insertOrder, c)
    })

    return currentTable.map((row) => {
      const check = checkMap.get(row.insertOrder)
      return {
        ...row,
        satisfies: check?.satisfies ?? false,
        satisfyReason: check?.satisfyReason,
      }
    })
  }, [rangeResult, currentTable])

  const diffs = useMemo(() => {
    if (!processResult?.result) return null
    return generateDiff(processResult.result.original, processResult.result.sorted)
  }, [processResult])

  const renderTableRow = (row, idx) => {
    const isInvalid = !row.parsed.valid
    const satisfies = sortedWithRangeCheck?.find((r) => r.insertOrder === row.insertOrder)?.satisfies
    const diff = diffs?.find((d) => d.raw === row.raw || (row.parsed.valid && d.raw === row.parsed.original))

    let rowClass = ''
    if (isInvalid) rowClass = 'invalid-row'
    else if (satisfies) rowClass = 'satisfies-row'

    return (
      <tr key={row.insertOrder} className={rowClass}>
        <td>{idx + 1}</td>
        <td>{renderVersionDisplay(row.parsed)}</td>
        <td>
          {row.parsed.valid ? (
            <>
              <span className="major">{row.parsed.major}</span>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
          )}
        </td>
        <td>
          {row.parsed.valid ? (
            <span className="minor">{row.parsed.minor}</span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
          )}
        </td>
        <td>
          {row.parsed.valid ? (
            <span className="patch">{row.parsed.patch}</span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
          )}
        </td>
        <td>
          {row.parsed.valid
            ? renderPrereleaseBar(row.parsed.prereleaseTokens)
            : <span style={{ color: 'var(--text-secondary)' }}>-</span>
          }
        </td>
        <td>
          {row.parsed.valid && row.parsed.build
            ? <span className="build">{escapeHtml(row.parsed.build)}</span>
            : <span style={{ color: 'var(--text-secondary)' }}>-</span>
          }
        </td>
        {rangeResult?.success && (
          <td className="satisfies-cell">
            <span className={satisfies ? 'satisfies-yes' : 'satisfies-no'}>
              {satisfies ? '✓' : '—'}
            </span>
          </td>
        )}
        {showDiff && diff && (
          <td className="diff-cell">
            {diff.direction === 'up' && <span className="diff-up">↑ {diff.originalPosition - diff.sortedPosition}</span>}
            {diff.direction === 'down' && <span className="diff-down">↓ {diff.sortedPosition - diff.originalPosition}</span>}
            {diff.direction === 'none' && <span className="diff-none">—</span>}
          </td>
        )}
        <td>
          {row.parsed.valid ? (
            <span style={{ color: 'var(--success)' }}>有效</span>
          ) : (
            <span className="error-cell">{row.parsed.errorCode}</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="semver-compare-sort">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>语义化版本比较与排序</h2>

        <div className="form-group">
          <label>输入版本列表（每行一个，或使用其他分隔符）</label>
          <div className="textarea-container">
            <textarea
              className="input-textarea"
              value={input}
              onChange={handleInputChange}
              placeholder={'粘贴版本号列表...\n\n例如:\nv1.0.0\n1.0.1-alpha.1\n1.0.1-beta\n2.0.0-rc\n2.0.0'}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="options-row">
          <div className="option-group">
            <label>分隔符</label>
            <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
              {DELIMITER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label>排序顺序</label>
            <select value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value={SORT_ORDER.ASC}>升序（从小到大）</option>
              <option value={SORT_ORDER.DESC}>降序（从大到小）</option>
            </select>
          </div>

          <div className="option-group">
            <label>排序键</label>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {SORT_KEY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label>并列次级键</label>
            <select value={tiebreaker} onChange={(e) => setTiebreaker(e.target.value)}>
              {TIEBREAKER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>选项</label>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={filterComments}
                onChange={(e) => setFilterComments(e.target.checked)}
              />
              <span>忽略以 <code>#</code> 开头的注释行</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={filterEmpty}
                onChange={(e) => setFilterEmpty(e.target.checked)}
              />
              <span>忽略空行</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={deduplicate}
                onChange={(e) => setDeduplicate(e.target.checked)}
              />
              <span>去重</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={validateOnly}
                onChange={(e) => setValidateOnly(e.target.checked)}
              />
              <span>仅校验不排序</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={showDiff}
                onChange={(e) => setShowDiff(e.target.checked)}
              />
              <span>显示排序前后位置变化（diff）</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>范围查询（可选）</label>
          <input
            type="text"
            className="range-input"
            value={rangeInput}
            onChange={handleRangeChange}
            placeholder="输入范围表达式，如 ^1.2.3、~2.0.0、>=1.0.0"
          />
        </div>

        <div className="form-group">
          <label>示例数据</label>
          <div className="example-buttons">
            <button
              type="button"
              className={`example-btn ${activeExampleKey === 'PRERELEASE_CHAIN' ? 'active' : ''}`}
              onClick={() => handleApplyExample('PRERELEASE_CHAIN', EXAMPLES.PRERELEASE_CHAIN)}
            >
              先行版链
            </button>
            <button
              type="button"
              className={`example-btn ${activeExampleKey === 'SAME_LENGTH_DIFF_PRERELEASE' ? 'active' : ''}`}
              onClick={() => handleApplyExample('SAME_LENGTH_DIFF_PRERELEASE', EXAMPLES.SAME_LENGTH_DIFF_PRERELEASE)}
            >
              不同先行级
            </button>
            <button
              type="button"
              className={`example-btn ${activeExampleKey === 'SAME_PATCH_DIFF_BUILD' ? 'active' : ''}`}
              onClick={() => handleApplyExample('SAME_PATCH_DIFF_BUILD', EXAMPLES.SAME_PATCH_DIFF_BUILD)}
            >
              不同构建元数据
            </button>
            <button
              type="button"
              className={`example-btn ${activeExampleKey === 'MIXED_INVALID' ? 'active' : ''}`}
              onClick={() => handleApplyExample('MIXED_INVALID', EXAMPLES.MIXED_INVALID)}
            >
              含非法行
            </button>
            <button
              type="button"
              className={`example-btn ${activeExampleKey === 'LARGE_PREVIEW' ? 'active' : ''}`}
              onClick={() => handleApplyExample('LARGE_PREVIEW', EXAMPLES.LARGE_PREVIEW)}
            >
              大体量预览
            </button>
          </div>
        </div>

        <div className="action-row">
          <button className="secondary-btn" onClick={handleCopyShareUrl}>
            分享当前配置
          </button>
          <button className="secondary-btn" onClick={handleClear}>
            清空
          </button>
        </div>
      </section>

      {hasError && (
        <section className="tool-section">
          <div className="error-box">
            <div className="error-code">
              <span className="error-label">错误码</span>
              <code>{processResult.errorCode}</code>
            </div>
            <p>{processResult.error?.message}</p>
            {processResult.error?.details && (
              <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
                {JSON.stringify(processResult.error.details)}
              </p>
            )}
          </div>
        </section>
      )}

      {hasInvalidLines && !validateOnly && (
        <section className="tool-section">
          <div className="warning-banner">
            ⚠️ 检测到 {processResult.result.stats.invalid} 行非法版本。
            当前模式为「排序」，非法行将排在最后。如需仅校验请开启「仅校验不排序」选项。
          </div>
        </section>
      )}

      {hasRangeError && (
        <section className="tool-section">
          <div className="error-box">
            <div className="error-code">
              <span className="error-label">范围错误</span>
              <code>{rangeResult.errorCode}</code>
            </div>
            <p>{rangeResult.error?.message}</p>
          </div>
        </section>
      )}

      {processResult?.result && processResult.result.stats.total > 0 && (
        <>
          <section className="tool-section preview-section">
            <div className="preview-header">
              <h3>
                {validateOnly ? '校验结果' : '排序结果'}
                {rangeResult?.success && (
                  <span style={{ marginLeft: '0.5rem', fontWeight: 'normal', fontSize: '0.875rem', color: 'var(--accent)' }}>
                    (范围: {rangeResult.result.range.description})
                  </span>
                )}
              </h3>
              <div className="preview-actions">
                {!validateOnly && (
                  <>
                    <button className="secondary-btn" onClick={handleCopySortedList}>
                      复制排序后的列表
                    </button>
                    <button className="secondary-btn" onClick={handleCopyAsTSV}>
                      复制 TSV
                    </button>
                    <button className="secondary-btn" onClick={handleCopyAsJSON}>
                      复制 JSON
                    </button>
                  </>
                )}
                {validateOnly && (
                  <button className="secondary-btn" onClick={handleCopyAsJSON}>
                    复制校验结果 JSON
                  </button>
                )}
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-label">总数</span>
                <span className="stat-value">{formatNumber(processResult.result.stats.total)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">有效</span>
                <span className="stat-value valid">{formatNumber(processResult.result.stats.valid)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">无效</span>
                <span className="stat-value invalid">{formatNumber(processResult.result.stats.invalid)}</span>
              </div>
              {deduplicate && (
                <div className="stat-item">
                  <span className="stat-label">去重后</span>
                  <span className="stat-value">{formatNumber(processResult.result.stats.unique)}</span>
                </div>
              )}
              {rangeResult?.success && (
                <div className="stat-item">
                  <span className="stat-label">满足范围</span>
                  <span className="stat-value valid">{formatNumber(rangeResult.result.stats.satisfied)}</span>
                </div>
              )}
              {processResult.result.isLargeList && (
                <div className="stat-item">
                  <span className="stat-label">渲染策略</span>
                  <span className="stat-value" style={{ color: 'var(--info-text)' }}>
                    虚拟滚动
                  </span>
                </div>
              )}
            </div>

            {shouldUseVirtualScroll && virtualVisibleRange ? (
              <div
                ref={virtualContainerRef}
                className="virtual-scroll-container"
              >
                <div
                  className="virtual-scroll-phantom"
                  style={{ height: `${currentTable.length * ROW_HEIGHT}px` }}
                />
                <div
                  className="virtual-scroll-content"
                  style={{ transform: `translateY(${virtualVisibleRange.startIndex * ROW_HEIGHT}px)` }}
                >
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>版本</th>
                        <th>Major</th>
                        <th>Minor</th>
                        <th>Patch</th>
                        <th>先行版</th>
                        <th>构建</th>
                        {rangeResult?.success && <th>满足范围</th>}
                        {showDiff && <th>位置变化</th>}
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTable
                        .slice(virtualVisibleRange.startIndex, virtualVisibleRange.endIndex)
                        .map((row, offset) => renderTableRow(
                          row,
                          virtualVisibleRange.startIndex + offset
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>版本</th>
                      <th>Major</th>
                      <th>Minor</th>
                      <th>Patch</th>
                      <th>先行版</th>
                      <th>构建</th>
                      {rangeResult?.success && <th>满足范围</th>}
                      {showDiff && <th>位置变化</th>}
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTable.map((row, idx) => renderTableRow(row, idx))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {rangeResult?.success && rangeResult.result.majorGroups.length > 0 && (
            <section className="tool-section">
              <h3>按 Major 分组</h3>
              <div>
                {rangeResult.result.majorGroups.map((group) => (
                  <div key={group.key} className="major-group">
                    <div className="major-group-title">{group.key}</div>
                    <div className="major-group-items">
                      {group.lines.slice(0, 10).map((line, idx) => (
                        <span key={idx} className="version-badge">
                          {line.parsed.normalized}
                        </span>
                      ))}
                      {group.lines.length > 10 && (
                        <span className="version-badge" style={{ opacity: 0.7 }}>
                          +{group.lines.length - 10} 更多
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {rangeResult?.success && (rangeResult.result.maxInRange || rangeResult.result.minInRange) && (
            <section className="tool-section">
              <h3>范围极值</h3>
              <div className="stats-row">
                {rangeResult.result.minInRange && (
                  <div className="stat-item">
                    <span className="stat-label">范围最小值</span>
                    <span className="stat-value valid">
                      {rangeResult.result.minInRange.normalized}
                    </span>
                  </div>
                )}
                {rangeResult.result.maxInRange && (
                  <div className="stat-item">
                    <span className="stat-label">范围最大值</span>
                    <span className="stat-value valid">
                      {rangeResult.result.maxInRange.normalized}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {processResult?.result && processResult.result.stats.total === 0 && (
        <section className="tool-section">
          <div className="empty-state">输入内容解析后为空</div>
        </section>
      )}

      {!processResult && input.length === 0 && (
        <section className="tool-section">
          <div className="empty-state">请输入或粘贴版本号列表开始</div>
        </section>
      )}

      <section className="notes-section">
        <h4>📖 使用说明与限制</h4>
        <ul>
          <li>
            <strong>解析规则 (SemVer 2.0.0 兼容)：</strong>
            <ul>
              <li>格式：<code>major.minor.patch</code>，支持可选前导 <code>v</code> 或 <code>V</code></li>
              <li>先行版格式：<code>-prerelease</code>，如 <code>-alpha.1</code>、<code>-beta</code>、<code>-rc.2</code></li>
              <li>构建元数据：<code>+build</code>，如 <code>+build.123</code>、<code>+sha.abc123</code></li>
              <li>前导零规范化：<code>01.02.03</code> 被视为非法</li>
            </ul>
          </li>
          <li>
            <strong>先行版优先级（固定在页内）：</strong>
            <ul>
              <li><code>snapshot</code> &lt; <code>alpha</code> &lt; <code>beta</code> &lt; <code>rc</code> &lt; <code>pre</code> &lt; <code>preview</code></li>
              <li>非关键字按字典序比较，数字标识符按数值比较</li>
              <li>数字标识符优先级低于非数字标识符</li>
            </ul>
          </li>
          <li>
            <strong>范围算子（语义页内固定）：</strong>
            <ul>
              {RANGE_OPERATORS.map((op) => (
                <li key={op.symbol}>
                  <code>{op.symbol}</code>：{op.description}
                </li>
              ))}
            </ul>
          </li>
          <li>
            <strong>排序与比较：</strong>
            <ul>
              <li>有效版本排在非法行之前</li>
              <li>默认使用原始插入序作为次级键（稳定排序）</li>
              <li>「构建元数据参与」模式下，<code>+build</code> 参与比较</li>
            </ul>
          </li>
          <li>
            <strong>注释行（页内声明）：</strong>
            <ul>
              <li>以 <code>{COMMENT_PREFIX}</code> 开头的行被视为注释，默认过滤</li>
              <li>可通过选项关闭注释过滤</li>
            </ul>
          </li>
          <li>
            <strong>大体量处理：</strong>
            <ul>
              <li>超过 {formatNumber(LARGE_LIST_THRESHOLD)} 行启用虚拟滚动优化</li>
              <li>使用防抖解析（{DEBOUNCE_DELAY}ms）避免输入卡顿</li>
            </ul>
          </li>
          <li>
            <strong>大小限制：</strong>
            <ul>
              <li>最大行数：{formatNumber(MAX_LINE_COUNT)}</li>
              <li>单行最大长度：{formatNumber(MAX_LINE_LENGTH)} 字符</li>
            </ul>
          </li>
          <li>
            <strong>错误码说明：</strong>
            <ul>
              <li><code>{ERROR_CODES.EMPTY_INPUT}</code>：输入为空</li>
              <li><code>{ERROR_CODES.INPUT_TOO_LARGE}</code>：输入超过大小限制</li>
              <li><code>{ERROR_CODES.TOO_MANY_LINES}</code>：行数超出限制</li>
              <li><code>{ERROR_CODES.LINE_TOO_LONG}</code>：单行过长</li>
              <li><code>{ERROR_CODES.INVALID_SEMVER}</code>：无效的语义化版本格式</li>
              <li><code>{ERROR_CODES.VERSION_NUMBER_TOO_LARGE}</code>：版本号超出安全整数范围</li>
              <li><code>{ERROR_CODES.INVALID_RANGE}</code>：无效的范围表达式</li>
              <li><code>{ERROR_CODES.MIXED_INVALID_LINES}</code>：存在非法行（排序模式）</li>
            </ul>
          </li>
          <li>
            <strong>分享功能：</strong>
            <ul>
              <li>点击「分享当前配置」生成包含所有选项的 URL</li>
              <li>支持恢复输入内容、分隔符、排序选项、范围查询等</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  )
}
