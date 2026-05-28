import { useCallback, useMemo, useState } from 'react'
import './GeoCoordinateDatumConverterTool.css'
import {
  convertCoordinate,
  formatCoordinate,
  isInChina,
  DATUM_TYPES,
  calculateOffset,
  parseCSV,
  batchConvert,
  resultsToCSV,
  generateLineStringGeoJSON,
  downloadGeoJSON,
} from './logic/index.js'
import { EXAMPLES, COMPLIANCE_NOTICE } from './logic/examples.js'

const MODES = {
  SINGLE: 'single',
  BATCH: 'batch',
  TRAJECTORY: 'trajectory',
}

function computeSingle(lat, lon, fromDatum, decimals) {
  const wgs84 =
    fromDatum === DATUM_TYPES.WGS84
      ? { lat, lon }
      : convertCoordinate(lat, lon, fromDatum, DATUM_TYPES.WGS84)

  const gcj02 = convertCoordinate(lat, lon, fromDatum, DATUM_TYPES.GCJ02)
  const bd09 = convertCoordinate(lat, lon, fromDatum, DATUM_TYPES.BD09)

  const gcjOffset = calculateOffset(wgs84.lat, wgs84.lon, gcj02.lat, gcj02.lon)
  const bdOffset = calculateOffset(wgs84.lat, wgs84.lon, bd09.lat, bd09.lon)
  const inChina = isInChina(wgs84.lat, wgs84.lon)

  return {
    original: { lat, lon },
    wgs84: {
      lat: formatCoordinate(wgs84.lat, decimals),
      lon: formatCoordinate(wgs84.lon, decimals),
    },
    gcj02: {
      lat: formatCoordinate(gcj02.lat, decimals),
      lon: formatCoordinate(gcj02.lon, decimals),
    },
    bd09: {
      lat: formatCoordinate(bd09.lat, decimals),
      lon: formatCoordinate(bd09.lon, decimals),
    },
    gcjOffset,
    bdOffset,
    inChina,
  }
}

