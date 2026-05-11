### 任务目标
1. 提供进制转换输入与参数配置界面，支持 2~36 进制的单值转换流程。
2. 在前端本地实现单值与批量转换流程，展示转换结果、数值信息和批量成功失败统计。
3. 对非法进制、非法字符、溢出和批量超限等错误场景给出明确提示。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/base-radix-converter/`（输入区、源/目标进制参数区、批量区、结果区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/base-radix-converter/logic/`（参数组装、批量结果聚合、错误映射）。
- 测试文件夹：`devtools-web/src/tools/base-radix-converter/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 单值转换参数：`value`、`sourceRadix`、`targetRadix`、`allowNegative`、`allowLeadingZeros`、`separator`、`outputMinLength`、`outputUpperCase`。
- 单值转换字段：`originalValue`、`sourceRadix`、`targetRadix`、`convertedValue`、`isNegative`、`numericValue`、`errorCode`、`errorMessage`。
- 批量转换字段：`allSuccess`、`totalCount`、`successCount`、`failureCount`、`items[index,success,result,errorCode,errorMessage]`。
- 错误约定：处理并展示 `NULL_INPUT`、`EMPTY_VALUE`、`INVALID_RADIX`、`INVALID_CHAR`、`NEGATIVE_NOT_ALLOWED`、`LEADING_ZEROS_NOT_ALLOWED`、`OVERFLOW`、`VALUE_TOO_LONG`、`BATCH_TOO_LARGE`、`BATCH_PRODUCT_EXCEEDED`。
### 任务约束
- 当前任务只允许读取和修改 `base-radix-converter` 目录下文件，不可读取、不可修改其他任务编号目录。
- 页面负责交互与展示，校验文案与批量汇总逻辑放在纯逻辑目录。
### 验收标准
- 单值转换支持常见参数组合并正确展示结果与数值信息。
- 批量转换可展示成功/失败统计与逐项状态。
- 纯 JS 函数单测通过，覆盖批量汇总与错误映射逻辑。
