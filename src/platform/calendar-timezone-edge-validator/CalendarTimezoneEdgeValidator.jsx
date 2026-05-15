import { useState, useCallback, useMemo } from 'react'
import './CalendarTimezoneEdgeValidator.css'
import {
  PlainDateTime,
  PlainDate,
  hasNativeTemporal,
  TIMEZONE_MODE,
  DST_STATUS,
  INPUT_TYPE,
  WEEKDAYS,
  COMMON_TIMEZONES,
  COMPARISON_TIMEZONES,
  getAllExamples,
  detectInputSupport,
  formatDateForInput,
  parseDateInput,
  isLeapYear,
  isMonthEnd,
  getWeekdayName,
  formatTimezoneName,
  formatOffsetMinutes,
  compareTimezones,
  validateDateTime,
  getSeverityByErrorType,
  getErrorIcon,
} from './logic/index.js'

function CalendarTimezoneEdgeValidator() {
  const [dateTime, setDateTime] = useState(
    PlainDateTime.from({ year: 2024, month: 3, day: 10, hour: 2, minute: 30 })
  )
  const [timezoneMode, setTimezoneMode] = useState(TIMEZONE_MODE.IANA)
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York')
  const [fixedOffset, setFixedOffset] = useState(0)
  const [disabledWeekdays, setDisabledWeekdays] = useState([WEEKDAYS.SUNDAY, WEEKDAYS.SATURDAY])
  const [minDate, setMinDate] = useState(null)
  const [maxDate, setMaxDate] = useState(null)
  const [selectedExampleKey, setSelectedExampleKey] = useState(null)

  const inputSupport = useMemo(() => detectInputSupport(), [])

  const validationResult = useMemo(() => {
    return validateDateTime(dateTime, {
      minDate,
      maxDate,
      disabledWeekdays,
      timeZone: timezoneMode === TIMEZONE_MODE.IANA ? selectedTimezone : null,
      warnWallClockWithoutOffset: timezoneMode === TIMEZONE_MODE.FIXED_OFFSET,
    })
  }, [dateTime, minDate, maxDate, disabledWeekdays, selectedTimezone, timezoneMode])

  const timezoneComparison = useMemo(() => {
    return compareTimezones(dateTime, COMPARISON_TIMEZONES)
  }, [dateTime])

  const dateInfo = useMemo(() => {
    const isLeap = isLeapYear(dateTime.year)
    const isEndOfMonth = isMonthEnd(dateTime)
    const weekdayName = getWeekdayName(dateTime.dayOfWeek)

    return [
      { label: '星期', value: weekdayName },
      { label: '闰年', value: isLeap ? '是' : '否' },
      { label: '月末', value: isEndOfMonth ? '是' : '否' },
      { label: 'Temporal API', value: hasNativeTemporal ? '原生支持' : 'Polyfill' },
    ]
  }, [dateTime])

  const handleDateTimeChange = useCallback((e) => {
    const value = e.target.value
    const parsed = parseDateInput(value)
    if (parsed) {
      setDateTime(parsed)
    }
  }, [])

  const handlePresetClick = useCallback((example) => {
    setDateTime(example.dateTime)
    setSelectedTimezone(example.timezone)
    setTimezoneMode(TIMEZONE_MODE.IANA)
    setSelectedExampleKey(example.key)
  }, [])

  const handleWeekdayToggle = useCallback((weekday) => {
    setDisabledWeekdays(prev => {
      if (prev.includes(weekday)) {
        return prev.filter(w => w !== weekday)
      }
      return [...prev, weekday]
    })
  }, [])

  const handleMinDateChange = useCallback((e) => {
    const value = e.target.value
    if (!value) {
      setMinDate(null)
      return
    }
    const parsed = parseDateInput(value)
    if (parsed) {
      setMinDate(parsed instanceof PlainDateTime ? parsed.plainDate : parsed)
    }
  }, [])

  const handleMaxDateChange = useCallback((e) => {
    const value = e.target.value
    if (!value) {
      setMaxDate(null)
      return
    }
    const parsed = parseDateInput(value)
    if (parsed) {
      setMaxDate(parsed instanceof PlainDateTime ? parsed.plainDate : parsed)
    }
  }, [])

  const renderErrors = () => {
    if (validationResult.errors.length === 0) return null

    return (
      <div className="validation-errors">
        {validationResult.errors.map((error, index) => {
          const severity = getSeverityByErrorType(error.type)
          return (
            <div key={index} className={`validation-error ${severity}`}>
              <span className="error-icon">{getErrorIcon(severity)}</span>
              <div className="error-content">
                <p className="error-message">{error.message}</p>
                {error.details && (
                  <p className="error-details">
                    {error.details.suggestion || ''}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderStatusSummary = () => {
    let summaryClass = 'status-summary'
    if (validationResult.errors.some(e => getSeverityByErrorType(e.type) === 'error')) {
      summaryClass += ' has-errors'
    } else if (validationResult.hasWarnings) {
      summaryClass += ' has-warnings'
    }

    return (
      <div className={summaryClass}>
        <div className="status-item">
          <span className="icon">{validationResult.isValid ? '✅' : '⚠️'}</span>
          <span className="label">状态：</span>
          <span className="value">{validationResult.isValid ? '有效' : '存在问题'}</span>
        </div>
        {validationResult.hasDSTIssue && (
          <div className="status-item">
            <span className="icon">⏰</span>
            <span className="label">DST 问题：</span>
            <span className="value">存在夏令时间隙</span>
          </div>
        )}
        {validationResult.hasWarnings && (
          <div className="status-item">
            <span className="icon">📝</span>
            <span className="label">警告：</span>
            <span className="value">注意潜在问题</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="calendar-timezone-validator">
      <header>
        <h1>日历时区边缘情况验证器</h1>
        <p className="subtitle">
          验证夏令时、月末、闰年等边缘日期 | DST Gap / Fall Back 检测 | 多时区对照
        </p>
      </header>

      <section className="control-panel">
        <h3>输入控制</h3>

        <div className="input-row">
          <div className="input-group">
            <label>日期时间</label>
            <input
              type={inputSupport[INPUT_TYPE.DATETIME_LOCAL] ? 'datetime-local' : 'text'}
              value={formatDateForInput(dateTime)}
              onChange={handleDateTimeChange}
            />
          </div>

          <div className="input-group">
            <label>时区模式</label>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${timezoneMode === TIMEZONE_MODE.IANA ? 'active' : ''}`}
                onClick={() => setTimezoneMode(TIMEZONE_MODE.IANA)}
              >
                IANA 时区
              </button>
              <button
                className={`mode-btn ${timezoneMode === TIMEZONE_MODE.FIXED_OFFSET ? 'active' : ''}`}
                onClick={() => setTimezoneMode(TIMEZONE_MODE.FIXED_OFFSET)}
              >
                固定偏移
              </button>
            </div>
          </div>

          {timezoneMode === TIMEZONE_MODE.IANA ? (
            <div className="input-group">
              <label>选择时区</label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
              >
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>
                    {formatTimezoneName(tz)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="input-group">
              <label>UTC 偏移（分钟）</label>
              <input
                type="number"
                value={fixedOffset}
                onChange={(e) => setFixedOffset(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          )}
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>禁用星期</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(WEEKDAYS).map(([name, value]) => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={disabledWeekdays.includes(value)}
                    onChange={() => handleWeekdayToggle(value)}
                  />
                  <span style={{ fontSize: '13px' }}>{getWeekdayName(value)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>最小日期（可选）</label>
            <input
              type={inputSupport[INPUT_TYPE.DATE] ? 'date' : 'text'}
              value={minDate ? minDate.toString() : ''}
              onChange={handleMinDateChange}
              placeholder="留空则不限制"
            />
          </div>
          <div className="input-group">
            <label>最大日期（可选）</label>
            <input
              type={inputSupport[INPUT_TYPE.DATE] ? 'date' : 'text'}
              value={maxDate ? maxDate.toString() : ''}
              onChange={handleMaxDateChange}
              placeholder="留空则不限制"
            />
          </div>
        </div>

        <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px', color: '#374151' }}>
          快速示例
        </h4>
        <div className="preset-buttons">
          {getAllExamples().map(example => (
            <button
              key={example.key}
              className={`preset-btn ${selectedExampleKey === example.key ? 'selected' : ''}`}
              onClick={() => handlePresetClick(example)}
            >
              <strong>{example.name}</strong>
              <span>{example.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="validation-section">
        <h3>验证结果</h3>
        {renderStatusSummary()}
        {renderErrors()}

        <div className="date-info">
          {dateInfo.map((item, index) => (
            <div key={index} className="date-info-item">
              <span className="label">{item.label}</span>
              <span className="value">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="timezone-comparison">
        <h3>多时区对照</h3>
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>时区</th>
                <th>本地时间</th>
                <th>UTC 偏移</th>
                <th>DST 状态</th>
              </tr>
            </thead>
            <tbody>
              {timezoneComparison.map((tz, index) => (
                <tr key={index}>
                  <td>
                    <strong>{tz.displayName}</strong>
                  </td>
                  <td>{tz.formattedDateTime}</td>
                  <td>UTC{tz.offsetString}</td>
                  <td>
                    {tz.dstStatus && (
                      <span className={`dst-indicator ${
                        tz.dstStatus.status === DST_STATUS.SPRING_FORWARD_GAP ? 'gap' :
                        tz.dstStatus.status === DST_STATUS.FALL_BACK_REPEAT ? 'repeat' : 'normal'
                      }`}>
                        {tz.dstStatus.status === DST_STATUS.SPRING_FORWARD_GAP && '⚠️ 时间不存在'}
                        {tz.dstStatus.status === DST_STATUS.FALL_BACK_REPEAT && '🔄 时间重复'}
                        {tz.dstStatus.status === DST_STATUS.NORMAL && '✓ 正常'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default CalendarTimezoneEdgeValidator
