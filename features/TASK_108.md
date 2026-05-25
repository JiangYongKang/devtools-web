### 任务目标
- 方言检测：粘贴 CSV 文本，自动推断分隔符（`,`/`;`/`\t`/`|``）、引号字符、转义规则、首行是否为 header；用户可手动覆盖检测结果并即时重解析。
- 类型推断：按列推断 boolean/integer/number/date/string（ISO 日期启发式）；展示每列推断置信度与反例单元格；异常单元格列表（无法 coercion 的值）带行列坐标。
- Schema 导出：生成 JSON Schema `object.properties` 草稿或 Table Schema 风格字段描述；可配置「全部 string 保守模式」；复制与下载 schema JSON。
- 示例：内置欧式分号 CSV、带引号换行字段、混合类型列三组一键填充；空文件与单列文件边界提示。
- 单测：覆盖分隔符投票、类型推断边界、异常单元格收集、header 检测；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/csv-dialect-schema-inferrer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/csv-dialect-schema-inferrer/logic/`
- 测试文件夹：`devtools-web/src/tools/csv-dialect-schema-inferrer/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/csv-dialect-schema-inferrer/` 目录内文件；不得修改 CSV 行列互转其它任务目录。
### 验收标准
- 方言检测、类型推断、异常列表、schema 导出均可验收；单测覆盖分隔符与类型边界；示例可用。
