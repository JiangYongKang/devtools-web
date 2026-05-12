### 任务目标
- 对用户输入的一段文本离线统计：`grapheme`（若在任务内采用 Intl.Segmenter 或明确替代算法须在任务与 DOC 对齐）、Unicode 码点个数、UTF-16 代码单元、`UTF-8` 字节长度、行数（按 `\n` 与可选 `\r\n` 归一说明）、非空行数、词数（在选定语言规则或空白分词方案下注明假设）、字节与字符比等摘要卡片。
- 提供行与列指针（当前光标或选中范围起止）对应的行列号、选中子串的上述指标复算、大小写/空白归一化开关对「词数」或「可见长度」的影响对比（所有开关含义在 UI 旁白释明）。
- 示例一键填入（多行日志、JSON 一行、混合 emoji）、整段与选中部分的一键复制统计报告、按行/按段折叠展示过长结果、以及超大批注输入时的节流或 Web Worker 策略与上限提示。
- 空与仅空白、含 `\0` 控制符、BOM 存在与否的展示、以及统计算法假设与限制（与「真实编辑器选中」差异）在用户可见文案中写清并保持错误码一致。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/string-metrics-counter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/string-metrics-counter/logic/`
- 测试文件夹：`devtools-web/src/tools/string-metrics-counter/__tests__/`
### 前端实现说明
- 核心参数：`text`、`newlineMode`、`tokenizationProfile`、`normalizeFlags`、`selectionRange`。
- 输出：`graphemeCount`、`scalarCount`、`utf16Units`、`utf8Bytes`、`lineCount`、`nonEmptyLines`、`tokenCount`、`columnRowPointer`、`digestReport`、`errorCode`。
- 错误约定：`NULL_INPUT`、`SELECTION_OUT_OF_RANGE`、`WORKER_UNAVAILABLE_FALLBACK`、`INPUT_TOO_LARGE`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/string-metrics-counter/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条均可逐条在页面核对；示例与选择范围联动正确。
- 大文本下 UI 可操作、主线程不显式长时间阻塞或无提示。
- 纯逻辑单测覆盖各计数模式、行列推算与 BOM/换行边界。
