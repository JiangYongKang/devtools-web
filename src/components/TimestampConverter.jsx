
import { useState, useCallback } from 'react'
import {
  toDateTime,
  toTimestamp,
  ApiError,
  GRANULARITY_OPTIONS,
  FORMAT_PATTERN_OPTIONS,
  TIMEZONE_OPTIONS,
} from '../services/timestampApi'

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000)
}

function formatDateTimeForInput(data) {
  if (!data || !data.formattedDateTime) return ''
  return data.formattedDateTime
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export default function TimestampConverter() {
  const [timestampInput, setTimestampInput] = useState(String(getCurrentTimestamp()))
  const [dateTimeInput, setDateTimeInput] = useState('')
  const [timezoneId, setTimezoneId] = useState('Asia/Shanghai')
  const [granularity, setGranularity] = useState('SECONDS')
  const [formatPattern, setFormatPattern] = useState('YYYY-mm-dd HH:mm:ss')
  const [toDateTimeResult, setToDateTimeResult] = useState(null)
  const [toTimestampResult, setToTimestampResult] = useState(null)
  const [loading, setLoading] = useState({ toDateTime: false, toTimestamp: false })
  const [error, setError] = useState({ toDateTime: null, toTimestamp: null })
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

  const handleToDateTime = useCallback(async () => {
    setLoading((prev) => ({ ...prev, toDateTime: true }))
    setError((prev) => ({ ...prev, toDateTime: null }))
    setToDateTimeResult(null)

    try {
      const result = await toDateTime({
        timestamp: timestampInput,
        granularity,
        timezoneId,
        formatPattern,
      })
      setToDateTimeResult(result)
      setDateTimeInput(formatDateTimeForInput(result))
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.errorMessage || `错误码：${err.errorCode}`
          : err?.message || '请求失败，请稍后重试'
      setError((prev) => ({ ...prev, toDateTime: errorMessage }))
    } finally {
      setLoading((prev) => ({ ...prev, toDateTime: false }))
    }
  }, [timestampInput, granularity, timezoneId, formatPattern])

  const handleToTimestamp = useCallback(async () => {
    setLoading((prev) => ({ ...prev, toTimestamp: true }))
    setError((prev) => ({ ...prev, toTimestamp: null }))
    setToTimestampResult(null)

    try {
      const result = await toTimestamp({
        dateTimeString: dateTimeInput,
        timezoneId,
        formatPattern,
        granularity,
      })
      setToTimestampResult(result)
      setTimestampInput(String(result.timestamp))
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.errorMessage || `错误码：${err.errorCode}`
          : err?.message || '请求失败，请稍后重试'
      setError((prev) => ({ ...prev, toTimestamp: errorMessage }))
    } finally {
      setLoading((prev) => ({ ...prev, toTimestamp: false }))
    }
  }, [dateTimeInput, timezoneId, formatPattern, granularity])

  return (
    <div className="timestamp-converter">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="converter-section to-date-time-section">
        <h2>时间戳 → 可读日期时间</h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="timestamp-input">Unix 时间戳</label>
            <input
              id="timestamp-input"
              type="text"
              value={timestampInput}
              onChange={(e) => setTimestampInput(e.target.value)}
              placeholder="输入时间戳数值，如 1609459200"
            />
            <div className="input-hint">支持秒级或毫秒级大数字输入</div>
          </div>

          <div className="form-group">
            <label htmlFor="granularity-to-datetime">粒度</label>
            <select
              id="granularity-to-datetime"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
            >
              {GRANULARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="timezone-to-datetime">目标时区 (IANA)</label>
            <select
              id="timezone-to-datetime"
              value={timezoneId}
              onChange={(e) => setTimezoneId(e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="format-to-datetime">输出格式</label>
            <select
              id="format-to-datetime"
              value={formatPattern}
              onChange={(e) => setFormatPattern(e.target.value)}
            >
              {FORMAT_PATTERN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleToDateTime}
            disabled={loading.toDateTime || !timestampInput.trim()}
          >
            {loading.toDateTime ? '转换中...' : '转换为日期时间'}
          </button>
        </div>

        {error.toDateTime && (
          <div className="error-box">
            <strong>转换失败</strong>
            <p dangerouslySetInnerHTML={{ __html: escapeHtml(error.toDateTime) }} />
          </div>
        )}

        {toDateTimeResult && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">转换结果</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(toDateTimeResult.formattedDateTime, '日期时间')}
              >
                复制
              </button>
            </div>
            <div className="result-main" data-testid="to-datetime-result">
              <span dangerouslySetInnerHTML={{ __html: escapeHtml(toDateTimeResult.formattedDateTime) }} />
            </div>
            <div className="result-details">
              <div className="detail-row">
                <span className="detail-label">时区：</span>
                <span dangerouslySetInnerHTML={{ __html: escapeHtml(toDateTimeResult.timezoneId) }} />
              </div>
              <div className="detail-row">
                <span className="detail-label">格式：</span>
                <span dangerouslySetInnerHTML={{ __html: escapeHtml(toDateTimeResult.formatPattern) }} />
              </div>
              <div className="detail-grid">
                <span>年: <strong dangerouslySetInnerHTML={{ __html: escapeHtml(String(toDateTimeResult.year)) }} /></span>
                <span>月: <strong dangerouslySetInnerHTML={{ __html: escapeHtml(String(toDateTimeResult.month)) }} /></span>
                <span>日: <strong dangerouslySetInnerHTML={{ __html: escapeHtml(String(toDateTimeResult.day)) }} /></span>
                <span>时: <strong dangerouslySetInnerHTML={{ __html: escapeHtml(String(toDateTimeResult.hour)) }} /></span>
                <span>分: <strong dangerouslySetInnerHTML={{ __html: escapeHtml(String(toDateTimeResult.minute)) }} /></span>
                <span>秒: <strong dangerouslySetInnerHTML={{ __html: escapeHtml(String(toDateTimeResult.second)) }} /></span>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="section-divider" />

      <section className="converter-section to-timestamp-section">
        <h2>可读日期时间 → 时间戳</h2>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="datetime-input">日期时间字符串</label>
            <input
              id="datetime-input"
              type="text"
              value={dateTimeInput}
              onChange={(e) => setDateTimeInput(e.target.value)}
              placeholder="输入日期时间，如 2021-01-01 00:00:00"
            />
            <div className="input-hint">格式需与下方「解析格式」匹配</div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="timezone-to-timestamp">时区 (IANA)</label>
            <select
              id="timezone-to-timestamp"
              value={timezoneId}
              onChange={(e) => setTimezoneId(e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="format-to-timestamp">解析格式</label>
            <select
              id="format-to-timestamp"
              value={formatPattern}
              onChange={(e) => setFormatPattern(e.target.value)}
            >
              {FORMAT_PATTERN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="granularity-to-timestamp">输出粒度</label>
            <select
              id="granularity-to-timestamp"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
            >
              {GRANULARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleToTimestamp}
            disabled={loading.toTimestamp || !dateTimeInput.trim()}
          >
            {loading.toTimestamp ? '转换中...' : '转换为时间戳'}
          </button>
        </div>

        {error.toTimestamp && (
          <div className="error-box">
            <strong>转换失败</strong>
            <p dangerouslySetInnerHTML={{ __html: escapeHtml(error.toTimestamp) }} />
          </div>
        )}

        {toTimestampResult && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">转换结果</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(String(toTimestampResult.timestamp), '时间戳')}
              >
                复制
              </button>
            </div>
            <div className="result-main timestamp" data-testid="to-timestamp-result">
              <span dangerouslySetInnerHTML={{ __html: escapeHtml(String(toTimestampResult.timestamp)) }} />
            </div>
            <div className="result-details">
              <div className="detail-row">
                <span className="detail-label">粒度：</span>
                <span dangerouslySetInnerHTML={{ __html: escapeHtml(toTimestampResult.granularity) }} />
              </div>
              <div className="detail-row">
                <span className="detail-label">原始输入：</span>
                <span dangerouslySetInnerHTML={{ __html: escapeHtml(toTimestampResult.originalDateTimeString) }} />
              </div>
              <div className="detail-row">
                <span className="detail-label">时区：</span>
                <span dangerouslySetInnerHTML={{ __html: escapeHtml(toTimestampResult.timezoneId) }} />
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>核心换算由后端统一执行，避免前端与后端时区/夏令时规则不一致</li>
          <li>时区使用完整 IANA 标识（如 Asia/Shanghai），不推荐三字母缩写</li>
          <li>边缘情况（歧义时刻、极大时间范围）以后端实现为准</li>
        </ul>
      </div>
    </div>
  )
}
