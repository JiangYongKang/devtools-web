### 任务目标
- DSL 编辑：Mermaid `erDiagram` 或等价 ER DSL 文本编辑区，实时渲染实体关系图（canvas/svg）；语法错误定位至行；支持实体、属性、关系 cardinality 标注。
- 结构浏览：解析后展示实体列表、关系列表与字段摘要表；点击实体在图中高亮；搜索实体名过滤。
- DDL 导出：由 ER 模型生成 SQL DDL 草稿（CREATE TABLE + FOREIGN KEY，方言可选 MySQL/PostgreSQL/SQLite 子集）；标注「无类型推断处默认 VARCHAR/INTEGER」；复制与下载。
- 示例：内置「用户-订单-商品三实体」「自引用关系」「多对多关联表」三组一键填充；空 DSL 与非法关系语法边界提示。
- 单测：覆盖 DSL parse、实体/关系提取、DDL 生成各方言、语法错误行列；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/er-diagram-dsl-editor/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/er-diagram-dsl-editor/logic/`
- 测试文件夹：`devtools-web/src/tools/er-diagram-dsl-editor/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/er-diagram-dsl-editor/` 目录内文件；不得修改 Mermaid 流程图其它任务目录。
### 验收标准
- ER 图渲染、结构浏览、DDL 导出均可演示；单测覆盖 parse 与 DDL；示例可用。
