/**
 * 地球平均半径（米）
 */
const EARTH_RADIUS = 6371000

/**
 * 角度转弧度
 * @param {number} degrees - 角度
 * @returns {number} 弧度
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * 弧度转角度
 * @param {number} radians - 弧度
 * @returns {number} 角度
 */
function toDegrees(radians) {
  return (radians * 180) / Math.PI
}

/**
 * Haversine 公式计算两点间大圆距离
 * @param {number} lat1 - 点1纬度（度）
 * @param {number} lon1 - 点1经度（度）
 * @param {number} lat2 - 点2纬度（度）
 * @param {number} lon2 - 点2经度（度）
 * @returns {number} 距离（米）
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const rLat1 = toRadians(lat1)
  const rLat2 = toRadians(lat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS * c
}

/**
 * 距离格式化为可读字符串
 * @param {number} meters - 米数
 * @returns {string} 格式化的距离
 */
export function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  }
  return `${meters.toFixed(2)} m`
}

/**
 * 计算多点折线累计距离
 * @param {Array<{lat: number, lon: number}>} points - 点数组
 * @returns {number} 累计距离（米）
 */
export function polylineDistance(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0
  }

  let total = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    total += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon)
  }

  return total
}

/**
 * 计算两点的初始方位角（初始 bearing）
 * 参考：https://www.movable-type.co.uk/scripts/latlong.html
 * @param {number} lat1 - 起点纬度
 * @param {number} lon1 - 起点经度
 * @param {number} lat2 - 终点纬度
 * @param {number} lon2 - 终点经度
 * @returns {number} 方位角（0 ~ 360 度，正北为 0）
 */
export function bearing(lat1, lon1, lat2, lon2) {
  const rLat1 = toRadians(lat1)
  const rLat2 = toRadians(lat2)
  const dLon = toRadians(lon2 - lon1)

  const y = Math.sin(dLon) * Math.cos(rLat2)
  const x =
    Math.cos(rLat1) * Math.sin(rLat2) -
    Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon)

  let brng = toDegrees(Math.atan2(y, x))
  return (brng + 360) % 360
}

/**
 * 方位角格式化为罗盘方向
 * @param {number} bearing - 方位角（0 ~ 360）
 * @returns {string} 罗盘方向（如 N, NE, E, ...）
 */
export function bearingToCompass(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

/**
 * 计算两点之间的等距采样点
 * @param {number} lat1 - 起点纬度
 * @param {number} lon1 - 起点经度
 * @param {number} lat2 - 终点纬度
 * @param {number} lon2 - 终点经度
 * @param {number} numPoints - 采样点数（含端点）
 * @returns {Array<{lat: number, lon: number}>} 采样点数组
 */
export function interpolatePath(lat1, lon1, lat2, lon2, numPoints = 10) {
  if (numPoints < 2) return [{ lat: lat1, lon: lon1 }]

  const d = haversineDistance(lat1, lon1, lat2, lon2)
  const R = EARTH_RADIUS
  const dr = d / R

  const rLat1 = toRadians(lat1)
  const rLon1 = toRadians(lon1)
  const rLat2 = toRadians(lat2)
  const rLon2 = toRadians(lon2)

  const points = []

  for (let i = 0; i < numPoints; i++) {
    const f = i / (numPoints - 1)

    const a = Math.sin((1 - f) * dr) / Math.sin(dr)
    const b = Math.sin(f * dr) / Math.sin(dr)

    const x = a * Math.cos(rLat1) * Math.cos(rLon1) + b * Math.cos(rLat2) * Math.cos(rLon2)
    const y = a * Math.cos(rLat1) * Math.sin(rLon1) + b * Math.cos(rLat2) * Math.sin(rLon2)
    const z = a * Math.sin(rLat1) + b * Math.sin(rLat2)

    const lat = toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y)))
    const lon = toDegrees(Math.atan2(y, x))

    points.push({ lat, lon })
  }

  return points
}
