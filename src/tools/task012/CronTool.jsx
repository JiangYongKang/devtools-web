import { useCallback, useState } from 'react'
import { interpretCron } from './logic/index'
import { COMMON_CRON_EXAMPLES, FIELD_DEFINITIONS } from './logic/constants'
import './CronTool.css'

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

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: '亚洲/上海 (UTC+8)', tzLabel: 'UTC+8' },
  { value: 'Asia/Tokyo', label: '亚洲/东京 (UTC+9)', tzLabel: 'UTC+9' },
  { value: 'Asia/Hong_Kong', label: '亚洲/香港 (UTC+8)', tzLabel: 'UTC+8' },
  { value: 'Asia/Singapore', label: '亚洲/新加坡 (UTC+8)', tzLabel: 'UTC+8' },
  { value: 'America/New_York', label: '美国/纽约 (UTC-5/-4)', tzLabel: 'UTC-5/-4' },
  { value: 'America/Los_Angeles', label: '美国/洛杉矶 (UTC-8/-7)', tzLabel: 'UTC-8/-7' },
  { value: 'Europe/London', label: '欧洲/伦敦 (UTC+0/+1)', tzLabel: 'UTC+0/+1' },
  { value: 'Europe/Paris', label: '欧洲/巴黎 (UTC+1/+2)', tzLabel: 'UTC+1/+2' },
  { value: 'UTC', label: 'UTC', tzLabel: 'UTC' },
]

const LANGUAGE_OPTIONS = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
]

export default function CronTool() {
  const [expression, setExpression] = useState('0 0 12 * * ?')
  const [timezoneId, setTimezoneId] = useState('Asia/Shanghai')
  const [language, setLanguage] = useState('zh')
  const [interpretResult, setInterpretResult] = useState(null)
  const [interpretError, setInterpretError] = useState(null)

  const getTimezoneLabel = (tzId) => {
    const option = TIMEZONE_OPTIONS.find((opt) => opt.value === tzId)
    return option ? option.tzLabel : tzId
  }

  const handleInterpret = useCallback(() => {
    setInterpretResult(null)
    setInterpretError(null)

    const result = interpretCron({
      expression,
      timezoneId,
      language,
      includeNextTriggers: true,
      nextTriggerCount: 10,
    })

    if (result.success) {
      setInterpretResult(result.result)
    } else {
      setInterpretError(result.error)
    }
  }, [expression, timezoneId, language])

  const handleApplyExample = useCallback((example) => {
    setExpression(example.expression)
  }, [])

  const handleClear = useCallback(() => {
    setExpression('')
    setInterpretResult(null)
    setInterpretError(null)
  }, [])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <div className="error-code">
          <span className="error-label">错误码</span>
          <code>{escapeHtml(err.code)}</code>
        </div>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const renderFieldDescription = (label, description, hasField = true) => {
    if (!hasField) return null
    return (
      <div className="field-desc-item">
        <span className="field-label">{label}</span>
        <span className="field-value">{escapeHtml(description)}</span>
      </div>
    )
  }

  return (
    <div className="cron-tool">
      <section className="tool-section">
        <h2>Cron 表达式解释器</h2>

        <div className="form-group full-width">
          <label htmlFor="cron-expression">
            Cron 表达式
          </label>
          <input
            id="cron-expression"
            type="text"
            className={`cron-input ${interpretError ? 'error' : ''}`}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="例如：0 0 12 * * ? 或 0 12 * * ?"
            spellCheck={false}
            autoComplete="off"
          />
          <div className="input-hint">
            支持五域（分 时 日 月 周）和六域（秒 分 时 日 月 周）表达式
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="timezone">时区</label>
            <select
              id="timezone"
              className="form-select"
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
            <label htmlFor="language">语言</label>
            <select
              id="language"
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>常用表达式</label>
          <div className="example-buttons">
            {COMMON_CRON_EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                className="example-btn"
                onClick={() => handleApplyExample(example)}
                title={example.description}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleInterpret}
          >
            解释表达式
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            清除
          </button>
        </div>

        {renderErrorBox(interpretError)}
      </section>

      {interpretResult && (
        <section className="tool-section result-section">
          <h2>解释结果</h2>

          <div className="result-box">
            <div className="result-header">
              <span className="result-label">完整说明</span>
            </div>
            <div className="result-description">
              {escapeHtml(interpretResult.description)}
            </div>
            <div className="result-meta">
              <span dangerouslySetInnerHTML={{
                __html: `原始表达式：<code>${escapeHtml(interpretResult.originalExpression)}</code>`,
              }} />
              <span dangerouslySetInnerHTML={{
                __html: `字段数量：<code>${interpretResult.fieldCount}</code>`,
              }} />
            </div>
          </div>

          <div className="field-descriptions">
            <h3>分域说明</h3>
            <div className="field-desc-grid">
              {renderFieldDescription(
                FIELD_DEFINITIONS.seconds.nameZh,
                interpretResult.secondsDescription,
                interpretResult.fieldCount === 6,
              )}
              {renderFieldDescription(
                FIELD_DEFINITIONS.minutes.nameZh,
                interpretResult.minutesDescription,
              )}
              {renderFieldDescription(
                FIELD_DEFINITIONS.hours.nameZh,
                interpretResult.hoursDescription,
              )}
              {renderFieldDescription(
                FIELD_DEFINITIONS.dayOfMonth.nameZh,
                interpretResult.dayOfMonthDescription,
              )}
              {renderFieldDescription(
                FIELD_DEFINITIONS.month.nameZh,
                interpretResult.monthDescription,
              )}
              {renderFieldDescription(
                FIELD_DEFINITIONS.dayOfWeek.nameZh,
                interpretResult.dayOfWeekDescription,
              )}
            </div>
          </div>

          {interpretResult.nextTriggerTimes && interpretResult.nextTriggerTimes.length > 0 && (
            <div className="next-triggers">
              <h3>
                最近触发时刻
                <span className="timezone-hint">
                  ({getTimezoneLabel(timezoneId)})
                </span>
              </h3>
              <ol className="trigger-list">
                {interpretResult.nextTriggerTimes.map((time, index) => (
                  <li key={index} className="trigger-item">
                    <code>{escapeHtml(time)}</code>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解释逻辑均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>五域表达式：</strong>格式为 <code>分 时 日 月 周</code>，如 <code>0 12 * * ?</code>
          </li>
          <li>
            <strong>六域表达式：</strong>格式为 <code>秒 分 时 日 月 周</code>，如 <code>0 0 12 * * ?</code>
          </li>
          <li>
            <strong>日期冲突：</strong>日（Day of Month）和周（Day of Week）不能同时指定具体值，
            其中一个必须使用 <code>?</code> 或 <code>*</code>。
          </li>
        </ul>
        <h3>字段格式</h3>
        <ul>
          <li><code>*</code>：匹配所有值</li>
          <li><code>?</code>：不指定（仅用于日和周字段）</li>
          <li><code>,</code>：分隔多个值，如 <code>1,15,30</code></li>
          <li><code>-</code>：范围，如 <code>1-5</code></li>
          <li><code>/</code>：步长，如 <code>*/5</code>（每隔 5 个单位）</li>
        </ul>
      </div>
    </div>
  )
}
