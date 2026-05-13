### 任务目标
- 实现可配置的 `fetch` 封装：`baseURL` 规范化（禁止双斜杠与反斜杠混用）、动态 `baseURL` 切换（多环境切换表）、默认 `headers` 与按请求合并、查询参数序列化（嵌套对象与数组编码策略页内固定并单测）、`POST` JSON 自动 `Content-Type`。
- 拦截器链：请求拦截可返回替换 `init` 或 `url`；响应拦截可短路返回、重试或抛出带 `errorCode` 的业务错误；支持「取消注册」以避免泄漏；所有拦截器错误须包装为可序列化诊断对象（含 `cause` 链摘要长度上界）。
- 超时与取消：基于 `AbortController` 与 `Promise.race`，区分用户取消与超时（不同 `errorCode`）；支持「超时后仍继续后台完成但界面不再等待」的可选模式（逻辑开关，默认关）；重复请求合并（相同 method+url+body hash）为可选特性并说明缓存 TTL。
- 提供演示页与示例：对公开 `https://httpbin.org` 或仓库内 Mock 服务（DOC 写明）发起 GET/POST、演示拦截器注入 `X-Request-Id`、演示超时与手动取消；展示原始 `Request`/`Response` 摘要（不记录敏感头值完整，仅长度与哈希）。
- 边界：`Body` 为 `FormData` 时不强行设置 JSON `Content-Type`；流式响应 `body` 为 `ReadableStream` 时不在封装内缓冲全量；CORS 预检失败映射到稳定 `errorCode`；在 `window` 不存在环境导出纯函数子集供 SSR 预取构造 URL。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/http-client/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/http-client/logic/`
- 测试文件夹：`devtools-web/src/platform/http-client/__tests__/`
### API 信息
- 运行时请求目标由演示配置决定；错误约定：`NETWORK`、`TIMEOUT`、`ABORTED`、`HTTP_ERROR`、`INVALID_URL`、`INTERCEPTOR_REJECTED` 等枚举在逻辑层集中定义并单测。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/http-client/` 目录内文件；不得修改 `devtools-web/src/tools/http-request-playground/` 等既有工具实现目录；宿主若复用本客户端，须在 DOC 说明与任务 027 的差异（027 为完整工具页，本任务为库）。
### 验收标准
- 任务目标五条均可演示或通过 mock `fetch` 单测验证。
- 单测覆盖 URL 拼接、查询序列化、拦截器顺序、超时/取消分支、错误包装；网络集成步骤写在 DOC。
