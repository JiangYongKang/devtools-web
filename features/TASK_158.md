### 任务目标
- 配置解析：粘贴 Nginx 或 Caddy 配置片段（可切换方言），解析 `server`/`location`/`upstream`/`reverse_proxy` 块边界；语法错误定位至行列；行内 `#` 注释剥离。
- 语法高亮：按指令关键字、`{}`、`;` 分词着色（纯 CSS 类，不依赖 Monaco）；字符串与变量片段区分。
- Upstream 摘要：提取 `upstream` 名称、成员 `server` 列表、负载策略（`least_conn`/`ip_hash` 等）、`max_fails`/`fail_timeout`；Caddy 的 `to` 上游列表等价映射。
- Include 模拟：识别 `include path/*.conf;` 占位，允许用户追加「虚拟 include 文件」内容合并解析；循环 include 检测。
- 示例：内置「反向代理单 upstream」「多 location」「Caddy 自动 HTTPS 块」三组一键填充；单测覆盖块切分、upstream 提取、include 合并、方言探测；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/nginx-caddy-config-inspector/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/nginx-caddy-config-inspector/logic/`
- 测试文件夹：`devtools-web/src/tools/nginx-caddy-config-inspector/__tests__/`
### API 信息
- 无外部 API；不 reload 真实 Nginx/Caddy。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/nginx-caddy-config-inspector/` 目录内文件；不得修改 HTTP 缓存模拟等其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 双方言解析、高亮、upstream 摘要、include 模拟均可演示；单测覆盖块解析与 upstream；示例可用。
