### 任务目标
- Geohash：经纬度↔geohash 编解码（base32）；精度级别 1～12 与误差界对照表；邻格 n/s/e/w 及 neighbors 九宫；边界经度环绕处理。
- 距离：Haversine 大圆距离（米/千米）；多点折线累计距离；任选两点方位角（初始 bearing）。
- 区域：由 geohash 前缀计算 bounding box 多边形坐标；多 geohash 并集 bbox；点在 prefix 内判定。
- 可视化：在简易地图网格或平面投影上绘制点、路径、bbox（Canvas）；导出 GeoJSON FeatureCollection。
- 示例：内置「北京 geohash」「路径 3 点」「前缀覆盖判定」三组；单测覆盖编解码往返、邻格、Haversine 已知距离；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/geohash-distance-calculator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/geohash-distance-calculator/logic/`
- 测试文件夹：`devtools-web/src/tools/geohash-distance-calculator/__tests__/`
### API 信息
- 无外部 API；不调用地图瓦片服务。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/geohash-distance-calculator/` 目录内文件；不得修改坐标系转换（任务 189）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- geohash 编解码、邻格、Haversine、bbox 与 GeoJSON 均可演示；单测覆盖往返与距离；示例可用。
