### 任务目标
- 语法高亮：Cypher 查询编辑器，关键字/函数/字符串/参数 `$param` 高亮；语法错误定位至偏移；常用片段插入（`MATCH`、`WHERE`、`RETURN`、`WITH`）。
- EXPLAIN 树：粘贴 Neo4j 风格 `EXPLAIN`/`PROFILE` 计划文本，解析为算子树（NodeByLabelScan、Expand、Filter 等）；估算 rows/db hits 字段摘要；全图扫描节点高亮。
- 交互：算子树可展开；点击算子展示原始 plan 行；查询与 plan 分栏联动（plan 独立粘贴，不执行真实 Neo4j）。
- 示例：内置「简单 MATCH-RETURN」「多跳关系」「PROFILE 含 db hits」三组一键填充；无法 parse 的 plan 格式提示。
- 单测：覆盖 Cypher 词法 error 偏移、plan 行 parse、算子树构建、扫描判定；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/cypher-query-explain-viewer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/cypher-query-explain-viewer/logic/`
- 测试文件夹：`devtools-web/src/tools/cypher-query-explain-viewer/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/cypher-query-explain-viewer/` 目录内文件；不得修改 SQL EXPLAIN 其它任务目录。
### 验收标准
- 语法高亮、EXPLAIN 树、全图扫描高亮均可演示；单测覆盖 plan parse；示例可用。
