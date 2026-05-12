### 任务目标
- 在浏览器端通过 `fetch` 构造并发送用户自定义 HTTP(S) 请求：可编辑方法、`URL`、查询串、请求头表、Body（raw/JSON/表单键值）、超时与 `AbortController` 取消按钮，并展示响应状态、状态文字、响应头表、Body 文本/JSON 树形折叠预览、耗时与重定向链摘要（在 CORS 与安全策略允许范围内尽可能从 `Response` 推导）。
- 提供「预置模板」与示例一键填入（GET JSON API、POST form、带 `Authorization`、错误 URL）、请求/响应各自一键复制、HAR 风格摘要导出（纯前端 JSON）、以及将响应用作「再次作为新请求模板」的周转。
- CORS 失败、网络离线、`DNS` 级失败、超时、非 2xx、空 Body、过大 Body 流式截断与下载为 blob 的降级路径均须有明确用户文案与 `errorCode` 映射；明示浏览器无法跨域读部分响应头时的限制。
- URL 与 Header 的合法字符基础校验、可疑 `javascript:` schema 拦截提示、敏感头（如 cookie）展示遮罩或二次确认、以及不在本地持久化完整令牌的默认策略说明（若提供本地草稿则须可关）。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/http-request-playground/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/http-request-playground/logic/`
- 测试文件夹：`devtools-web/src/tools/http-request-playground/__tests__/`
### API 信息
- 运行时依赖目标站点 CORS 策略；本工具不引入专用后端，所有请求由用户浏览器直接发出。错误展示须区分 `TypeError`（网络/CORS）、`AbortError`（用户取消）、HTTP 4xx/5xx 与 Body 解析失败。
- 契约：逻辑层导出 `buildFetchInit(params) -> { url, init }`、`summarizeResponse(meta) -> report`，单测使用 mock `Response` 对象或纯序列化结构，不依赖真实网络。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/http-request-playground/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条均可在联调环境通过手工与示例覆盖；取消与超时行为可复现。
- 纯逻辑单测覆盖 init 组装、头合并、query 编码与错误分类辅助函数。
