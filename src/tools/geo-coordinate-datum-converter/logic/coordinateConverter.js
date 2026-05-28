const PI = Math.PI
const X_PI = (PI * 3000.0) / 180.0
const A = 6378245.0
const EE = 0.00669342162296594323

/**
 * 判断坐标是否在中国境内（粗略 bounding box）
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @returns {boolean} 是否在中国境内
 */
export function isInChina(lat, lon) {
  return lon >= 72.004 && lon <= 137.8347 && lat >= 0.8293 && lat <= 55.8271
}

/**
 * 计算 GCJ02 经度偏移量
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @returns {number} 经度偏移
 */
function transformLon(lat, lon) {
  let ret = 300.0 + lon + 2.0 * lat + 0.1 * lon * lon + 0.1 * lon * lat + 0.1 * Math.sqrt(Math.abs(lon))
  ret += ((20.0 * Math.sin(6.0 * lon * PI) + 20.0 * Math.sin(2.0 * lon * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lon * PI) + 40.0 * Math.sin((lon / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((lon / 12.0) * PI) + 300.0 * Math.sin((lon / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/**
 * 计算 GCJ02 纬度偏移量
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @returns {number} 纬度偏移
 */
function transformLat(lat, lon) {
  let ret = -100.0 + 2.0 * lon + 3.0 * lat + 0.2 * lat * lat + 0.1 * lon * lat + 0.2 * Math.sqrt(Math.abs(lon))
  ret += ((20.0 * Math.sin(6.0 * lon * PI) + 20.0 * Math.sin(2.0 * lon * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

/**
 * WGS84 转 GCJ02（火星坐标系）
 * @param {number} wgsLat - WGS84 纬度
 * @param {number} wgsLon - WGS84 经度
 * @returns {{lat: number, lon: number}} GCJ02 坐标
 */
export function wgs84ToGcj02(wgsLat, wgsLon) {
  if (!isInChina(wgsLat, wgsLon)) {
    return { lat: wgsLat, lon: wgsLon }
  }

  let dLat = transformLat(wgsLon - 105.0, wgsLat - 35.0)
  let dLon = transformLon(wgsLon - 105.0, wgsLat - 35.0)
  const radLat = (wgsLat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLon = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  const mgLat = wgsLat + dLat
  const mgLon = wgsLon + dLon
  return { lat: mgLat, lon: mgLon }
}

/**
 * GCJ02 转 WGS84
 * @param {number} gcjLat - GCJ02 纬度
 * @param {number} gcjLon - GCJ02 经度
 * @returns {{lat: number, lon: number}} WGS84 坐标
 */
export function gcj02ToWgs84(gcjLat, gcjLon) {
  if (!isInChina(gcjLat, gcjLon)) {
    return { lat: gcjLat, lon: gcjLon }
  }

  const threshold = 1e-7
  let wgsLat = gcjLat
  let wgsLon = gcjLon
  let dLat = 0
  let dLon = 0

  for (let i = 0; i < 30; i++) {
    const tmp = wgs84ToGcj02(wgsLat, wgsLon)
    dLat = tmp.lat - gcjLat
    dLon = tmp.lon - gcjLon
    if (Math.abs(dLat) < threshold && Math.abs(dLon) < threshold) {
      break
    }
    wgsLat -= dLat
    wgsLon -= dLon
  }

  return { lat: wgsLat, lon: wgsLon }
}

/**
 * GCJ02 转 BD09（百度坐标系）
 * @param {number} gcjLat - GCJ02 纬度
 * @param {number} gcjLon - GCJ02 经度
 * @returns {{lat: number, lon: number}} BD09 坐标
 */
export function gcj02ToBd09(gcjLat, gcjLon) {
  const z = Math.sqrt(gcjLon * gcjLon + gcjLat * gcjLat) + 0.00002 * Math.sin(gcjLat * X_PI)
  const theta = Math.atan2(gcjLat, gcjLon) + 0.000003 * Math.cos(gcjLon * X_PI)
  const bdLon = z * Math.cos(theta) + 0.0065
  const bdLat = z * Math.sin(theta) + 0.006
  return { lat: bdLat, lon: bdLon }
}

/**
 * BD09 转 GCJ02
 * @param {number} bdLat - BD09 纬度
 * @param {number} bdLon - BD09 经度
 * @returns {{lat: number, lon: number}} GCJ02 坐标
 */
export function bd09ToGcj02(bdLat, bdLon) {
  const x = bdLon - 0.0065
  const y = bdLat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  const gcjLon = z * Math.cos(theta)
  const gcjLat = z * Math.sin(theta)
  return { lat: gcjLat, lon: gcjLon }
}

/**
 * WGS84 转 BD09
 * @param {number} wgsLat - WGS84 纬度
 * @param {number} wgsLon - WGS84 经度
 * @returns {{lat: number, lon: number}} BD09 坐标
 */
export function wgs84ToBd09(wgsLat, wgsLon) {
  if (!isInChina(wgsLat, wgsLon)) {
    return { lat: wgsLat, lon: wgsLon }
  }
  const gcj = wgs84ToGcj02(wgsLat, wgsLon)
  return gcj02ToBd09(gcj.lat, gcj.lon)
}

/**
 * BD09 转 WGS84
 * @param {number} bdLat - BD09 纬度
 * @param {number} bdLon - BD09 经度
 * @returns {{lat: number, lon: number}} WGS84 坐标
 */
export function bd09ToWgs84(bdLat, bdLon) {
  if (!isInChina(bdLat, bdLon)) {
    return { lat: bdLat, lon: bdLon }
  }
  const gcj = bd09ToGcj02(bdLat, bdLon)
  return gcj02ToWgs84(gcj.lat, gcj.lon)
}

/**
 * 格式化坐标，保留指定小数位数
 * @param {number} value - 坐标值
 * @param {number} decimals - 小数位数（6-8）
 * @returns {number} 格式化后的坐标
 */
export function formatCoordinate(value, decimals = 6) {
  const d = Math.max(6, Math.min(8, decimals))
  return Number(value.toFixed(d))
}

/**
 * 坐标系类型枚举
 */
export const DATUM_TYPES = {
  WGS84: 'wgs84',
  GCJ02: 'gcj02',
  BD09: 'bd09',
}

/**
 * 通用坐标转换函数
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {string} fromDatum - 源坐标系
 * @param {string} toDatum - 目标坐标系
 * @returns {{lat: number, lon: number}} 转换后的坐标
 */
export function convertCoordinate(lat, lon, fromDatum, toDatum) {
  if (fromDatum === toDatum) {
    return { lat, lon }
  }

  let gcjLat = lat
  let gcjLon = lon

  if (fromDatum === DATUM_TYPES.WGS84) {
    const gcj = wgs84ToGcj02(lat, lon)
    gcjLat = gcj.lat
    gcjLon = gcj.lon
  } else if (fromDatum === DATUM_TYPES.BD09) {
    const gcj = bd09ToGcj02(lat, lon)
    gcjLat = gcj.lat
    gcjLon = gcj.lon
  }

  if (toDatum === DATUM_TYPES.GCJ02) {
    return { lat: gcjLat, lon: gcjLon }
  } else if (toDatum === DATUM_TYPES.WGS84) {
    return gcj02ToWgs84(gcjLat, gcjLon)
  } else if (toDatum === DATUM_TYPES.BD09) {
    return gcj02ToBd09(gcjLat, gcjLon)
  }

  return { lat, lon }
}
