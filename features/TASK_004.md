### 任务目标

1. 提供站内文本的百分号编码（URL 编码）与解码：用户粘贴或输入文本，可选择字符集与编码风格，分别触发编码与解码，并能复制结果；行为与 devtools 后端 URL 工具语义一致。
2. 支持两种编码风格：URI 组件风格（空格为 `%20`，星号等按 URI 组件规则）与表单风格（空格为 `+`，适用于 `application/x-www-form-urlencoded`）；默认与后端一致为 URI 组件风格。
3. 支持批量处理：多条文本在同一请求中按条指定 ENCODE 或 DECODE，并支持快速失败与继续处理两种策略，与后端批量契约一致；UI 形态可为列表编辑器、多行约定分隔或多段输入等，以实现为准。
4. 上述能力统一走后端 REST 契约；前端负责选项组织、加载态、错误呈现、结果与安全复制。口径与 FEATURE 中任务 004 一致。

### 任务要求

1. 页面级能力至少包含：多行文本输入区；编码与解码各有明确触发方式；须支持或与后端对齐下列选项：字符集 `charset`（默认 UTF-8，与 Java 可用字符集名称一致，如 ISO-8859-1、GBK 等）、编码风格 `style`（`URI_COMPONENT` / `FORM`，默认 URI_COMPONENT）。主要输出（编码结果、解码结果）可一键复制；加载中、成功、失败状态区分清晰。布局分区由实现自定。

2. HTTP：核心处理须经统一 HTTP 出口访问后端，不在页内重复拼装请求体。联调基址与上下文以后端为准；URL 工具路径前缀为 `/api/url`。

   - POST `/api/url/encode`：请求体含必填 `text`，可选 `charset`、`style`。
   - POST `/api/url/decode`：请求体含必填 `text`，可选 `charset`、`style`。
   - POST `/api/url/batch`：请求体为 JSON 数组；每项须含 `text`、`action`（`ENCODE` 或 `DECODE`），可选 `charset`、`style`；快速失败模式由首条元素上的 `failFast` 字段决定（默认未出现时与后端「继续处理」一致）。批量 UI 是否默认展开可由实现决定，但须能完成联调与验收。

3. 响应包络：与后端统一包络一致：`success`、`data`、`errorCode`、`errorMessage`。单条编码／解码成功时，`data` 内含结果字符串字段（与后端字段名一致，如 `result`）、实际使用的 `charset`、`action`、`style`。能否稳定解析 JSON 体优先于依赖特定 HTTP 状态码组合。

4. 批量成功时：`data` 内须能反映总条数、成功条数、失败条数及按输入顺序的逐条结果；每条含索引、是否成功、成功时的 `result` 结构或失败时的 `errorCode`、`errorMessage`。部分失败时顶层 `success` 可能为 false，但负载中仍可能包含已成功项，须按契约解析并完整呈现，不向用户掩盖已有成功项。

5. 错误码须在界面有明确反馈，并与后端 DOC_004 对齐，至少覆盖：`NULL_INPUT`（含不应提交 null 文本的场景）、`INVALID_CHARSET`、`INVALID_ACTION`、`ENCODE_FAILED`、`DECODE_FAILED`、`INVALID_PERCENT_SEQUENCE`（不完整 `%`、非十六进制等）、`INVALID_UTF8_SEQUENCE`。宜展示 `errorMessage` 中位置或原因说明；界面不白屏。

6. 边界与提示：空字符串 `""` 合法，编码／解码后仍为空串；仅空白字符可被编码为对应百分号或加号序列。大体积文本输入时界面保持可操作，可采用防抖、处理中提示等与项目风格一致的手段；请求超时、服务不可用须有可读说明，不臆测后端单请求体积上限。

7. 用户输入、`errorMessage`、批量逐条错误信息等须以安全方式展示，避免不可信文本当 HTML 渲染导致 XSS。

### 任务约束

1. 路由、样式与 devtools-web 现有约定一致；样式须遵守 FEATURE 中「样式隔离」要求，改动范围限定本工具页及对 `/api/url` 的封装，避免无关重构。

2. 权威语义以后端为准：不得在浏览器内用另一套规则替代 `URLEncoder`/`URLDecoder` 等价语义、两种风格下空格与星号等差异、百分号序列校验与 UTF-8 合法性校验；已知后端限制（如非 UTF-8 字符集下 UTF-8 字节校验范围等）须在对应 DOC 中可查阅。

3. CORS、API 基址、超时与取消（如 AbortController）须可配置或可维护，验收环境可稳定访问后端。

4. 单条接口的成功负载形状与任务 001、002、003 等可能不同：封装层须按 DOC_004 的 `data` 结构解析，不混用其他工具的 `output` 或纯字符串假定。

### 交付产物

1. 可用的 URL 编码与解码工具页（或等价导航入口），含输入、字符集与风格选项、编码／解码操作与复制。

2. 与 POST `/api/url/encode`、`/api/url/decode`、`/api/url/batch` 对齐的请求构造与响应解析（含成功字段与失败码），放在统一 HTTP 出口或约定模块。

3. 同编号 DOC：联调环境、验证步骤；错误样例与可选批量策略验证步骤须在 DOC 中可复现。

### 注释规范

1. 非显而易见处附简洁中文注释（如 FORM 与 URI_COMPONENT 在空格、`+`、星号处理上的差异、解码时百分号序列大小写不敏感等）。

2. 错误文案与错误码映射处建议注明后端来源（对应 devtools 侧 DOC_004），便于契约漂移时核对。

### 验收标准

1. 编码：`hello world` 在默认 UTF-8、URI_COMPONENT 下结果为 `hello%20world`；切换为 FORM 时为 `hello+world`，与后端 DOC 验证结论一致。

2. 解码：`hello%20world` 在 URI_COMPONENT 下还原为原空格；FORM 场景下 `+` 与空格的处理与后端一致；中文等多字节字符往返与后端示例一致。

3. `charset` 切换（如合法的中文字符集名）时编码／解码结果与后端 CURL 示例或对拍 DOC 一致；非法字符集名能展示 `INVALID_CHARSET`（或等价 `errorMessage`），页面不崩溃。

4. 解码非法输入：`test%`、`%G0` 等能展示 `INVALID_PERCENT_SEQUENCE`；界面可读且不白屏。

5. 单条请求体缺失 `text` 或后端认定为 null 输入时展示 `NULL_INPUT`（或等价），不当作成功。

6. 批量：混合 ENCODE／DECODE 的数组请求在继续处理模式下，失败项带错误码、成功项带 `result`，总成功／失败计数与顺序与后端 DOC 一致；快速失败模式下行为与 DOC 描述一致（含停止点后未处理条目不计入成功）。

7. 复制主要输出时在常见浏览器有成功反馈或可理解的失败说明。

8. 大文本：在 TASK 与 DOC 约定样例下可滚动、可操作或有明确处理中态，无不合理长时间假死。
