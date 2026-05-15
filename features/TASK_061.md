### 任务目标
- 交付可复用的「功能开关 + 远程配置」消费层：支持从静态 JSON（同源或 CORS 允许的 URL）、内存种子、以及可选 `GET` 拉取（`ETag`/`If-None-Match` 条件请求、超时、`AbortController`）合并为单一只读快照；合并顺序、环境维度（`dev`/`staging`/`prod`）与用户 cohort（逻辑层用字符串 cohort id 模拟）须在规则表中可声明且单测冻结。
- 每条开关须带：`key`、布尔或枚举取值、`payload`（JSON 子树，有最大深度与键数上界）、`source`（`remote`/`static`/`default`）、`version` 与 `expiresAt`（可选）；冲突时按「版本新者优先、同版本则 remote 覆盖 static、static 覆盖 default」仲裁，冲突诊断写入不可变审计数组供页面折叠展示。
- 提供演示页与示例：一键载入「部分键类型错误、循环 `$ref` 替身、超大 payload 被截断」三类样本；展示刷新间隔倒计时、手动强制刷新、离线时使用上次成功快照并 banner 提示；支持将当前快照导出为 JSON（脱敏：对匹配 `token|secret|password` 大小写不敏感路径的值替换为 `[REDACTED]`）。
- 与任务 057 衔接：导出 `createFeatureFetchInterceptor({ getSnapshot })` 形状（仅类型与纯函数组装示例，不复制 057 源码），演示如何在请求拦截器读取开关以切换 `baseURL` 或附加头；配置拉取失败时不得导致无限重试（指数退避参数在逻辑常量中）。
- 边界：非法 JSON、`204` 空体、`304` 未改、时钟回拨与 `expiresAt` 已过期时的降级；CSP 禁止 `eval` 下禁止动态执行配置中的脚本字段（若存在 `script` 类键名须拒绝并 `errorCode`）；SSR 无 `fetch` 时仅使用静态种子。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/feature-remote-config/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/feature-remote-config/logic/`
- 测试文件夹：`devtools-web/src/platform/feature-remote-config/__tests__/`
### API 信息
- 远程：`GET /api/devtools/config`（可配置基址），响应 JSON 对象，字段 `flags`（数组或记录）、`version`（整数或字符串）、`etag`（可选）；HTTP 4xx/5xx 映射到稳定 `errorCode`；超时默认 8s 可配；演示可用 `httpbin` 或内存 mock。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/feature-remote-config/` 目录内文件；不得修改 `http-client`、`route-sync` 等其它任务目录实现；宿主集成 057 时仅在 DOC 描述 import 边界。
### 验收标准
- 任务目标五条均可逐条在演示页与单测核对；合并仲裁、过期、条件请求、脱敏导出均有断言。
- 单测覆盖快照归一、冲突列表、ETag 分支、恶意深度与键数拒绝、退避计数重置。
