import { useCallback, useEffect, useMemo, useState } from 'react'
import './BusinessDateRulesEngineTool.css'
import {
  EXAMPLES,
  COMMON_TIMEZONES,
  addDateUnits,
  calculateSLAByHours,
  calculateSLAByWorkdays,
  checkSLAOverdue,
  formatDateStr,
  formatDateTime,
  isWorkday,
  checkDSTStatus,
} from './logic/index.js'

const DEFAULT_HOLIDAY_JSON = JSON.stringify([
  { date: '2025-01-01', name: '元旦', type: 'holiday' },
  { date: '2025-02-04', name: '春节调休上班', type: 'workday' },
], null, 2)

function getTodayDateStr() {
  const today = new Date()
  return formatDateStr(today)
}

function getCurrentTimeStr() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function DSTWarningBox({ warnings }) {
  if (!warnings || warnings.length === 0) return null

  return warnings.map((warning, idx) => {
    if (warning.nonExistent?.isNonExistent) {
      return (
        <div key={`dst-${idx}`} className="error-box">
          <strong>⚠️ 不存在的时间（{warning.when === 'start' ? '起始' : '结束'}时刻）</strong>
          <p>{warning.nonExistent.warning}</p>
          <p style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
            偏移变化：{warning.nonExistent.info.offsetBefore} → {warning.nonExistent.info.offsetAfter}
            ，建议：{warning.nonExistent.info.suggestion}
          </p>
        </div>
      )
    }
    if (warning.repeated?.isRepeated) {
      return (
        <div key={`dst-${idx}`} className="warning-box">
          <strong>⚠️ 重复小时（{warning.when === 'start' ? '起始' : '结束'}时刻）</strong>
          <p>{warning.repeated.warning}</p>
          <p style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
            {warning.repeated.info.occurrence1} / {warning.repeated.info.occurrence2}
          </p>
        </div>
      )
    }
    if (warning.transition?.hasTransition) {
      return (
        <div key={`dst-${idx}`} className="info-box">
          <strong>ℹ️ DST 边界日（{warning.when === 'start' ? '起始' : '结束'}日期）</strong>
          <p>
            该日存在 {warning.transition.transitionType === 'spring-forward' ? '春季向前跳变' : '秋季回退'}，
            偏移 {warning.transition.transitionInfo.offsetBeforeFormatted} → {warning.transition.transitionInfo.offsetAfterFormatted}
          </p>
        </div>
      )
    }
    return null
  })
}

