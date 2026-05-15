### 任务目标
- 建立统一错误映射层：输入为 `domain`（`http`/`ws`/`clipboard`/`storage` 等）、`httpStatus`（可选）、`businessCode`（字符串，可选）、`cause`（`Error` 或序列化摘要）；输出为 `{ userTitle, userDetail, recoveryHints[], errorCode, severity, retryable }`；禁止在映射表内嵌 HTML，所有文案为纯文本或结构化片段（页面负责换行）。
- 支持分层覆盖：默认表 → 环境覆盖表（`import.meta.env.MODE`）→ 远程补丁 JSON（拉取失败静默忽略并记 `source=skipped` 诊断）；合并须确定性排序；未知 `businessCode` 回退到 `UNKNOWN_BUSINESS` 并附带原始码供技术支持复制。
- 演示页与示例：矩阵表勾选「HTTP 状态 × 业务码」预览映射结果；一键注入 `TypeError`、`AbortError`、`DOMException` 典型 `name`；展示 `retryable` 与推荐退避秒数（只读建议，不内嵌 066 实现）；支持导出当前映射表为 CSV。
- 与任务 057/027 衔接：导出 `mapFetchError(error, responseMeta)` 纯函数，`responseMeta` 仅含 `status`、`statusText`、头子集长度；不得依赖真实 `Response` 对象构造（单测用手写对象）。
- 边界：429/503 与 `Retry-After` 头解析（秒与 HTTP-date）；多语言占位：逻辑层接受 `locale` 参数，缺失文案时回退 `en` 再回退 `errorCode` 本身；循环引用 `cause` 链截断。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/error-message-mapper/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/error-message-mapper/logic/`
- 测试文件夹：`devtools-web/src/platform/error-message-mapper/__tests__/`
### API 信息
- 远程补丁：`GET` 可选，JSON `{ "overrides": [ { "match": {...}, "template": {...} } ] }`，schema 校验失败则整包丢弃并 `errorCode=INVALID_PATCH`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/error-message-mapper/` 目录内文件；不得修改其他任务目录。
### 验收标准
- 任务目标五条均可演示；单测覆盖合并顺序、429、`Retry-After`、未知码、循环 cause、locale 回退。
