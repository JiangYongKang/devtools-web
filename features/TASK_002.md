### 任务目标

1. 提供站内 JSON 文本的可读格式化与单行紧凑压缩：用户粘贴或输入 JSON，可配置缩进类型与宽度、可选按键名排序后输出，并能复制结果。
2. 在同一工具场景中提供 JSON 结构化搜索（按键名或按标量值的文本匹配），列出命中路径摘要，与服务端去重及排序规则一致。
3. 上述能力统一走后端 REST 契约（解析、转义、sortKeys 与搜索语义与 devtools 后端一致）；前端负责参数、加载态、错误与结果展示及安全复制。口径与 FEATURE 中任务 002（含大文本性能与错误提示）一致。

### 任务要求

1. 页面级能力：多行 JSON 输入；格式化与压缩各有明确触发方式；格式化含 indentType（SPACE/TAB）、indentWidth（1～8，TAB 时每层仍为一个制表符但宽度须在合法区间）、sortKeys（为真时对象键自然序，数组顺序不变）；压缩与格式化共享 sortKeys，输出为零缩进紧凑单行。搜索：query 必填且不可为 null（空字符串易海量命中，须提示避免或说明风险）；searchTarget 缺省或空同后端视为 KEY，可选 VALUE（对标量 toString 匹配，不整段序列化对象再搜）；matchMode 缺省或空为 SUBSTRING，可选 EXACT；caseSensitive 缺省或 null 时为区分大小写，仅显式 false 时忽略大小写。主要输出均可一键复制；加载中、成功、失败区分清晰。布局分区由实现自定。

2. HTTP：核心结果须经统一 HTTP 出口访问后端，不在页内重复拼装。联调基址与上下文以后端为准（文档示例为 http://localhost:10000/devtools）；JSON 工具路径前缀为 /api/json。POST /api/json/format：体含 jsonString，可选 indentType、indentWidth、sortKeys。POST /api/json/compress：体含 jsonString，可选 sortKeys。POST /api/json/search：体含 jsonString 与 query（不可 null），可选 searchTarget、matchMode、caseSensitive。

3. 响应包络：成功时 success 为 true，data 为负载（格式化与压缩时 data 为字符串；搜索时 data 含 query、target、totalMatches、nodePaths，路径数组字典序）。失败时 success 为 false，含 errorCode、errorMessage、nodePath（无路径时多为空字符串；解析失败可能为 $ 或推断路径）。能否稳定解析 JSON 体优先于依赖特定 HTTP 状态码组合。

4. 错误码须在界面有明确反馈：NULL_INPUT（jsonString 缺失、null、仅空白，或搜索 query 为 null）；EMPTY_INPUT；INVALID_INDENT；PARSE_FAILED（宜展示 errorMessage，必要时 nodePath）；INVALID_SEARCH；INVALID_PARAMETER（含非法枚举、indentWidth 越界、indentType/searchTarget/matchMode 非法值等）。

5. 大文本：较大体积输入时界面保持可操作，避免长时间阻塞主线程；可采用防抖、异步分段、Worker 或处理中提示等，实现自选，验收需覆盖常见大文本场景。请求体超限或超时须有可读说明或重试建议，不臆测后端上限。

6. 用户输入与错误、路径列表等须安全展示，避免不可信文本当 HTML 渲染导致 XSS。

### 任务约束

1. 路由、样式与 devtools-web 现有约定一致；改动范围限定本工具页及对 /api/json 的封装，避免无关重构。

2. 权威语义以后端为准：不得在 UI 上以另一套规则替代 format/compress/search 与 sortKeys、KEY/VALUE、默认大小写等约定。

3. CORS、API 基址、超时与取消（如 AbortController）须可配置或可维护，验收环境可稳定访问后端。

4. 数值形态与非法 JSON 是否可解析以后端 Hutool 行为为准；不要求前端自建解析器；与 RFC 的差异在文案或 DOC 中说明。

### 交付产物

1. 可用的 JSON 格式化、压缩、结构化搜索工具页（或等价入口），含输入、选项、三项操作与复制。

2. 与 POST /api/json/format、compress、search 对齐的请求与响应解析（含失败与可选 nodePath 展示），放在统一 HTTP 出口或约定模块。

3. 同编号 DOC：联调环境、验证步骤；性能与大文本验证步骤须在 DOC 中可复现。

### 注释规范

1. 非显而易见处附简洁中文注释（如空 query 提示原因、caseSensitive 缺省与后端一致等）。

2. 错误文案与错误码映射处建议注明后端来源，便于漂移时核对。

### 验收标准

1. 格式化：合法样例默认两空格、SPACE、不排序时 data 为多行可读；启用 sortKeys 且 indentType 为 TAB 时，键序与 Tab 层级与后端 DOC 一致（indentWidth 仍在 1～8）。

2. 压缩：嵌套对象与数组样例成功时为单行紧凑；sortKeys 为 true 时键序与格式化场景一致。

3. indentWidth 为 9 等非法参数时能展示 INVALID_PARAMETER（或等价）与 errorMessage，不崩溃。

4. 非法 JSON 时能展示 PARSE_FAILED 及 message，并按返回展示 nodePath；界面不白屏。

5. 搜索：键名子串与 user / userName 类样例的 nodePaths 与后端 DOC 示例一致；按值 EXACT + caseSensitive false 时对 OK/ok 样例的 totalMatches 与路径与后端一致。

6. jsonString 空或空白时展示 NULL_INPUT（或等价），不当作成功。

7. 大文本：在 TASK 约定样例下可滚动、可操作或有明确处理中态，无不合理长时间假死；体量与步骤见 DOC。

8. 复制主要结果时在常见浏览器有成功反馈或可理解的失败说明。
