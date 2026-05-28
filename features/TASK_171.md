### 任务目标
- 地址规范化：支持完整 128 位、:: 压缩、IPv4 映射（::ffff:x.x.x.x）、链路本地 fe80::/10 与 zone ID（%eth0）输入；按 RFC 5952 输出 canonical 形式；非法字符、双 ::、段数错误定位至字段。
- 类型判定：识别 ULA（fc00::/7）、GUA（2000::/3）、link-local、loopback、multicast（ff00::/8 及 scope）、未指定；展示首段范围与用途说明；与任务 024/025 IPv4 工具互补不修改其目录。
- 子网划分：给定前缀长度（/48～/128）计算网络地址、首末可用地址、地址总数（BigInt）、/64 子网切分表（如 /48→4096 个 /64）；支持 nibble 对齐提示与 ULA 随机生成（RFC 4193 风格，仅本地演示）。
- 批量与 diff：多地址列表规范化去重；两前缀包含关系判定；地址 ±N 递增（BigInt）；导出 CIDR 列表与 BIND 风格注释。
- 示例：内置「双栈映射」「ULA 站点前缀」「错误 zone 与溢出」三组；单测覆盖 RFC 5952 样例、类型判定边界、/64 切分、BigInt 运算；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/ipv6-address-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/ipv6-address-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/ipv6-address-workbench/__tests__/`
### API 信息
- 无外部 API；纯本地解析与计算。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/ipv6-address-workbench/` 目录内文件；不得修改 IPv4/CIDR 其它任务目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 规范化、类型判定、子网划分、批量处理均可演示；单测含 RFC 5952 与 BigInt 边界；示例可用。
