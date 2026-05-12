### 任务目标
- 提供本地 Webhook 调试工作台：主区展示「配合外置隧道（如 ngrok、cloudflared）或反向代理时宜使用的回调路径、方法与签名字段占位说明」可复制；次区支持用户粘贴完整原始 HTTP 报文或仅 Body，按 `Content-Type` 自动尝试 JSON 美化、表单字段表、纯文本与十六进制并排；同屏拆分展示常用头（含 `X-*`、签名相关头）与安全纯文本渲染。
- 内置请求构造模板区：一键生成可复制 `curl` 与等价 `fetch` 代码草稿（含占位 `URL`/Header/JSON Body），用户仅在显式按下「试运行」时对 **同源或可 CORS** 的目标发起单次 `fetch` 以便自查；非同源须在结果区写明预期 CORS 失败形态而不视为工具缺陷。
- 载荷时间线在浏览器内离线维护：`sessionStorage` 持久最近 N 条事件，每条可由「将当前解析结果追加为一条」、或由用户粘贴单行/多段原始报文写入、支持展开、过滤、清空、导出与导入 JSON；不依赖仓库外后端即可完成全链路演示。
- 示例一键填入典型 GitHub/Stripe 风格 JSON webhook 样例（脱敏）、签名占位符说明、超长 Body 与非法 mixed boundary 的报错、以及 XSS 安全展示策略。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/webhook-debug-receiver/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/webhook-debug-receiver/logic/`
- 测试文件夹：`devtools-web/src/tools/webhook-debug-receiver/__tests__/`
### API 信息
- 不依赖本项目后端接口；试运行能力仅基于浏览器 `fetch` 访问用户自选且 CORS 允许的目标 URL。载荷时间线数据结构由 `logic/` 导出类型或注释约定：`events[]` 含 `receivedAt`、`rawRequestText`、`derivedHeaders`、`bodyPreview`、`errorCode` 等字段，导出/导入与该形状一致以便单测断言。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/webhook-debug-receiver/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条均可演示：「解析粘贴 + curl/fetch 模板 + sessionStorage 时间线 + 示例与安全展示」在无后端环境下可独立完成。
- 纯逻辑单测覆盖报文分段、JSON/表单探测、`events` 序列化与错误枚举。
