### 任务目标
- 查询构建：`find` 过滤器 JSON 与 `aggregate` pipeline 数组双模式 Tab；可视化 stage 列表（`$match`/`$group`/`$lookup`/`$project` 等）可增删排序；每 stage 独立 JSON 编辑与校验。
- 匹配预览：内置或用户粘贴 BSON/Extended JSON 样例文档数组，对当前 pipeline 逐步模拟执行（内存简化引擎，覆盖常用 stage 子集）；每步输出中间文档列表与计数。
- 导出：生成可粘贴至 mongosh 的命令草稿（`db.col.find(...)` / `aggregate([...])`）；复制与下载；stage 语法错误定位至索引。
- 示例：内置「按状态分组计数」「$lookup 关联」「$unwind 数组」三组 pipeline+样例文档一键填充；不支持的 stage 明确列出。
- 单测：覆盖 stage 校验、简化 `$match`/`$group`/`$project` 执行、命令导出；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/mongodb-query-builder/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/mongodb-query-builder/logic/`
- 测试文件夹：`devtools-web/src/tools/mongodb-query-builder/__tests__/`
### API 信息
- 无外部 API；不连接真实 MongoDB。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/mongodb-query-builder/` 目录内文件；不得修改 JSON 查询表达式其它任务目录。
### 验收标准
- find/aggregate 编排、逐步预览、mongosh 导出均可演示；单测覆盖核心 stage；示例可用。
