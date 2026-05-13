import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  processBatch,
  exportToTsv,
  detectApiSupport,
  normalizeOptions,
  EXAMPLE_DOMAINS,
  OUTPUT_MODES,
  OUTPUT_MODE_LABELS,
  XN_CASE_OPTIONS,
  XN_CASE_OPTION_LABELS,
  IDNA_MODES,
  IDNA_MODE_LABELS,
  STORAGE_KEY,
} from './logic/index.js'
import './IdnPunycodeConverterTool.css'

export default function IdnPunycodeConverterTool() {
  const [input, setInput] = useState(() => EXAMPLE_DOMAINS[0]?.input ?? '')
  const [opts, setOpts] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return normalizeOptions()
      const parsed = JSON.parse(raw)
      return normalizeOptions(parsed)
    } catch {
      return normalizeOptions()
    }
  })
  const [batch, setBatch] = useState(() => processBatch('', normalizeOptions()))

  useEffect(() => {
    const id = setTimeout(() => {
      setBatch(processBatch(input, normalizeOptions(opts)))
    }, 150)
    return () => clearTimeout(id)
  }, [input, opts])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opts))
    } catch {
      /* ignore quota */
    }
  }, [opts])

  const apiSupport = useMemo(() => detectApiSupport(), [])

  const setOption = useCallback((patch) => {
    setOpts((prev) => normalizeOptions({ ...prev, ...patch }))
  }, [])

  const copyTsv = useCallback(() => {
    const tsv = exportToTsv(batch)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tsv).catch(() => {})
    }
  }, [batch])

  return (
    <div className="idn-punycode-tool">
      <section className="idn-section">
        <h2 className="idn-section-title">输入</h2>
        <p className="idn-hint">
          每行一个域名；支持批量。环境检测：URL=
          {apiSupport.hasUrl ? '有' : '无'}，Intl=
          {apiSupport.hasIntl ? '有' : '无'}，浏览器 IDN 行为≈
          <strong>{apiSupport.idnSupport}</strong>
        </p>
        <textarea
          className="idn-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          aria-label="域名输入，每行一条"
        />
      </section>

      <section className="idn-section">
        <h2 className="idn-section-title">选项</h2>
        <div className="idn-options-grid">
          <label>
            输出模式
            <select
              value={opts.outputMode}
              onChange={(e) => setOption({ outputMode: e.target.value })}
            >
              {Object.values(OUTPUT_MODES).map((m) => (
                <option key={m} value={m}>
                  {OUTPUT_MODE_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </label>
          <label>
            xn-- 大小写
            <select
              value={opts.xnCaseOption}
              onChange={(e) => setOption({ xnCaseOption: e.target.value })}
            >
              {Object.values(XN_CASE_OPTIONS).map((m) => (
                <option key={m} value={m}>
                  {XN_CASE_OPTION_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </label>
          <label>
            IDNA 语义
            <select
              value={opts.idnaMode}
              onChange={(e) => setOption({ idnaMode: e.target.value })}
            >
              {Object.values(IDNA_MODES).map((m) => (
                <option key={m} value={m}>
                  {IDNA_MODE_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </label>
          <label className="idn-check">
            <input
              type="checkbox"
              checked={opts.caseFold}
              onChange={(e) => setOption({ caseFold: e.target.checked })}
            />
            大小写折叠
          </label>
          <label className="idn-check">
            <input
              type="checkbox"
              checked={opts.stripUrlPrefix}
              onChange={(e) => setOption({ stripUrlPrefix: e.target.checked })}
            />
            剥离 http(s):// 前缀
          </label>
        </div>
      </section>

      <section className="idn-section">
        <h2 className="idn-section-title">示例</h2>
        <div className="idn-examples">
          {EXAMPLE_DOMAINS.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="idn-example-btn"
              title={ex.description}
              onClick={() => setInput(ex.input)}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </section>

      <section className="idn-section">
        <div className="idn-toolbar">
          <h2 className="idn-section-title">结果</h2>
          <button type="button" className="idn-copy-btn" onClick={copyTsv}>
            复制 TSV
          </button>
        </div>
        <p className="idn-stats">
          有效 {batch.successCount} / 行数 {batch.totalCount}
          {batch.truncated ? `（已截断 ${batch.truncatedCount} 行）` : ''}
        </p>
        <div className="idn-table-wrap">
          <table className="idn-table">
            <thead>
              <tr>
                <th>#</th>
                <th>原始</th>
                <th>输出</th>
                <th>U-label</th>
                <th>A-label</th>
                <th>有效</th>
                <th>错误</th>
              </tr>
            </thead>
            <tbody>
              {batch.results.map((row) => (
                <tr key={row.index} className={row.isValid ? '' : 'idn-row-err'}>
                  <td>{row.index + 1}</td>
                  <td className="idn-mono">{row.original}</td>
                  <td className="idn-mono">{row.output}</td>
                  <td className="idn-mono">{row.uLabel}</td>
                  <td className="idn-mono">{row.aLabel}</td>
                  <td>{row.isEmpty ? '—' : row.isValid ? '是' : '否'}</td>
                  <td className="idn-err">
                    {row.errors?.length
                      ? row.errors.map((e) => e.errorMessage).join('；')
                      : '—'}
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
