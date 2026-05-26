### 任务目标
- 依赖提取：粘贴多条 Migration SQL（`CREATE TABLE`/`ALTER TABLE ADD CONSTRAINT`/`REFERENCES`），提取表间外键依赖边；支持 schema 限定名与引号标识符。
- 拓扑排序：对依赖图 Kahn 排序输出建议执行批次（同批次可并行）；检测循环依赖并输出环路径列表；孤立表单独批次。
- 可视化：依赖有向图展示（表为节点、FK 为边）；点击边展示约束名与列映射；导出批次为编号 SQL 文件列表 Markdown。
- 示例：内置「线性链式迁移」「多表并行批次」「循环 FK 失败」三组一键填充；无法 parse 的语句跳过并警告。
- 单测：覆盖 FK 提取、拓扑排序、环检测、批次划分；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/migration-sql-topology-sorter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/migration-sql-topology-sorter/logic/`
- 测试文件夹：`devtools-web/src/tools/migration-sql-topology-sorter/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/migration-sql-topology-sorter/` 目录内文件；不得修改 ER 图 DDL 导出其它任务目录。
### 验收标准
- FK 提取、拓扑批次、循环检测、依赖图均可演示；单测覆盖排序与环；示例可用。
