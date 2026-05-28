import { describe, test, expect } from 'vitest'
import {
  prefixToBbox,
  bboxCenter,
  bboxToPolygon,
  unionBbox,
  isPointInBbox,
  bboxIntersects,
  bboxArea,
  formatArea,
} from '../logic/bbox.js'
import { decodeGeohash } from '../logic/geohash.js'

describe('prefixToBbox', () => {
  test('与 decodeGeohash 返回的 bbox 一致', () => {
    const hash = 'wx4g0'
    const bbox1 = prefixToBbox(hash)
    const decoded = decodeGeohash(hash)

    expect(bbox1.latMin).toBe(decoded.latMin)
    expect(bbox1.latMax).toBe(decoded.latMax)
    expect(bbox1.lonMin).toBe(decoded.lonMin)
    expect(bbox1.lonMax).toBe(decoded.lonMax)
  })

  test('无效前缀抛出错误', () => {
    expect(() => prefixToBbox('invalid')).toThrow()
  })
})

describe('bboxCenter', () => {
  test('计算中心点', () => {
    const bbox = { latMin: 30, latMax: 40, lonMin: 110, lonMax: 120 }
    const center = bboxCenter(bbox)
    expect(center.lat).toBe(35)
    expect(center.lon).toBe(115)
  })
})

describe('bboxToPolygon', () => {
  test('返回闭合多边形', () => {
    const bbox = { latMin: 30, latMax: 40, lonMin: 110, lonMax: 120 }
    const polygon = bboxToPolygon(bbox)

    expect(polygon).toHaveLength(5)
    expect(polygon[0]).toEqual([110, 30])
    expect(polygon[1]).toEqual([120, 30])
    expect(polygon[2]).toEqual([120, 40])
    expect(polygon[3]).toEqual([110, 40])
    expect(polygon[4]).toEqual(polygon[0])
  })
})

describe('unionBbox', () => {
  test('多个 geohash 并集 bbox', () => {
    const hashes = ['wx4g0', 'wx4g1', 'wx4fb']
    const bbox = unionBbox(hashes)

    expect(bbox.latMin).toBeLessThanOrEqual(bbox.latMax)
    expect(bbox.lonMin).toBeLessThanOrEqual(bbox.lonMax)

    for (const hash of hashes) {
      const hb = prefixToBbox(hash)
      expect(bbox.latMin).toBeLessThanOrEqual(hb.latMin)
      expect(bbox.latMax).toBeGreaterThanOrEqual(hb.latMax)
      expect(bbox.lonMin).toBeLessThanOrEqual(hb.lonMin)
      expect(bbox.lonMax).toBeGreaterThanOrEqual(hb.lonMax)
    }
  })

  test('空数组抛出错误', () => {
    expect(() => unionBbox([])).toThrow()
  })
})

describe('isPointInBbox', () => {
  const bbox = { latMin: 30, latMax: 40, lonMin: 110, lonMax: 120 }

  test('点在 bbox 内', () => {
    expect(isPointInBbox(35, 115, bbox)).toBe(true)
    expect(isPointInBbox(30, 110, bbox)).toBe(true)
    expect(isPointInBbox(40, 120, bbox)).toBe(true)
  })

  test('点在 bbox 外', () => {
    expect(isPointInBbox(29, 115, bbox)).toBe(false)
    expect(isPointInBbox(41, 115, bbox)).toBe(false)
    expect(isPointInBbox(35, 109, bbox)).toBe(false)
    expect(isPointInBbox(35, 121, bbox)).toBe(false)
  })
})

describe('bboxIntersects', () => {
  const bbox1 = { latMin: 30, latMax: 40, lonMin: 110, lonMax: 120 }

  test('bbox 相交', () => {
    const bbox2 = { latMin: 35, latMax: 45, lonMin: 115, lonMax: 125 }
    expect(bboxIntersects(bbox1, bbox2)).toBe(true)
  })

  test('bbox 包含', () => {
    const bbox2 = { latMin: 32, latMax: 38, lonMin: 112, lonMax: 118 }
    expect(bboxIntersects(bbox1, bbox2)).toBe(true)
  })

  test('bbox 不相交', () => {
    const bbox2 = { latMin: 50, latMax: 60, lonMin: 130, lonMax: 140 }
    expect(bboxIntersects(bbox1, bbox2)).toBe(false)
  })

  test('边接触视为相交', () => {
    const bbox2 = { latMin: 40, latMax: 50, lonMin: 120, lonMax: 130 }
    expect(bboxIntersects(bbox1, bbox2)).toBe(true)
  })
})

describe('bboxArea', () => {
  test('赤道附近 1x1 度约 12364 平方公里', () => {
    const bbox = { latMin: 0, latMax: 1, lonMin: 0, lonMax: 1 }
    const area = bboxArea(bbox)
    const areaSqKm = area / 1000000

    expect(areaSqKm).toBeCloseTo(12364, -2)
  })

  test('面积为正', () => {
    const bbox = { latMin: -10, latMax: 10, lonMin: -10, lonMax: 10 }
    expect(bboxArea(bbox)).toBeGreaterThan(0)
  })
})

describe('formatArea', () => {
  test('格式化面积', () => {
    expect(formatArea(100)).toBe('100.00 m²')
    expect(formatArea(15000)).toBe('1.50 公顷')
    expect(formatArea(2000000)).toBe('2.00 km²')
  })
})
