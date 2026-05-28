### 任务目标
- DoH 查询：通过可配置 DoH 端点（默认 Cloudflare/Google 公共解析器之一，用户可改 URL）发起 RFC 8484 `application/dns-message` 查询；支持 A/AAAA/CNAME/MX/TXT/NS/SOA/CAA 类型；超时、HTTP 错误、非 0 RCODE 分级提示；CORS 失败时展示「需代理或换端点」说明卡。
- 结果可视化：答案区按类型结构化展示（MX priority、TXT 字符串拆分、CNAME 链跟随至最大跳数并环检测）；TTL 倒计时与缓存到期时刻；DNSSEC AD/CD 位展示（若响应含 EDNS）。
- 批量与 trace：多域名队列顺序查询（可取消）；简易「解析路径」：对每个 CNAME 继续查询直至 A/AAAA 或达上限；负缓存 SOA minimum TTL 提示。
- 安全与合规：禁止记录用户查询到远端；响应原文 hex 可选展开；示例域名使用 RFC 6761 保留名或文档示例。
- 示例：内置「CNAME 链」「MX 多记录」「SERVFAIL/ NXDOMAIN 说明」三组；单测覆盖 DNS message 编解码子集、CNAME 链逻辑、TTL 解析（mock 响应）；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/dns-doh-record-visualizer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/dns-doh-record-visualizer/logic/`
- 测试文件夹：`devtools-web/src/tools/dns-doh-record-visualizer/__tests__/`
### API 信息
- 公共 DoH HTTPS GET/POST；须处理 CORS、超时（建议 8s）、429/5xx、空 body；不对接系统递归解析器。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/dns-doh-record-visualizer/` 目录内文件；不得修改 HTTP 客户端封装其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- DoH 查询、多类型展示、CNAME 链、TTL 倒计时、错误与 CORS 说明均可演示；单测覆盖 message 编解码与链逻辑；示例可用。
