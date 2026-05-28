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
 * Haversine 公式计算两点间大圆距离（米）
 * @param {number} lat1 - 点1纬度
 * @param {number} lon1 - 点1经度
 * @param {number} lat2 - 点2纬度
 * @param {number} lon2 - 点2经度
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
 * 计算坐标偏移量（相对于WGS84）
 * @param {number} wgsLat - WGS84纬度
 * @param {number} wgsLon - WGS84经度
 * @param {number} targetLat - 目标坐标系纬度
 * @param {number} targetLon - 目标坐标系经度
 * @returns {{deltaLatMeters: number, deltaLonMeters: number, totalDistance: number}} 偏移量（米）
 */
export function calculateOffset(wgsLat, wgsLon, targetLat, targetLon) {
  const latMetersPerDegree = haversineDistance(wgsLat, wgsLon, wgsLat + 1, wgsLon)
  const lonMetersPerDegree = haversineDistance(wgsLat, wgsLon, wgsLat, wgsLon + 1)

  const deltaLat = targetLat - wgsLat
  const deltaLon = targetLon - wgsLon

  return {
    deltaLatMeters: deltaLat * latMetersPerDegree,
    deltaLonMeters: deltaLon * lonMetersPerDegree,
    totalDistance: haversineDistance(wgsLat, wgsLon, targetLat, targetLon),
  }
}
