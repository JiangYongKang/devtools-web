import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './GeohashDistanceCalculatorTool.css'
import {
  encodeGeohash,
  decodeGeohash,
  isValidGeohash,
  getNeighbors,
  isPointInPrefix,
  PRECISION_ERRORS,
  getGeohashPolygon,
  normalizeLongitude,
} from './logic/geohash.js'
import {
  haversineDistance,
  formatDistance,
  polylineDistance,
  bearing,
  bearingToCompass,
} from './logic/distance.js'
import {
  prefixToBbox,
  bboxCenter,
  unionBbox,
  bboxArea,
  formatArea,
} from './logic/bbox.js'
import {
  exportPathToGeoJSON,
  exportGeohashesToGeoJSON,
  downloadGeoJSON,
} from './logic/geojson.js'
import {
  latLonToPixel,
  drawGrid,
  drawPoint,
  drawPath,
  drawPolygon,
  computeBounds,
  drawAxisLabels,
} from './logic/mapCanvas.js'
import { EXAMPLES } from './logic/examples.js'

const TABS = [
  { id: 'geohash', name: 'Geohash 编解码' },
  { id: 'distance', name: '距离与方位' },
  { id: 'region', name: '区域与 BBox' },
  { id: 'map', name: '可视化地图' },
]

