### 任务目标
- 离线解析 IPv4 地址与子网掩码（点分四段与前缀长度双输入方式）、推导并展示网络地址、广播地址、可用主机区间、前缀长度、`/30`/`/31`/`/32` 等特殊前缀的可读解释、Wildcard mask、以及二进制按八位组展开的参照视图。
- 支持正反演算：给定任意一对合法字段（如 IP+掩码、IP+前缀、网络地址+前缀）在规则允许下回填其余字段；提供「主机数量」「子网拆分建议草图」（按用户输入的子网前缀再切分下一级）等与常见网络规划相关的辅助计算器。
- 示例一键填入（私网三段、LOOPBACK、链路本地说明性样例）、全表可复制、输入即时校验与高亮非法八位组、`0` 前缀废弃写法与省略规则提示。
- 对非法 IPv4、`/0`/`/33+`越界、掩码中非连续主机位、`127.x`/`0.x`等非可路由特例的警告分级、仅限浏览器的算术与 BigInt（若采用）一致性说明。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/ipv4-subnet-calculator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/ipv4-subnet-calculator/logic/`
- 测试文件夹：`devtools-web/src/tools/ipv4-subnet-calculator/__tests__/`
### 前端实现说明
- 核心参数：`addressDotted`、`maskDottedOrNull`、`prefixLengthOrNull`、`deriveMode`。
- 输出：`networkAddress`、`broadcastAddress`、`firstHost`、`lastHost`、`hostCount`、`wildcardMask`、`binaryRows[]`、`warnings[]`、`errorCode`。
- 错误约定：`INVALID_IPV4`、`INVALID_MASK`、`NON_CONTIGUOUS_MASK`、`PREFIX_OUT_OF_RANGE`、`CONFLICTING_INPUT`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/ipv4-subnet-calculator/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条功能均可通过手工用例与示例按钮覆盖验证。
- 典型与边界前缀下数值与二进制展开一致。
- 纯逻辑单测覆盖掩码连续性检测、广播计算与错误路径。
