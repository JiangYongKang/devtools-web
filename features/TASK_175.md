### 任务目标
- 配置解析：粘贴 `wg-quick` 风格或 INI 片段（`[Interface]`/`[Peer]`），提取 PrivateKey/PublicKey、ListenPort、Address、DNS、MTU、Peer Endpoint、AllowedIPs、PersistentKeepalive；私钥仅用于格式校验与掩码展示，禁止持久化 localStorage。
- 密钥校验：Base64 32 字节 key 合法性；公钥与私钥 Curve25519 派生一致性校验（纯 JS 或 Web Crypto X25519）；PresharedKey 可选校验。
- 路由表：合并多 Peer 的 AllowedIPs，检测重叠与覆盖缺省路由（0.0.0.0/0、::/0）；输出最长匹配路由表预览（v4/v6 分表）；Endpoint 解析为 IP:port 与 bracketed IPv6。
- 策略说明：生成 `wg set` 等价命令草稿；PersistentKeepalive NAT 穿透说明卡；示例不含真实生产密钥。
- 示例：内置「单 Peer 隧道」「双 Peer 分流」「非法 key 反例」三组；单测覆盖 INI 解析、AllowedIPs 合并、key 格式；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/wireguard-config-inspector/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/wireguard-config-inspector/logic/`
- 测试文件夹：`devtools-web/src/tools/wireguard-config-inspector/__tests__/`
### API 信息
- 无外部 API；不发起真实 WireGuard 握手。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/wireguard-config-inspector/` 目录内文件；不得修改密钥转换（任务 130）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 配置解析、密钥校验、AllowedIPs 路由合并、命令草稿均可演示；单测覆盖解析与合并；示例可用。
