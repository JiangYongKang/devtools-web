import { decodeGeohash } from './geohash.js'

/**
 * 经纬度坐标转 Canvas 像素坐标（墨卡托投影简化版）
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {number} width - Canvas 宽度
 * @param {number} height - Canvas 高度
 * @param {object} bounds - 边界 {latMin, latMax, lonMin, lonMax}
 * @returns {{x: number, y: number}} 像素坐标
 */
export function latLonToPixel(lat, lon, width, height, bounds) {
  const { latMin, latMax, lonMin, lonMax } = bounds

  const x = ((lon - lonMin) / (lonMax - lonMin)) * width
  const y = height - ((lat - latMin) / (latMax - latMin)) * height

  return { x, y }
}

/**
 * 绘制网格线
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {number} [gridSize=50] - 网格大小
 */
export function drawGrid(ctx, width, height, gridSize = 50) {
  ctx.save()
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 0.5

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * 绘制点
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {object} [options] - 选项
 * @param {string} [options.color='#e53e3e'] - 颜色
 * @param {number} [options.radius=6] - 半径
 * @param {string} [options.label] - 标签
 */
export function drawPoint(ctx, x, y, options = {}) {
  const { color = '#e53e3e', radius = 6, label } = options

  ctx.save()

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()

  if (label) {
    ctx.fillStyle = '#2d3748'
    ctx.font = '12px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, x, y - radius - 5)
  }

  ctx.restore()
}

/**
 * 绘制折线（路径）
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Array<{x: number, y: number}>} points - 像素点数组
 * @param {object} [options] - 选项
 * @param {string} [options.color='#4a90d9'] - 颜色
 * @param {number} [options.lineWidth=2] - 线宽
 */
export function drawPath(ctx, points, options = {}) {
  const { color = '#4a90d9', lineWidth = 2 } = options

  if (points.length < 2) return

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()

  ctx.restore()
}

/**
 * 绘制多边形（bbox）
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Array<{x: number, y: number}>} points - 像素点数组
 * @param {object} [options] - 选项
 * @param {string} [options.strokeColor='#48bb78'] - 边框颜色
 * @param {string} [options.fillColor='rgba(72, 187, 120, 0.15)'] - 填充颜色
 * @param {number} [options.lineWidth=1.5] - 线宽
 * @param {string} [options.label] - 标签
 */
export function drawPolygon(ctx, points, options = {}) {
  const {
    strokeColor = '#48bb78',
    fillColor = 'rgba(72, 187, 120, 0.15)',
    lineWidth = 1.5,
    label,
  } = options

  if (points.length < 3) return

  ctx.save()

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.closePath()

  if (fillColor) {
    ctx.fillStyle = fillColor
    ctx.fill()
  }

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = lineWidth
  ctx.stroke()

  if (label) {
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length
    ctx.fillStyle = '#276749'
    ctx.font = '11px -apple-system, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, cy)
  }

  ctx.restore()
}

/**
 * 绘制 geohash 网格
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {string[]} hashes - geohash 数组
 * @param {number} width - Canvas 宽度
 * @param {number} height - Canvas 高度
 * @param {object} bounds - 边界
 */
export function drawGeohashGrid(ctx, hashes, width, height, bounds) {
  for (const hash of hashes) {
    const polygon = getGeohashPixelPolygon(hash, width, height, bounds)
    drawPolygon(ctx, polygon, {
      label: hash,
      strokeColor: '#4299e1',
      fillColor: 'rgba(66, 153, 225, 0.1)',
    })
  }
}

/**
 * 获取 geohash 的像素多边形
 * @param {string} hash - geohash
 * @param {number} width - Canvas 宽度
 * @param {number} height - Canvas 高度
 * @param {object} bounds - 边界
 * @returns {Array<{x: number, y: number}>}
 */
function getGeohashPixelPolygon(hash, width, height, bounds) {
  const { latMin, latMax, lonMin, lonMax } = decodeGeohash(hash)

  const corners = [
    [lonMin, latMin],
    [lonMax, latMin],
    [lonMax, latMax],
    [lonMin, latMax],
  ]

  return corners.map(([lon, lat]) =>
    latLonToPixel(lat, lon, width, height, bounds)
  )
}

/**
 * 计算所有元素的边界
 * @param {Array<{lat: number, lon: number}>} points - 点数组
 * @param {Array<{latMin: number, latMax: number, lonMin: number, lonMax: number}>} bboxes - bbox 数组
 * @returns {{latMin: number, latMax: number, lonMin: number, lonMax: number}}
 */
export function computeBounds(points = [], bboxes = []) {
  let latMin = Infinity
  let latMax = -Infinity
  let lonMin = Infinity
  let lonMax = -Infinity

  for (const p of points) {
    latMin = Math.min(latMin, p.lat)
    latMax = Math.max(latMax, p.lat)
    lonMin = Math.min(lonMin, p.lon)
    lonMax = Math.max(lonMax, p.lon)
  }

  for (const b of bboxes) {
    latMin = Math.min(latMin, b.latMin)
    latMax = Math.max(latMax, b.latMax)
    lonMin = Math.min(lonMin, b.lonMin)
    lonMax = Math.max(lonMax, b.lonMax)
  }

  if (!isFinite(latMin)) {
    latMin = -90
    latMax = 90
    lonMin = -180
    lonMax = 180
  }

  const latPad = (latMax - latMin) * 0.15 || 1
  const lonPad = (lonMax - lonMin) * 0.15 || 1

  return {
    latMin: Math.max(-90, latMin - latPad),
    latMax: Math.min(90, latMax + latPad),
    lonMin: Math.max(-180, lonMin - lonPad),
    lonMax: Math.min(180, lonMax + lonPad),
  }
}

/**
 * 绘制坐标轴标签
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {object} bounds - 边界
 */
export function drawAxisLabels(ctx, width, height, bounds) {
  const { latMin, latMax, lonMin, lonMax } = bounds

  ctx.save()
  ctx.fillStyle = '#718096'
  ctx.font = '10px -apple-system, sans-serif'

  ctx.textAlign = 'left'
  ctx.fillText(`${latMax.toFixed(2)}°`, 4, 12)
  ctx.fillText(`${latMin.toFixed(2)}°`, 4, height - 4)

  ctx.textAlign = 'right'
  ctx.fillText(`${lonMin.toFixed(2)}°`, width - 4, height - 4)
  ctx.fillText(`${lonMax.toFixed(2)}°`, width - 4, 12)

  ctx.restore()
}
