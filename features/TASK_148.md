### 任务目标
- 元数据解析：上传或粘贴 Parquet 文件（只读，不上传服务器——浏览器 File API 本地解析），读取 footer magic、schema、row groups 列表；解析失败字段级提示。
- Schema 浏览：嵌套字段树（struct/list/map 子集）；每列 physical/logical type、null count、distinct count（若统计可用）；压缩 codec 与 encoding 列表。
- Row group 摘要：每个 row group 的行数、总字节、列 chunk 偏移表；可选列级 min/max 统计展示（若文件含 statistics）。
- 示例：内置 demo parquet fixture（小文件 base64 或本目录 fixtures）；超大文件只读 footer 策略与大小上限说明；禁止执行任意代码。
- 单测：覆盖 footer parse、schema 树构建、row group 列表、magic 校验；所有纯函数中文注释；WASM/纯 JS 解析层可 mock。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/parquet-metadata-inspector/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/parquet-metadata-inspector/logic/`
- 测试文件夹：`devtools-web/src/tools/parquet-metadata-inspector/__tests__/`
### API 信息
- 无外部 API；文件仅在浏览器内存处理。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/parquet-metadata-inspector/` 目录内文件；不得修改文件魔数校验其它任务目录。
### 验收标准
- 本地 parquet 元数据、schema 树、row group 摘要均可演示；单测覆盖 parse 核心；示例 fixture 可用。
