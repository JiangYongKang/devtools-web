import { describe, it, expect } from 'vitest'
import { parseCSV, batchConvert, resultsToCSV } from '../logic/batchProcessor.js'
import { DATUM_TYPES } from '../logic/coordinateConverter.js'

describe('批量处理测试', () => {
  describe('CSV 解析', () => {
    it('应正确解析简单CSV格式', () => {
      const csv = `39.9042,116.4074,北京
31.2304,121.4737,上海`
      const result = parseCSV(csv)
      expect(result.length).toBe(2)
      expect(result[0].lat).toBe(39.9042)
      expect(result[0].lon).toBe(116.4074)
      expect(result[0].name).toBe('北京')
    })

    it('应跳过注释行和空行', () => {
      const csv = `# 这是注释

39.9042,116.4074,北京

31.2304,121.4737,上海`
      const result = parseCSV(csv)
      expect(result.length).toBe(2)
    })

    it('应支持中文逗号和制表符分隔', () => {
      const csv = `39.9042，116.4074，北京
31.2304\t121.4737\t上海`
      const result = parseCSV(csv)
      expect(result.length).toBe(2)
      expect(result[0].lat).toBe(39.9042)
      expect(result[1].lon).toBe(121.4737)
    })

    it('应跳过无效行', () => {
      const csv = `39.9042,116.4074,北京
invalid,data,here
31.2304,121.4737,上海`
      const result = parseCSV(csv)
      expect(result.length).toBe(2)
    })
  })

  describe('批量转换', () => {
    it('应批量转换多个点', () => {
      const points = [
        { lat: 39.9042, lon: 116.4074, name: '北京' },
        { lat: 31.2304, lon: 121.4737, name: '上海' },
      ]
      const results = batchConvert(points, DATUM_TYPES.WGS84, DATUM_TYPES.GCJ02, 6)
      expect(results.length).toBe(2)
      expect(results[0].originalLat).toBe(39.9042)
      expect(results[0].originalLon).toBe(116.4074)
      expect(results[0].lat).not.toBe(results[0].originalLat)
      expect(results[0].name).toBe('北京')
    })

    it('境外点批量转换不应有偏移', () => {
      const points = [
        { lat: 35.6762, lon: 139.6503, name: '东京' },
        { lat: 40.7128, lon: -74.006, name: '纽约' },
      ]
      const results = batchConvert(points, DATUM_TYPES.WGS84, DATUM_TYPES.GCJ02, 6)
      expect(results[0].lat).toBeCloseTo(35.6762, 6)
      expect(results[0].lon).toBeCloseTo(139.6503, 6)
    })
  })

  describe('CSV导出', () => {
    it('应正确导出CSV格式', () => {
      const results = [
        {
          originalLat: 39.9042,
          originalLon: 116.4074,
          lat: 39.9055,
          lon: 116.4125,
          name: '北京',
        },
      ]
      const csv = resultsToCSV(results, 'wgs84', 'gcj02')
      expect(csv).toContain('original_wgs84_lat')
      expect(csv).toContain('converted_gcj02_lat')
      expect(csv).toContain('39.9042,116.4074,39.9055,116.4125,北京')
    })
  })
})
