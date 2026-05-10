### 任务目标

1. 提供站内 XML 文本的可读缩进排版与空白压缩：用户粘贴或输入 XML，可在格式化与压缩两种输出间切换或分别触发，并能复制结果。
2. 可选展示后端返回的文档结构摘要（根元素名、元素总数、最大深度、元素路径列表），与 devtools 后端 XML 工具的语义一致。
3. 上述格式化与压缩统一走后端 REST 契约（解析失败时的错误码、节点路径、行列号等与后端一致）；前端负责选项组织、加载态、错误呈现、结果与安全复制。口径与 FEATURE 中任务 003 一致。

### 任务要求

1. 页面级能力至少包含：多行 XML 输入区；格式化与压缩各有明确触发方式；格式化须支持或与后端对齐下列选项：indentType（SPACE / TAB）、indentWidth（1 ～ 8，SPACE 下为每层空格数）、declarationPolicy（KEEP / REMOVE / REWRITE）、commentPolicy（KEEP / REMOVE）、includeStructure（是否请求结构信息）。压缩请求须支持或与后端对齐：declarationPolicy、commentPolicy、includeStructure。主要输出（格式化结果、压缩结果）可一键复制；加载中、成功、失败状态区分清晰。布局分区由实现自定。

2. HTTP：核心处理须经统一 HTTP 出口访问后端，不在页内重复拼装请求体。联调基址与上下文以后端为准；XML 工具路径前缀为 `/api/xml`。POST `/api/xml/format`：请求体含必填 `xmlString`，可选 `indentType`、`indentWidth`、`declarationPolicy`、`commentPolicy`、`includeStructure`。POST `/api/xml/compress`：请求体含必填 `xmlString`，可选 `declarationPolicy`、`commentPolicy`、`includeStructure`。

3. 响应包络：成功时 `success` 为 true，负载为顶层字段 `output`（字符串）；若请求 `includeStructure` 为 true 且后端返回，则附带 `structure` 对象，含 `rootElementName`、`totalElements`、`maxDepth`、`elementPaths`（XPath 风格简化路径，命名空间前缀保留形式与后端 DOC 一致）。失败时 `success` 为 false，含 `errorCode`、`errorMessage`，以及可用的 `nodePath`、`lineNumber`、`columnNumber`（根级或未定位时路径可能为 `/` 或空串，以后端为准）。能否稳定解析 JSON 体优先于依赖特定 HTTP 状态码组合。

4. 错误码须在界面有明确反馈：`NULL_INPUT`（请求体缺失、`xmlString` 为 null 等）；`EMPTY_INPUT`（仅空白）；`INVALID_INDENT`（缩进类型或宽度非法）；`PARSE_FAILED`（宜突出 `errorMessage`，并按需展示 `nodePath` 与行列）；`TRANSFORM_FAILED`。空输入场景下 `nodePath` 可能为空字符串，与后端表格一致。

5. 大文本：较大体积 XML 输入时界面保持可操作，避免长时间阻塞主线程；可采用防抖、处理中提示、Worker 等与项目风格一致的手段，验收需覆盖常见大文本场景。请求体超限、超时或服务不可用须有可读说明，不臆测后端单请求上限。

6. 用户输入、`errorMessage`、结构路径列表等须以安全方式展示，避免不可信文本当 HTML 渲染导致 XSS。

### 任务约束

1. 路由、样式与 devtools-web 现有约定一致；样式须遵守 FEATURE 中「样式隔离」要求，改动范围限定本工具页及对 `/api/xml` 的封装，避免无关重构。

2. 权威语义以后端为准：不得在 UI 上以另一套规则替代格式化、压缩或与 `declarationPolicy`、`commentPolicy`、CDATA、命名空间、注释处理相关的约定；属性顺序、空元素形式、实体规范化等已知后端限制须在 DOC 中可查阅，前端不宣称与 Infoset 不一致的「完全一致于原文」。

3. CORS、API 基址、超时与取消（如 AbortController）须可配置或可维护，验收环境可稳定访问后端。

4. 与 TASK 001、002 的响应形状差异：XML 接口成功结果为顶层 `output`（及可选 `structure`），不要求与带 `data` 包络的其他工具混用同一解析假设；封装层须按契约区分。

### 交付产物

1. 可用的 XML 格式化与压缩工具页（或等价导航入口），含输入、选项、两项操作与复制。

2. 与 POST `/api/xml/format`、`/api/xml/compress` 对齐的请求构造与响应解析（含失败与行列、路径展示），放在统一 HTTP 出口或约定模块。

3. 同编号 DOC：联调环境、验证步骤；大文本与错误样例验证步骤须在 DOC 中可复现。

### 注释规范

1. 非显而易见处附简洁中文注释（如声明策略、注释策略对输出的影响、为何展示行列号）。

2. 错误文案与错误码映射处建议注明后端来源（对应 DOC_003），便于契约漂移时核对。

### 验收标准

1. 格式化：合法紧凑样例在默认 SPACE、宽度 2、声明与注释 KEEP 下，`output` 为多行可读缩进；CDATA、命名空间样例处理后语义与后端 DOC 验证结论一致（不凭空修改 CDATA 内文本）。

2. 压缩：带换行与缩进的样例成功后 `output` 为紧凑单行（无多余无关紧要空白），与后端 DOC 一致。

3. `indentWidth` 为 0 或 9、非法 `indentType` 等参数时能从响应展示 `INVALID_INDENT` 或等价 `errorMessage`，页面不崩溃。

4. 非 XML 或标签未闭合样例时能展示 `PARSE_FAILED`，并按需展示 `nodePath`、`lineNumber`、`columnNumber`；界面不白屏。

5. `xmlString` 缺失、null 或仅空白时能展示 `NULL_INPUT` 或 `EMPTY_INPUT`（以后端为准），不当作成功。

6. `includeStructure` 为 true 且输入为多层嵌套样例时，结构区块能展示 `totalElements`、`maxDepth`、`elementPaths` 与后端示例一致或可对照 DOC 逐项核对。

7. 复制主要输出时在常见浏览器有成功反馈或可理解的失败说明。

8. 大文本：在 TASK 与 DOC 约定样例下可滚动、可操作或有明确处理中态，无不合理长时间假死。
