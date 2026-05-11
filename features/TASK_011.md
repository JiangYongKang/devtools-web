### 任务目标
1. 提供 JavaScript 输入与输出界面，支持“格式化”和“压缩”两种处理模式切换。
2. 在前端本地实现“格式化”和“压缩”处理流程，展示输出结果与大小统计。
3. 对输入错误与语法错误做可读化反馈，确保用户可定位参数错误、语法错误和输入超限问题。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task011/`（输入区、参数区、结果区、错误提示）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task011/logic/`（参数组装、结果映射、错误文案映射）。
- 测试文件夹：`devtools-web/src/tools/task011/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 处理模式：在前端实现“格式化”和“压缩”两种本地处理流程，输入参数与输出结构保持一致。
- 结果字段：至少输出 `output`、`originalSize`、`outputSize`、`mode`，并在失败时提供 `errorCode`、`errorMessage`，必要时包含 `snippet`。
- 错误约定：处理并展示 `NULL_INPUT`、`EMPTY_INPUT`、`INVALID_INDENT`、`INPUT_TOO_LARGE`、`TRUNCATED_INPUT`、`NESTING_TOO_DEEP`、`PARSE_FAILED`、`INVALID_PARAMETER`。
### 任务约束
- 当前任务只允许读取和修改 `task011` 目录下文件，不可读取、不可修改其他任务编号目录。
- 不限制具体组件、Hook、函数命名，但页面层不得堆叠与渲染无关的大段逻辑。
### 验收标准
- 能完成“仅格式化”和“仅压缩”两种流程，成功态展示输出文本与大小统计。
- 参数非法与语法错误时展示错误码和可读错误信息，必要时展示 `snippet`。
- 纯 JS 函数单测通过，且测试目录仅包含 task011 相关测试。
