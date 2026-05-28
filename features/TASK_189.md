### 任务目标
- 坐标转换：WGS84↔GCJ02↔BD09 双向转换（使用公开算法实现，非测绘资质）；输入经纬度十进制度；批量点列表转换；输出保留 6～8 位小数可配置。
- 偏移分析：相对 WGS84 展示 Δlon/Δlat 米级估算（Haversine）；中国境内外判断（粗略 bounding box）与「境外不应加偏」提示。
- 合规：显著位置展示「仅供开发调试，不得用于导航与正式地图发布」；说明加密偏移法律与政策背景；禁止存储用户坐标到服务端。
- 轨迹：多点序列转换后导出 GeoJSON LineString（仅下载）；与任务 190 距离工具互补不修改其目录。
- 示例：内置「北京天安门三系坐标」「境外点不偏移」「批量 CSV」三组；单测覆盖已知参考点误差阈值（米级）；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/geo-coordinate-datum-converter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/geo-coordinate-datum-converter/logic/`
- 测试文件夹：`devtools-web/src/tools/geo-coordinate-datum-converter/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/geo-coordinate-datum-converter/` 目录内文件；不得修改 Haversine（任务 190）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 三系互转、偏移估算、境内外提示、GeoJSON 导出均可演示；单测覆盖参考点；示例可用。
