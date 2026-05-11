### 任务目标
1. 提供 SQL 输入与格式参数配置界面，支持方言、缩进、大小写和注释策略设置。
2. 在前端本地实现 SQL 格式化流程，展示格式化结果、语句统计和可选关键字高亮信息。
3. 对输入过大、嵌套过深和语法截断等错误场景给出明确反馈。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task018/`（SQL 输入区、选项区、格式化结果与高亮展示区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task018/logic/`（参数规范化、高亮结构映射、错误映射）。
- 测试文件夹：`devtools-web/src/tools/task018/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 输入参数：`sql`、`dialect`、`keywordCase`、`indentType`、`indentWidth`、`lineBreakStyle`、`commentPolicy`、`includeHighlight`、`maxInputSizeKb`、`maxNestingDepth`。
- 输出字段：`formattedSql`、`highlights`、`statementCount`、`originalLineCount`、`formattedLineCount`、`errorCode`、`errorMessage`。
- 高亮字段：`type`、`startLine`、`startColumn`、`endLine`、`endColumn`、`originalText`、`formattedText`。
- 错误约定：处理并展示 `NULL_INPUT`、`EMPTY_INPUT`、`INVALID_INDENT`、`INPUT_TOO_LARGE`、`NESTING_TOO_DEEP`、`TRUNCATED_INPUT`、`PARSE_FAILED`、`INVALID_PARAMETER`。
### 任务约束
- 当前任务只允许读取和修改 `task018` 目录下文件，不可读取、不可修改其他任务编号目录。
- 关键字高亮计算与映射逻辑放入纯逻辑目录，页面仅做可视化渲染。
### 验收标准
- 可完成 SQL 格式化并展示语句统计信息。
- 开启高亮时可按位置字段正确渲染关键字高亮。
- 纯 JS 函数单测通过，覆盖参数归一化与高亮映射。
