import { describe, test, expect } from 'vitest'
import {
  haversineDistance,
  formatDistance,
  polylineDistance,
  bearing,
  bearingToCompass,
  interpolatePath,
} from '../logic/distance.js'

describe('haversineDistance 大圆距离', () => {
  test('同一点距离为 0', () => {
    const d = haversineDistance(39.9042, 116.4074, 39.9042, 116.4074)
    expect(d).toBeCloseTo(0, 6)
  })

  test('北京到上海约 1068 公里', () => {
    const beijing = { lat: 39.9042, lon: 116.4074 }
    const shanghai = { lat: 31.2304, lon: 121.4737 }

    const d = haversineDistance(beijing.lat, beijing.lon, shanghai.lat, shanghai.lon)
    const dKm = d / 1000

    expect(dKm).toBeGreaterThan(1000)
    expect(dKm).toBeLessThan(1150)
    expect(dKm).toBeCloseTo(1068, -1)
  })

  test('纽约到伦敦约 5585 公里', () => {
    const newYork = { lat: 40.7128, lon: -74.006 }
    const london = { lat: 51.5074, lon: -0.1278 }

    const d = haversineDistance(newYork.lat, newYork.lon, london.lat, london.lon)
    const dKm = d / 1000

    expect(dKm).toBeGreaterThan(5500)
    expect(dKm).toBeLessThan(5700)
  })

  test('赤道上经度相差 1 度约 111.32 公里', () => {
    const d = haversineDistance(0, 0, 0, 1)
    const dKm = d / 1000

    expect(dKm).toBeCloseTo(111.32, 0)
  })

  test('任意经度相差 1 度在纬度 45° 约 78.7 公里', () => {
    const d = haversineDistance(45, 0, 45, 1)
    const dKm = d / 1000

    expect(dKm).toBeCloseTo(78.7, 0)
  })
})

describe('formatDistance', () => {
  test('小于 1000 米显示为米', () => {
    expect(formatDistance(500)).toBe('500.00 m')
    expect(formatDistance(999.99)).toBe('999.99 m')
  })

  test('大于等于 1000 米显示为公里', () => {
    expect(formatDistance(1000)).toBe('1.00 km')
    expect(formatDistance(1500)).toBe('1.50 km')
    expect(formatDistance(1000000)).toBe('1000.00 km')
  })
})

describe('polylineDistance 折线累计距离', () => {
  test('少于 2 个点返回 0', () => {
    expect(polylineDistance([])).toBe(0)
    expect(polylineDistance([{ lat: 0, lon: 0 }])).toBe(0)
  })

  test('两点距离等于 haversineDistance', () => {
    const points = [
      { lat: 39.9042, lon: 116.4074 },
      { lat: 31.2304, lon: 121.4737 },
    ]
    const d1 = polylineDistance(points)
    const d2 = haversineDistance(points[0].lat, points[0].lon, points[1].lat, points[1].lon)
    expect(d1).toBeCloseTo(d2, 6)
  })

  test('三点折线距离为两段之和', () => {
    const points = [
      { lat: 39.9042, lon: 116.4074 },
      { lat: 31.2304, lon: 121.4737 },
      { lat: 23.1291, lon: 113.2644 },
    ]
    const total = polylineDistance(points)
    const seg1 = haversineDistance(points[0].lat, points[0].lon, points[1].lat, points[1].lon)
    const seg2 = haversineDistance(points[1].lat, points[1].lon, points[2].lat, points[2].lon)

    expect(total).toBeCloseTo(seg1 + seg2, 6)
  })
})

describe('bearing 方位角', () => {
  test('正北方向为 0 度', () => {
    const b = bearing(0, 0, 1, 0)
    expect(b).toBeCloseTo(0, 0)
  })

  test('正东方向为 90 度', () => {
    const b = bearing(0, 0, 0, 1)
    expect(b).toBeCloseTo(90, 0)
  })

  test('正南方向为 180 度', () => {
    const b = bearing(1, 0, 0, 0)
    expect(b).toBeCloseTo(180, 0)
  })

  test('正西方向为 270 度', () => {
    const b = bearing(0, 1, 0, 0)
    expect(b).toBeCloseTo(270, 0)
  })

  test('北京到上海方位角约为 135 度（东南方向）', () => {
    const beijing = { lat: 39.9042, lon: 116.4074 }
    const shanghai = { lat: 31.2304, lon: 121.4737 }

    const b = bearing(beijing.lat, beijing.lon, shanghai.lat, shanghai.lon)
    expect(b).toBeGreaterThan(120)
    expect(b).toBeLessThan(160)
  })

  test('方位角范围 0 ~ 360', () => {
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = -170; lon <= 170; lon += 20) {
        const b = bearing(0, 0, lat, lon)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThan(360)
      }
    }
  })
})

describe('bearingToCompass 罗盘方向', () => {
  test('八个基本方向', () => {
    expect(bearingToCompass(0)).toBe('N')
    expect(bearingToCompass(45)).toBe('NE')
    expect(bearingToCompass(90)).toBe('E')
    expect(bearingToCompass(135)).toBe('SE')
    expect(bearingToCompass(180)).toBe('S')
    expect(bearingToCompass(225)).toBe('SW')
    expect(bearingToCompass(270)).toBe('W')
    expect(bearingToCompass(315)).toBe('NW')
  })

  test('360 度等同于 0 度', () => {
    expect(bearingToCompass(360)).toBe('N')
  })
})

describe('interpolatePath 路径插值', () => {
  test('采样点数量正确', () => {
    const points = interpolatePath(0, 0, 10, 10, 5)
    expect(points).toHaveLength(5)
  })

  test('起点和终点正确', () => {
    const lat1 = 39.9042, lon1 = 116.4074
    const lat2 = 31.2304, lon2 = 121.4737
    const points = interpolatePath(lat1, lon1, lat2, lon2, 10)

    expect(points[0].lat).toBeCloseTo(lat1, 6)
    expect(points[0].lon).toBeCloseTo(lon1, 6)
    expect(points[points.length - 1].lat).toBeCloseTo(lat2, 6)
    expect(points[points.length - 1].lon).toBeCloseTo(lon2, 6)
  })

  test('少于 2 个采样点返回起点', () => {
    const points = interpolatePath(0, 0, 10, 10, 1)
    expect(points).toHaveLength(1)
    expect(points[0].lat).toBe(0)
    expect(points[0].lon).toBe(0)
  })
})
