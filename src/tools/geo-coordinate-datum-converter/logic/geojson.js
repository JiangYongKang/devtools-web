/**
 * 生成 GeoJSON LineString
 * @param {Array<{lat: number, lon: number}>} coordinates - 坐标点数组
 * @param {string} [name] - 轨迹名称
 * @returns {object} GeoJSON FeatureCollection
 */
export function generateLineStringGeoJSON(coordinates, name = 'trajectory') {
  const lineString = {
    type: 'Feature',
    properties: {
      name,
      pointCount: coordinates.length,
    },
    geometry: {
      type: 'LineString',
      coordinates: coordinates.map((c) => [c.lon, c.lat]),
    },
  }

  return {
    type: 'FeatureCollection',
    features: [lineString],
  }
}

/**
 * 生成 GeoJSON Point 集合
 * @param {Array<{lat: number, lon: number, name?: string}>} points - 点数组
 * @returns {object} GeoJSON FeatureCollection
 */
export function generatePointsGeoJSON(points) {
  return {
    type: 'FeatureCollection',
    features: points.map((p, i) => ({
      type: 'Feature',
      properties: {
        name: p.name || `Point ${i + 1}`,
        index: i,
      },
      geometry: {
        type: 'Point',
        coordinates: [p.lon, p.lat],
      },
    })),
  }
}

/**
 * 下载 GeoJSON 文件
 * @param {object} geojson - GeoJSON 对象
 * @param {string} filename - 文件名
 */
export function downloadGeoJSON(geojson, filename) {
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
