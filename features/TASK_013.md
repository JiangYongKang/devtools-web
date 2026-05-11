### 任务目标
1. 提供颜色输入与目标格式选择界面，支持 HEX、RGB/RGBA、HSL/HSLA 常见格式互转。
2. 在前端本地实现解析、单值转换、批量转换三类流程，展示转换结果、归一化信息与批量统计。
3. 对非法颜色、越界值和批量失败项给出明确反馈，保证每项结果可追踪。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task013/`（颜色输入、目标格式选择、批量区与结果区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task013/logic/`（参数生成、颜色结果标准化、批量结果聚合）。
- 测试文件夹：`devtools-web/src/tools/task013/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 单值解析字段：`valid`、`notation`、`normalizedColor`、`hex`、`rgb`、`hsl`、`errorCode`、`errorMessage`。
- 单值转换参数：`color`、`targetNotation`、`roundingMode`、`clampingMode`、`includeAlpha`；输出字段：`originalColor`、`originalNotation`、`targetNotation`、`convertedColor`、`normalizedColor`、`hex`、`rgb`、`hsl`。
- 批量转换参数：`items`、`failFast`；输出字段：`allSuccess`、`totalCount`、`successCount`、`failureCount`、`items`。
- 错误约定：处理并展示 `NULL_INPUT`、`EMPTY_INPUT`、`INVALID_FORMAT`、`UNSUPPORTED_NOTATION`、`OUT_OF_RANGE`、`BATCH_SIZE_EXCEEDED`、`INVALID_PARAMETER`。
### 任务约束
- 当前任务只允许读取和修改 `task013` 目录下文件，不可读取、不可修改其他任务编号目录。
- 页面只负责交互与展示，转换规则、批量统计与错误映射必须放在纯逻辑目录。
### 验收标准
- 支持解析校验、单值转换、批量转换三类流程，且结果字段展示完整。
- 批量模式可区分全成功与部分失败，并展示每项状态。
- 纯 JS 函数单测通过，覆盖请求组装与批量统计逻辑。
