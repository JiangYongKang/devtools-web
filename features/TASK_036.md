### 任务目标
- 支持粘贴多行日志样本文本，按页内声明的格式族（如常见 `level` 前缀、`ISO8601`/`RFC3339` 时间戳、部分 `key=value` 片段等）抽取级别与时间字段，逐行展示结构化结果（原行、解析到的级别、解析到的时间、未匹配原因）。
- 提供多套示例一键填充（JSON 行日志、Nginx、简单 `INFO` 前缀等）、时间解析时区或默认 UTC/本地说明、复制表格或 TSV；对无法解析的行保留原行并标记而非整体失败。
- 对空输入、超长单行、总行数上限与不支持格式给出 `errorCode` 与页内说明；大体量粘贴使用节流或 Web Worker（若采用须在页内说明）避免卡顿。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/log-field-extractor/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/log-field-extractor/logic/`
- 测试文件夹：`devtools-web/src/tools/log-field-extractor/__tests__/`
### API 信息
- 无后端 HTTP 调用；解析与格式化仅在浏览器内完成。
### 任务约束
- 当前任务只允许读取和修改 `log-field-extractor` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标中多格式抽取、示例、时区说明、未匹配行处理、上限与错误均可逐条验收。
- 纯 JS 单测覆盖多行解析主干、无匹配行、非法时间与体积守卫逻辑。
