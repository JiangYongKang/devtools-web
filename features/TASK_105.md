### 任务目标
- TOML 解析：粘贴 TOML 文本，校验语法并输出结构化对象；错误定位至行列与期望 token；支持标准表 `[table]`、点分表、`[[array of tables]]` 与内联表 `{ k = v }`。
- 互转：TOML→JSON、TOML→YAML（可选保留表名路径注释）、JSON→TOML 草稿生成（类型映射说明：对象/数组/日期/整数边界）；转换结果可复制与下载。
- 结构树：树形浏览表路径（如 `owner.name`）、数组表索引节点、内联表叶子；搜索表名/键名高亮；统计表数量与键数量。
- 示例：内置「基础键值」「数组表」「内联与多表」三组一键填充；非法 TOML（重复键、类型冲突）样例；大文档性能说明。
- 单测：覆盖表路径构建、array of tables、JSON→TOML 往返关键类型、错误行列；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/toml-parse-convert-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/toml-parse-convert-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/toml-parse-convert-workbench/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/toml-parse-convert-workbench/` 目录内文件；不得修改 YAML/JSON 互换其它任务目录。
### 验收标准
- 解析、三向互转、结构树搜索均可演示；错误可定位；单测覆盖 array of tables 与重复键；示例可用。
