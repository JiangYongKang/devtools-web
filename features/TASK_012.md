### 任务目标
1. 提供 Cron 表达式输入与参数配置界面，支持五域和六域表达式解释。
2. 在前端本地实现表达式解释逻辑，展示完整说明、分域说明及可选的最近触发时刻列表。
3. 对非法表达式、非法时区和不支持语言等场景输出明确错误提示，避免静默失败。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task012/`（表达式输入、选项区、解释结果区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task012/logic/`（参数规范化、字段文本拼装、错误映射）。
- 测试文件夹：`devtools-web/src/tools/task012/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 输入参数：`expression`、`timezoneId`、`language`、`expandSteps`、`includeNextTriggers`、`nextTriggerCount`。
- 输出字段：`originalExpression`、`fieldCount`、`description`、`secondsDescription`、`minutesDescription`、`hoursDescription`、`dayOfMonthDescription`、`monthDescription`、`dayOfWeekDescription`、`nextTriggerTimes`。
- 错误约定：处理并展示 `NULL_INPUT`、`EMPTY_INPUT`、`INVALID_FIELD_COUNT`、`INVALID_FIELD`、`INVALID_VALUE`、`INVALID_TIMEZONE`、`UNSUPPORTED_LANGUAGE`、`UNSUPPORTED_COMBINATION`。
### 任务约束
- 当前任务只允许读取和修改 `task012` 目录下文件，不可读取、不可修改其他任务编号目录。
- 不限制组件命名与状态组织方式，但必须保持页面渲染与纯逻辑分离。
### 验收标准
- 可正确展示完整解释文本与分域解释字段，支持是否显示最近触发时刻的切换。
- 错误场景展示明确错误码与提示信息，不吞错。
- 纯 JS 函数单测通过，覆盖默认参数与展示映射行为。