function MilestoneTimeline({ milestones }) {
  if (!milestones || milestones.length === 0) return null

  return (
    <div>
      <div className="section-divider">里程碑</div>
      <div className="milestone-list">
        {milestones.map((m, idx) => (
          <div key={idx} className="milestone-item">
            <div className="milestone-percent">{m.percentage}%</div>
            <div className="milestone-progress">
              <div className="milestone-progress-bar" style={{ width: `${m.percentage}%` }} />
            </div>
            <div className="milestone-time">{m.timeFormatted}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkippedDaysList({ skippedDays }) {
  if (!skippedDays || skippedDays.length === 0) return null

  return (
    <div>
      <div className="section-divider">跳过的日期（共 {skippedDays.length} 天）</div>
      <ul className="skipped-list">
        {skippedDays.map((d, idx) => (
          <li key={idx}>
            <code>{d.date}</code> — {d.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function BusinessDateRulesEngineTool() {
  const [activeTab, setActiveTab] = useState('date-ops')
  const [copyStatus, setCopyStatus] = useState(null)

  const [startDate, setStartDate] = useState(getTodayDateStr())
  const [startTime, setStartTime] = useState(getCurrentTimeStr())
  const [timeZone, setTimeZone] = useState('Asia/Shanghai')
  const [addAmount, setAddAmount] = useState(5)
  const [addUnit, setAddUnit] = useState('workdays')
  const [cutoffTime, setCutoffTime] = useState('17:00')
  const [holidayJson, setHolidayJson] = useState(DEFAULT_HOLIDAY_JSON)
  const [holidayParseError, setHolidayParseError] = useState(null)

  const [slaType, setSlaType] = useState('hours')
  const [slaAmount, setSlaAmount] = useState(24)
  const [businessStart, setBusinessStart] = useState('09:00')
  const [businessEnd, setBusinessEnd] = useState('17:00')
  const [slaEndOfDay, setSlaEndOfDay] = useState(false)

  const [dateOpsResult, setDateOpsResult] = useState(null)
  const [slaResult, setSlaResult] = useState(null)
  const [dstCheckResult, setDstCheckResult] = useState(null)

  const parsedHolidayTable = useMemo(() => {
    if (!holidayJson.trim()) {
      setHolidayParseError(null)
      return []
    }
    try {
      const parsed = JSON.parse(holidayJson)
      if (!Array.isArray(parsed)) {
        setHolidayParseError('节假日表必须是数组')
        return []
      }
      setHolidayParseError(null)
      return parsed
    } catch (e) {
      setHolidayParseError(`JSON 解析错误：${e.message}`)
      return []
    }
  }, [holidayJson])

  const combinedStartDateTime = useMemo(() => {
    const [y, m, d] = startDate.split('-').map(Number)
    const [h, min] = startTime.split(':').map(Number)
    return new Date(y, m - 1, d, h, min, 0, 0)
  }, [startDate, startTime])

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
    if (example.holidayTable) {
      setHolidayJson(JSON.stringify(example.holidayTable, null, 2))
    }
    if (example.preset) {
      if (example.preset.startDate) setStartDate(example.preset.startDate)
      if (example.preset.startTime) setStartTime(example.preset.startTime)
      if (example.preset.timeZone) setTimeZone(example.preset.timeZone)
      if (example.preset.addAmount !== undefined) setAddAmount(example.preset.addAmount)
      if (example.preset.addUnit) setAddUnit(example.preset.addUnit)
      if (example.preset.cutoffTime !== undefined) setCutoffTime(example.preset.cutoffTime)
    }
    setDateOpsResult(null)
    setSlaResult(null)
    setDstCheckResult(null)
  }, [])

  const handleDateOpsCalculate = useCallback(() => {
    if (holidayParseError) return

    const result = addDateUnits(
      combinedStartDateTime,
      addAmount,
      addUnit,
      {
        timeZone,
        cutoffTime: cutoffTime || null,
        holidayTable: parsedHolidayTable,
      },
    )

    setDateOpsResult(result)
    setSlaResult(null)
  }, [combinedStartDateTime, addAmount, addUnit, timeZone, cutoffTime, parsedHolidayTable, holidayParseError])

  const handleSLACalculate = useCallback(() => {
    if (holidayParseError) return

    const options = {
      timeZone,
      cutoffTime: cutoffTime || null,
      holidayTable: parsedHolidayTable,
      businessHours: { start: businessStart, end: businessEnd },
      endOfDay: slaEndOfDay,
    }

    let result
    if (slaType === 'hours') {
      result = calculateSLAByHours(combinedStartDateTime, slaAmount, options)
    } else {
      result = calculateSLAByWorkdays(combinedStartDateTime, slaAmount, options)
    }

    setSlaResult(result)
    setDateOpsResult(null)
  }, [combinedStartDateTime, slaType, slaAmount, timeZone, cutoffTime, parsedHolidayTable, businessStart, businessEnd, slaEndOfDay, holidayParseError])

  const handleCheckDST = useCallback(() => {
    const result = checkDSTStatus(combinedStartDateTime, timeZone)
    setDstCheckResult(result)
  }, [combinedStartDateTime, timeZone])

  const handleClear = useCallback(() => {
    setDateOpsResult(null)
    setSlaResult(null)
    setDstCheckResult(null)
  }, [])

  useEffect(() => {
    handleCheckDST()
  }, [startDate, startTime, timeZone, handleCheckDST])

  useEffect(() => {
    if (holidayParseError) return
    if (activeTab === 'date-ops') {
      handleDateOpsCalculate()
    } else if (activeTab === 'sla') {
      handleSLACalculate()
    }
  }, [
    activeTab,
    combinedStartDateTime,
    addAmount,
    addUnit,
    timeZone,
    cutoffTime,
    parsedHolidayTable,
    holidayParseError,
    slaType,
    slaAmount,
    businessStart,
    businessEnd,
    slaEndOfDay,
    handleDateOpsCalculate,
    handleSLACalculate,
  ])

  return (
    <div className="business-date-rules-engine">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>工作日历规则引擎</h2>
        <p className="tool-description">
          支持 ISO 国家工作日规则（周一至五）+ 用户 JSON 节假日表；日期运算（工作日/自然日加减、cutoff 时间）；
          DST 边界检测与警告；SLA 截止时刻计算。
          <strong> 注意：</strong>农历相关节假日仅提供静态日期表，不实现天文农历算法。
        </p>
      </section>

      <section className="tool-section">
        <h3>内置示例</h3>
        <div className="examples-row">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              className="example-btn"
              onClick={() => handleLoadExample(example)}
              title={example.description}
            >
              <span className="example-name">{example.name}</span>
              <span className="example-desc">{example.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h3>节假日配置</h3>
        <div className="note-box">
          <strong>声明：</strong>农历相关节假日为静态日期映射表，不包含天文农历算法。
          格式：<code>[{'{ "date": "YYYY-MM-DD", "name": "节日名", "type": "holiday" | "workday" }'}]</code>，
          <code>type: workday</code> 表示调休工作日。
        </div>
        <textarea
          className="json-editor"
          value={holidayJson}
          onChange={(e) => setHolidayJson(e.target.value)}
          placeholder="粘贴节假日 JSON 数组..."
          spellCheck={false}
        />
        {holidayParseError && (
          <div className="error-box">
            <strong>JSON 格式错误</strong>
            <p>{holidayParseError}</p>
          </div>
        )}
        {parsedHolidayTable.length > 0 && !holidayParseError && (
          <div className="holiday-table-editor">
            <table className="holiday-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>名称</th>
                  <th>类型</th>
                </tr>
              </thead>
              <tbody>
                {parsedHolidayTable.slice(0, 20).map((h, idx) => (
                  <tr key={idx} className={h.type === 'workday' ? 'workday-row' : 'holiday-row'}>
                    <td><code>{h.date}</code></td>
                    <td>{h.name || '-'}</td>
                    <td>{h.type === 'workday' ? '调休工作日' : '节假日'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedHolidayTable.length > 20 && (
              <p style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                共 {parsedHolidayTable.length} 条记录，仅显示前 20 条
              </p>
            )}
          </div>
        )}
      </section>

      <section className="tool-section">
        <h3>全局配置</h3>
        <div className="form-row">
          <div className="form-group">
            <label>起始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>起始时间</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>时区</label>
            <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Cutoff 时间（空为不启用）</label>
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              placeholder="如 17:00"
            />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button className="secondary-btn" onClick={handleCheckDST}>
              刷新 DST 状态
            </button>
          </div>
        </div>
        {dstCheckResult && (
          <div className="result-box">
            <div className="result-meta">
              <div>当前时区偏移：<strong>{dstCheckResult.offset}</strong></div>
            </div>
            <DSTWarningBox
              warnings={[
                { when: 'check', ...dstCheckResult },
              ]}
            />
          </div>
        )}
      </section>

      <section className="tool-section">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'date-ops' ? 'active' : ''}`}
            onClick={() => setActiveTab('date-ops')}
          >
            日期运算
          </button>
          <button
            className={`tab-btn ${activeTab === 'sla' ? 'active' : ''}`}
            onClick={() => setActiveTab('sla')}
          >
            SLA 计算
          </button>
        </div>

        <div className={`tab-content ${activeTab === 'date-ops' ? 'active' : ''}`}>
          <h4>日期运算配置</h4>
          <div className="form-row">
            <div className="form-group">
              <label>增加/减少数量</label>
              <input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>单位</label>
              <select value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
                <option value="workdays">工作日</option>
                <option value="natural">自然日</option>
              </select>
            </div>
          </div>
          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleDateOpsCalculate}
              disabled={!!holidayParseError}
            >
              刷新计算
            </button>
            <button className="secondary-btn" onClick={handleClear}>
              清除结果
            </button>
          </div>

          {dateOpsResult && (
            <div className="result-box">
              <DSTWarningBox warnings={dateOpsResult.dstWarnings} />

              {dateOpsResult.cutoffAdjustment?.cutoffApplied && (
                <div className="info-box">
                  <strong>Cutoff 已应用</strong>
                  <p>
                    起始时间 {formatDateTime(dateOpsResult.cutoffAdjustment.originalDate, timeZone)}
                    晚于 cutoff {cutoffTime}，已调整到下一工作日
                  </p>
                </div>
              )}

              <div className="result-value">
                结果：{dateOpsResult.resultFormatted}
              </div>
              <div className="result-meta">
                <div>起始时间：{formatDateTime(combinedStartDateTime, timeZone)}</div>
                <div>运算：{addAmount > 0 ? '+' : ''}{addAmount} {addUnit === 'workdays' ? '个工作日' : '个自然日'}</div>
                <div>时区：{timeZone}</div>
              </div>

              <SkippedDaysList skippedDays={dateOpsResult.skippedDays} />
            </div>
          )}
        </div>

        <div className={`tab-content ${activeTab === 'sla' ? 'active' : ''}`}>
          <h4>SLA 计算配置</h4>
          <div className="form-row">
            <div className="form-group">
              <label>SLA 类型</label>
              <select value={slaType} onChange={(e) => setSlaType(e.target.value)}>
                <option value="hours">按小时</option>
                <option value="workdays">按工作日</option>
              </select>
            </div>
            <div className="form-group">
              <label>SLA {slaType === 'hours' ? '小时数' : '工作日数'}</label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={slaAmount}
                onChange={(e) => setSlaAmount(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>工作开始时间</label>
              <input
                type="time"
                value={businessStart}
                onChange={(e) => setBusinessStart(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>工作结束时间</label>
              <input
                type="time"
                value={businessEnd}
                onChange={(e) => setBusinessEnd(e.target.value)}
              />
            </div>
            {slaType === 'workdays' && (
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="sla-end-of-day"
                  checked={slaEndOfDay}
                  onChange={(e) => setSlaEndOfDay(e.target.checked)}
                />
                <label htmlFor="sla-end-of-day">截止到工作日结束时间</label>
              </div>
            )}
          </div>
          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleSLACalculate}
              disabled={!!holidayParseError}
            >
              刷新 SLA 计算
            </button>
            <button className="secondary-btn" onClick={handleClear}>
              清除结果
            </button>
          </div>

          {slaResult && (
            <div className="result-box">
              <DSTWarningBox warnings={slaResult.dstWarnings} />

              <div className="result-value">
                SLA 截止：{slaResult.deadlineFormatted}
              </div>
              <div className="result-meta">
                <div>起始时间：{formatDateTime(combinedStartDateTime, timeZone)}</div>
                <div>
                  SLA：{slaAmount} {slaType === 'hours' ? '工作小时' : '工作日'}
                  （{businessStart} - {businessEnd}）
                </div>
                <div>时区：{timeZone}</div>
              </div>

              <MilestoneTimeline milestones={slaResult.milestones} />

              {slaResult.skippedDays && (
                <SkippedDaysList skippedDays={slaResult.skippedDays} />
              )}
            </div>
          )}
        </div>
      </section>

      <section className="tool-section">
        <h3>说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>工作日规则：</strong>默认 ISO 工作日（周一至周五），可通过 JSON 表自定义节假日与调休工作日。
          </li>
          <li>
            <strong>Cutoff 时间：</strong>若起始时间晚于 cutoff，则从下一个工作日开始计算。
          </li>
          <li>
            <strong>DST 处理：</strong>使用 Intl.DateTimeFormat 检测时区偏移变化，
            对「不存在的时间」（春季跳变）显示错误，对「重复小时」（秋季回退）显示警告。
          </li>
          <li>
            <strong>SLA 计算：</strong>按工作小时计算时会跳过非工作时间和节假日，
            自动生成 25% / 50% / 75% / 100% 里程碑。
          </li>
          <li>
            <strong>农历声明：</strong>所有农历相关节假日均为静态映射表，不包含天文农历算法，
            如需精确农历请使用专用农历库。
          </li>
        </ul>
      </section>
    </div>
  )
}
