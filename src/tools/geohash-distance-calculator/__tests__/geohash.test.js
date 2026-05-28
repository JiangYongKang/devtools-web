import { describe, test, expect } from 'vitest'
import {
  encodeGeohash,
  decodeGeohash,
  isValidGeohash,
  getNeighbor,
  getNeighbors,
  isPointInPrefix,
  getGeohashPolygon,
  normalizeLongitude,
  PRECISION_ERRORS,
} from '../logic/geohash.js'

describe('isValidGeohash', () => {
  test('有效 geohash 字符串', () => {
    expect(isValidGeohash('wx4g0')).toBe(true)
    expect(isValidGeohash('0123456789bcdefghjkmnpqrstuvwxyz')).toBe(true)
  })

  test('非法字符返回 false', () => {
    expect(isValidGeohash('wx4g0a')).toBe(false)
    expect(isValidGeohash('wx4g0i')).toBe(false)
    expect(isValidGeohash('wx4g0l')).toBe(false)
    expect(isValidGeohash('wx4g0o')).toBe(false)
  })

  test('空值或非字符串返回 false', () => {
    expect(isValidGeohash('')).toBe(false)
    expect(isValidGeohash(null)).toBe(false)
    expect(isValidGeohash(undefined)).toBe(false)
    expect(isValidGeohash(123)).toBe(false)
  })
})

describe('encodeGeohash & decodeGeohash 往返测试', () => {
  test('北京天安门坐标编解码往返', () => {
    const lat = 39.9042
    const lon = 116.4074

    for (let precision = 1; precision <= 12; precision++) {
      const hash = encodeGeohash(lat, lon, precision)
      expect(hash).toHaveLength(precision)
      expect(isValidGeohash(hash)).toBe(true)

      const decoded = decodeGeohash(hash)
      expect(decoded.lat).toBeGreaterThanOrEqual(decoded.latMin)
      expect(decoded.lat).toBeLessThanOrEqual(decoded.latMax)
      expect(decoded.lon).toBeGreaterThanOrEqual(decoded.lonMin)
      expect(decoded.lon).toBeLessThanOrEqual(decoded.lonMax)

      const latError = Math.abs(decoded.lat - lat)
      const lonError = Math.abs(decoded.lon - lon)
      const maxLatError = (decoded.latMax - decoded.latMin) / 2
      const maxLonError = (decoded.lonMax - decoded.lonMin) / 2
      expect(latError).toBeLessThanOrEqual(maxLatError)
      expect(lonError).toBeLessThanOrEqual(maxLonError)
    }
  })

  test('边界坐标编解码', () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 90, lon: 180 },
      { lat: -90, lon: -180 },
      { lat: 45, lon: -90 },
      { lat: -45, lon: 90 },
    ]

    for (const p of points) {
      const hash = encodeGeohash(p.lat, p.lon, 8)
      const decoded = decodeGeohash(hash)
      expect(decoded.latMin).toBeLessThanOrEqual(p.lat)
      expect(decoded.latMax).toBeGreaterThanOrEqual(p.lat)
      expect(decoded.lonMin).toBeLessThanOrEqual(p.lon)
      expect(decoded.lonMax).toBeGreaterThanOrEqual(p.lon)
    }
  })

  test('默认精度为 6', () => {
    const hash = encodeGeohash(39.9042, 116.4074)
    expect(hash).toHaveLength(6)
  })

  test('精度超出范围抛出错误', () => {
    expect(() => encodeGeohash(0, 0, 0)).toThrow()
    expect(() => encodeGeohash(0, 0, 13)).toThrow()
  })

  test('经纬度超出范围抛出错误', () => {
    expect(() => encodeGeohash(91, 0)).toThrow()
    expect(() => encodeGeohash(-91, 0)).toThrow()
    expect(() => encodeGeohash(0, 181)).toThrow()
    expect(() => encodeGeohash(0, -181)).toThrow()
  })

  test('解码无效 geohash 抛出错误', () => {
    expect(() => decodeGeohash('invalid')).toThrow()
    expect(() => decodeGeohash('')).toThrow()
  })
})

describe('getGeohashPolygon', () => {
  test('返回闭合的 5 个点', () => {
    const polygon = getGeohashPolygon('wx4g')
    expect(polygon).toHaveLength(5)
    expect(polygon[0]).toEqual(polygon[4])

    for (const point of polygon) {
      expect(point).toHaveLength(2)
      expect(typeof point[0]).toBe('number')
      expect(typeof point[1]).toBe('number')
    }
  })
})

describe('normalizeLongitude', () => {
  test('经度环绕规范化', () => {
    expect(normalizeLongitude(180)).toBe(180)
    expect(normalizeLongitude(181)).toBe(-179)
    expect(normalizeLongitude(-181)).toBe(179)
    expect(normalizeLongitude(360)).toBe(0)
    expect(normalizeLongitude(-360)).toBe(0)
    expect(normalizeLongitude(270)).toBe(-90)
  })
})

