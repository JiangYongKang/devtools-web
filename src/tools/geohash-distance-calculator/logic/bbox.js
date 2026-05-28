import { decodeGeohash, isValidGeohash } from './geohash.js'

/**
 * 由 geohash 前缀计算 bounding box
 * @param {string} prefix - geohash 前缀
 * @returns {{latMin: number, latMax: number, lonMin: number, lonMax: number}}
 */
export function prefixToBbox(prefix) {
  if (!isValidGeohash(prefix)) {
    throw new Error('无效的 geohash 前缀')
  }
  const { latMin, latMax, lonMin, lonMax } = decodeGeohash(prefix)
  return { latMin, latMax, lonMin, lonMax }
}

/**
 * 计算 bbox 的中心点
 * @param {{latMin: number, latMax: number, lonMin: number, lonMax: number}} bbox
 * @returns {{lat: number, lon: number}}
 */
export function bboxCenter(bbox) {
  return {
    lat: (bbox.latMin + bbox.latMax) / 2,
    lon: (bbox.lonMin + bbox.lonMax) / 2,
  }
}

/**
 * 获取 bbox 的多边形坐标（顺时针闭合）
 * @param {{latMin: number, latMax: number, lonMin: number, lonMax: number}} bbox
 * @returns {Array<[number, number]>} [[lon, lat], ...]
 */
export function bboxToPolygon(bbox) {
  return [
    [bbox.lonMin, bbox.latMin],
    [bbox.lonMax, bbox.latMin],
    [bbox.lonMax, bbox.latMax],
    [bbox.lonMin, bbox.latMax],
    [bbox.lonMin, bbox.latMin],
  ]
}

/**
 * 计算多个 geohash 的并集 bbox
 * @param {string[]} hashes - geohash 字符串数组
 * @returns {{latMin: number, latMax: number, lonMin: number, lonMax: number}}
 */
export function unionBbox(hashes) {
  if (!Array.isArray(hashes) || hashes.length === 0) {
    throw new Error('geohash 数组不能为空')
  }

  let latMin = Infinity
  let latMax = -Infinity
  let lonMin = Infinity
  let lonMax = -Infinity

  for (const hash of hashes) {
    const bbox = prefixToBbox(hash)
    latMin = Math.min(latMin, bbox.latMin)
    latMax = Math.max(latMax, bbox.latMax)
    lonMin = Math.min(lonMin, bbox.lonMin)
    lonMax = Math.max(lonMax, bbox.lonMax)
  }

  return { latMin, latMax, lonMin, lonMax }
}

/**
 * 判定点是否在 bbox 内
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {{latMin: number, latMax: number, lonMin: number, lonMax: number}} bbox
 * @returns {boolean}
 */
export function isPointInBbox(lat, lon, bbox) {
  return (
    lat >= bbox.latMin &&
    lat <= bbox.latMax &&
    lon >= bbox.lonMin &&
    lon <= bbox.lonMax
  )
}

/**
 * 判定两个 bbox 是否相交
 * @param {{latMin: number, latMax: number, lonMin: number, lonMax: number}} bbox1
 * @param {{latMin: number, latMax: number, lonMin: number, lonMax: number}} bbox2
 * @returns {boolean}
 */
export function bboxIntersects(bbox1, bbox2) {
  return !(
    bbox1.lonMax < bbox2.lonMin ||
    bbox1.lonMin > bbox2.lonMax ||
    bbox1.latMax < bbox2.latMin ||
    bbox1.latMin > bbox2.latMax
  )
}

/**
 * 计算 bbox 面积（近似，使用中心纬度）
 * @param {{latMin: number, latMax: number, lonMin: number, lonMax: number}} bbox
 * @param {number} [earthRadius=6371000] - 地球半径（米）
 * @returns {number} 面积（平方米）
 */
export function bboxArea(bbox, earthRadius = 6371000) {
  const centerLat = (bbox.latMin + bbox.latMax) / 2
  const latDelta = bbox.latMax - bbox.latMin
  const lonDelta = bbox.lonMax - bbox.lonMin

  const latMetersPerDegree = (Math.PI * earthRadius) / 180
  const lonMetersPerDegree = (Math.PI * earthRadius * Math.cos((centerLat * Math.PI) / 180)) / 180

  return Math.abs(latDelta * latMetersPerDegree * lonDelta * lonMetersPerDegree)
}

/**
 * 格式化面积为可读字符串
 * @param {number} sqMeters - 平方米
 * @returns {string}
 */
export function formatArea(sqMeters) {
  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km²`
  }
  if (sqMeters >= 10000) {
    return `${(sqMeters / 10000).toFixed(2)} 公顷`
  }
  return `${sqMeters.toFixed(2)} m²`
}
