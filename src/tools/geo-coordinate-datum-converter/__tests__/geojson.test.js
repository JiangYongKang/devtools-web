import { describe, it, expect } from 'vitest'
import { generateLineStringGeoJSON, generatePointsGeoJSON } from '../logic/geojson.js'

describe('GeoJSON 生成测试', () => {
  describe('LineString 生成', () => {
    it('应生成有效的 GeoJSON LineString', () => {
      const coordinates = [
        { lat: 39.9042, lon: 116.4074 },
        { lat: 39.9142, lon: 116.4174 },
        { lat: 39.9242, lon: 116.4274 },
      ]
      const geojson = generateLineStringGeoJSON(coordinates, '测试轨迹')

      expect(geojson.type).toBe('FeatureCollection')
      expect(geojson.features.length).toBe(1)
      expect(geojson.features[0].type).toBe('Feature')
      expect(geojson.features[0].geometry.type).toBe('LineString')
      expect(geojson.features[0].geometry.coordinates.length).toBe(3)
      expect(geojson.features[0].properties.name).toBe('测试轨迹')
      expect(geojson.features[0].properties.pointCount).toBe(3)
    })

    it('坐标顺序应为 [lon, lat]', () => {
      const coordinates = [{ lat: 39.9042, lon: 116.4074 }]
      const geojson = generateLineStringGeoJSON(coordinates)
      expect(geojson.features[0].geometry.coordinates[0][0]).toBe(116.4074)
      expect(geojson.features[0].geometry.coordinates[0][1]).toBe(39.9042)
    })
  })

  describe('Points 生成', () => {
    it('应生成有效的 GeoJSON Point 集合', () => {
      const points = [
        { lat: 39.9042, lon: 116.4074, name: '北京' },
        { lat: 31.2304, lon: 121.4737, name: '上海' },
      ]
      const geojson = generatePointsGeoJSON(points)

      expect(geojson.type).toBe('FeatureCollection')
      expect(geojson.features.length).toBe(2)
      expect(geojson.features[0].geometry.type).toBe('Point')
      expect(geojson.features[0].properties.name).toBe('北京')
      expect(geojson.features[1].properties.index).toBe(1)
    })
  })
})
