### 任务目标
- 计划解析：粘贴 MySQL `EXPLAIN`、PostgreSQL `EXPLAIN (FORMAT TEXT)` 或 SQLite `EXPLAIN QUERY PLAN` 文本，自动识别方言并解析为算子节点树（type、table、rows、cost、filter 等字段按方言映射）。
- 可视化：树形/缩进视图展示算子层级；全表扫描（`Seq Scan`/`ALL`/`SCAN TABLE`）节点高亮；成本字段摘要卡（总 cost、最大 cost 节点、预估 rows）。
- 交互：点击节点展开详情 JSON；搜索 table 名或算子 type 过滤；支持多语句结果 Tab 切换。
- 示例：内置 MySQL/PostgreSQL/SQLite 各一份 EXPLAIN 样例一键填充；无法识别格式时给出期望样例链接说明。
- 单测：覆盖三方言 parse、算子树构建、全表扫描判定、cost 聚合；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/sql-explain-plan-visualizer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/sql-explain-plan-visualizer/logic/`
- 测试文件夹：`devtools-web/src/tools/sql-explain-plan-visualizer/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/sql-explain-plan-visualizer/` 目录内文件；不得修改 SQL 方言对照其它任务目录。
### 验收标准
- 三方言 EXPLAIN 解析、算子树、全表扫描高亮、cost 摘要均可演示；单测覆盖 parse 与扫描判定；示例可用。
