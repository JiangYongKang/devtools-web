import { describe, it, expect } from 'vitest'
import {
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  isInChina,
  convertCoordinate,
  DATUM_TYPES,
  formatCoordinate,
} from '../logic/coordinateConverter.js'
import { haversineDistance, calculateOffset } from '../logic/haversine.js'
import { REFERENCE_POINTS } from '../logic/examples.js'

describe('坐标转换算法测试', () => {
  describe('境内外判断', () => {
    it('北京天安门应该在中国境内', () => {
      expect(isInChina(39.9042, 116.4074)).toBe(true)
    })

    it('东京应该在中国境外', () => {
      expect(isInChina(35.6762, 139.6503)).toBe(false)
    })

    it('纽约应该在中国境外', () => {
      expect(isInChina(40.7128, -74.006)).toBe(false)
    })
  })

  describe('WGS84 ↔ GCJ02 转换', () => {
    it('北京天安门 WGS84 转 GCJ02 误差在允许范围内', () => {
      const point = REFERENCE_POINTS[0]
      const result = wgs84ToGcj02(point.wgs84.lat, point.wgs84.lon)
      const distance = haversineDistance(
        result.lat,
        result.lon,
        point.expectedGcj02.lat,
        point.expectedGcj02.lon
      )
      expect(distance).toBeLessThan(point.toleranceMeters)
    })

    it('上海外滩 WGS84 转 GCJ02 误差在允许范围内', () => {
      const point = REFERENCE_POINTS[1]
      const result = wgs84ToGcj02(point.wgs84.lat, point.wgs84.lon)
      const distance = haversineDistance(
        result.lat,
        result.lon,
        point.expectedGcj02.lat,
        point.expectedGcj02.lon
      )
      expect(distance).toBeLessThan(point.toleranceMeters)
    })

    it('境外点 WGS84 转 GCJ02 不应有偏移', () => {
      const point = REFERENCE_POINTS[2]
      const result = wgs84ToGcj02(point.wgs84.lat, point.wgs84.lon)
      expect(result.lat).toBeCloseTo(point.wgs84.lat, 6)
      expect(result.lon).toBeCloseTo(point.wgs84.lon, 6)
    })

    it('GCJ02 转 WGS84 往返误差在米级', () => {
      const original = { lat: 39.9055, lon: 116.4125 }
      const wgs84 = gcj02ToWgs84(original.lat, original.lon)
      const backToGcj = wgs84ToGcj02(wgs84.lat, wgs84.lon)
      const distance = haversineDistance(original.lat, original.lon, backToGcj.lat, backToGcj.lon)
      expect(distance).toBeLessThan(1)
    })
  })

  describe('GCJ02 ↔ BD09 转换', () => {
    it('GCJ02 转 BD09 往返误差在米级', () => {
      const original = { lat: 39.9055, lon: 116.4125 }
      const bd09 = gcj02ToBd09(original.lat, original.lon)
      const backToGcj = bd09ToGcj02(bd09.lat, bd09.lon)
      const distance = haversineDistance(original.lat, original.lon, backToGcj.lat, backToGcj.lon)
      expect(distance).toBeLessThan(1)
    })
  })

  describe('WGS84 ↔ BD09 转换', () => {
    it('WGS84 转 BD09 往返误差在米级', () => {
      const original = { lat: 39.9042, lon: 116.4074 }
      const bd09 = wgs84ToBd09(original.lat, original.lon)
      const backToWgs = bd09ToWgs84(bd09.lat, bd09.lon)
      const distance = haversineDistance(original.lat, original.lon, backToWgs.lat, backToWgs.lon)
      expect(distance).toBeLessThan(1)
    })

    it('境外点 WGS84 转 BD09 不应有偏移', () => {
      const original = { lat: 35.6762, lon: 139.6503 }
      const bd09 = wgs84ToBd09(original.lat, original.lon)
      expect(bd09.lat).toBeCloseTo(original.lat, 6)
      expect(bd09.lon).toBeCloseTo(original.lon, 6)
    })
  })

  describe('通用转换函数', () => {
    it('相同坐标系转换应返回原值', () => {
      const result = convertCoordinate(39.9042, 116.4074, DATUM_TYPES.WGS84, DATUM_TYPES.WGS84)
      expect(result.lat).toBe(39.9042)
      expect(result.lon).toBe(116.4074)
    })

    it('WGS84 转 BD09 应正确执行', () => {
      const direct = wgs84ToBd09(39.9042, 116.4074)
      const viaConvert = convertCoordinate(39.9042, 116.4074, DATUM_TYPES.WGS84, DATUM_TYPES.BD09)
      expect(direct.lat).toBeCloseTo(viaConvert.lat, 6)
      expect(direct.lon).toBeCloseTo(viaConvert.lon, 6)
    })

    it('BD09 转 GCJ02 应正确执行', () => {
      const bd09 = { lat: 39.9118, lon: 116.4189 }
      const direct = bd09ToGcj02(bd09.lat, bd09.lon)
      const viaConvert = convertCoordinate(bd09.lat, bd09.lon, DATUM_TYPES.BD09, DATUM_TYPES.GCJ02)
      expect(direct.lat).toBeCloseTo(viaConvert.lat, 6)
      expect(direct.lon).toBeCloseTo(viaConvert.lon, 6)
    })
  })

  describe('坐标格式化', () => {
    it('默认保留6位小数', () => {
      expect(formatCoordinate(39.123456789)).toBe(39.123457)
    })

    it('可以指定保留8位小数', () => {
      expect(formatCoordinate(39.123456789, 8)).toBe(39.12345679)
    })

    it('小数位数限制在6-8之间', () => {
      expect(formatCoordinate(39.123456789, 2)).toBe(39.123457)
      expect(formatCoordinate(39.123456789, 10)).toBeCloseTo(39.12345679, 8)
    })
  })
})

describe('Haversine 距离计算', () => {
  it('同一点距离应为0', () => {
    expect(haversineDistance(39.9, 116.4, 39.9, 116.4)).toBeCloseTo(0, 3)
  })

  it('计算两点距离应在合理范围内', () => {
    const distance = haversineDistance(39.9042, 116.4074, 31.2304, 121.4737)
    expect(distance).toBeGreaterThan(1000000)
    expect(distance).toBeLessThan(1500000)
  })
})

describe('偏移量计算', () => {
  it('国内点应有偏移', () => {
    const wgs = { lat: 39.9042, lon: 116.4074 }
    const gcj = wgs84ToGcj02(wgs.lat, wgs.lon)
    const offset = calculateOffset(wgs.lat, wgs.lon, gcj.lat, gcj.lon)
    expect(offset.totalDistance).toBeGreaterThan(100)
    expect(offset.totalDistance).toBeLessThan(1000)
  })

  it('境外点偏移应为0', () => {
    const wgs = { lat: 35.6762, lon: 139.6503 }
    const gcj = wgs84ToGcj02(wgs.lat, wgs.lon)
    const offset = calculateOffset(wgs.lat, wgs.lon, gcj.lat, gcj.lon)
    expect(offset.totalDistance).toBeCloseTo(0, 3)
  })
})
