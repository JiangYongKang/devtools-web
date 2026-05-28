### 任务目标
- 过滤编译：将 tcpdump/libpcap 过滤表达式（子集：host/net/port/proto/vlan/and/or/not/括号）编译为 BPF 指令序列（BPF_LD/BPF_ALU/BPF_JMP/BPF_RET 教学子集）；不支持项明确列出并拒绝编译。
- 反汇编对照：将 BPF 字节码（十六进制或 tcpdump -d 风格文本）反汇编为人类可读指令表；标注 A、X、index、k 等字段；PC 序号与跳转目标。
- 语义解释：对常见模式（「tcp port 80」）给出等价逻辑说明与预期截获/丢弃；统计指令条数与最大跳转深度；检测无限循环跳转。
- pcap 联动：粘贴 pcap 全局头+首包（hex）验证 linktype 与过滤是否可能匹配（静态分析，不执行内核 BPF）；导出 C struct sock_filter 草稿数组。
- 示例：内置「HTTP」「DNS 非 53」「vlan 嵌套」三组；单测覆盖编译往返、已知 tcpdump -d 向量、跳转检测；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/tcpdump-bpf-compiler-explainer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/tcpdump-bpf-compiler-explainer/logic/`
- 测试文件夹：`devtools-web/src/tools/tcpdump-bpf-compiler-explainer/__tests__/`
### API 信息
- 无外部 API；教学向，不加载 eBPF 内核程序。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/tcpdump-bpf-compiler-explainer/` 目录内文件；不得修改日志抽取（任务 036）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 表达式编译、反汇编、语义说明、sock_filter 导出均可演示；单测覆盖编译器与反汇编；示例可用。
