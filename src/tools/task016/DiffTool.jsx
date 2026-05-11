import { useCallback, useState } from 'react'
import {
  MAX_SAFE_INPUT_SIZE,
  GRANULARITY,
  OPERATION,
  ERROR_CODES,
  escapeHtml,
  formatBytes,
  computeDiff,
  groupSegmentsByOperation,
} from './logic/diffLogic'
import './DiffTool.css'

export default function DiffTool() {
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [granularity, setGranularity] = useState(GRANULARITY.LINE)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [normalizeNewlines, setNormalizeNewlines] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCompare = useCallback(() => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const diffResult = computeDiff(leftText, rightText, {
        granularity,
        ignoreWhitespace,
        normalizeNewlines,
      })

      if (!diffResult.success) {
        setError(diffResult.error)
        return
      }

      setResult(diffResult.result)
    } catch (err) {
      setError({
        code: ERROR_CODES.DIFF_ERROR,
        message: err?.message || '对比过程中发生错误',
      })
    } finally {
      setLoading(false)
    }
  }, [leftText, rightText, granularity, ignoreWhitespace, normalizeNewlines])

  const handleClear = useCallback(() => {
    setLeftText('')
    setRightText('')
    setResult(null)
    setError(null)
  }, [])

  const handleSwap = useCallback(() => {
    const temp = leftText
    setLeftText(rightText)
    setRightText(temp)
    setResult(null)
    setError(null)
  }, [leftText, rightText])

  const renderErrorBox = (err) => {
    if (!err) return null

    const errorTitle = {
      [ERROR_CODES.NULL_INPUT]: '输入为空',
      [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
      [ERROR_CODES.INPUT_TOO_LARGE]: '输入过大',
      [ERROR_CODES.TOO_MANY_SEGMENTS]: '片段超限',
      [ERROR_CODES.DIFF_TIMEOUT]: '对比超时',
      [ERROR_CODES.DIFF_INTERRUPTED]: '对比中断',
      [ERROR_CODES.DIFF_ERROR]: '对比失败',
    }

    return (
      <div className="error-box">
        <strong>{errorTitle[err.code] || '操作失败'}</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
        {err.code && (
          <div className="error-code">错误代码：<code>{err.code}</code></div>
        )}
      </div>
    )
  }

  const renderSegmentContent = (segment, isWordMode) => {
    const content = segment.content || ''
    const escaped = escapeHtml(content)

    if (isWordMode) {
      if (content === '') return <span>&nbsp;</span>
      return <span>{escaped}</span>
    }

    if (content === '') {
      return <span className="empty-line">(空行)</span>
    }

    return <span>{escaped}</span>
  }

  const renderSegmentsList = () => {
    if (!result || !result.segments) return null

    const isWordMode = granularity === GRANULARITY.WORD
    const groups = groupSegmentsByOperation(result.segments)

    return (
      <div className="diff-result">
        <div className="segments-header">
          <h3>差异片段列表</h3>
          <div className="segments-summary">
            <span className="summary-item summary-equal">
              相等：{groups.equal.length}
            </span>
            <span className="summary-item summary-delete">
              删除：{groups.delete.length}
            </span>
            <span className="summary-item summary-insert">
              新增：{groups.insert.length}
            </span>
          </div>
        </div>

        <div className="segments-list">
          {result.segments.map((segment, index) => (
            <div
              key={index}
              className={`segment-item segment-${segment.operation}`}
            >
              <div className="segment-meta">
                <span className="segment-index">#{index + 1}</span>
                <span className={`segment-op op-${segment.operation}`}>
                  {segment.operation === OPERATION.EQUAL ? '相等' :
                   segment.operation === OPERATION.DELETE ? '删除' : '新增'}
                </span>
                {segment.leftStartIndex != null && (
                  <span className="segment-pos">
                    左侧：[{segment.leftStartIndex}, {segment.leftEndIndex})
                  </span>
                )}
                {segment.rightStartIndex != null && (
                  <span className="segment-pos">
                    右侧：[{segment.rightStartIndex}, {segment.rightEndIndex})
                  </span>
                )}
              </div>
              <div className="segment-content">
                {renderSegmentContent(segment, isWordMode)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderStats = () => {
    if (!result) return null

    return (
      <div className="stats-panel">
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">是否存在差异</span>
            <span className={`stat-value ${result.hasDifferences ? 'has-diff' : 'no-diff'}`}>
              {result.hasDifferences ? '是' : '否'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总片段数</span>
            <span className="stat-value">{result.totalSegments}</span>
          </div>
          <div className="stat-item stat-delete">
            <span className="stat-label">删除片段</span>
            <span className="stat-value">{result.deleteCount}</span>
          </div>
          <div className="stat-item stat-insert">
            <span className="stat-label">新增片段</span>
            <span className="stat-value">{result.insertCount}</span>
          </div>
        </div>
      </div>
    )
  }

  const leftSize = new Blob([leftText]).size
  const rightSize = new Blob([rightText]).size
  const isLargeInput = leftSize > MAX_SAFE_INPUT_SIZE || rightSize > MAX_SAFE_INPUT_SIZE
  const canCompare = leftText.trim().length > 0 && rightText.trim().length > 0

  return (
    <div className="diff-tool">
      <section className="tool-section">
        <h2>输入文本</h2>
        <div className="options-panel">
          <div className="options-row">
            <div className="option-group">
              <label>对比粒度</label>
              <select
                value={granularity}
                onChange={(e) => {
                  setGranularity(e.target.value)
                  setResult(null)
                  setError(null)
                }}
              >
                <option value={GRANULARITY.LINE}>行级对比</option>
                <option value={GRANULARITY.WORD}>词级对比</option>
              </select>
            </div>
            <div className="option-group checkbox-option">
              <input
                type="checkbox"
                id="ignoreWhitespace"
                checked={ignoreWhitespace}
                onChange={(e) => {
                  setIgnoreWhitespace(e.target.checked)
                  setResult(null)
                  setError(null)
                }}
              />
              <label htmlFor="ignoreWhitespace">忽略空白字符</label>
            </div>
            <div className="option-group checkbox-option">
              <input
                type="checkbox"
                id="normalizeNewlines"
                checked={normalizeNewlines}
                onChange={(e) => {
                  setNormalizeNewlines(e.target.checked)
                  setResult(null)
                  setError(null)
                }}
              />
              <label htmlFor="normalizeNewlines">标准化换行符</label>
            </div>
          </div>
        </div>
        {isLargeInput && (
          <div className="warning-hint">
            输入内容较大，建议使用小于 {formatBytes(MAX_SAFE_INPUT_SIZE)} 的内容，对比可能需要较长时间
          </div>
        )}

        <div className="text-inputs-row">
          <div className="text-input-col">
            <div className="input-header">
              <h3>左侧文本（原始）</h3>
              <div className="input-meta">
                <span dangerouslySetInnerHTML={{
                  __html: `字符：<code>${leftText.length.toLocaleString()}</code>`,
                }} />
                <span dangerouslySetInnerHTML={{
                  __html: `大小：<code>${formatBytes(leftSize)}</code>`,
                }} />
              </div>
            </div>
            <textarea
              className="diff-textarea"
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              placeholder="粘贴或输入左侧文本..."
              spellCheck={false}
            />
          </div>

          <div className="text-input-col">
            <div className="input-header">
              <h3>右侧文本（修改后）</h3>
              <div className="input-meta">
                <span dangerouslySetInnerHTML={{
                  __html: `字符：<code>${rightText.length.toLocaleString()}</code>`,
                }} />
                <span dangerouslySetInnerHTML={{
                  __html: `大小：<code>${formatBytes(rightSize)}</code>`,
                }} />
              </div>
            </div>
            <textarea
              className="diff-textarea"
              value={rightText}
              onChange={(e) => setRightText(e.target.value)}
              placeholder="粘贴或输入右侧文本..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleCompare}
            disabled={loading || !canCompare}
          >
            {loading ? '对比中...' : '开始对比'}
          </button>
          <button
            className="secondary-btn"
            onClick={handleSwap}
            disabled={!leftText && !rightText}
          >
            交换左右文本
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            清除全部
          </button>
        </div>

        {renderErrorBox(error)}
      </section>

      {result && (
        <section className="tool-section">
          <h2>对比结果</h2>
          {renderStats()}
          {renderSegmentsList()}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li><strong>纯前端实现：</strong>所有对比均在浏览器本地执行，不向任何后端服务器发送数据。</li>
          <li><strong>行级对比：</strong>按行进行差异分析，适合对比代码、文档等结构化文本。</li>
          <li><strong>词级对比：</strong>按单词和空白进行差异分析，适合查看句子内部的细微变化。</li>
          <li><strong>忽略空白：</strong>勾选后将忽略空格和制表符的差异，主要关注内容本身。</li>
          <li><strong>标准化换行：</strong>自动将不同系统的换行符（CRLF/CR/LF）统一为 LF，避免虚假差异。</li>
          <li><strong>输入限制：</strong>建议输入在 {formatBytes(MAX_SAFE_INPUT_SIZE)} 以内；过大输入可能导致页面卡顿或超时。</li>
        </ul>
      </div>
    </div>
  )
}
