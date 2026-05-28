/**
 * 示例 1：北京 geohash 示例
 * 北京天安门坐标约为 39.9042° N, 116.4074° E
 */
export const BEIJING_GEOHASH_EXAMPLE = {
  id: 'beijing',
  name: '北京 Geohash',
  description: '北京天安门坐标的 geohash 编解码与邻格展示',
  lat: 39.9042,
  lon: 116.4074,
  precision: 6,
}

/**
 * 示例 2：路径 3 点示例
 * 北京 -> 上海 -> 广州
 */
export const PATH_3_POINTS_EXAMPLE = {
  id: 'path-3points',
  name: '路径 3 点',
  description: '北京-上海-广州三点折线距离与方位角',
  points: [
    { name: '北京', lat: 39.9042, lon: 116.4074 },
    { name: '上海', lat: 31.2304, lon: 121.4737 },
    { name: '广州', lat: 23.1291, lon: 113.2644 },
  ],
}

/**
 * 示例 3：前缀覆盖判定示例
 * 使用北京 geohash 前缀，判定某些点是否在该区域内
 */
export const PREFIX_COVERAGE_EXAMPLE = {
  id: 'prefix-coverage',
  name: '前缀覆盖判定',
  description: '判定点是否在 geohash 前缀范围内',
  prefix: 'wx4g',
  testPoints: [
    { name: '北京天安门', lat: 39.9042, lon: 116.4074, expected: true },
    { name: '北京故宫', lat: 39.9163, lon: 116.3972, expected: true },
    { name: '上海外滩', lat: 31.2397, lon: 121.4998, expected: false },
    { name: '北京西站', lat: 39.8948, lon: 116.3215, expected: true },
  ],
}

/**
 * 所有示例集合
 */
export const EXAMPLES = [
  BEIJING_GEOHASH_EXAMPLE,
  PATH_3_POINTS_EXAMPLE,
  PREFIX_COVERAGE_EXAMPLE,
]
