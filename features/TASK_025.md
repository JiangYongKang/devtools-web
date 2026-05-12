### 任务目标
- 解析 CIDR 记法（`a.b.c.d/n`）与可选的起止 IP 输入，离线计算网络地址、广播地址、首末可用主机、地址总数、掩码点分与二进制展开、以及列表区展示区间内地址（对大前缀提供分页、虚拟滚动或「仅首尾+N 样本」策略并在 UI 明示）。
- 支持双向：从 CIDR 生成范围说明；粘贴「start-end」或单列 IP 表格反查最小覆盖 CIDR（若为多段离散则列出若干建议超网或明示无法单 CIDR 覆盖时的拆分草案）；附 `inRange(ip)` 单点探测框。
- 示例一键填入、结果区与明细表可复制、非法记法与同序性错误（起始大于结束）之提示、`/31`RFC3021 链路互联语义说明、`/32`单主机语义说明。
- 大体量前缀（例如 `/8`）下禁止无脑枚举全表的策略与占位说明、算术一致性与溢出防护、对用户输入的纯文本安全展示。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/cidr-range-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/cidr-range-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/cidr-range-parser/__tests__/`
### 前端实现说明
- 核心参数：`cidr`、`rangeStart`、`rangeEnd`、`enumeratePolicy`、`singleProbeIp`。
- 输出：`derivedNetwork`、`prefix`、`addressTotal`、`enumerationPreview`、`aggregatedCidrProposal[]`、`probeResult`、`warnings[]`、`errorCode`。
- 错误约定：`INVALID_CIDR`、`RANGE_NOT_ORDERED`、`NO_SINGLE_CIDR_AGGREGATE`（仍可返回草稿列表）、`ENUMERATION_LIMIT_EXCEEDED`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/cidr-range-parser/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条均可操作验证；超限策略在 UI 可读。
- 正反算与单点探测在同批单测场景下数值一致。
- 纯逻辑单测覆盖前缀边界、离散聚合与安全限制。