export default function GeoCoordinateDatumConverterTool() {
  const [mode, setMode] = useState(MODES.SINGLE)

  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [fromDatum, setFromDatum] = useState(DATUM_TYPES.WGS84)
  const [toDatum, setToDatum] = useState(DATUM_TYPES.GCJ02)
  const [decimals, setDecimals] = useState(6)

  const [batchInput, setBatchInput] = useState('')
  const [batchFromDatum, setBatchFromDatum] = useState(DATUM_TYPES.WGS84)
  const [batchToDatum, setBatchToDatum] = useState(DATUM_TYPES.GCJ02)

  const [trajectoryInput, setTrajectoryInput] = useState('')
  const [trajectoryFromDatum, setTrajectoryFromDatum] = useState(DATUM_TYPES.WGS84)
  const [trajectoryToDatum, setTrajectoryToDatum] = useState(DATUM_TYPES.GCJ02)

  const [toast, setToast] = useState(null)

  const singleResult = useMemo(() => {
    const lat = parseFloat(latInput)
    const lon = parseFloat(lonInput)
    if (isNaN(lat) || isNaN(lon)) return null
    return computeSingle(lat, lon, fromDatum, decimals)
  }, [latInput, lonInput, fromDatum, decimals])

  const batchResults = useMemo(() => {
    const points = parseCSV(batchInput)
    if (points.length === 0) return null
    return batchConvert(points, batchFromDatum, batchToDatum, decimals)
  }, [batchInput, batchFromDatum, batchToDatum, decimals])

  const trajectoryResults = useMemo(() => {
    const points = parseCSV(trajectoryInput)
    if (points.length < 2) return null
    return batchConvert(points, trajectoryFromDatum, trajectoryToDatum, decimals)
  }, [trajectoryInput, trajectoryFromDatum, trajectoryToDatum, decimals])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleCopy = useCallback(async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label} 已复制到剪贴板`)
    } catch {
      showToast('复制失败', 'error')
    }
  }, [showToast])

  const handleLoadExample = useCallback((example) => {
    if (example.data.type === 'single') {
      setMode(MODES.SINGLE)
      setLatInput(String(example.data.wgs84.lat))
      setLonInput(String(example.data.wgs84.lon))
      setFromDatum(DATUM_TYPES.WGS84)
      setToDatum(DATUM_TYPES.GCJ02)
    } else if (example.data.type === 'batch') {
      setMode(MODES.BATCH)
      setBatchInput(example.data.csv)
      setBatchFromDatum(example.data.fromDatum)
      setBatchToDatum(example.data.toDatum)
    } else if (example.data.type === 'trajectory') {
      setMode(MODES.TRAJECTORY)
      const csv = example.data.points.map((p) => `${p.lat},${p.lon},${p.name}`).join('\n')
      setTrajectoryInput(csv)
      setTrajectoryFromDatum(example.data.fromDatum)
      setTrajectoryToDatum(example.data.toDatum)
    }
  }, [])

  const handleDownloadGeoJSON = useCallback(() => {
    if (!trajectoryResults) return
    const points = trajectoryResults.map((r) => ({ lat: r.lat, lon: r.lon, name: r.name }))
    const geojson = generateLineStringGeoJSON(points, `trajectory_${trajectoryToDatum}`)
    downloadGeoJSON(geojson, `trajectory_${trajectoryFromDatum}_to_${trajectoryToDatum}.geojson`)
    showToast('GeoJSON 已下载')
  }, [trajectoryResults, trajectoryFromDatum, trajectoryToDatum, showToast])

  const handleDownloadBatchCSV = useCallback(() => {
    if (!batchResults) return
    const csv = resultsToCSV(batchResults, batchFromDatum, batchToDatum)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coordinates_${batchFromDatum}_to_${batchToDatum}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV 已下载')
  }, [batchResults, batchFromDatum, batchToDatum, showToast])

  const handleClear = useCallback(() => {
    if (mode === MODES.SINGLE) {
      setLatInput('')
      setLonInput('')
    } else if (mode === MODES.BATCH) {
      setBatchInput('')
    } else if (mode === MODES.TRAJECTORY) {
      setTrajectoryInput('')
    }
  }, [mode])

  const datumOptions = useMemo(
    () => [
      { value: DATUM_TYPES.WGS84, label: 'WGS84 (GPS)' },
      { value: DATUM_TYPES.GCJ02, label: 'GCJ02 (火星坐标)' },
      { value: DATUM_TYPES.BD09, label: 'BD09 (百度坐标)' },
    ],
    []
  )

  return (
    <div className="geo-coordinate-converter">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="compliance-banner">
        <h4>⚠️ 合规声明</h4>
        <p>仅供开发调试，不得用于导航与正式地图发布。所有计算在本地完成，不存储任何坐标数据。</p>
      </div>

      <section className="tool-section">
        <h2>大地坐标系转换工具</h2>
        <p className="tool-description">
          WGS84 ↔ GCJ02 ↔ BD09 双向转换；支持单点、批量 CSV、轨迹 GeoJSON 导出；
          偏移量米级估算与境内外判定。
        </p>
      </section>

      <section className="tool-section">
        <h3>示例数据</h3>
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
        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === MODES.SINGLE ? 'active' : ''}`}
            onClick={() => setMode(MODES.SINGLE)}
          >
            单点转换
          </button>
          <button
            className={`mode-tab ${mode === MODES.BATCH ? 'active' : ''}`}
            onClick={() => setMode(MODES.BATCH)}
          >
            批量转换
          </button>
          <button
            className={`mode-tab ${mode === MODES.TRAJECTORY ? 'active' : ''}`}
            onClick={() => setMode(MODES.TRAJECTORY)}
          >
            轨迹导出
          </button>
        </div>

        <div className="input-group">
          <label>小数位数：{decimals}</label>
          <div className="decimals-control">
            <input
              type="range"
              min="6"
              max="8"
              value={decimals}
              onChange={(e) => setDecimals(Number(e.target.value))}
            />
            <span className="decimals-value">{decimals}</span>
          </div>
        </div>

        {mode === MODES.SINGLE && (
          <>
            <div className="input-row">
              <div className="input-field">
                <label>纬度 (Lat)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="39.9042"
                />
              </div>
              <div className="input-field">
                <label>经度 (Lon)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  placeholder="116.4074"
                />
              </div>
            </div>

            <div className="input-row" style={{ marginTop: 15 }}>
              <div className="input-field">
                <label>源坐标系</label>
                <select value={fromDatum} onChange={(e) => setFromDatum(e.target.value)}>
                  {datumOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-field">
                <label>目标坐标系</label>
                <select value={toDatum} onChange={(e) => setToDatum(e.target.value)}>
                  {datumOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="action-row">
              <button
                className="secondary-btn"
                onClick={handleClear}
                disabled={!latInput && !lonInput}
              >
                清除
              </button>
            </div>

            {singleResult && (
              <div>
                <div className="results-grid">
                  <div className="result-card">
                    <h4>
                      WGS84 <span className="badge badge-wgs84">GPS原始</span>
                    </h4>
                    <div className="coord-values">
                      <div>
                        <span>lat:</span> {singleResult.wgs84.lat}
                      </div>
                      <div>
                        <span>lon:</span> {singleResult.wgs84.lon}
                      </div>
                    </div>
                  </div>

                  <div className={`result-card ${!singleResult.inChina ? 'no-offset-card' : ''}`}>
                    <h4>
                      GCJ02 <span className="badge badge-gcj02">火星坐标</span>
                      {!singleResult.inChina && (
                        <span className="badge badge-no-offset">境外未加偏</span>
                      )}
                    </h4>
                    <div className="coord-values">
                      <div>
                        <span>lat:</span> {singleResult.gcj02.lat}
                      </div>
                      <div>
                        <span>lon:</span> {singleResult.gcj02.lon}
                      </div>
                    </div>
                  </div>

                  <div className={`result-card ${!singleResult.inChina ? 'no-offset-card' : ''}`}>
                    <h4>
                      BD09 <span className="badge badge-bd09">百度坐标</span>
                      {!singleResult.inChina && (
                        <span className="badge badge-no-offset">境外未加偏</span>
                      )}
                    </h4>
                    <div className="coord-values">
                      <div>
                        <span>lat:</span> {singleResult.bd09.lat}
                      </div>
                      <div>
                        <span>lon:</span> {singleResult.bd09.lon}
                      </div>
                    </div>
                  </div>
                </div>

                {singleResult.inChina ? (
                  <div className="offset-info">
                    <h5>偏移分析（相对 WGS84）</h5>
                    <div className="offset-values">
                      <div className="offset-value">
                        <span className="offset-label">GCJ02 总偏移</span>
                        <span className="offset-number">{singleResult.gcjOffset.totalDistance.toFixed(2)} m</span>
                      </div>
                      <div className="offset-value">
                        <span className="offset-label">Δlat</span>
                        <span className="offset-number">{singleResult.gcjOffset.deltaLatMeters.toFixed(2)} m</span>
                      </div>
                      <div className="offset-value">
                        <span className="offset-label">Δlon</span>
                        <span className="offset-number">{singleResult.gcjOffset.deltaLonMeters.toFixed(2)} m</span>
                      </div>
                      <div className="offset-value">
                        <span className="offset-label">BD09 总偏移</span>
                        <span className="offset-number">{singleResult.bdOffset.totalDistance.toFixed(2)} m</span>
                      </div>
                    </div>
                    <div className="location-status in-china" style={{ marginTop: 10 }}>
                      📍 坐标位于中国境内，已应用加密偏移
                    </div>
                  </div>
                ) : (
                  <div className="offset-info overseas-offset">
                    <h5>偏移分析（相对 WGS84）</h5>
                    <div className="overseas-notice">
                      坐标位于中国境外（lon {singleResult.wgs84.lon}°），GCJ-02 / BD-09 加密偏移不适用。
                      三系坐标值相同是正确行为——境外不应加偏。
                    </div>
                    <div className="location-status overseas" style={{ marginTop: 10 }}>
                      🌍 坐标位于中国境外，未应用加密偏移（境外不应加偏）
                    </div>
                  </div>
                )}

                <div className="action-row">
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      handleCopy(
                        `${singleResult.wgs84.lat}, ${singleResult.wgs84.lon}`,
                        'WGS84 坐标'
                      )
                    }
                  >
                    复制 WGS84
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      handleCopy(
                        `${singleResult.gcj02.lat}, ${singleResult.gcj02.lon}`,
                        'GCJ02 坐标'
                      )
                    }
                  >
                    复制 GCJ02
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      handleCopy(
                        `${singleResult.bd09.lat}, ${singleResult.bd09.lon}`,
                        'BD09 坐标'
                      )
                    }
                  >
                    复制 BD09
                  </button>
                </div>
              </div>
            )}

            {!singleResult && !latInput && !lonInput && (
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <h3>等待输入</h3>
                <p>输入经纬度或点击上方示例按钮，结果将实时展示</p>
              </div>
            )}
          </>
        )}

        {mode === MODES.BATCH && (
          <>
            <div className="input-group">
              <label>坐标列表（每行一个：lat, lon[, name]）</label>
              <textarea
                className="batch-textarea"
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder={
                  '39.9042,116.4074,北京\n31.2304,121.4737,上海\n22.5431,114.0579,深圳'
                }
              />
              <p className="batch-hint">
                支持英文逗号、中文逗号、制表符分隔；以 # 开头的行为注释；输入即实时转换
              </p>
            </div>

            <div className="input-row">
              <div className="input-field">
                <label>源坐标系</label>
                <select value={batchFromDatum} onChange={(e) => setBatchFromDatum(e.target.value)}>
                  {datumOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-field">
                <label>目标坐标系</label>
                <select value={batchToDatum} onChange={(e) => setBatchToDatum(e.target.value)}>
                  {datumOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="action-row">
              <button
                className="secondary-btn"
                onClick={handleClear}
                disabled={!batchInput}
              >
                清除
              </button>
              {batchResults && (
                <button className="secondary-btn" onClick={handleDownloadBatchCSV}>
                  下载 CSV
                </button>
              )}
            </div>

            {batchResults && (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>名称</th>
                    <th>原始 lat</th>
                    <th>原始 lon</th>
                    <th>转换后 lat</th>
                    <th>转换后 lon</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.name || '-'}</td>
                      <td>{r.originalLat}</td>
                      <td>{r.originalLon}</td>
                      <td>{r.lat}</td>
                      <td>{r.lon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!batchResults && batchInput.trim() && (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>格式无效</h3>
                <p>请确保每行包含至少纬度和经度两个数值</p>
              </div>
            )}

            {!batchResults && !batchInput.trim() && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>等待输入</h3>
                <p>输入坐标列表或点击上方示例，结果将实时展示</p>
              </div>
            )}
          </>
        )}

        {mode === MODES.TRAJECTORY && (
          <>
            <div className="input-group">
              <label>轨迹点列表（每行一个：lat, lon[, name]）</label>
              <textarea
                className="batch-textarea"
                value={trajectoryInput}
                onChange={(e) => setTrajectoryInput(e.target.value)}
                placeholder={
                  '39.9042,116.4074,起点\n39.9142,116.4174,途经点\n39.9242,116.4274,终点'
                }
              />
              <p className="batch-hint">至少需要2个点才能生成 LineString；输入即实时转换</p>
            </div>

            <div className="input-row">
              <div className="input-field">
                <label>源坐标系</label>
                <select
                  value={trajectoryFromDatum}
                  onChange={(e) => setTrajectoryFromDatum(e.target.value)}
                >
                  {datumOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-field">
                <label>目标坐标系</label>
                <select
                  value={trajectoryToDatum}
                  onChange={(e) => setTrajectoryToDatum(e.target.value)}
                >
                  {datumOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="action-row">
              <button
                className="secondary-btn"
                onClick={handleClear}
                disabled={!trajectoryInput}
              >
                清除
              </button>
              {trajectoryResults && (
                <button className="primary-btn" onClick={handleDownloadGeoJSON}>
                  下载 GeoJSON
                </button>
              )}
            </div>

            {trajectoryResults && (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>名称</th>
                    <th>原始 lat</th>
                    <th>原始 lon</th>
                    <th>转换后 lat</th>
                    <th>转换后 lon</th>
                  </tr>
                </thead>
                <tbody>
                  {trajectoryResults.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.name || '-'}</td>
                      <td>{r.originalLat}</td>
                      <td>{r.originalLon}</td>
                      <td>{r.lat}</td>
                      <td>{r.lon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!trajectoryResults && trajectoryInput.trim() && (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>数据不足</h3>
                <p>至少需要2个有效坐标点才能生成 LineString</p>
              </div>
            )}

            {!trajectoryResults && !trajectoryInput.trim() && (
              <div className="empty-state">
                <div className="empty-icon">🛤️</div>
                <h3>等待输入</h3>
                <p>输入轨迹点或点击上方示例，结果将实时展示</p>
              </div>
            )}
          </>
        )}
      </section>

      <details className="compliance-details">
        <summary>📋 详细合规说明与法律背景</summary>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{COMPLIANCE_NOTICE}</pre>
      </details>
    </div>
  )
}