describe('getNeighbor 邻格计算', () => {
  test('已知 geohash 邻格正确性', () => {
    const hash = 'wx4g0'

    const n = getNeighbor(hash, 'n')
    const s = getNeighbor(hash, 's')
    const e = getNeighbor(hash, 'e')
    const w = getNeighbor(hash, 'w')

    expect(n).not.toBe(hash)
    expect(s).not.toBe(hash)
    expect(e).not.toBe(hash)
    expect(w).not.toBe(hash)

    expect(isValidGeohash(n)).toBe(true)
    expect(isValidGeohash(s)).toBe(true)
    expect(isValidGeohash(e)).toBe(true)
    expect(isValidGeohash(w)).toBe(true)

    expect(n).toHaveLength(hash.length)
    expect(s).toHaveLength(hash.length)
    expect(e).toHaveLength(hash.length)
    expect(w).toHaveLength(hash.length)
  })

  test('往返邻格回到原点', () => {
    const hash = 'wx4g0'

    expect(getNeighbor(getNeighbor(hash, 'n'), 's')).toBe(hash)
    expect(getNeighbor(getNeighbor(hash, 's'), 'n')).toBe(hash)
    expect(getNeighbor(getNeighbor(hash, 'e'), 'w')).toBe(hash)
    expect(getNeighbor(getNeighbor(hash, 'w'), 'e')).toBe(hash)
  })

  test('对角邻格', () => {
    const hash = 'wx4g0'
    const ne = getNeighbor(hash, 'ne')
    const sw = getNeighbor(hash, 'sw')
    const nw = getNeighbor(hash, 'nw')
    const se = getNeighbor(hash, 'se')

    expect(isValidGeohash(ne)).toBe(true)
    expect(isValidGeohash(sw)).toBe(true)
    expect(isValidGeohash(nw)).toBe(true)
    expect(isValidGeohash(se)).toBe(true)

    expect(getNeighbor(getNeighbor(hash, 'n'), 'e')).toBe(ne)
    expect(getNeighbor(getNeighbor(hash, 's'), 'w')).toBe(sw)
  })

  test('无效方向抛出错误', () => {
    expect(() => getNeighbor('wx4g0', 'x')).toThrow()
  })
})

describe('getNeighbors 九宫格', () => {
  test('返回 9 个邻格（含自身）', () => {
    const hash = 'wx4g0'
    const neighbors = getNeighbors(hash)

    expect(neighbors.center).toBe(hash)
    expect(neighbors.n).toBe(getNeighbor(hash, 'n'))
    expect(neighbors.ne).toBe(getNeighbor(hash, 'ne'))
    expect(neighbors.e).toBe(getNeighbor(hash, 'e'))
    expect(neighbors.se).toBe(getNeighbor(hash, 'se'))
    expect(neighbors.s).toBe(getNeighbor(hash, 's'))
    expect(neighbors.sw).toBe(getNeighbor(hash, 'sw'))
    expect(neighbors.w).toBe(getNeighbor(hash, 'w'))
    expect(neighbors.nw).toBe(getNeighbor(hash, 'nw'))

    const all = [
      neighbors.center,
      neighbors.n,
      neighbors.ne,
      neighbors.e,
      neighbors.se,
      neighbors.s,
      neighbors.sw,
      neighbors.w,
      neighbors.nw,
    ]
    expect(new Set(all).size).toBe(9)
  })
})

describe('isPointInPrefix', () => {
  test('点在前缀范围内', () => {
    const prefix = 'wx4g'
    expect(isPointInPrefix(39.9042, 116.4074, prefix)).toBe(true)
  })

  test('点不在前缀范围内', () => {
    const prefix = 'wx4g'
    expect(isPointInPrefix(31.2304, 121.4737, prefix)).toBe(false)
  })

  test('无效前缀抛出错误', () => {
    expect(() => isPointInPrefix(0, 0, 'invalid')).toThrow()
  })
})

describe('PRECISION_ERRORS 精度误差表', () => {
  test('精度 1~12 对应误差存在', () => {
    for (let i = 1; i <= 12; i++) {
      expect(PRECISION_ERRORS[i]).toBeDefined()
      expect(typeof PRECISION_ERRORS[i].lat).toBe('number')
      expect(typeof PRECISION_ERRORS[i].lon).toBe('number')
      expect(PRECISION_ERRORS[i].lat).toBeGreaterThan(0)
      expect(PRECISION_ERRORS[i].lon).toBeGreaterThan(0)
    }
  })

  test('精度越高误差越小', () => {
    for (let i = 1; i < 12; i++) {
      expect(PRECISION_ERRORS[i].lat).toBeGreaterThan(PRECISION_ERRORS[i + 1].lat)
      expect(PRECISION_ERRORS[i].lon).toBeGreaterThan(PRECISION_ERRORS[i + 1].lon)
    }
  })
})
