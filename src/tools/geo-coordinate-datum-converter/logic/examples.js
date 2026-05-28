export const EXAMPLES = [
  {
    id: 'tiananmen',
    name: '北京天安门',
    description: '三系坐标对比（WGS84/GCJ02/BD09）',
    data: {
      type: 'single',
      wgs84: { lat: 39.9042, lon: 116.4074 },
      gcj02: { lat: 39.9055, lon: 116.4125 },
      bd09: { lat: 39.9118, lon: 116.4189 },
      name: '北京天安门',
    },
  },
  {
    id: 'overseas',
    name: '境外点（东京）',
    description: '演示境外坐标不应加偏',
    data: {
      type: 'single',
      wgs84: { lat: 35.6762, lon: 139.6503 },
      gcj02: { lat: 35.6762, lon: 139.6503 },
      bd09: { lat: 35.6762, lon: 139.6503 },
      name: '日本东京',
    },
  },
  {
    id: 'batch-csv',
    name: '批量CSV示例',
    description: '国内多个城市坐标批量转换',
    data: {
      type: 'batch',
      csv: `39.9042,116.4074,北京
31.2304,121.4737,上海
22.5431,114.0579,深圳
30.5728,104.0668,成都
25.2744,110.2900,桂林`,
      fromDatum: 'wgs84',
      toDatum: 'gcj02',
    },
  },
  {
    id: 'trajectory',
    name: '轨迹示例',
    description: '多点序列转换后导出GeoJSON',
    data: {
      type: 'trajectory',
      points: [
        { lat: 39.9042, lon: 116.4074, name: '起点' },
        { lat: 39.9142, lon: 116.4174, name: '途经点1' },
        { lat: 39.9242, lon: 116.4274, name: '途经点2' },
        { lat: 39.9342, lon: 116.4374, name: '终点' },
      ],
      fromDatum: 'wgs84',
      toDatum: 'gcj02',
    },
  },
]

export const REFERENCE_POINTS = [
  {
    name: '北京天安门',
    wgs84: { lat: 39.9042, lon: 116.4074 },
    expectedGcj02: { lat: 39.9055, lon: 116.4125 },
    toleranceMeters: 100,
  },
  {
    name: '上海外滩',
    wgs84: { lat: 31.2397, lon: 121.4998 },
    expectedGcj02: { lat: 31.2411, lon: 121.5052 },
    toleranceMeters: 500,
  },
  {
    name: '东京（境外）',
    wgs84: { lat: 35.6762, lon: 139.6503 },
    expectedGcj02: { lat: 35.6762, lon: 139.6503 },
    toleranceMeters: 1,
  },
]

export const COMPLIANCE_NOTICE = `
仅供开发调试，不得用于导航与正式地图发布。

法律与政策背景：
- 根据《中华人民共和国测绘法》，未经测绘行政主管部门批准，
  任何单位和个人不得擅自发布、出版、展示、登载未做保密
  技术处理的中国境内地理信息数据。
- GCJ-02（火星坐标系）是中国国家测绘局制定的加密坐标系
  统，用于中国大陆出版的地图。
- BD-09是百度地图使用的坐标系，在GCJ-02基础上再次加密。

本工具特点：
- 所有计算在浏览器本地完成，不向服务器发送任何坐标数据
- 仅用于开发调试阶段的坐标系转换参考
- 请勿将转换结果用于导航、测绘或正式地图发布
`
