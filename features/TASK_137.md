### 任务目标
- Stats 导入：粘贴 Rollup `stats.json` 或 Webpack `stats.json`（自动识别 schema 变体）；解析 modules、chunks、assets 列表；解析失败字段级提示。
- 依赖图：模块 import 关系有向图可视化（可缩放/filter）；点击节点展示 size、path、issuer 链摘要；chunk 边界着色。
- 体积分析：treemap 或 sunburst 展示 chunk/asset 体积占比；Top-N 最大模块表；重复依赖检测（同 resolved path 多 chunk 引用列表）。
- 示例：内置 Rollup 与 Webpack 各一份精简 stats 样例一键填充；导出重复依赖 CSV；空 stats 边界说明。
- 单测：覆盖 schema 探测、图构建、重复包聚合、体积排序；所有纯函数中文注释；图布局算法可测部分抽纯函数。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/bundle-stats-analyzer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/bundle-stats-analyzer/logic/`
- 测试文件夹：`devtools-web/src/tools/bundle-stats-analyzer/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/bundle-stats-analyzer/` 目录内文件；不得修改路由分包 Playground 其它任务目录。
### 验收标准
- 双 schema 导入、依赖图、treemap、重复依赖均可演示；单测覆盖探测与重复检测；示例可用。