export default function GeohashDistanceCalculatorTool() {
  const [activeTab, setActiveTab] = useState('geohash')
  const [copyStatus, setCopyStatus] = useState(null)

  const [encodeLat, setEncodeLat] = useState('39.9042')
  const [encodeLon, setEncodeLon] = useState('116.4074')
  const [encodePrecision, setEncodePrecision] = useState('6')

  const [decodeHash, setDecodeHash] = useState('')

  const [point1Lat, setPoint1Lat] = useState('39.9042')
  const [point1Lon, setPoint1Lon] = useState('116.4074')
  const [point2Lat, setPoint2Lat] = useState('31.2304')
  const [point2Lon, setPoint2Lon] = useState('121.4737')

  const [polyPoints, setPolyPoints] = useState([
    { name: '北京', lat: '39.9042', lon: '116.4074' },
    { name: '上海', lat: '31.2304', lon: '121.4737' },
    { name: '广州', lat: '23.1291', lon: '113.2644' },
  ])

  const [prefixInput, setPrefixInput] = useState('wx4g')
  const [checkLat, setCheckLat] = useState('39.9042')
  const [checkLon, setCheckLon] = useState('116.4074')

  const [geoHashesInput, setGeoHashesInput] = useState('wx4g0\nwx4g1\nwx4fb')

  const canvasRef = useRef(null)

  const encodeResult = useMemo(() => {
    try {
      const lat = parseFloat(encodeLat)
      const lon = parseFloat(encodeLon)
      const precision = parseInt(encodePrecision, 10)

      if (isNaN(lat) || isNaN(lon)) return null

      const hash = encodeGeohash(lat, lon, precision)
      const decoded = decodeGeohash(hash)
      const neighbors = getNeighbors(hash)

      return { hash, decoded, neighbors }
    } catch {
      return null
    }
  }, [encodeLat, encodeLon, encodePrecision])

  const decodeResult = useMemo(() => {
    try {
      if (!isValidGeohash(decodeHash)) return null
      const decoded = decodeGeohash(decodeHash)
      const neighbors = getNeighbors(decodeHash)
      return { decoded, neighbors }
    } catch {
      return null
    }
  }, [decodeHash])

  const distanceResult = useMemo(() => {
    try {
      const lat1 = parseFloat(point1Lat)
      const lon1 = parseFloat(point1Lon)
      const lat2 = parseFloat(point2Lat)
      const lon2 = parseFloat(point2Lon)

      if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null

      const d = haversineDistance(lat1, lon1, lat2, lon2)
      const b = bearing(lat1, lon1, lat2, lon2)
      const compass = bearingToCompass(b)

      return { distance: d, bearing: b, compass }
    } catch {
      return null
    }
  }, [point1Lat, point1Lon, point2Lat, point2Lon])

  const polylineResult = useMemo(() => {
    const validPoints = polyPoints.filter(
      (p) => !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lon))
    ).map((p) => ({
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      name: p.name,
    }))

    if (validPoints.length < 2) return null

    const total = polylineDistance(validPoints)
    const segments = []
    for (let i = 1; i < validPoints.length; i++) {
      const p1 = validPoints[i - 1]
      const p2 = validPoints[i]
      segments.push({
        from: p1.name || `点${i}`,
        to: p2.name || `点${i + 1}`,
        distance: haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon),
        bearing: bearing(p1.lat, p1.lon, p2.lat, p2.lon),
      })
    }

    return { total, segments, points: validPoints }
  }, [polyPoints])

  const prefixResult = useMemo(() => {
    try {
      const lat = parseFloat(checkLat)
      const lon = parseFloat(checkLon)

      if (isNaN(lat) || isNaN(lon) || !isValidGeohash(prefixInput)) return null

      const inside = isPointInPrefix(lat, lon, prefixInput)
      const bbox = prefixToBbox(prefixInput)
      const area = bboxArea(bbox)

      return { inside, bbox, area }
    } catch {
      return null
    }
  }, [checkLat, checkLon, prefixInput])

  const unionResult = useMemo(() => {
    try {
      const hashes = geoHashesInput
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && isValidGeohash(s))

      if (hashes.length === 0) return null

      const bbox = unionBbox(hashes)
      const center = bboxCenter(bbox)
      const area = bboxArea(bbox)

      return { hashes, bbox, center, area }
    } catch {
      return null
    }
  }, [geoHashesInput])

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
    if (example.id === 'beijing') {
      setEncodeLat(String(example.lat))
      setEncodeLon(String(example.lon))
      setEncodePrecision(String(example.precision))
      setActiveTab('geohash')
      setDecodeHash(encodeGeohash(example.lat, example.lon, example.precision))
    } else if (example.id === 'path-3points') {
      setPolyPoints(example.points.map((p) => ({
        name: p.name,
        lat: String(p.lat),
        lon: String(p.lon),
      })))
      setPoint1Lat(String(example.points[0].lat))
      setPoint1Lon(String(example.points[0].lon))
      setPoint2Lat(String(example.points[1].lat))
      setPoint2Lon(String(example.points[1].lon))
      setActiveTab('distance')
    } else if (example.id === 'prefix-coverage') {
      setPrefixInput(example.prefix)
      setCheckLat(String(example.testPoints[0].lat))
      setCheckLon(String(example.testPoints[0].lon))
      setActiveTab('region')
    }
  }, [])

  const handleAddPoint = useCallback(() => {
    setPolyPoints((prev) => [...prev, { name: '', lat: '', lon: '' }])
  }, [])

  const handleRemovePoint = useCallback((index) => {
    setPolyPoints((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpdatePoint = useCallback((index, field, value) => {
    setPolyPoints((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
  }, [])

  useEffect(() => {
    if (activeTab !== 'map') return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    ctx.clearRect(0, 0, width, height)

    const geoPoints = polyPoints
      .filter((p) => !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lon)))
      .map((p) => ({
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
        name: p.name,
      }))

    const bboxes = []
    if (decodeResult) bboxes.push(decodeResult.decoded)
    if (encodeResult) bboxes.push(encodeResult.decoded)
    if (prefixResult) bboxes.push(prefixResult.bbox)
    if (unionResult) bboxes.push(unionResult.bbox)

    const hashPolygons = []
    if (decodeResult && decodeResult.neighbors) {
      const allNeighbors = Object.values(decodeResult.neighbors)
      for (const h of allNeighbors) {
        hashPolygons.push({ hash: h, isCenter: h === decodeHash })
      }
    }
    if (encodeResult && encodeResult.neighbors) {
      const allNeighbors = Object.values(encodeResult.neighbors)
      for (const h of allNeighbors) {
        hashPolygons.push({ hash: h, isCenter: h === encodeResult.hash })
      }
    }

    const bounds = computeBounds(geoPoints, bboxes)

    drawGrid(ctx, width, height, 40)
    drawAxisLabels(ctx, width, height, bounds)

    for (const { hash, isCenter } of hashPolygons) {
      try {
        const poly = getGeohashPolygon(hash)
        const pixelPoints = poly.map(([lon, lat]) =>
          latLonToPixel(lat, lon, width, height, bounds)
        )
        drawPolygon(ctx, pixelPoints, {
          strokeColor: isCenter ? '#4a90d9' : '#a0c4e8',
          fillColor: isCenter ? 'rgba(74, 144, 217, 0.2)' : 'rgba(74, 144, 217, 0.08)',
          label: hash,
        })
      } catch {
        // skip invalid hashes
      }
    }

    if (geoPoints.length >= 2) {
      const pathPixels = geoPoints.map((p) =>
        latLonToPixel(p.lat, p.lon, width, height, bounds)
      )
      drawPath(ctx, pathPixels, { color: '#4a90d9', lineWidth: 2 })
    }

    for (let i = 0; i < geoPoints.length; i++) {
      const p = geoPoints[i]
      const { x, y } = latLonToPixel(p.lat, p.lon, width, height, bounds)
      drawPoint(ctx, x, y, {
        color: '#e53e3e',
        radius: 6,
        label: p.name || `P${i + 1}`,
      })
    }
  }, [activeTab, polyPoints, decodeResult, encodeResult, prefixResult, unionResult, decodeHash, encodeResult?.hash])

  const handleExportPathGeoJSON = useCallback(() => {
    if (!polylineResult) return
    const geojson = exportPathToGeoJSON(polylineResult.points)
    downloadGeoJSON(geojson, 'path')
    handleCopy(JSON.stringify(geojson, null, 2), '路径 GeoJSON')
  }, [polylineResult, handleCopy])

  const handleExportGeohashesGeoJSON = useCallback(() => {
    if (!unionResult) return
    const geojson = exportGeohashesToGeoJSON(unionResult.hashes)
    downloadGeoJSON(geojson, 'geohashes')
    handleCopy(JSON.stringify(geojson, null, 2), 'Geohash GeoJSON')
  }, [unionResult, handleCopy])

  return (
    <div className="geohash-distance-calculator">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>Geohash 与距离计算器</h2>
        <p className="tool-description">
          Geohash 经纬度编解码（Base32）、Haversine 大圆距离、方位角、BBox
          区域计算、Canvas 可视化与 GeoJSON 导出；不依赖外部地图服务。
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
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {activeTab === 'geohash' && (
          <div>
            <div className="input-row">
              <div className="input-group">
                <label>纬度 (lat)</label>
                <input
                  type="text"
                  value={encodeLat}
                  onChange={(e) => setEncodeLat(e.target.value)}
                  placeholder="-90 ~ 90"
                />
              </div>
              <div className="input-group">
                <label>经度 (lon)</label>
                <input
                  type="text"
                  value={encodeLon}
                  onChange={(e) => setEncodeLon(e.target.value)}
                  placeholder="-180 ~ 180"
                />
              </div>
              <div className="input-group">
                <label>精度级别</label>
                <select
                  value={encodePrecision}
                  onChange={(e) => setEncodePrecision(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      {p} 级
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {encodeResult && (
              <div className="result-box">
                <div className="result-row">
                  <span className="result-label">Geohash</span>
                  <span className="result-value">{encodeResult.hash}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">中心点纬度</span>
                  <span className="result-value">{encodeResult.decoded.lat.toFixed(6)}°</span>
                </div>
                <div className="result-row">
                  <span className="result-label">中心点经度</span>
                  <span className="result-value">{encodeResult.decoded.lon.toFixed(6)}°</span>
                </div>
                <div className="result-row">
                  <span className="result-label">纬度范围</span>
                  <span className="result-value">
                    {encodeResult.decoded.latMin.toFixed(6)}° ~ {encodeResult.decoded.latMax.toFixed(6)}°
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">经度范围</span>
                  <span className="result-value">
                    {encodeResult.decoded.lonMin.toFixed(6)}° ~ {encodeResult.decoded.lonMax.toFixed(6)}°
                  </span>
                </div>

                <div className="section-divider">邻格（九宫格）</div>
                <div className="neighbors-grid">
                  <div className="neighbor-cell">{encodeResult.neighbors.nw}</div>
                  <div className="neighbor-cell">{encodeResult.neighbors.n}</div>
                  <div className="neighbor-cell">{encodeResult.neighbors.ne}</div>
                  <div className="neighbor-cell">{encodeResult.neighbors.w}</div>
                  <div className="neighbor-cell center">{encodeResult.neighbors.center}</div>
                  <div className="neighbor-cell">{encodeResult.neighbors.e}</div>
                  <div className="neighbor-cell">{encodeResult.neighbors.sw}</div>
                  <div className="neighbor-cell">{encodeResult.neighbors.s}</div>
                  <div className="neighbor-cell">{encodeResult.neighbors.se}</div>
                </div>

                <div className="action-row">
                  <button
                    className="secondary-btn"
                    onClick={() => handleCopy(encodeResult.hash, 'Geohash')}
                  >
                    复制 Geohash
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => setDecodeHash(encodeResult.hash)}
                  >
                    解码此 Geohash
                  </button>
                </div>
              </div>
            )}

            <div className="section-divider" style={{ marginTop: 24 }}>
              解码 Geohash
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Geohash 字符串</label>
                <input
                  type="text"
                  value={decodeHash}
                  onChange={(e) => setDecodeHash(e.target.value)}
                  placeholder="例如: wx4g0s"
                />
              </div>
            </div>

            {decodeResult && (
              <div className="result-box">
                <div className="result-row">
                  <span className="result-label">中心点纬度</span>
                  <span className="result-value">{decodeResult.decoded.lat.toFixed(6)}°</span>
                </div>
                <div className="result-row">
                  <span className="result-label">中心点经度</span>
                  <span className="result-value">{decodeResult.decoded.lon.toFixed(6)}°</span>
                </div>
                <div className="result-row">
                  <span className="result-label">纬度范围</span>
                  <span className="result-value">
                    {decodeResult.decoded.latMin.toFixed(6)}° ~ {decodeResult.decoded.latMax.toFixed(6)}°
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">经度范围</span>
                  <span className="result-value">
                    {decodeResult.decoded.lonMin.toFixed(6)}° ~ {decodeResult.decoded.lonMax.toFixed(6)}°
                  </span>
                </div>

                <div className="section-divider">邻格（九宫格）</div>
                <div className="neighbors-grid">
                  <div className="neighbor-cell">{decodeResult.neighbors.nw}</div>
                  <div className="neighbor-cell">{decodeResult.neighbors.n}</div>
                  <div className="neighbor-cell">{decodeResult.neighbors.ne}</div>
                  <div className="neighbor-cell">{decodeResult.neighbors.w}</div>
                  <div className="neighbor-cell center">{decodeResult.neighbors.center}</div>
                  <div className="neighbor-cell">{decodeResult.neighbors.e}</div>
                  <div className="neighbor-cell">{decodeResult.neighbors.sw}</div>
                  <div className="neighbor-cell">{decodeResult.neighbors.s}</div>
                  <div className="neighbor-cell">{decodeResult.neighbors.se}</div>
                </div>
              </div>
            )}

            <div className="section-divider" style={{ marginTop: 24 }}>
              精度级别与误差界对照表
            </div>
            <table className="precision-table">
              <thead>
                <tr>
                  <th>精度级别</th>
                  <th>纬度误差 (米)</th>
                  <th>经度误差 (米)</th>
                  <th>字符数</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                  <tr key={p}>
                    <td>{p}</td>
                    <td>{PRECISION_ERRORS[p].lat.toLocaleString()}</td>
                    <td>{PRECISION_ERRORS[p].lon.toLocaleString()}</td>
                    <td>{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'distance' && (
          <div>
            <h4>两点距离与方位角</h4>
            <div className="input-row">
              <div className="input-group">
                <label>点 1 纬度</label>
                <input
                  type="text"
                  value={point1Lat}
                  onChange={(e) => setPoint1Lat(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>点 1 经度</label>
                <input
                  type="text"
                  value={point1Lon}
                  onChange={(e) => setPoint1Lon(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>点 2 纬度</label>
                <input
                  type="text"
                  value={point2Lat}
                  onChange={(e) => setPoint2Lat(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>点 2 经度</label>
                <input
                  type="text"
                  value={point2Lon}
                  onChange={(e) => setPoint2Lon(e.target.value)}
                />
              </div>
            </div>

            {distanceResult && (
              <div className="result-box">
                <div className="result-row">
                  <span className="result-label">大圆距离</span>
                  <span className="result-value">
                    {formatDistance(distanceResult.distance)}
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">初始方位角</span>
                  <span className="result-value">
                    {distanceResult.bearing.toFixed(2)}° ({distanceResult.compass})
                  </span>
                </div>
              </div>
            )}

            <div className="section-divider" style={{ marginTop: 24 }}>
              多点折线累计距离
            </div>
            <div className="points-list">
              {polyPoints.map((p, i) => (
                <div key={i} className="point-item">
                  <div className="point-index">{i + 1}</div>
                  <div className="point-inputs">
                    <input
                      type="text"
                      placeholder="名称"
                      value={p.name}
                      onChange={(e) => handleUpdatePoint(i, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="纬度"
                      value={p.lat}
                      onChange={(e) => handleUpdatePoint(i, 'lat', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="经度"
                      value={p.lon}
                      onChange={(e) => handleUpdatePoint(i, 'lon', e.target.value)}
                    />
                  </div>
                  {polyPoints.length > 2 && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemovePoint(i)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="action-row">
              <button className="secondary-btn" onClick={handleAddPoint}>
                + 添加点
              </button>
              {polylineResult && (
                <button
                  className="secondary-btn"
                  onClick={handleExportPathGeoJSON}
                >
                  导出 GeoJSON
                </button>
              )}
            </div>

            {polylineResult && (
              <div className="result-box">
                <div className="result-row">
                  <span className="result-label">总累计距离</span>
                  <span className="result-value">
                    {formatDistance(polylineResult.total)}
                  </span>
                </div>
                <div className="section-divider">分段详情</div>
                {polylineResult.segments.map((seg, i) => (
                  <div key={i} className="result-row">
                    <span className="result-label">
                      {seg.from} → {seg.to}
                    </span>
                    <span className="result-value">
                      {formatDistance(seg.distance)} · {seg.bearing.toFixed(1)}°
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'region' && (
          <div>
            <h4>点在 Prefix 内判定</h4>
            <div className="input-row">
              <div className="input-group">
                <label>Geohash 前缀</label>
                <input
                  type="text"
                  value={prefixInput}
                  onChange={(e) => setPrefixInput(e.target.value)}
                  placeholder="例如: wx4g"
                />
              </div>
              <div className="input-group">
                <label>检测点纬度</label>
                <input
                  type="text"
                  value={checkLat}
                  onChange={(e) => setCheckLat(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>检测点经度</label>
                <input
                  type="text"
                  value={checkLon}
                  onChange={(e) => setCheckLon(e.target.value)}
                />
              </div>
            </div>

            {prefixResult && (
              <div className="result-box">
                <div className="result-row">
                  <span className="result-label">判定结果</span>
                  <span className={`result-value ${prefixResult.inside ? 'success' : 'error'}`}>
                    {prefixResult.inside ? '✓ 在范围内' : '✗ 不在范围内'}
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">BBox 范围</span>
                  <span className="result-value">
                    lat: {prefixResult.bbox.latMin.toFixed(4)}° ~ {prefixResult.bbox.latMax.toFixed(4)}°
                    <br />
                    lon: {prefixResult.bbox.lonMin.toFixed(4)}° ~ {prefixResult.bbox.lonMax.toFixed(4)}°
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">区域面积</span>
                  <span className="result-value">
                    {formatArea(prefixResult.area)}
                  </span>
                </div>
              </div>
            )}

            <div className="section-divider" style={{ marginTop: 24 }}>
              多 Geohash 并集 BBox
            </div>
            <div className="input-row">
              <div className="input-group" style={{ flex: '1 1 100%' }}>
                <label>Geohash 列表（每行一个）</label>
                <textarea
                  className="yaml-textarea"
                  style={{ minHeight: 120, width: '100%' }}
                  value={geoHashesInput}
                  onChange={(e) => setGeoHashesInput(e.target.value)}
                  placeholder="wx4g0&#10;wx4g1&#10;wx4fb"
                />
              </div>
            </div>
            <div className="action-row">
              {unionResult && (
                <button
                  className="secondary-btn"
                  onClick={handleExportGeohashesGeoJSON}
                >
                  导出 GeoJSON
                </button>
              )}
            </div>

            {unionResult && (
              <div className="result-box">
                <div className="result-row">
                  <span className="result-label">有效 Geohash 数</span>
                  <span className="result-value">{unionResult.hashes.length}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">并集 BBox</span>
                  <span className="result-value">
                    lat: {unionResult.bbox.latMin.toFixed(4)}° ~ {unionResult.bbox.latMax.toFixed(4)}°
                    <br />
                    lon: {unionResult.bbox.lonMin.toFixed(4)}° ~ {unionResult.bbox.lonMax.toFixed(4)}°
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">中心点</span>
                  <span className="result-value">
                    {unionResult.center.lat.toFixed(4)}°N, {unionResult.center.lon.toFixed(4)}°E
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">总面积</span>
                  <span className="result-value">
                    {formatArea(unionResult.area)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div>
            <div className="map-canvas-container">
              <canvas ref={canvasRef} className="map-canvas" />
            </div>
            <p style={{ fontSize: 13, color: '#718096', marginTop: 8 }}>
              平面投影可视化。输入数据即时更新，支持点、路径、Geohash 网格的展示。切换标签页即可查看对应图形。
            </p>
          </div>
        )}
      </section>

      <section className="tool-section">
        <h3>说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>Geohash：</strong>使用标准 Base32 字符表
            <span className="inline-code">0123456789bcdefghjkmnpqrstuvwxyz</span>，
            精度 1～12 级，邻格计算处理边界环绕。
          </li>
          <li>
            <strong>Haversine：</strong>基于地球平均半径 6371km 计算大圆距离，
            方位角采用初始 bearing 公式。
          </li>
          <li>
            <strong>BBox：</strong>由 geohash 前缀计算 bounding box，
            支持多前缀并集与面积估算（基于中心纬度近似）。
          </li>
          <li>
            <strong>GeoJSON：</strong>导出 <code>FeatureCollection</code>，
            包含 Point、LineString、Polygon 三种几何类型。
          </li>
          <li>
            <strong>边界处理：</strong>经度环绕自动规范化到 -180° ~ 180°，
            邻格越界时自动进位。
          </li>
        </ul>
      </section>
    </div>
  )
}
