import { convertCoordinate, formatCoordinate, DATUM_TYPES } from './coordinateConverter.js'

/**
 * 解析CSV格式的批量坐标数据
 * @param {string} csvText - CSV文本
 * @returns {Array<{lat: number, lon: number, name?: string}>} 坐标点数组
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue

    const parts = line.split(/[,，\t]/).map((p) => p.trim())
    if (parts.length < 2) continue

    const lat = parseFloat(parts[0])
    const lon = parseFloat(parts[1])

    if (!isNaN(lat) && !isNaN(lon)) {
      result.push({
        lat,
        lon,
        name: parts[2] || `Point ${i + 1}`,
      })
    }
  }

  return result
}

/**
 * 批量转换坐标
 * @param {Array<{lat: number, lon: number}>} points - 坐标点数组
 * @param {string} fromDatum - 源坐标系
 * @param {string} toDatum - 目标坐标系
 * @param {number} decimals - 小数位数
 * @returns {Array<{lat: number, lon: number, originalLat: number, originalLon: number}>} 转换后的坐标数组
 */
export function batchConvert(points, fromDatum, toDatum, decimals = 6) {
  return points.map((p) => {
    const converted = convertCoordinate(p.lat, p.lon, fromDatum, toDatum)
    return {
      originalLat: p.lat,
      originalLon: p.lon,
      lat: formatCoordinate(converted.lat, decimals),
      lon: formatCoordinate(converted.lon, decimals),
      name: p.name,
    }
  })
}

/**
 * 转换结果导出为CSV
 * @param {Array<{lat: number, lon: number, originalLat: number, originalLon: number}>} results - 转换结果
 * @param {string} fromDatum - 源坐标系名称
 * @param {string} toDatum - 目标坐标系名称
 * @returns {string} CSV文本
 */
export function resultsToCSV(results, fromDatum, toDatum) {
  const header = `original_${fromDatum}_lat,original_${fromDatum}_lon,converted_${toDatum}_lat,converted_${toDatum}_lon,name`
  const rows = results.map(
    (r) => `${r.originalLat},${r.originalLon},${r.lat},${r.lon},${r.name || ''}`
  )
  return [header, ...rows].join('\n')
}
