import { getGeohashPolygon } from './geohash.js'
import { bboxToPolygon } from './bbox.js'

/**
 * 生成 GeoJSON Point Feature
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {object} [properties] - 属性
 * @returns {object} GeoJSON Feature
 */
export function createPointFeature(lat, lon, properties = {}) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
  }
}

/**
 * 生成 GeoJSON Polygon Feature
 * @param {Array<[number, number]>} polygon - 多边形顶点 [[lon, lat], ...]
 * @param {object} [properties] - 属性
 * @returns {object} GeoJSON Feature
 */
export function createPolygonFeature(polygon, properties = {}) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [polygon],
    },
  }
}

/**
 * 生成 GeoJSON LineString Feature
 * @param {Array<{lat: number, lon: number}>} points - 点数组
 * @param {object} [properties] - 属性
 * @returns {object} GeoJSON Feature
 */
export function createLineStringFeature(points, properties = {}) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'LineString',
      coordinates: points.map((p) => [p.lon, p.lat]),
    },
  }
}

/**
 * 由 geohash 字符串生成 GeoJSON Polygon Feature
 * @param {string} hash - geohash 字符串
 * @param {object} [extraProperties] - 额外属性
 * @returns {object} GeoJSON Feature
 */
export function geohashToFeature(hash, extraProperties = {}) {
  const polygon = getGeohashPolygon(hash)
  return createPolygonFeature(polygon, {
    geohash: hash,
    ...extraProperties,
  })
}

/**
 * 由 bbox 生成 GeoJSON Polygon Feature
 * @param {{latMin: number, latMax: number, lonMin: number, lonMax: number}} bbox
 * @param {object} [extraProperties] - 额外属性
 * @returns {object} GeoJSON Feature
 */
export function bboxToFeature(bbox, extraProperties = {}) {
  const polygon = bboxToPolygon(bbox)
  return createPolygonFeature(polygon, extraProperties)
}

/**
 * 生成 GeoJSON FeatureCollection
 * @param {object[]} features - Feature 数组
 * @returns {object} GeoJSON FeatureCollection
 */
export function createFeatureCollection(features = []) {
  return {
    type: 'FeatureCollection',
    features,
  }
}

/**
 * 将多个 geohash 导出为 FeatureCollection
 * @param {string[]} hashes - geohash 数组
 * @returns {object} GeoJSON FeatureCollection
 */
export function exportGeohashesToGeoJSON(hashes) {
  const features = hashes.map((hash, idx) =>
    geohashToFeature(hash, { index: idx })
  )
  return createFeatureCollection(features)
}

/**
 * 将点路径导出为 FeatureCollection（包含点和线）
 * @param {Array<{lat: number, lon: number, name?: string}>} points - 点数组
 * @param {object} [options] - 选项
 * @param {boolean} [options.includePoints=true] - 是否包含点 Feature
 * @param {boolean} [options.includeLine=true] - 是否包含线 Feature
 * @returns {object} GeoJSON FeatureCollection
 */
export function exportPathToGeoJSON(points, options = {}) {
  const { includePoints = true, includeLine = true } = options
  const features = []

  if (includeLine && points.length >= 2) {
    features.push(
      createLineStringFeature(points, {
        type: 'path',
        pointCount: points.length,
      })
    )
  }

  if (includePoints) {
    points.forEach((p, idx) => {
      features.push(
        createPointFeature(p.lat, p.lon, {
          index: idx,
          name: p.name || `Point ${idx + 1}`,
        })
      )
    })
  }

  return createFeatureCollection(features)
}

/**
 * 下载 GeoJSON 文件
 * @param {object} geojson - GeoJSON 对象
 * @param {string} filename - 文件名（不含扩展名）
 */
export function downloadGeoJSON(geojson, filename = 'export') {
  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/geo+json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.geojson`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
