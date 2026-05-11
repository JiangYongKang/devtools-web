### 任务目标
1. 提供左右文本输入与对比参数配置界面，支持行级和词级差异模式切换。
2. 在前端本地实现文本对比流程，展示差异片段列表及新增/删除统计结果。
3. 对超时、超限和参数错误场景给出明确提示，保障对比流程可诊断。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task016/`（左右文本输入、选项区、diff 结果区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task016/logic/`（参数组装、片段分组、统计字段映射）。
- 测试文件夹：`devtools-web/src/tools/task016/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 输入参数：`leftText`、`rightText`、`granularity`、`ignoreWhitespace`、`normalizeNewlines`。
- 输出字段：`hasDifferences`、`totalSegments`、`deleteCount`、`insertCount`、`segments`。
- 片段字段：`operation`、`content`、`leftStartIndex`、`leftEndIndex`、`rightStartIndex`、`rightEndIndex`。
- 错误约定：处理并展示 `NULL_INPUT`、`INVALID_PARAMETER`、`INPUT_TOO_LARGE`、`TOO_MANY_SEGMENTS`、`DIFF_TIMEOUT`、`DIFF_INTERRUPTED`、`DIFF_ERROR`。
### 任务约束
- 当前任务只允许读取和修改 `task016` 目录下文件，不可读取、不可修改其他任务编号目录。
- 页面展示与差异统计逻辑分离，禁止在 JSX 中堆叠复杂统计代码。
### 验收标准
- 支持行级与词级差异切换，正确展示新增/删除/相等片段。
- 能展示统计字段并在超时或超限场景下给出明确错误。
- 纯 JS 函数单测通过，覆盖分组与统计逻辑。
