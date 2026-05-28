### 任务目标
- AS Path 解析：解析 BGP UPDATE 风格文本或 MRT 简化片段中的 AS_PATH 属性（AS_SEQUENCE/AS_SET/confed 序列）；展开为有序 AS 列表并标注 SET 去重语义；私有 ASN（16/32 位区间）与保留 ASN 高亮。
- Prefix 列表：解析多行 prefix（CIDR 或 prefix + length）；校验首地址与掩码一致性；按地址族（v4/v6）分栏；非法 prefix 定位至行。
- 聚合预览：对同一地址族执行最长前缀合并（RFC 4632 风格）前后对比 diff；输出聚合后条目数、覆盖地址空间占比估算（v4 用 32 位、v6 用 128 位 BigInt）；标注被吞并的具体前缀。
- 策略辅助：模拟 AS_PATH prepend 前后路径长度；简单路径相似度（公共后缀 AS 数）；导出 Markdown 路由策略草稿（仅文本，不对接真实路由器）。
- 示例：内置「上游多宿 AS_SET」「私有 ASN 泄漏样例」「可聚合 v4 列表」三组；单测覆盖 AS_PATH 解码、聚合算法、私有 ASN 判定；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/bgp-as-path-prefix-analyzer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/bgp-as-path-prefix-analyzer/logic/`
- 测试文件夹：`devtools-web/src/tools/bgp-as-path-prefix-analyzer/__tests__/`
### API 信息
- 无外部 API；不连接 BMP/BGP 会话。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/bgp-as-path-prefix-analyzer/` 目录内文件；不得修改 CIDR 工具目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- AS Path 解析、prefix 校验、聚合 diff、prepend 模拟均可演示；单测覆盖聚合与 ASN 规则；示例可用。
