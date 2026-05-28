/**
 * Geohash 基32字符表（标准）
 */
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

/**
 * 字符到索引映射
 */
const CHAR_MAP = {}
for (let i = 0; i < BASE32.length; i++) {
  CHAR_MAP[BASE32[i]] = i
}

/**
 * 精度级别 1～12 对应的误差界（米）
 * [lat误差, lon误差]
 * 参考：https://en.wikipedia.org/wiki/Geohash#Precision
 */
export const PRECISION_ERRORS = [
  null,
  { lat: 4992000, lon: 4992000 },
  { lat: 624000, lon: 1248000 },
  { lat: 78000, lon: 156000 },
  { lat: 9700, lon: 19500 },
  { lat: 1220, lon: 2440 },
  { lat: 152, lon: 305 },
  { lat: 19, lon: 38 },
  { lat: 2.38, lon: 4.77 },
  { lat: 0.297, lon: 0.597 },
  { lat: 0.037, lon: 0.0745 },
  { lat: 0.0046, lon: 0.0093 },
  { lat: 0.00057, lon: 0.00116 },
]

/**
 * 验证 geohash 字符串合法性
 * @param {string} hash - geohash 字符串
 * @returns {boolean} 是否合法
 */
export function isValidGeohash(hash) {
  if (typeof hash !== 'string' || hash.length === 0) return false
  for (let i = 0; i < hash.length; i++) {
    if (!(hash[i] in CHAR_MAP)) return false
  }
  return true
}

/**
 * 经纬度编码为 geohash
 * @param {number} lat - 纬度 (-90 ~ 90)
 * @param {number} lon - 经度 (-180 ~ 180)
 * @param {number} [precision=6] - 精度级别 1~12
 * @returns {string} geohash 字符串
 */
export function encodeGeohash(lat, lon, precision = 6) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('经纬度必须是数字')
  }
  if (lat < -90 || lat > 90) {
    throw new Error('纬度必须在 -90 ~ 90 之间')
  }
  if (lon < -180 || lon > 180) {
    throw new Error('经度必须在 -180 ~ 180 之间')
  }
  if (precision < 1 || precision > 12) {
    throw new Error('精度级别必须在 1 ~ 12 之间')
  }

  let latMin = -90, latMax = 90
  let lonMin = -180, lonMax = 180
  let bits = 0
  let bitPos = 0
  let result = ''
  let isLonBit = true

  while (result.length < precision) {
    let mid
    if (isLonBit) {
      mid = (lonMin + lonMax) / 2
      if (lon >= mid) {
        bits = (bits << 1) | 1
        lonMin = mid
      } else {
        bits = (bits << 1) | 0
        lonMax = mid
      }
    } else {
      mid = (latMin + latMax) / 2
      if (lat >= mid) {
        bits = (bits << 1) | 1
        latMin = mid
      } else {
        bits = (bits << 1) | 0
        latMax = mid
      }
    }

    isLonBit = !isLonBit
    bitPos++

    if (bitPos === 5) {
      result += BASE32[bits]
      bits = 0
      bitPos = 0
    }
  }

  return result
}

/**
 * geohash 解码为经纬度范围
 * @param {string} hash - geohash 字符串
 * @returns {{lat: number, lon: number, latMin: number, latMax: number, lonMin: number, lonMax: number}}
 *          中心点与边界
 */
export function decodeGeohash(hash) {
  if (!isValidGeohash(hash)) {
    throw new Error('无效的 geohash 字符串')
  }

  let latMin = -90, latMax = 90
  let lonMin = -180, lonMax = 180
  let isLonBit = true

  for (let i = 0; i < hash.length; i++) {
    const char = hash[i]
    let bits = CHAR_MAP[char]

    for (let j = 4; j >= 0; j--) {
      const bit = (bits >> j) & 1
      let mid
      if (isLonBit) {
        mid = (lonMin + lonMax) / 2
        if (bit === 1) {
          lonMin = mid
        } else {
          lonMax = mid
        }
      } else {
        mid = (latMin + latMax) / 2
        if (bit === 1) {
          latMin = mid
        } else {
          latMax = mid
        }
      }
      isLonBit = !isLonBit
    }
  }

  const lat = (latMin + latMax) / 2
  const lon = (lonMin + lonMax) / 2

  return { lat, lon, latMin, latMax, lonMin, lonMax }
}

/**
 * 获取 geohash 的 bbox 多边形坐标（顺时针闭合）
 * @param {string} hash - geohash 字符串
 * @returns {Array<[number, number]>} [[lon, lat], ...] 多边形顶点
 */
export function getGeohashPolygon(hash) {
  const { latMin, latMax, lonMin, lonMax } = decodeGeohash(hash)
  return [
    [lonMin, latMin],
    [lonMax, latMin],
    [lonMax, latMax],
    [lonMin, latMax],
    [lonMin, latMin],
  ]
}

/**
 * 经度环绕规范化（处理 180 度经线穿越）
 * @param {number} lon - 经度
 * @returns {number} 规范化到 -180 ~ 180
 */
export function normalizeLongitude(lon) {
  while (lon > 180) lon -= 360
  while (lon < -180) lon += 360
  return lon
}

/**
 * 计算单个方向的邻格（使用位操作算法，避免邻接表错误）
 * @param {string} hash - geohash 字符串
 * @param {'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'} dir - 方向
 * @returns {string} 邻格 geohash
 */
export function getNeighbor(hash, dir) {
  if (!isValidGeohash(hash)) {
    throw new Error('无效的 geohash 字符串')
  }

  const validDirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
  if (!validDirs.includes(dir)) {
    throw new Error(`无效方向: ${dir}`)
  }

  if (dir.length === 2) {
    const d1 = dir[0]
    const d2 = dir[1]
    return getNeighbor(getNeighbor(hash, d1), d2)
  }

  const decoded = decodeGeohash(hash)
  const { lat, lon, latMin, latMax, lonMin, lonMax } = decoded
  const latStep = latMax - latMin
  const lonStep = lonMax - lonMin

  let newLat = lat
  let newLon = lon

  if (dir === 'n') newLat += latStep
  else if (dir === 's') newLat -= latStep
  else if (dir === 'e') newLon += lonStep
  else if (dir === 'w') newLon -= lonStep

  if (newLat > 90) newLat = 90 - (newLat - 90)
  if (newLat < -90) newLat = -90 - (newLat + 90)
  newLon = normalizeLongitude(newLon)

  return encodeGeohash(newLat, newLon, hash.length)
}

/**
 * 获取九宫格邻格（8个方向 + 自身）
 * @param {string} hash - geohash 字符串
 * @returns {{n: string, ne: string, e: string, se: string, s: string, sw: string, w: string, nw: string, center: string}}
 */
export function getNeighbors(hash) {
  return {
    n: getNeighbor(hash, 'n'),
    ne: getNeighbor(hash, 'ne'),
    e: getNeighbor(hash, 'e'),
    se: getNeighbor(hash, 'se'),
    s: getNeighbor(hash, 's'),
    sw: getNeighbor(hash, 'sw'),
    w: getNeighbor(hash, 'w'),
    nw: getNeighbor(hash, 'nw'),
    center: hash,
  }
}

/**
 * 判定点是否在 geohash 前缀范围内
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {string} prefix - geohash 前缀
 * @returns {boolean}
 */
export function isPointInPrefix(lat, lon, prefix) {
  if (!isValidGeohash(prefix)) {
    throw new Error('无效的 geohash 前缀')
  }
  const actual = encodeGeohash(lat, lon, prefix.length)
  return actual.startsWith(prefix)
}
